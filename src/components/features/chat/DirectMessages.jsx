import { useState, useEffect } from "react";
import { useConversations } from "../../../hooks/useConversations";
import { useUnreadMessageCount } from "../../../hooks/useUnreadMessageCount";
import ChatUI from "./ChatUI";
import "./DirectMessages.css";

export default function DirectMessages() {
  const [isOpen, setIsOpen] = useState(false);
  const unreadMessageCount = useUnreadMessageCount();

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

  if (!chat.currentUser) return null;

  if (!isOpen) {
    return (
      <button
        className="dm-fab"
        onClick={() => setIsOpen(true)}
        title="Direct Messages"
      >
        ✉️
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
