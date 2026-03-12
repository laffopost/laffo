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
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { EmojiPicker } from "../components/features/utilities";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import "./Messages.css";

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export default function MessagesPage() {
  const { firebaseUser, userProfile } = useAuth();
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

  // Subscribe to conversations
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc"),
      limit(30),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convos = [];
      snap.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        convos.push(data);
      });
      setConversations(convos);
    });
    return () => unsub();
  }, [currentUser]);

  // Mark all conversations as read when user visits Messages page
  useEffect(() => {
    if (currentUser && conversations.length > 0) {
      conversations.forEach(async (convo) => {
        if (
          convo.lastSenderId !== currentUser.uid &&
          !convo[`read_${currentUser.uid}`]
        ) {
          try {
            await updateDoc(doc(db, "conversations", convo.id), {
              [`read_${currentUser.uid}`]: true,
            });
          } catch (_error) {
            // Silently handle errors
          }
        }
      });
    }
  }, [currentUser, conversations]);
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convos = [];
      snap.forEach((d) => convos.push({ id: d.id, ...d.data() }));
      setConversations(convos);
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to messages
  useEffect(() => {
    if (!activeConvo) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "conversations", activeConvo.id, "messages"),
      orderBy("timestamp", "asc"),
      limit(200),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    // Mark as read
    if (activeConvo.lastSenderId !== currentUser?.uid) {
      updateDoc(doc(db, "conversations", activeConvo.id), {
        [`read_${currentUser.uid}`]: true,
      }).catch(() => {});
    }

    return () => unsub();
  }, [activeConvo, currentUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for openDM events from other components
  const startConversation = useCallback(
    async (otherUser) => {
      if (!currentUser) return;
      const convoId = getConversationId(currentUser.uid, otherUser.uid);
      const existing = conversations.find((c) => c.id === convoId);
      if (existing) {
        setActiveConvo(existing);
        setShowNewChat(false);
        return;
      }
      try {
        const convoRef = doc(db, "conversations", convoId);
        await setDoc(
          convoRef,
          {
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
          },
          { merge: true },
        );
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
      } catch {
        toast.error("Could not start conversation");
      }
    },
    [currentUser, conversations],
  );

  // Global openDM listener — redirect to this page
  useEffect(() => {
    const handler = (e) => {
      const user = e.detail;
      if (!user?.uid || !currentUser) return;
      if (user.uid === currentUser.uid) return;
      startConversation(user);
    };
    window.addEventListener("openDM", handler);
    return () => window.removeEventListener("openDM", handler);
  }, [currentUser, startConversation]);

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
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const results = [];
        snap.forEach((d) => {
          const data = d.data();
          if (
            d.id !== currentUser?.uid &&
            data.username?.toLowerCase().includes(q.toLowerCase())
          ) {
            results.push({ uid: d.id, ...data });
          }
        });
        setSearchResults(results.slice(0, 10));
      } catch {
        toast.error("Search failed");
      }
      setSearching(false);
    },
    [currentUser],
  );

  // Send message
  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim() || !activeConvo || !currentUser) return;
      const now = Date.now();
      if (now - cooldownRef.current < 1500) {
        toast.error("Slow down!");
        return;
      }
      cooldownRef.current = now;
      const text = newMessage.trim().slice(0, 500);
      setNewMessage("");
      try {
        await addDoc(
          collection(db, "conversations", activeConvo.id, "messages"),
          {
            text,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            timestamp: serverTimestamp(),
          },
        );
        await updateDoc(doc(db, "conversations", activeConvo.id), {
          lastMessage: text.slice(0, 50),
          lastMessageAt: serverTimestamp(),
          lastSenderId: currentUser.uid,
          [`read_${currentUser.uid}`]: true,
          ...Object.fromEntries(
            activeConvo.participants
              .filter((p) => p !== currentUser.uid)
              .map((p) => [`read_${p}`, false]),
          ),
        });
        inputRef.current?.focus();
      } catch {
        toast.error("Failed to send message");
      }
    },
    [newMessage, activeConvo, currentUser],
  );

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
        // Delete the conversation document
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

  // Not logged in
  if (!currentUser) {
    return (
      <div className="messages-page">
        <div className="messages-login-prompt">
          <span className="messages-login-icon">✉️</span>
          <h2>Direct Messages</h2>
          <p>Log in to send and receive messages</p>
          <Link to="/profile" className="messages-login-btn">
            Log in / Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-wrapper">
        {/* Sidebar */}
        <div className={`messages-sidebar ${activeConvo ? "hide-mobile" : ""}`}>
          <div className="messages-sidebar-header">
            <h2>✉️ Messages</h2>
            <button
              className="messages-new-btn"
              onClick={() => setShowNewChat(!showNewChat)}
              title="New conversation"
            >
              {showNewChat ? "✕" : "✏️ New"}
            </button>
          </div>

          {/* Search */}
          {showNewChat && (
            <div className="messages-search-section">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search users..."
                className="messages-search-input"
                autoFocus
              />
              <div className="messages-search-results">
                {searching && (
                  <div className="messages-search-status">Searching...</div>
                )}
                {searchResults.map((user) => (
                  <button
                    key={user.uid}
                    className="messages-search-result"
                    onClick={() => startConversation(user)}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="messages-avatar"
                      />
                    ) : (
                      <span className="messages-avatar-placeholder">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                    <span className="messages-search-name">
                      {user.username || "User"}
                    </span>
                  </button>
                ))}
                {!searching &&
                  searchQuery.length >= 2 &&
                  searchResults.length === 0 && (
                    <div className="messages-search-status">No users found</div>
                  )}
              </div>
            </div>
          )}

          {/* Conversations list */}
          <div className="messages-convo-list">
            {conversations.length === 0 && !showNewChat ? (
              <div className="messages-empty">
                <span>💬</span>
                <p>No conversations yet</p>
                <button
                  className="messages-start-btn"
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
                    className={`messages-convo-item ${activeConvo?.id === convo.id ? "active" : ""} ${isUnread ? "unread" : ""}`}
                    onClick={() => setActiveConvo(convo)}
                  >
                    {other.avatar ? (
                      <img
                        src={other.avatar}
                        alt=""
                        className="messages-avatar"
                      />
                    ) : (
                      <span className="messages-avatar-placeholder">
                        {other.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                    <div className="messages-convo-info">
                      <span className="messages-convo-name">{other.name}</span>
                      <span className="messages-convo-preview">
                        {convo.lastMessage || "No messages yet"}
                      </span>
                    </div>
                    <div className="messages-convo-meta">
                      <span className="messages-convo-time">
                        {formatTime(convo.lastMessageAt)}
                      </span>
                      {isUnread && <span className="messages-unread-dot" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`messages-chat ${!activeConvo ? "hide-mobile" : ""}`}>
          {activeConvo ? (
            <>
              <div className="messages-chat-header">
                <button
                  className="messages-back-btn"
                  onClick={() => setActiveConvo(null)}
                >
                  ← Back
                </button>
                <div className="messages-chat-user">
                  {(() => {
                    const other = getOtherUser(activeConvo);
                    return (
                      <>
                        {other.avatar ? (
                          <img
                            src={other.avatar}
                            alt=""
                            className="messages-avatar"
                          />
                        ) : (
                          <span className="messages-avatar-placeholder">
                            {other.name?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                        <div className="messages-chat-user-info">
                          <span className="messages-chat-name">
                            {other.name}
                          </span>
                          <Link
                            to={`/profile/${other.name}`}
                            className="messages-view-profile"
                          >
                            View Profile
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  className="messages-delete-chat-btn"
                  onClick={() => deleteConversation(activeConvo.id)}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="messages-list-empty">
                    <span>👋</span>
                    <p>Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`messages-bubble-row ${msg.senderId === currentUser.uid ? "own" : ""}`}
                    >
                      <div className="messages-bubble">
                        {editingMessage === msg.id ? (
                          <div className="messages-edit-form">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="messages-edit-input"
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
                            <div className="messages-edit-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditMessage(msg.id, editText)
                                }
                                className="messages-edit-save"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="messages-edit-cancel"
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
                                <span className="messages-edited">
                                  {" "}
                                  (edited)
                                </span>
                              )}
                            </p>
                            {msg.senderId === currentUser.uid && (
                              <div className="messages-message-actions">
                                <button
                                  onClick={() => startEditing(msg)}
                                  className="messages-action-btn"
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
                                  className="messages-action-btn"
                                  title="Delete message"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <span className="messages-bubble-time">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="messages-input-form">
                <div className="messages-input-container">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="messages-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="messages-emoji-btn"
                    onClick={() => setShowEmojiPicker(true)}
                    title="Add emoji"
                  >
                    😀
                  </button>
                </div>
                <button
                  type="submit"
                  className="messages-send-btn"
                  disabled={!newMessage.trim()}
                >
                  ➤ Send
                </button>
              </form>
            </>
          ) : (
            <div className="messages-no-chat">
              <span>💬</span>
              <h3>Your Messages</h3>
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
