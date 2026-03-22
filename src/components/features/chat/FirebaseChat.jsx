import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/config";
import { GifPicker } from "../../common";
import "./FirebaseChat.css";

import logger from "../../../utils/logger";
const ADJECTIVES = [
  "Giggling",
  "Chuckling",
  "Cackling",
  "Memeing",
  "Diamond-Handed",
  "Degen",
  "Based",
];
const NOUNS = ["Ape", "Trader", "Hodler", "Whale", "Moonboy", "Memer", "Chad"];
const SUFFIXES = ["420", "69", "100x", "WAGMI", "LFG"];
const AVATARS = ["😂", "🤣", "😆", "🚀", "💎", "🔥", "💰", "🐂", "🦍"];

// Emoji categories for picker
const EMOJI_CATEGORIES = {
  Faces: [
    "😂",
    "🤣",
    "😆",
    "😎",
    "🤪",
    "😍",
    "🤗",
    "🤔",
    "😴",
    "😢",
    "😡",
    "🤯",
  ],
  Hands: [
    "👍",
    "👎",
    "👏",
    "🙌",
    "👋",
    "🤝",
    "💪",
    "🤘",
    "🤙",
    "👌",
    "✌️",
    "🤞",
  ],
  Hearts: [
    "❤️",
    "💜",
    "💙",
    "💚",
    "💛",
    "🧡",
    "💖",
    "💗",
    "💓",
    "💕",
    "💞",
    "💝",
  ],
  Crypto: [
    "🚀",
    "💎",
    "🔥",
    "💰",
    "📈",
    "📉",
    "🪙",
    "💸",
    "🤑",
    "💵",
    "🏆",
    "⭐",
  ],
  Animals: [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
  ],
  Food: [
    "🍕",
    "🍔",
    "🌮",
    "🍟",
    "🍿",
    "🍩",
    "🍪",
    "🎂",
    "🍰",
    "🍺",
    "🍻",
    "🥂",
  ],
};

export default function FirebaseChat({ collection: collectionName = "chat-messages", title = "Live Chat", variant = "sidebar" }) {
  logger.log("FirebaseChat rendered");
  const [messages, setMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const oldestMsgDocRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState(null);
  const [minimized, setMinimized] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifBtnRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const CHAT_COOLDOWN_MS = 2000; // 2 seconds between messages

  const { firebaseUser, userProfile, loading } = useAuth();

  // Removed debug useEffect that logged on every auth/profile change

  const generateUsername = useCallback((uid) => {
    const adjIndex = parseInt(uid.slice(0, 2), 36) % ADJECTIVES.length;
    const nounIndex = parseInt(uid.slice(2, 4), 36) % NOUNS.length;
    const suffixIndex = parseInt(uid.slice(-2), 36) % SUFFIXES.length;
    return `${ADJECTIVES[adjIndex]}${NOUNS[nounIndex]}${SUFFIXES[suffixIndex]}`;
  }, []);

  const getRandomAvatar = useCallback((uid) => {
    const avatarIndex = parseInt(uid.slice(-2), 36) % AVATARS.length;
    return AVATARS[avatarIndex];
  }, []);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const user = useMemo(() => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      name:
        userProfile?.username && userProfile.username.trim()
          ? userProfile.username
          : generateUsername(firebaseUser.uid),
      avatar: getRandomAvatar(firebaseUser.uid),
    };
  }, [firebaseUser, userProfile, generateUsername, getRandomAvatar]);

  const CHAT_PAGE = 10;

  useEffect(() => {
    if (!user) return;

    setOlderMessages([]);
    setHasOlderMessages(false);
    oldestMsgDocRef.current = null;

    logger.log("FirebaseChat: subscribing to Firestore chat-messages");
    const messagesRef = collection(db, collectionName);
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(CHAT_PAGE));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        logger.log("FirebaseChat: Firestore snapshot received", snapshot.size);
        const newMessages = [];
        snapshot.forEach((doc) => {
          newMessages.push({ id: doc.id, ...doc.data() });
        });
        newMessages.reverse();
        setMessages(newMessages);
        if (snapshot.docs.length > 0) {
          oldestMsgDocRef.current = snapshot.docs[snapshot.docs.length - 1];
          setHasOlderMessages(snapshot.docs.length === CHAT_PAGE);
        }
        setError(null);
      },
      (err) => {
        logger.error("Firestore error:", err);
        setError("Connection lost");
      },
    );

    return () => {
      logger.log("FirebaseChat: unsubscribing from Firestore chat-messages");
      unsubscribe();
    };
  }, [user]);

  const loadOlderMessages = useCallback(async () => {
    if (!oldestMsgDocRef.current || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const messagesRef = collection(db, collectionName);
      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        startAfter(oldestMsgDocRef.current),
        limit(CHAT_PAGE),
      );
      const snap = await getDocs(q);
      const older = [];
      snap.forEach((doc) => older.push({ id: doc.id, ...doc.data() }));
      older.reverse();
      setOlderMessages((prev) => [...older, ...prev]);
      if (snap.docs.length > 0) oldestMsgDocRef.current = snap.docs[snap.docs.length - 1];
      setHasOlderMessages(snap.docs.length === CHAT_PAGE);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [collectionName, loadingOlderMessages]);

  useEffect(() => {
    if (chatRef.current && messages.length > 0) {
      logger.log("FirebaseChat: messages updated, scrolling to bottom");
      const timer = setTimeout(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim() && !pendingGif) return;
      if (!user) return;

      // Block anonymous users from chatting
      if (firebaseUser?.isAnonymous) {
        setError("Log in to send messages");
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Rate limiting: prevent chat spam
      const now = Date.now();
      if (now - lastMessageTimeRef.current < CHAT_COOLDOWN_MS) {
        setError("Slow down! Wait a moment before sending.");
        setTimeout(() => setError(null), 2000);
        return;
      }

      const gif = pendingGif;
      try {
        lastMessageTimeRef.current = now;
        const messagesRef = collection(db, collectionName);
        await addDoc(messagesRef, {
          text: newMessage.trim(),
          userId: user.uid,
          userName: user.name,
          timestamp: serverTimestamp(),
          ...(gif && { gifUrl: gif.url }),
        });

        setNewMessage("");
        setPendingGif(null);
        inputRef.current?.focus();
        setError(null);
      } catch (err) {
        logger.error("Send error:", err);
        setError("Failed to send message");
      }
    },
    [newMessage, pendingGif, user, firebaseUser],
  );

  const handleEmojiClick = useCallback((emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const isLoggedIn = !loading && firebaseUser && !firebaseUser.isAnonymous;
  const isInline = variant === "inline";

  // Inline variant: just messages + input, no wrapper/header (used inside MusicPlayer)
  if (isInline) {
    if (!isLoggedIn) {
      return (
        <div className="chat-login-prompt">
          <div className="chat-login-icon">💬</div>
          <p>Log in to join the chat</p>
        </div>
      );
    }

    return (
      <>
        {error && <div className="chat-error">{error}</div>}
        <div ref={chatRef} className="chat-messages">
          {hasOlderMessages && (
            <button className="chat-load-older-btn" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
              {loadingOlderMessages ? "Loading…" : "Load older messages"}
            </button>
          )}
          {messages.length === 0 && olderMessages.length === 0 ? (
            <div className="chat-empty">
              <div className="empty-icon">💬</div>
              <div>Chat while you listen!</div>
            </div>
          ) : (
            [...olderMessages, ...messages].map((msg) => (
              <div key={msg.id} className={`chat-message-small ${msg.userId === user?.uid ? "own" : ""}`}>
                <div className="message-header-row">
                  {msg.userId !== user?.uid ? (
                    <button
                      className="message-username message-username-dm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("openDM", { detail: { uid: msg.userId, username: msg.userName, avatar: null } }));
                      }}
                      title={`DM ${msg.userName}`}
                    >
                      {msg.userName}
                    </button>
                  ) : (
                    <span className="message-username">{msg.userName}</span>
                  )}
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                {msg.gifUrl && <img src={msg.gifUrl} alt="GIF" className="chat-msg-gif" />}
                {msg.text && <div className="message-text">{msg.text}</div>}
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSendMessage} className="chat-input-form">
          {pendingGif && (
            <div className="chat-gif-preview">
              <img src={pendingGif.url} alt="GIF" />
              <button type="button" className="chat-gif-preview-remove" onClick={() => setPendingGif(null)}>✕</button>
            </div>
          )}
          <div className="chat-input-wrapper" ref={inputWrapperRef}>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              maxLength={200}
              disabled={!!error}
              className="chat-input"
            />
            <div className="chat-actions">
              <button type="button" className="emoji-toggle-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add emoji">😊</button>
              <button type="button" ref={gifBtnRef} className="chat-gif-btn" onClick={() => setShowGifPicker((v) => !v)} title="Add GIF">GIF</button>
              <button type="submit" className="chat-send-btn" title="Send">➤</button>
            </div>
          </div>
          {showEmojiPicker && (
            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <div className="emoji-picker-custom">
                {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                  <div key={category} className="emoji-category">
                    <div className="emoji-category-label">{category}</div>
                    <div className="emoji-grid">
                      {emojis.map((emoji) => (
                        <button key={emoji} type="button" className="emoji-btn" onClick={() => handleEmojiClick(emoji)}>{emoji}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showGifPicker && (
            <GifPicker
              anchorRef={inputWrapperRef}
              onSelect={(gif) => { setPendingGif(gif); setShowGifPicker(false); }}
              onClose={() => setShowGifPicker(false)}
            />
          )}
        </form>
      </>
    );
  }

  // Sidebar variant (default): full card with header + minimize
  if (minimized) {
    return (
      <div
        className="firebase-chat-minimized"
        onClick={() => setMinimized(false)}
        title="Open Chat"
      >
        <span className="chat-live-dot" />
        <span className="chat-min-title">{title}</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="firebase-chat">
        <div className="chat-header">
          <div className="chat-header-row">
            <span className="chat-live-dot" />
            <span className="chat-title-ellipsis">{title}</span>
          </div>
          <button className="chat-minimize-btn" title="Minimize" onClick={() => setMinimized(true)}>–</button>
        </div>
        <div className="chat-login-prompt">
          <div className="chat-login-icon">💬</div>
          <p>Log in to join the chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="firebase-chat">
      <div className="chat-header">
        <div className="chat-header-row">
          <span className="chat-live-dot" />
          <span className="chat-title-ellipsis">{title}</span>
          {user && <span className="chat-user-ellipsis">@{user.name}</span>}
        </div>
        <button className="chat-minimize-btn" title="Minimize" onClick={() => setMinimized(true)}>–</button>
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div ref={chatRef} className="chat-messages">
        {hasOlderMessages && (
          <button className="chat-load-older-btn" onClick={loadOlderMessages} disabled={loadingOlderMessages}>
            {loadingOlderMessages ? "Loading…" : "Load older messages"}
          </button>
        )}
        {messages.length === 0 && olderMessages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <div>Welcome to {title}</div>
          </div>
        ) : (
          [...olderMessages, ...messages].map((msg) => (
            <div
              key={msg.id}
              className={`chat-message-small ${
                msg.userId === user?.uid ? "own" : ""
              }`}
            >
              <div className="message-header-row">
                {msg.userId !== user?.uid && !firebaseUser?.isAnonymous ? (
                  <button
                    className="message-username message-username-dm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent("openDM", {
                          detail: {
                            uid: msg.userId,
                            username: msg.userName,
                            avatar: null,
                          },
                        }),
                      );
                    }}
                    title={`DM ${msg.userName}`}
                  >
                    {msg.userName}
                  </button>
                ) : (
                  <span className="message-username">{msg.userName}</span>
                )}
                <span className="message-time">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              {msg.gifUrl && <img src={msg.gifUrl} alt="GIF" className="chat-msg-gif" />}
              {msg.text && <div className="message-text">{msg.text}</div>}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        {pendingGif && (
          <div className="chat-gif-preview">
            <img src={pendingGif.url} alt="GIF" />
            <button type="button" className="chat-gif-preview-remove" onClick={() => setPendingGif(null)}>✕</button>
          </div>
        )}
        <div className="chat-input-wrapper" ref={inputWrapperRef}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              firebaseUser?.isAnonymous
                ? "Log in to chat..."
                : "Type a message..."
            }
            maxLength={200}
            disabled={!user || !!error || firebaseUser?.isAnonymous}
            className="chat-input"
          />
          <div className="chat-actions">
            <button
              type="button"
              className="emoji-toggle-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              😊
            </button>
            <button
              type="button"
              ref={gifBtnRef}
              className="chat-gif-btn"
              onClick={() => setShowGifPicker((v) => !v)}
              title="Add GIF"
            >
              GIF
            </button>
            <button type="submit" className="chat-send-btn" title="Send">
              ➤
            </button>
          </div>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <div className="emoji-picker-custom">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="emoji-category">
                  <div className="emoji-category-label">{category}</div>
                  <div className="emoji-grid">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="emoji-btn"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showGifPicker && (
          <GifPicker
            anchorRef={inputWrapperRef}
            onSelect={(gif) => { setPendingGif(gif); setShowGifPicker(false); }}
            onClose={() => setShowGifPicker(false)}
          />
        )}
      </form>
    </div>
  );
}
