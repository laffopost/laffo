import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../../utils/icons";
import CountdownRenderer from "./CountdownRenderer";
import "./AddPostModal.css";

const EMOJIS = ["🎉", "🚀", "⏰", "🎂", "🏆", "❤️", "🔥", "🎯", "📅", "💎", "🌟", "⚡"];

const BG_COLORS = [
  "#1a1a2e",
  "#23234a",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
];

const DURATIONS = [
  { value: "1d", label: "1 Day" },
  { value: "2d", label: "2 Days" },
  { value: "7d", label: "1 Week" },
  { value: "never", label: "No Limit" },
];
const DURATION_MS = {
  "1d": 86400000,
  "2d": 172800000,
  "7d": 604800000,
};

function getMinDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now.toISOString().slice(0, 16);
}

export default function CreateCountdownForm({ onSubmit, onClose, onBack }) {
  const { userProfile, firebaseUser } = useAuth();
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [duration, setDuration] = useState("never");
  const [error, setError] = useState("");

  const author = userProfile?.username || firebaseUser?.displayName || "Anon";
  const authorAvatar = userProfile?.avatar || null;

  const previewTarget = targetDate
    ? new Date(targetDate).getTime()
    : Date.now() + 86400000 * 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetDate) {
      setError("Please pick a date and time.");
      return;
    }
    const targetMs = new Date(targetDate).getTime();
    if (targetMs <= Date.now()) {
      setError("Target date must be in the future.");
      return;
    }

    const endsAt = DURATION_MS[duration]
      ? Date.now() + DURATION_MS[duration]
      : null;

    onSubmit({
      type: "countdown",
      targetDate: targetMs,
      description: description.trim() || "",
      emoji,
      bgColor,
      author: postAsAnonymous ? "Anonymous" : author,
      authorAvatar: postAsAnonymous ? null : authorAvatar,
      reactions: { "🔥": 0, "😂": 0, "🙌": 0, "🚀": 0 },
      image: null,
      endsAt,
      isAnonymousPost: postAsAnonymous,
    });
    onClose();
  };

  return (
    <form className="add-image-form" onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>
          Create Event
        </h3>
        <button type="button" onClick={onClose} className="close-btn" title="Close">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="form-group">
        <label>Target Date & Time *</label>
        <input
          type="datetime-local"
          value={targetDate}
          onChange={(e) => { setTargetDate(e.target.value); setError(""); }}
          min={getMinDateTime()}
          required
          style={{ colorScheme: "dark" }}
        />
      </div>

      <div className="form-group">
        <label>Caption</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you counting down to?"
          maxLength={150}
          rows={2}
        />
        <span className="char-counter">{description.length}/150</span>
      </div>

      <div className="form-group">
        <label>Icon</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              style={{
                fontSize: "1.3rem",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: emoji === e ? "2px solid #8b5cf6" : "1.5px solid rgba(255,255,255,0.1)",
                background: emoji === e ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Background Color</label>
        <div className="color-picker-row">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-btn${bgColor === c ? " active" : ""}`}
              style={{ background: c }}
              onClick={() => setBgColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="status-preview-section">
        <label className="status-preview-label">Preview</label>
        <CountdownRenderer
          targetDate={previewTarget}
          emoji={emoji}
          bgColor={bgColor}
          compact={false}
        />
      </div>

      <div className="form-group">
        <label>Posting as</label>
        <input
          type="text"
          value={postAsAnonymous ? "Anonymous" : author}
          disabled
          className="author-display-input"
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={postAsAnonymous}
            onChange={() => setPostAsAnonymous((v) => !v)}
          />
          <span>Post as Anonymous</span>
        </label>
      </div>

      <div className="form-group">
        <label>Post Duration</label>
        <div className="poll-duration-row">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`poll-duration-btn${duration === d.value ? " active" : ""}`}
              onClick={() => setDuration(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button type="submit" className="btn-submit">
          Create Event ⏳
        </button>
      </div>
    </form>
  );
}
