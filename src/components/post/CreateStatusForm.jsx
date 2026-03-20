import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../../utils/icons";
import "./AddPostModal.css";
import "./CreateStatusForm.css";

const BG_COLORS = [
  "#ffffff",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#000000",
];
const TEXT_COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const DURATIONS = [
  { value: "5m", label: "5 Min" },
  { value: "15m", label: "15 Min" },
  { value: "30m", label: "30 Min" },
  { value: "1h", label: "1 Hour" },
  { value: "2h", label: "2 Hours" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "2d", label: "2 Days" },
  { value: "7d", label: "1 Week" },
  { value: "never", label: "No Limit" },
];
const DURATION_MS = {
  "5m": 300000,
  "15m": 900000,
  "30m": 1800000,
  "1h": 3600000,
  "2h": 7200000,
  "4h": 14400000,
  "1d": 86400000,
  "2d": 172800000,
  "7d": 604800000,
};

export default function CreateStatusForm({ onSubmit, onClose, onBack, initialData = null, onSave = null }) {
  const { userProfile, firebaseUser } = useAuth();
  const isEditMode = !!onSave;
  const [status, setStatus] = useState(initialData?.status || "");
  const [error, setError] = useState("");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#ffffff");
  const [textColor, setTextColor] = useState(initialData?.textColor || "#000000");
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [duration, setDuration] = useState("never");
  const [author] = useState(
    userProfile?.username || firebaseUser?.displayName || "Anon",
  );
  const [authorAvatar] = useState(userProfile?.avatar || null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!status.trim()) {
      setError("Status cannot be empty.");
      return;
    }

    if (isEditMode) {
      onSave({
        status: status.trim(),
        bgColor,
        textColor,
      });
      onClose();
      return;
    }

    const finalAuthor = postAsAnonymous ? "Anonymous" : author;
    const finalAvatar = postAsAnonymous ? null : authorAvatar;
    const endsAt = DURATION_MS[duration]
      ? Date.now() + DURATION_MS[duration]
      : null;

    onSubmit({
      type: "status",
      status: status.trim(),
      bgColor,
      textColor,
      author: finalAuthor,
      authorAvatar: finalAvatar,
      reactions: { "🔥": 0, "😂": 0, "🙌": 0 },
      image: null,
      endsAt,
      isAnonymousPost: postAsAnonymous,
    });
    onClose();
  };

  return (
    <form className="add-image-form" data-edit-mode={String(isEditMode)} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
          {isEditMode ? "Edit Status" : "Post a Status"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="close-btn"
          title="Close"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="form-group">
        <label>Status *</label>
        <textarea
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={200}
          rows={3}
          required
        />
        <span className="char-counter">{status.length}/200</span>
      </div>

      {!isEditMode && (
        <div className="form-group">
          <label htmlFor="author">Posting as</label>
          <input
            type="text"
            id="author"
            value={postAsAnonymous ? "Anonymous" : author}
            disabled
            className="author-display-input"
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={postAsAnonymous}
              onChange={() => {
                setPostAsAnonymous((v) => {
                  if (!v && duration === "never") setDuration("2d");
                  return !v;
                });
              }}
            />
            <span>Post as Anonymous</span>
          </label>
        </div>
      )}

      <div className="form-group">
        <label>Background Color</label>
        <div className="color-picker-row">
          {BG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-btn${bgColor === color ? " active" : ""}`}
              style={{ background: color }}
              onClick={() => setBgColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Text Color</label>
        <div className="color-picker-row">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-btn${textColor === color ? " active" : ""}`}
              style={{ background: color }}
              onClick={() => setTextColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="status-preview-section">
        <label className="status-preview-label">Preview</label>
        <div
          className="status-preview-box"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <span className="status-preview-text">
            {status || "What's on your mind?"}
          </span>
        </div>
      </div>

      {!isEditMode && (
        <div className="form-group">
          <label>Post Duration</label>
          {postAsAnonymous && <span className="anon-duration-hint">Anonymous posts require a duration</span>}
          <div className="poll-duration-row">
            {DURATIONS.filter((d) => !postAsAnonymous || d.value !== "never").map((d) => (
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
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button type="submit" className="btn-submit">
          {isEditMode ? "Save Changes ✓" : "Post Status ✨"}
        </button>
      </div>
    </form>
  );
}
