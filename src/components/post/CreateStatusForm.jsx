import { useState } from "react";
import MentionInput from "../common/MentionInput";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../../utils/icons";
import "./AddPostModal.css";
import "./CreateStatusForm.css";

const BG_COLORS = [
  // Solids — black first (default)
  "#000000",
  "#1a1a2e",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#ffffff",
  // Gradients
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
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

const FONT_SIZES = [
  { value: "sm", label: "S", px: "0.95rem" },
  { value: "md", label: "M", px: "1.2rem" },
  { value: "lg", label: "L", px: "1.6rem" },
  { value: "xl", label: "XL", px: "2rem" },
  { value: "xxl", label: "XXL", px: "2.6rem" },
];

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "🔥", label: "Hyped" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😂", label: "Funny" },
  { emoji: "💡", label: "Inspired" },
  { emoji: "😤", label: "Angry" },
  { emoji: "🥳", label: "Celebrating" },
];

export default function CreateStatusForm({ onSubmit, onClose, onBack, initialData = null, onSave = null }) {
  const { userProfile, firebaseUser } = useAuth();
  const isEditMode = !!onSave;
  const [status, setStatus] = useState(initialData?.status || "");
  const [error, setError] = useState("");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#000000");
  const [textColor, setTextColor] = useState(initialData?.textColor || "#ffffff");
  const [customBgColor, setCustomBgColor] = useState("#ff6b6b");
  const [customTextColor, setCustomTextColor] = useState("#ffdd59");
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [duration, setDuration] = useState("never");
  const [fontSize, setFontSize] = useState(initialData?.fontSize || "md");
  const [textAlign, setTextAlign] = useState(initialData?.textAlign || "center");
  const [mood, setMood] = useState(initialData?.mood || null);
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
        fontSize,
        textAlign,
        mood,
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
      fontSize,
      textAlign,
      mood,
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
        {!isEditMode ? (
          <button type="button" onClick={onBack} className="btn-back btn-back--top">← Back</button>
        ) : <div />}
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
        <MentionInput
          value={status}
          onChange={setStatus}
          placeholder="What's on your mind?"
          maxLength={200}
          rows={3}
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
          <label
            className={`color-btn color-btn--picker${bgColor === customBgColor ? " active" : ""}`}
            title="Custom color"
            style={{ background: customBgColor, position: "relative", overflow: "hidden" }}
          >
            <input
              type="color"
              value={customBgColor}
              onChange={(e) => { setCustomBgColor(e.target.value); setBgColor(e.target.value); }}
              style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
            />
          </label>
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
          <label
            className={`color-btn color-btn--picker${textColor === customTextColor ? " active" : ""}`}
            title="Custom color"
            style={{ background: customTextColor, position: "relative", overflow: "hidden" }}
          >
            <input
              type="color"
              value={customTextColor}
              onChange={(e) => { setCustomTextColor(e.target.value); setTextColor(e.target.value); }}
              style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
            />
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Font Size</label>
        <div className="status-font-row">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`status-font-btn${fontSize === f.value ? " active" : ""}`}
              onClick={() => setFontSize(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Alignment</label>
        <div className="status-align-row">
          {[
            { value: "left", icon: "⬅" },
            { value: "center", icon: "↔" },
            { value: "right", icon: "➡" },
          ].map((a) => (
            <button
              key={a.value}
              type="button"
              className={`status-align-btn${textAlign === a.value ? " active" : ""}`}
              onClick={() => setTextAlign(a.value)}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Mood <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
        <div className="status-mood-row">
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              type="button"
              title={m.label}
              className={`status-mood-btn${mood?.emoji === m.emoji ? " active" : ""}`}
              onClick={() => setMood(mood?.emoji === m.emoji ? null : m)}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        {mood && <span className="status-mood-selected">Feeling {mood.emoji} {mood.label}</span>}
      </div>

      <div className="status-preview-section">
        <label className="status-preview-label">Preview</label>
        <div
          className="status-preview-box"
          style={{ background: bgColor, color: textColor, textAlign, fontSize: FONT_SIZES.find(f => f.value === fontSize)?.px }}
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
