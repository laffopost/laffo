import { useState } from "react";
import MentionInput from "../common/MentionInput";
import { useAuth } from "../../context/AuthContext";
import { AddIcon, RemoveIcon, CloseIcon } from "../../utils/icons";
import "./AddPostModal.css";
import "./CreatePollForm.css";
import PollRenderer from "./PollRenderer";

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

export default function CreatePollForm({ onSubmit, onClose, onBack, initialData = null, onSave = null }) {
  const { userProfile, firebaseUser } = useAuth();
  const isEditMode = !!onSave;
  const [question, setQuestion] = useState(initialData?.question || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [options, setOptions] = useState(initialData?.options?.length ? initialData.options : ["", ""]);
  const [error, setError] = useState("");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#000000");
  const [customBgColor, setCustomBgColor] = useState("#ff6b6b");
  const [duration, setDuration] = useState("7d");
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [multiVote, setMultiVote] = useState(false);
  const [author] = useState(
    userProfile?.username || firebaseUser?.displayName || "Anon",
  );
  const [authorAvatar] = useState(userProfile?.avatar || null);

  const handleOptionChange = (i, value) => {
    setOptions((opts) => opts.map((opt, idx) => (idx === i ? value : opt)));
  };

  const addOption = () => {
    setOptions((opts) => [...opts, ""]);
  };

  const removeOption = (i) => {
    setOptions((opts) => opts.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      setError("Enter a question and at least 2 options.");
      return;
    }

    if (isEditMode) {
      onSave({
        question: question.trim(),
        description: description.trim() || null,
        options: validOptions,
        bgColor,
        multiVote,
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
      type: "poll",
      question: question.trim(),
      description: description.trim() || null,
      options: validOptions,
      bgColor,
      multiVote,
      endsAt,
      voteCounts: validOptions.map(() => 0),
      votes: {},
      image: null,
      author: finalAuthor,
      authorAvatar: finalAvatar,
      reactions: { "🔥": 0, "😂": 0, "🙌": 0 },
      isAnonymousPost: postAsAnonymous,
    });
    onClose();
  };

  return (
    <form className="add-image-form" data-edit-mode={String(isEditMode)} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        {!isEditMode ? (
          <button type="button" onClick={onBack} className="btn-back btn-back--top">← Back</button>
        ) : <div />}
        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
          {isEditMode ? "Edit Poll" : "Create a Poll"}
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
        <label>Question *</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want to ask?"
          maxLength={100}
          required
        />
      </div>

      <div className="form-group">
        <label>Caption</label>
        <MentionInput
          value={description}
          onChange={setDescription}
          placeholder="Add more context to your poll..."
          maxLength={200}
          rows={2}
        />
        <span className="char-counter">{description.length}/200</span>
      </div>

      {!isEditMode && (
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
        <label>Options * (minimum 2)</label>
        <div className="poll-options-list">
          {options.map((opt, i) => (
            <div key={i} className="poll-option-row">
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                maxLength={60}
                required
                placeholder={`Option ${i + 1}`}
                className="poll-option-input-field"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="remove-option-btn"
                  title="Remove option"
                >
                  <RemoveIcon size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button type="button" onClick={addOption} className="add-option-btn">
            <AddIcon size={16} style={{ marginRight: '0.5rem' }} />
            Add Option
          </button>
        )}
      </div>

      <div className="form-group">
        <label className="checkbox-label" style={{ marginTop: '4px' }}>
          <input
            type="checkbox"
            checked={multiVote}
            onChange={() => setMultiVote(v => !v)}
          />
          <span>Allow multiple votes per user</span>
        </label>
      </div>

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

      {!isEditMode && (
        <div className="form-group">
          <label>Poll Duration</label>
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

      <div className="status-preview-section">
        <label className="status-preview-label">Preview</label>
        <PollRenderer
          question={question || "Your poll question..."}
          description={description || null}
          options={
            options.filter((o) => o.trim()).length > 0
              ? options.filter((o) => o.trim())
              : ["Option 1", "Option 2"]
          }
          bgColor={bgColor}
          compact={false}
          className="poll-form-preview"
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button type="submit" className="btn-submit">
          {isEditMode ? "Save Changes ✓" : "Create Poll 📊"}
        </button>
      </div>
    </form>
  );
}
