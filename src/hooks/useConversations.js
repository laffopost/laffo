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
  getDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { formatTime } from "../utils/formatters";

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

/**
 * useConversations — shared Firebase + state logic for both
 * DirectMessages (FAB overlay) and Messages (full page route).
 *
 * @param {object} [options]
 * @param {function} [options.onConversationStarted] — called after a new
 *   conversation is opened so the overlay can reveal itself.
 */
export function useConversations({ onConversationStarted } = {}) {
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
  const [pendingGif, setPendingGif] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const gifBtnRef = useRef(null);
  const cooldownRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // ── Derived current user ──────────────────────────────────────────
  const currentUser = useMemo(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return null;
    return {
      uid: firebaseUser.uid,
      name: userProfile?.username || firebaseUser.displayName || "User",
      avatar: userProfile?.avatar || null,
    };
  }, [firebaseUser, userProfile]);

  // ── Conversations subscription ────────────────────────────────────
  const currentUid = currentUser?.uid ?? null;

  // ── Online presence — subscribe to other participants' lastSeen ───
  const otherUidsKey = useMemo(() => {
    if (!currentUid || !conversations.length) return "";
    return [...new Set(
      conversations.flatMap((c) => c.participants?.filter((p) => p !== currentUid) ?? [])
    )].sort().join(",");
  }, [currentUid, conversations]);

  useEffect(() => {
    if (!otherUidsKey) return;
    const uids = otherUidsKey.split(",").filter(Boolean);
    const unsubs = uids.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        if (!snap.exists()) return;
        const ls = snap.data().lastSeen;
        const ms = ls?.seconds ? ls.seconds * 1000 : 0;
        setOnlineUsers((prev) => ({ ...prev, [uid]: ms ? Date.now() - ms < 5 * 60 * 1000 : false }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [otherUidsKey]);
  useEffect(() => {
    if (!currentUid) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUid),
      limit(30),
    );
    let cancelled = false;
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        const convos = [];
        snap.forEach((d) => convos.push({ id: d.id, ...d.data() }));
        // Sort client-side to avoid needing a composite index
        convos.sort((a, b) => {
          const aTime = a.lastMessageAt?.seconds || 0;
          const bTime = b.lastMessageAt?.seconds || 0;
          return bTime - aTime;
        });
        setConversations(convos);
      },
      (err) => {
        console.error("Conversations query error:", err);
      },
    );
    return () => {
      cancelled = true;
      // Defer unsub by one tick to avoid Firestore watch-stream race condition
      // (React StrictMode tears down and re-mounts synchronously, which can
      //  corrupt Firestore's internal target state if unsub fires mid-stream)
      setTimeout(() => { try { unsub(); } catch {} }, 0);
    };
  }, [currentUid]);

  // ── Messages subscription ─────────────────────────────────────────
  const activeConvoId = activeConvo?.id ?? null;
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "conversations", activeConvoId, "messages"),
      orderBy("timestamp", "asc"),
      limit(200),
    );
    let cancelled = false;
    const unsub = onSnapshot(q, (snap) => {
      if (cancelled) return;
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return () => {
      cancelled = true;
      setTimeout(() => { try { unsub(); } catch {} }, 0);
    };
  }, [activeConvoId, currentUid]);

  // ── Auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // ── Typing indicator — detect other user typing ─────────────────
  useEffect(() => {
    if (!activeConvo || !currentUid) {
      setOtherUserTyping(false);
      return;
    }
    // Check the active conversation's typing field
    const otherUid = activeConvo.participants?.find((p) => p !== currentUid);
    if (!otherUid) return;

    const typingTs = activeConvo[`typing_${otherUid}`];
    if (typingTs) {
      const tsMs = typingTs.toMillis ? typingTs.toMillis() : typingTs;
      const age = Date.now() - tsMs;
      if (age < 4000) {
        setOtherUserTyping(true);
        const timer = setTimeout(() => setOtherUserTyping(false), 4000 - age);
        return () => clearTimeout(timer);
      }
    }
    setOtherUserTyping(false);
  }, [activeConvo, currentUid]);

  // ── sendTypingIndicator — debounced, writes to convo doc ────────
  const sendTypingIndicator = useCallback(() => {
    if (!activeConvo?.id || !currentUid) return;
    // Debounce: only send once per 2 seconds
    if (typingTimeoutRef.current) return;
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);

    updateDoc(doc(db, "conversations", activeConvo.id), {
      [`typing_${currentUid}`]: Date.now(),
    }).catch(() => {});
  }, [activeConvo?.id, currentUid]);

  // ── openConversation — select a convo and immediately mark it read ─
  const openConversation = useCallback(
    (convo) => {
      setActiveConvo(convo);
      if (!convo || !currentUid) return;
      // Optimistically clear the unread dot so the UI feels instant
      if (convo.lastSenderId !== currentUid && !convo[`read_${currentUid}`]) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convo.id ? { ...c, [`read_${currentUid}`]: true } : c,
          ),
        );
        updateDoc(doc(db, "conversations", convo.id), {
          [`read_${currentUid}`]: true,
        }).catch(() => {});
      }
    },
    [currentUid],
  );

  // ── startConversation ─────────────────────────────────────────────
  const startConversation = useCallback(
    async (otherUser) => {
      if (!currentUser) return;
      if (firebaseUser?.isAnonymous) {
        toast.error("Please log in to start conversations");
        return;
      }

      const convoId = getConversationId(currentUser.uid, otherUser.uid);

      // Already in local state?
      const existing = conversations.find((c) => c.id === convoId);
      if (existing) {
        setActiveConvo(existing);
        setShowNewChat(false);
        setSearchQuery("");
        setSearchResults([]);
        onConversationStarted?.();
        return;
      }

      try {
        const convoRef = doc(db, "conversations", convoId);

        // Check Firestore
        const existingDoc = await getDoc(convoRef);
        if (existingDoc.exists()) {
          setActiveConvo({ id: convoId, ...existingDoc.data() });
          setShowNewChat(false);
          setSearchQuery("");
          setSearchResults([]);
          onConversationStarted?.();
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
        setSearchQuery("");
        setSearchResults([]);
        onConversationStarted?.();
      } catch (error) {
        toast.error(
          `Could not start conversation: ${error.message || "Unknown error"}`,
        );
      }
    },
    [currentUser, conversations, firebaseUser, onConversationStarted],
  );

  // ── handleSend ────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim() && !pendingGif) return;
      if (!activeConvo || !currentUser) return;
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
      const gif = pendingGif;
      setNewMessage("");
      setPendingGif(null);

      try {
        await addDoc(
          collection(db, "conversations", activeConvo.id, "messages"),
          {
            text,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            timestamp: serverTimestamp(),
            ...(gif && { gifUrl: gif.url }),
          },
        );
        await updateDoc(doc(db, "conversations", activeConvo.id), {
          lastMessage: gif && !text ? "🎬 GIF" : text.slice(0, 50),
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
      } catch (error) {
        toast.error(
          `Failed to send message: ${error.message || "Unknown error"}`,
        );
        setNewMessage(text);
        setPendingGif(gif);
      }
    },
    [newMessage, pendingGif, activeConvo, currentUser, firebaseUser],
  );

  // ── handleSearchUsers (debounced 300 ms) ─────────────────────────
  // Cache fetched users to avoid re-downloading entire collection on every keystroke
  const usersCacheRef = useRef({ data: null, fetchedAt: 0 });
  const searchDebounceRef = useRef(null);
  const handleSearchUsers = useCallback(
    (q) => {
      setSearchQuery(q);
      clearTimeout(searchDebounceRef.current);
      if (q.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const cache = usersCacheRef.current;
          const now = Date.now();
          // Re-fetch at most every 60 seconds, limited to 200 users
          if (!cache.data || now - cache.fetchedAt > 60000) {
            const snap = await getDocs(
              query(collection(db, "users"), limit(200)),
            );
            const users = [];
            snap.forEach((d) => users.push({ uid: d.id, ...d.data() }));
            cache.data = users;
            cache.fetchedAt = now;
          }
          const lower = q.toLowerCase();
          const results = cache.data.filter(
            (u) =>
              u.uid !== currentUser?.uid &&
              u.username?.toLowerCase().includes(lower),
          );
          setSearchResults(results.slice(0, 10));
        } catch {
          toast.error("Search failed");
        }
        setSearching(false);
      }, 300);
    },
    [currentUser],
  );

  // ── handleReaction — one reaction per user per message ───────────
  const handleReaction = useCallback(
    async (messageId, emoji) => {
      if (!activeConvo || !currentUser) return;
      const msgRef = doc(db, "conversations", activeConvo.id, "messages", messageId);
      const msg = messages.find((m) => m.id === messageId);
      const reactions = msg?.reactions ?? {};
      const alreadyOnThis = (reactions[emoji] ?? []).includes(currentUser.uid);

      // Build a single atomic update: remove user from every other emoji,
      // then toggle (add or remove) the selected one.
      const update = {};
      for (const [e, uids] of Object.entries(reactions)) {
        if (e !== emoji && uids.includes(currentUser.uid)) {
          update[`reactions.${e}`] = arrayRemove(currentUser.uid);
        }
      }
      update[`reactions.${emoji}`] = alreadyOnThis
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid);

      await updateDoc(msgRef, update).catch(() => {});
    },
    [activeConvo, currentUser, messages],
  );

  // ── handleEditMessage ─────────────────────────────────────────────
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
      } catch {
        toast.error("Failed to edit message");
      }
    },
    [activeConvo, currentUser],
  );

  // ── handleDeleteMessage ───────────────────────────────────────────
  const handleDeleteMessage = useCallback(
    async (messageId) => {
      if (!activeConvo || !currentUser) return;
      try {
        await deleteDoc(
          doc(db, "conversations", activeConvo.id, "messages", messageId),
        );
        toast.success("Message deleted");
      } catch {
        toast.error("Failed to delete message");
      }
    },
    [activeConvo, currentUser],
  );

  // ── deleteConversation — hard delete (messages + conversation doc) ─
  const deleteConversation = useCallback(
    async (conversationId) => {
      if (!currentUser || !conversationId) return;
      try {
        // Delete all messages in the subcollection first
        const messagesSnap = await getDocs(
          collection(db, "conversations", conversationId, "messages")
        );
        const batch = [];
        messagesSnap.forEach((d) => batch.push(deleteDoc(d.ref)));
        await Promise.all(batch);
        // Then delete the conversation document
        await deleteDoc(doc(db, "conversations", conversationId));
        if (activeConvo?.id === conversationId) setActiveConvo(null);
        toast.success("Conversation deleted");
      } catch {
        toast.error("Failed to delete conversation");
      }
    },
    [activeConvo, currentUser],
  );

  // ── getOtherUser ──────────────────────────────────────────────────
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

  // ── edit helpers ──────────────────────────────────────────────────
  const startEditing = useCallback((message) => {
    setEditingMessage(message.id);
    setEditText(message.text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
    setEditText("");
  }, []);

  // ── emoji ─────────────────────────────────────────────────────────
  const handleEmojiSelect = useCallback((emoji) => {
    setNewMessage((prev) => prev + emoji);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return {
    // state
    currentUser,
    conversations,
    activeConvo,
    setActiveConvo,
    messages,
    newMessage,
    setNewMessage,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    showNewChat,
    setShowNewChat,
    showEmojiPicker,
    setShowEmojiPicker,
    editingMessage,
    setEditingMessage,
    editText,
    setEditText,
    pendingGif,
    setPendingGif,
    // refs
    messagesEndRef,
    messagesContainerRef,
    inputRef,
    gifBtnRef,
    // actions
    openConversation,
    startConversation,
    handleSend,
    handleSearchUsers,
    handleReaction,
    handleEditMessage,
    handleDeleteMessage,
    deleteConversation,
    getOtherUser,
    startEditing,
    cancelEditing,
    handleEmojiSelect,
    sendTypingIndicator,
    // state
    otherUserTyping,
    onlineUsers,
    // formatTime (re-exported for convenience)
    formatTime,
  };
}
