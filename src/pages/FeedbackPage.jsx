import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
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

export default function FeedbackPage() {
  const { firebaseUser, userProfile } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const uid = firebaseUser?.uid;
  const isAnon = firebaseUser?.isAnonymous;

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("voteCount", "desc"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!uid || isAnon) { toast.error("Please log in to submit feedback"); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
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
      });
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

  const toggleVote = async (item) => {
    if (!uid || isAnon) { toast.error("Please log in to vote"); return; }
    const ref = doc(db, "feedback", item.id);
    const hasVoted = item.votes?.includes(uid);
    try {
      await updateDoc(ref, {
        votes: hasVoted ? arrayRemove(uid) : arrayUnion(uid),
        voteCount: (item.voteCount || 0) + (hasVoted ? -1 : 1),
      });
    } catch {
      toast.error("Failed to vote");
    }
  };

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
          {filtered.map((item) => {
            const hasVoted = item.votes?.includes(uid);
            const cat = CATEGORIES.find((c) => c.value === item.category);
            const status = STATUS_LABELS[item.status] || STATUS_LABELS.open;

            return (
              <div key={item.id} className="feedback-card">
                <button
                  className={`feedback-vote-btn${hasVoted ? " voted" : ""}`}
                  onClick={() => toggleVote(item)}
                  title={hasVoted ? "Remove vote" : "Upvote"}
                >
                  <span className="feedback-vote-arrow">▲</span>
                  <span className="feedback-vote-count">{item.voteCount || 0}</span>
                </button>

                <div className="feedback-card-body">
                  <div className="feedback-card-top">
                    <span className="feedback-card-cat">
                      {cat?.emoji} {cat?.label}
                    </span>
                    <span
                      className="feedback-card-status"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="feedback-card-title">{item.title}</p>
                  {item.description && (
                    <p className="feedback-card-desc">{item.description}</p>
                  )}
                  <div className="feedback-card-meta">
                    {item.avatar && (
                      <img src={item.avatar} alt={item.username} className="feedback-meta-avatar" />
                    )}
                    <span className="feedback-meta-author">@{item.username}</span>
                    <span className="feedback-meta-dot">·</span>
                    <span className="feedback-meta-time">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
