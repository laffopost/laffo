import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useConversations } from "../../../hooks/useConversations";
import ChatUI from "./ChatUI";
import { ChatIcon } from "../../../utils/icons";
import "./DirectMessages.css";

export default function DirectMessages() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const chat = useConversations({
    onConversationStarted: () => setIsOpen(true),
  });

  // Global openDM event listener
  useEffect(() => {
    const handler = (e) => {
      const user = e.detail;
      if (!user?.uid || !chat.currentUser) return;
      if (user.uid === chat.currentUser.uid) return;
      setIsOpen(true);
      chat.startConversation(user);
    };
    window.addEventListener("openDM", handler);
    return () => window.removeEventListener("openDM", handler);
  }, [chat.currentUser, chat.startConversation]);

  const uid = chat.currentUser?.uid;
  const unreadMessageCount = uid
    ? chat.conversations.filter(
        (c) => c.lastSenderId !== uid && !c[`read_${uid}`] && c.lastMessage,
      ).length
    : 0;

  // Broadcast unread count to Header so it doesn't need its own Firestore listener
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("dm-unread-count", { detail: unreadMessageCount }));
  }, [unreadMessageCount]);

  // Don't render the FAB/overlay on the full Messages page — it also mounts
  // useConversations, and two simultaneous listeners on the same Firestore
  // query corrupt the watch-stream state.
  if (pathname === "/messages") return null;
  if (!chat.currentUser) return null;

  if (!isOpen) {
    return (
      <button
        className="dm-fab"
        onClick={() => setIsOpen(true)}
        title="Direct Messages"
      >
        <ChatIcon size={24} />
        {unreadMessageCount > 0 && (
          <span className="dm-fab-badge">{unreadMessageCount}</span>
        )}
      </button>
    );
  }

  const handleClose = () => {
    setIsOpen(false);
    chat.setActiveConvo(null);
    chat.setShowNewChat(false);
  };

  return (
    <div className="dm-overlay" onClick={handleClose}>
      <div className="dm-container" onClick={(e) => e.stopPropagation()}>
        <ChatUI {...chat} variant="overlay" onClose={handleClose} />
      </div>
    </div>
  );
}
