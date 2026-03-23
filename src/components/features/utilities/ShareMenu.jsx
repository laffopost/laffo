import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/AuthContext";
import { LinkIcon, SendIcon, ChatIcon } from "../../../utils/icons";
import "./ShareMenu.css";

function getConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// Minimal brand SVGs (lucide has no brand icons)
const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

function ShareDmRow({ user, onSend, sending }) {
  return (
    <button className="share-dm-result" onClick={() => onSend(user)} disabled={sending}>
      {user.avatar
        ? <img src={user.avatar} alt={user.username} className="share-dm-avatar" />
        : <div className="share-dm-avatar share-dm-avatar--placeholder">{user.username?.[0]?.toUpperCase() ?? "?"}</div>
      }
      <span>@{user.username}</span>
    </button>
  );
}

export default function ShareMenu({ sharePost, onClose }) {
  const { firebaseUser, userProfile } = useAuth();
  const [dmMode, setDmMode] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [dmResults, setDmResults] = useState([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!dmMode) return;
    inputRef.current?.focus();
    if (!firebaseUser?.uid || firebaseUser.isAnonymous) return;
    // Load existing DM contacts sorted by last message
    const fetchContacts = async () => {
      try {
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", firebaseUser.uid),
          orderBy("lastMessageAt", "desc"),
          limit(8),
        );
        const snap = await getDocs(q);
        const contacts = snap.docs.map((d) => {
          const data = d.data();
          const otherUid = data.participants.find((p) => p !== firebaseUser.uid);
          return {
            uid: otherUid,
            username: data.participantNames?.[otherUid] || "User",
            avatar: data.participantAvatars?.[otherUid] || null,
          };
        }).filter((c) => c.uid);
        setRecentContacts(contacts);
      } catch { setRecentContacts([]); }
    };
    fetchContacts();
  }, [dmMode, firebaseUser?.uid]);

  const searchUsers = useCallback(async (term) => {
    if (!term.trim()) { setDmResults([]); return; }
    setDmLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("username", ">=", term),
        where("username", "<=", term + "\uf8ff"),
        orderBy("username"),
        limit(6),
      );
      const snap = await getDocs(q);
      setDmResults(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((u) => u.uid !== firebaseUser?.uid));
    } catch { setDmResults([]); }
    finally { setDmLoading(false); }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(dmSearch), 250);
    return () => clearTimeout(t);
  }, [dmSearch, searchUsers]);

  const sendViaDM = async (recipient) => {
    if (!firebaseUser || firebaseUser.isAnonymous || sending) return;
    setSending(true);
    try {
      const myName = userProfile?.username || firebaseUser.displayName || "User";
      const convoId = getConversationId(firebaseUser.uid, recipient.uid);
      const convoRef = doc(db, "conversations", convoId);
      const postUrl = `${window.location.origin}/image/${sharePost.id}`;
      const existing = await getDoc(convoRef);
      if (!existing.exists()) {
        await setDoc(convoRef, {
          participants: [firebaseUser.uid, recipient.uid],
          participantNames: { [firebaseUser.uid]: myName, [recipient.uid]: recipient.username || "User" },
          participantAvatars: { [firebaseUser.uid]: userProfile?.avatar || null, [recipient.uid]: recipient.avatar || null },
          lastMessage: postUrl.slice(0, 50),
          lastMessageAt: serverTimestamp(),
          lastSenderId: firebaseUser.uid,
          [`read_${firebaseUser.uid}`]: true,
          [`read_${recipient.uid}`]: false,
          createdAt: serverTimestamp(),
        });
      }
      await addDoc(collection(db, "conversations", convoId, "messages"), {
        text: postUrl, senderId: firebaseUser.uid, senderName: myName, timestamp: serverTimestamp(),
      });
      await updateDoc(convoRef, {
        lastMessage: postUrl.slice(0, 50), lastMessageAt: serverTimestamp(),
        lastSenderId: firebaseUser.uid,
        [`read_${firebaseUser.uid}`]: true, [`read_${recipient.uid}`]: false,
      });
      toast.success(`Sent to @${recipient.username}`);
      onClose();
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  const shareToSocial = (platform) => {
    const text = `Check out this post on LaughCoin!`;
    const url = `${window.location.origin}/image/${sharePost.id}`;
    const links = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      discord: `https://discord.com/channels/@me?message=${encodeURIComponent(`${text} ${url}`)}`,
      reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    };
    if (links[platform]) window.open(links[platform], "_blank");
    onClose();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/image/${sharePost.id}`);
    toast.success("Link copied!");
    onClose();
  };

  if (!sharePost) return null;

  return (
    <div className="gallery-share-menu-backdrop" onClick={onClose}>
      <div className="gallery-share-menu" onClick={(e) => e.stopPropagation()}>
        <p className="share-menu-title">Share post</p>

        {dmMode ? (
          <>
            <button className="share-back-btn" onClick={() => { setDmMode(false); setDmSearch(""); setDmResults([]); }}>
              ← Back
            </button>
            <input
              ref={inputRef}
              className="share-dm-input"
              placeholder="Search username..."
              value={dmSearch}
              onChange={(e) => setDmSearch(e.target.value)}
            />
            {dmLoading && <p className="share-dm-status">Searching...</p>}
            {!dmLoading && dmSearch.trim() && dmResults.length === 0 && (
              <p className="share-dm-status">No users found</p>
            )}

            {/* Search results */}
            {dmSearch.trim()
              ? dmResults.map((user) => (
                  <ShareDmRow key={user.uid} user={user} onSend={sendViaDM} sending={sending} />
                ))
              : <>
                  {recentContacts.length > 0 && (
                    <p className="share-dm-section-label">Recent</p>
                  )}
                  {recentContacts.map((user) => (
                    <ShareDmRow key={user.uid} user={user} onSend={sendViaDM} sending={sending} />
                  ))}
                </>
            }
          </>
        ) : (
          <>
            {firebaseUser && !firebaseUser.isAnonymous && (
              <button className="share-option share-option--dm" onClick={() => setDmMode(true)}>
                <span className="share-option-icon share-option-icon--purple"><ChatIcon size={15} /></span>
                Send via DM
              </button>
            )}

            <div className="share-divider" />

            <button onClick={() => shareToSocial("twitter")} className="share-option">
              <span className="share-option-icon share-option-icon--x"><XIcon /></span>
              Twitter / X
            </button>
            <button onClick={() => shareToSocial("telegram")} className="share-option">
              <span className="share-option-icon share-option-icon--telegram"><TelegramIcon /></span>
              Telegram
            </button>
            <button onClick={() => shareToSocial("discord")} className="share-option">
              <span className="share-option-icon share-option-icon--discord"><DiscordIcon /></span>
              Discord
            </button>
            <button onClick={() => shareToSocial("reddit")} className="share-option">
              <span className="share-option-icon share-option-icon--reddit"><RedditIcon /></span>
              Reddit
            </button>

            <div className="share-divider" />

            <button onClick={copyLink} className="share-option">
              <span className="share-option-icon"><LinkIcon size={15} /></span>
              Copy Link
            </button>
            <button onClick={onClose} className="share-option share-option--close">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
