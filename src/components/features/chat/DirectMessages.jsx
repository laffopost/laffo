import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { useUnreadMessageCount } from "../../../hooks/useUnreadMessageCount";
import { EmojiPicker } from "../utilities";
import toast from "react-hot-toast";
import "./DirectMessages.css";

// Build a deterministic conversation ID from two UIDs
function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export default function DirectMessages() {
  const { firebaseUser, userProfile } = useAuth();
  const unreadMessageCount = useUnreadMessageCount();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const cooldownRef = useRef(0);

  const currentUser = useMemo(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return null;
    return {
      uid: firebaseUser.uid,
      name: userProfile?.username || firebaseUser.displayName || "User",
      avatar: userProfile?.avatar || null,
    };
  }, [firebaseUser, userProfile]);

  // Subscribe to conversations list
  useEffect(() => {
    if (!currentUser) return;

    // Temporary: Use simpler query to avoid index requirement
    // TODO: Create Firebase index for compound query
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      // orderBy("lastMessageAt", "desc"), // Commented out to avoid index requirement
      limit(30),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convos = [];
      snap.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        convos.push(data);
      });

      // Sort manually by lastMessageAt since we can't use orderBy
      convos.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
        const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
        return bTime - aTime; // Descending order
      });

      setConversations(convos);
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConvo) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "conversations", activeConvo.id, "messages"),
      orderBy("timestamp", "asc"),
      limit(100),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = [];
      snap.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    // Mark conversation as read
    if (activeConvo.lastSenderId !== currentUser?.uid) {
      updateDoc(doc(db, "conversations", activeConvo.id), {
        [`read_${currentUser.uid}`]: true,
      }).catch(() => {});
    }

    return () => unsub();
  }, [activeConvo, currentUser]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Search users
  const handleSearchUsers = useCallback(
    async (q) => {
      setSearchQuery(q);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        console.log("Searching for users with query:", q);
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const results = [];
        snap.forEach((doc) => {
          const data = doc.data();
          console.log("Found user:", {
            id: doc.id,
            username: data.username,
            data,
          });
          if (
            doc.id !== currentUser?.uid &&
            data.username?.toLowerCase().includes(q.toLowerCase())
          ) {
            results.push({ uid: doc.id, ...data });
          }
        });
        console.log("Search results:", results);
        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error("Search failed:", error);
        toast.error("Search failed");
      }
      setSearching(false);
    },
    [currentUser],
  );

  // Start or open conversation with a user
  const startConversation = useCallback(
    async (otherUser) => {
      if (!currentUser) {
        console.log("Cannot start conversation: no current user");
        return;
      }

      if (firebaseUser?.isAnonymous) {
        toast.error("Please log in to start conversations");
        return;
      }

      console.log("Starting conversation:", {
        currentUser: currentUser.uid,
        otherUser: otherUser.uid,
        isAnonymous: firebaseUser?.isAnonymous,
        userProfile: userProfile?.username,
      });
      const convoId = getConversationId(currentUser.uid, otherUser.uid);

      // Check if conversation already exists in local state
      const existing = conversations.find((c) => c.id === convoId);
      if (existing) {
        setActiveConvo(existing);
        setShowNewChat(false);
        return;
      }

      // Check Firestore
      try {
        const convoRef = doc(db, "conversations", convoId);
        const { setDoc, getDoc } = await import("firebase/firestore");

        // Check if conversation already exists in Firestore
        const existingDoc = await getDoc(convoRef);
        if (existingDoc.exists()) {
          const existingData = existingDoc.data();
          setActiveConvo({
            id: convoId,
            ...existingData,
          });
          setShowNewChat(false);
          console.log("Found existing conversation");
          return;
        }

        const conversationData = {
          participants: [currentUser.uid, otherUser.uid],
          participantNames: {
            [currentUser.uid]: currentUser.name,
            [otherUser.uid]: otherUser.username || otherUser.name || "User",
          },
          participantAvatars: {
            [currentUser.uid]: currentUser.avatar || null,
            [otherUser.uid]: otherUser.avatar || null,
          },
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          lastSenderId: "",
          [`read_${currentUser.uid}`]: true,
          [`read_${otherUser.uid}`]: true,
          createdAt: serverTimestamp(),
        };

        console.log("Creating new conversation with data:", conversationData);

        // Use setDoc without merge for new documents (this triggers CREATE rules)
        await setDoc(convoRef, conversationData);

        setActiveConvo({
          id: convoId,
          participants: [currentUser.uid, otherUser.uid],
          participantNames: {
            [currentUser.uid]: currentUser.name,
            [otherUser.uid]: otherUser.username || otherUser.name || "User",
          },
          participantAvatars: {
            [currentUser.uid]: currentUser.avatar || null,
            [otherUser.uid]: otherUser.avatar || null,
          },
        });
        setShowNewChat(false);
        console.log("Conversation created successfully");
      } catch (error) {
        console.error("Could not start conversation:", error);
        toast.error(
          `Could not start conversation: ${error.message || "Unknown error"}`,
        );
      }
    },
    [currentUser, conversations, firebaseUser, userProfile],
  );

  // Global event listener — lets any component trigger "openDM" with a user
  useEffect(() => {
    const handler = (e) => {
      const user = e.detail;
      if (!user?.uid || !currentUser) return;
      if (user.uid === currentUser.uid) return; // can't DM yourself
      setIsOpen(true);
      setShowNewChat(false);
      startConversation(user);
    };
    window.addEventListener("openDM", handler);
    return () => window.removeEventListener("openDM", handler);
  }, [currentUser, startConversation]);

  // Send message
  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim() || !activeConvo || !currentUser) {
        console.log("Send failed: missing data", {
          message: !!newMessage.trim(),
          activeConvo: !!activeConvo,
          currentUser: !!currentUser,
        });
        return;
      }

      // Validate user is authenticated and not anonymous
      if (firebaseUser?.isAnonymous) {
        toast.error("Please log in to send messages");
        return;
      }

      const now = Date.now();
      if (now - cooldownRef.current < 1500) {
        toast.error("Slow down!");
        return;
      }
      cooldownRef.current = now;

      const text = newMessage.trim().slice(0, 500);
      setNewMessage("");

      try {
        console.log("Attempting to send message:", {
          text,
          senderId: currentUser.uid,
          convoId: activeConvo.id,
          participants: activeConvo.participants,
        });

        // Add the message
        await addDoc(
          collection(db, "conversations", activeConvo.id, "messages"),
          {
            text,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            timestamp: serverTimestamp(),
          },
        );

        // Update conversation metadata
        await updateDoc(doc(db, "conversations", activeConvo.id), {
          lastMessage: text.slice(0, 50),
          lastMessageAt: serverTimestamp(),
          lastSenderId: currentUser.uid,
          [`read_${currentUser.uid}`]: true,
          // Mark as unread for the other person
          ...Object.fromEntries(
            activeConvo.participants
              .filter((p) => p !== currentUser.uid)
              .map((p) => [`read_${p}`, false]),
          ),
        });

        inputRef.current?.focus();
        console.log("Message sent successfully");
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error(
          `Failed to send message: ${error.message || "Unknown error"}`,
        );
        // Restore the message text so user can try again
        setNewMessage(text);
      }
    },
    [newMessage, activeConvo, currentUser, firebaseUser],
  );

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji) => {
    setNewMessage((prev) => prev + emoji);
    // Focus back to input after emoji selection
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);
  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (messageId) => {
      if (!activeConvo || !currentUser) return;

      try {
        await deleteDoc(
          doc(db, "conversations", activeConvo.id, "messages", messageId),
        );
        toast.success("Message deleted");
      } catch (error) {
        console.error("Failed to delete message:", error);
        toast.error("Failed to delete message");
      }
    },
    [activeConvo, currentUser],
  );

  // Handle message editing
  const handleEditMessage = useCallback(
    async (messageId, newText) => {
      if (!activeConvo || !currentUser || !newText.trim()) return;

      try {
        await updateDoc(
          doc(db, "conversations", activeConvo.id, "messages", messageId),
          {
            text: newText.trim(),
            edited: true,
            editedAt: serverTimestamp(),
          },
        );
        setEditingMessage(null);
        setEditText("");
        toast.success("Message updated");
      } catch (error) {
        console.error("Failed to edit message:", error);
        toast.error("Failed to edit message");
      }
    },
    [activeConvo, currentUser],
  );

  // Start editing a message
  const startEditing = useCallback((message) => {
    setEditingMessage(message.id);
    setEditText(message.text);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
    setEditText("");
  }, []);

  // Delete entire conversation
  const deleteConversation = useCallback(
    async (conversationId) => {
      if (!currentUser || !conversationId) return;

      if (
        !window.confirm(
          "Are you sure you want to delete this conversation? This will permanently delete all messages and cannot be undone.",
        )
      ) {
        return;
      }

      try {
        // Delete the conversation document (this will also delete all messages due to Firestore rules)
        await deleteDoc(doc(db, "conversations", conversationId));

        // Clear active conversation if it's the one being deleted
        if (activeConvo?.id === conversationId) {
          setActiveConvo(null);
        }

        toast.success("Conversation deleted");
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        toast.error("Failed to delete conversation");
      }
    },
    [activeConvo, currentUser],
  );
  // Get the other user's info for a conversation
  const getOtherUser = useCallback(
    (convo) => {
      if (!currentUser || !convo?.participants)
        return { name: "User", avatar: null };
      const otherId = convo.participants.find((p) => p !== currentUser.uid);
      return {
        name: convo.participantNames?.[otherId] || "User",
        avatar: convo.participantAvatars?.[otherId] || null,
        uid: otherId,
      };
    },
    [currentUser],
  );

  const formatTime = useCallback((ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays > 0) return `${diffDays}d ago`;
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Don't render for anonymous / logged-out users
  if (!currentUser) {
    console.log("DirectMessages: No current user, not rendering");
    return null;
  }

  // Debug info
  console.log("DirectMessages render state:", {
    currentUser: currentUser.uid,
    isAnonymous: firebaseUser?.isAnonymous,
    userProfile: userProfile?.username,
    conversationsCount: conversations.length,
  });

  // FAB button
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

  return (
    <div className="dm-overlay">
      <div className="dm-container" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className={`dm-sidebar ${activeConvo ? "hide-mobile" : ""}`}>
          <div className="dm-sidebar-header">
            <h3>Messages</h3>
            <div className="dm-sidebar-actions">
              <button
                className="dm-new-btn"
                onClick={() => setShowNewChat(!showNewChat)}
                title="New conversation"
              >
                ✏️
              </button>
              <button
                className="dm-close-btn"
                onClick={() => {
                  setIsOpen(false);
                  setActiveConvo(null);
                  setShowNewChat(false);
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Always visible search section */}
          <div className="dm-search-section">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              placeholder="Search users..."
              className="dm-search-input"
              autoFocus={showNewChat}
            />
            {showNewChat && (
              <div className="dm-search-results">
                {searching && (
                  <div className="dm-search-loading">Searching...</div>
                )}
                {searchResults.map((user) => (
                  <button
                    key={user.uid}
                    className="dm-search-result"
                    onClick={() => startConversation(user)}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="dm-avatar-small"
                      />
                    ) : (
                      <span className="dm-avatar-placeholder">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                    <span className="dm-search-name">
                      {user.username || "User"}
                    </span>
                  </button>
                ))}
                {!searching &&
                  searchQuery.length >= 2 &&
                  searchResults.length === 0 && (
                    <div className="dm-search-empty">No users found</div>
                  )}
              </div>
            )}
          </div>

          {/* Conversations list */}
          <div className="dm-convo-list">
            {conversations.length === 0 && !showNewChat ? (
              <div className="dm-empty-state">
                <span>✉️</span>
                <p>No messages yet</p>
                <button
                  className="dm-start-btn"
                  onClick={() => setShowNewChat(true)}
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              conversations.map((convo) => {
                const other = getOtherUser(convo);
                const isUnread =
                  convo.lastSenderId !== currentUser.uid &&
                  !convo[`read_${currentUser.uid}`];
                return (
                  <button
                    key={convo.id}
                    className={`dm-convo-item ${activeConvo?.id === convo.id ? "active" : ""} ${isUnread ? "unread" : ""}`}
                    onClick={() => setActiveConvo(convo)}
                  >
                    {other.avatar ? (
                      <img
                        src={other.avatar}
                        alt=""
                        className="dm-avatar-small"
                      />
                    ) : (
                      <span className="dm-avatar-placeholder">
                        {other.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                    <div className="dm-convo-info">
                      <span className="dm-convo-name">{other.name}</span>
                      <span className="dm-convo-preview">
                        {convo.lastMessage || "No messages yet"}
                      </span>
                    </div>
                    <div className="dm-convo-meta">
                      <span className="dm-convo-time">
                        {formatTime(convo.lastMessageAt)}
                      </span>
                      {isUnread && <span className="dm-unread-dot" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`dm-chat-area ${!activeConvo ? "hide-mobile" : ""}`}>
          {activeConvo ? (
            <>
              <div className="dm-chat-header">
                <button
                  className="dm-back-btn"
                  onClick={() => setActiveConvo(null)}
                  title="Back"
                >
                  ←
                </button>
                <div className="dm-chat-header-info">
                  {(() => {
                    const other = getOtherUser(activeConvo);
                    return (
                      <>
                        {other.avatar ? (
                          <img
                            src={other.avatar}
                            alt=""
                            className="dm-avatar-small"
                          />
                        ) : (
                          <span className="dm-avatar-placeholder">
                            {other.name?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                        <span className="dm-chat-header-name">
                          {other.name}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <button
                  className="dm-delete-chat-btn"
                  onClick={() => deleteConversation(activeConvo.id)}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>

              <div className="dm-messages">
                {messages.length === 0 ? (
                  <div className="dm-messages-empty">
                    <span>👋</span>
                    <p>Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`dm-message ${msg.senderId === currentUser.uid ? "own" : ""}`}
                    >
                      <div className="dm-message-bubble">
                        {editingMessage === msg.id ? (
                          <div className="dm-edit-form">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="dm-edit-input"
                              autoFocus
                              maxLength={500}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleEditMessage(msg.id, editText);
                                } else if (e.key === "Escape") {
                                  cancelEditing();
                                }
                              }}
                            />
                            <div className="dm-edit-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditMessage(msg.id, editText)
                                }
                                className="dm-edit-save"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="dm-edit-cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p>
                              {msg.text}
                              {msg.edited && (
                                <span className="dm-edited"> (edited)</span>
                              )}
                            </p>
                            {msg.senderId === currentUser.uid && (
                              <div className="dm-message-actions">
                                <button
                                  onClick={() => startEditing(msg)}
                                  className="dm-action-btn"
                                  title="Edit message"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm("Delete this message?")
                                    ) {
                                      handleDeleteMessage(msg.id);
                                    }
                                  }}
                                  className="dm-action-btn"
                                  title="Delete message"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <span className="dm-message-time">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="dm-input-form">
                <div className="dm-input-container">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="dm-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="dm-emoji-btn"
                    onClick={() => setShowEmojiPicker(true)}
                    title="Add emoji"
                  >
                    😀
                  </button>
                </div>
                <button
                  type="submit"
                  className="dm-send-btn"
                  disabled={!newMessage.trim()}
                >
                  ➤
                </button>
              </form>
            </>
          ) : (
            <div className="dm-no-chat">
              <span>💬</span>
              <h4>Your Messages</h4>
              <p>Select a conversation or start a new one</p>
            </div>
          )}
        </div>
      </div>

      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  );
}
