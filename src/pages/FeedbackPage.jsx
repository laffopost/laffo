import { useState, useEffect, useCallback, memo } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { usePosts } from "../context/PostContext";
import { DeleteIcon, ChatIcon, ShareIcon } from "../utils/icons";
import AddPostModal from "../components/post/AddPostModal";
import toast from "react-hot-toast";
import "./FeedbackPage.css";

const CATEGORIES = [
  { value: "feature", label: "Feature Request", emoji: "✨" },
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "idea", label: "Idea", emoji: "💡" },
  { value: "improvement", label: "Improvement", emoji: "🔧" },
];

const STATUS_LABELS = {
  open: { label: "Open", color: "#a78bfa" },
  planned: { label: "Planned", color: "#38bdf8" },
  done: { label: "Done", color: "#34d399" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const ms = ts.seconds ? ts.seconds * 1000 : ts;
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Feedback card (needs own state for comments toggle) ───────────
const FeedbackCardItem = memo(function FeedbackCardItem({ item, uid, isAnon, userProfile, firebaseUser, onDelete, onToggleVote, onShare }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const hasVoted = item.votes?.includes(uid);
  const cat = CATEGORIES.find((c) => c.value === item.category);
  const isOwner = uid === item.userId;

  return (
    <div className="feedback-card">
      <button
        className={`feedback-vote-btn${hasVoted ? " voted" : ""}`}
        onClick={() => onToggleVote(item)}
        title={hasVoted ? "Remove vote" : "Upvote"}
      >
        <span className="feedback-vote-arrow">▲</span>
        <span className="feedback-vote-count">{item.voteCount || 0}</span>
      </button>

      <div className="feedback-card-body">
        <div className="feedback-card-top">
          <span className="feedback-card-cat">{cat?.emoji} {cat?.label}</span>
          {isOwner && (
            <button className="feedback-delete-btn" onClick={() => onDelete(item)} title="Delete">
              <DeleteIcon size={14} />
            </button>
          )}
        </div>
        <p className="feedback-card-title">{item.title}</p>
        {item.description && <p className="feedback-card-desc">{item.description}</p>}
        <div className="feedback-card-meta">
          {item.avatar && <img src={item.avatar} alt={item.username} className="feedback-meta-avatar" />}
          <span className="feedback-meta-author">@{item.username}</span>
          <span className="feedback-meta-dot">·</span>
          <span className="feedback-meta-time">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="feedback-card-footer">
          <button
            className={`feedback-footer-btn${commentsOpen ? " active" : ""}`}
            onClick={() => setCommentsOpen((v) => !v)}
          >
            <ChatIcon size={13} />
            {commentCount > 0 && <span className="feedback-footer-count">{commentCount}</span>}
          </button>
          <button className="feedback-footer-btn" onClick={() => onShare(item)} title="Share as post">
            <ShareIcon size={13} />
          </button>
        </div>
        {commentsOpen && (
          <FeedbackComments
            feedbackId={item.id}
            uid={uid}
            isAnon={isAnon}
            userProfile={userProfile}
            firebaseUser={firebaseUser}
            onCountChange={setCommentCount}
          />
        )}
      </div>
    </div>
  );
});

// ── Comments sub-component ────────────────────────────────────────
function FeedbackComments({ feedbackId, uid, isAnon, userProfile, firebaseUser, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "feedback", feedbackId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      onCountChange?.(snap.docs.length);
    });
    return () => unsub();
  }, [feedbackId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !uid || isAnon) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback", feedbackId, "comments"), {
        text: text.trim().slice(0, 500),
        userId: uid,
        username: userProfile?.username || firebaseUser?.displayName || "User",
        avatar: userProfile?.avatar || null,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (comment.userId !== uid) return;
    try {
      await deleteDoc(doc(db, "feedback", feedbackId, "comments", comment.id));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="feedback-comments">
      {comments.map((c) => (
        <div key={c.id} className="feedback-comment">
          {c.avatar && <img src={c.avatar} alt={c.username} className="feedback-comment-avatar" />}
          <div className="feedback-comment-body">
            <span className="feedback-comment-author">@{c.username}</span>
            <span className="feedback-comment-text">{c.text}</span>
          </div>
          {c.userId === uid && (
            <button className="feedback-comment-delete" onClick={() => handleDeleteComment(c)} title="Delete">
              <DeleteIcon size={12} />
            </button>
          )}
        </div>
      ))}
      {uid && !isAnon && (
        <form className="feedback-comment-form" onSubmit={handleSend}>
          <input
            className="feedback-comment-input"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <button className="feedback-comment-send" type="submit" disabled={sending || !text.trim()}>
            ↵
          </button>
        </form>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { firebaseUser, userProfile } = useAuth();
  const { addPost } = usePosts();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [shareItem, setShareItem] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const uid = firebaseUser?.uid;
  const isAnon = firebaseUser?.isAnonymous;

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      setItems(docs);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!uid || isAnon) { toast.error("Please log in to submit feedback"); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      const data = {
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 500),
        category,
        userId: uid,
        username: userProfile?.username || firebaseUser.displayName || "User",
        avatar: userProfile?.avatar || null,
        votes: [],
        voteCount: 0,
        status: "open",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "feedback"), data);
      // Optimistic: prepend to local list immediately
      setItems((prev) => [{ id: ref.id, ...data, createdAt: { seconds: Date.now() / 1000 } }, ...prev]);
      setTitle("");
      setDescription("");
      setCategory("feature");
      setFormOpen(false);
      toast.success("Feedback submitted!");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = useCallback(async (item) => {
    if (!uid || isAnon) { toast.error("Please log in to vote"); return; }
    const hasVoted = item.votes?.includes(uid);
    const newVotes = hasVoted
      ? (item.votes || []).filter((v) => v !== uid)
      : [...(item.votes || []), uid];
    const newCount = (item.voteCount || 0) + (hasVoted ? -1 : 1);
    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, votes: newVotes, voteCount: newCount } : i));
    try {
      await updateDoc(doc(db, "feedback", item.id), {
        votes: hasVoted ? arrayRemove(uid) : arrayUnion(uid),
        voteCount: newCount,
      });
    } catch {
      toast.error("Failed to vote");
      loadFeedback(); // revert on error
    }
  }, [uid, isAnon, loadFeedback]);

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm("Delete this feedback?")) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id)); // optimistic remove
    try {
      await deleteDoc(doc(db, "feedback", item.id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
      loadFeedback(); // revert on error
    }
  }, [loadFeedback]);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <div className="feedback-header-text">
          <h1 className="feedback-title">💬 Feedback & Ideas</h1>
          <p className="feedback-subtitle">
            Help shape the future of Laffo. Upvote what matters to you.
          </p>
        </div>
        {uid && !isAnon && (
          <button className="feedback-new-btn" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "✕ Cancel" : "+ Submit Feedback"}
          </button>
        )}
      </div>

      {formOpen && (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-form-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`feedback-cat-btn${category === c.value ? " active" : ""}`}
                onClick={() => setCategory(c.value)}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <input
            className="feedback-input"
            placeholder="Short title (required)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
          <textarea
            className="feedback-textarea"
            placeholder="Describe in detail (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <button className="feedback-submit-btn" type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}

      <div className="feedback-filters">
        <button
          className={`feedback-filter-btn${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`feedback-filter-btn${filter === c.value ? " active" : ""}`}
            onClick={() => setFilter(c.value)}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="feedback-loading">Loading feedback...</div>
      ) : filtered.length === 0 ? (
        <div className="feedback-empty">No feedback yet. Be the first!</div>
      ) : (
        <div className="feedback-list">
          {filtered.map((item) => (
            <FeedbackCardItem
              key={item.id}
              item={item}
              uid={uid}
              isAnon={isAnon}
              userProfile={userProfile}
              firebaseUser={firebaseUser}
              onDelete={handleDelete}
              onToggleVote={toggleVote}
              onShare={(i) => {
                const cat = CATEGORIES.find((c) => c.value === i.category);
                setShareItem({
                  status: `${cat?.emoji || ""} ${i.title}${i.description ? `\n\n${i.description}` : ""}\n\n#Laffo #Feedback`,
                  bgColor: "#1e1e2e",
                  textColor: "#ffffff",
                });
              }}
            />
          ))}
        </div>
      )}

      {shareItem && (
        <AddPostModal
          onClose={() => setShareItem(null)}
          onSubmit={addPost}
          shareType="status"
          shareInitialData={shareItem}
        />
      )}
    </div>
  );
}
