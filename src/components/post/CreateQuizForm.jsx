import { useState } from "react";
import MentionInput from "../common/MentionInput";
import { useAuth } from "../../context/AuthContext";
import { AddIcon, RemoveIcon, CloseIcon } from "../../utils/icons";
import { ColorPicker } from "../common";
import { MOODS } from "../../utils/postConstants";
import "./AddPostModal.css";
import "./CreatePollForm.css";
import QuizRenderer from "./QuizRenderer";

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

const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "#10b981" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "hard", label: "Hard", color: "#ef4444" },
];

export default function CreateQuizForm({ onSubmit, onClose, onBack }) {
  const { userProfile, firebaseUser } = useAuth();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [bgColor, setBgColor] = useState("#000000");
  const [customBgColor, setCustomBgColor] = useState("#ff6b6b");
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [mood, setMood] = useState(null);

  const author = userProfile?.username || firebaseUser?.displayName || "Anon";
  const authorAvatar = userProfile?.avatar || null;

  const handleOptionChange = (i, value) => {
    setOptions((opts) => opts.map((opt, idx) => (idx === i ? value : opt)));
  };

  const addOption = () => {
    setOptions((opts) => [...opts, ""]);
  };

  const removeOption = (i) => {
    setOptions((opts) => {
      const next = opts.filter((_, idx) => idx !== i);
      if (correctIndex >= next.length) setCorrectIndex(next.length - 1);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      setError("Enter a question and at least 2 options.");
      return;
    }

    const finalAuthor = postAsAnonymous ? "Anonymous" : author;
    const finalAvatar = postAsAnonymous ? null : authorAvatar;

    onSubmit({
      type: "quiz",
      question: question.trim(),
      description: description.trim() || null,
      options: validOptions,
      correctIndex,
      explanation: explanation.trim() || null,
      bgColor,
      difficulty,
      voteCounts: validOptions.map(() => 0),
      votes: {},
      image: null,
      author: finalAuthor,
      authorAvatar: finalAvatar,
      reactions: { "🔥": 0, "😂": 0, "🙌": 0 },
      isAnonymousPost: postAsAnonymous,
      mood: mood || null,
    });
    onClose();
  };

  const validOptions = options.filter((o) => o.trim());
  const previewOptions = validOptions.length >= 2 ? validOptions : ["Option A", "Option B", "Option C", "Option D"];
  const previewCorrect = validOptions.length >= 2 ? correctIndex : 0;

  return (
    <form className="add-image-form" onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <button type="button" onClick={onBack} className="btn-back btn-back--top">← Back</button>
        <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>Create a Quiz</h3>
        <button type="button" onClick={onClose} className="close-btn" title="Close">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="form-group">
        <label>Question *</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What's your quiz question?"
          maxLength={120}
          required
        />
      </div>

      <div className="form-group">
        <label>Caption</label>
        <MentionInput
          value={description}
          onChange={setDescription}
          placeholder="Add context to your quiz..."
          maxLength={200}
          rows={2}
        />
        <span className="char-counter">{description.length}/200</span>
      </div>

      <div className="form-group">
        <label>Options * (mark the correct one)</label>
        <div className="poll-options-list">
          {options.map((opt, i) => (
            <div key={i} className="poll-option-row" style={{ alignItems: "center" }}>
              <input
                type="radio"
                name="correctAnswer"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                title="Mark as correct"
                style={{ accentColor: "#10b981", cursor: "pointer", flexShrink: 0 }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                maxLength={80}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
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
            <AddIcon size={16} style={{ marginRight: "0.5rem" }} />
            Add Option
          </button>
        )}
        <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "4px" }}>
          🟢 Green radio = correct answer
        </p>
      </div>

      <div className="form-group">
        <label>Explanation <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain why the correct answer is correct..."
          maxLength={300}
          rows={2}
        />
        <span className="char-counter">{explanation.length}/300</span>
      </div>

      <div className="form-group">
        <label>Difficulty</label>
        <div className="quiz-difficulty-row">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`quiz-difficulty-btn${difficulty === d.value ? " active" : ""}`}
              style={{ "--diff-color": d.color }}
              onClick={() => setDifficulty(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Mood <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
        <div className="status-mood-row">
          {MOODS.map((m) => (
            <button key={m.emoji} type="button" title={m.label}
              className={`status-mood-btn${mood?.emoji === m.emoji ? " active" : ""}`}
              onClick={() => setMood(mood?.emoji === m.emoji ? null : m)}>
              {m.emoji}
            </button>
          ))}
        </div>
        {mood && <span className="status-mood-selected">Feeling {mood.emoji} {mood.label}</span>}
      </div>

      <div className="form-group">
        <label>Background Color</label>
        <ColorPicker colors={BG_COLORS} value={bgColor} onChange={setBgColor} customColor={customBgColor} onCustomChange={setCustomBgColor} />
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

      <div className="status-preview-section">
        <label className="status-preview-label">Preview</label>
        <QuizRenderer
          question={question || "Your quiz question..."}
          options={previewOptions}
          correctIndex={previewCorrect}
          bgColor={bgColor}
          compact={false}
          className="quiz-form-preview"
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button type="submit" className="btn-submit">
          Create Quiz 🧠
        </button>
      </div>
    </form>
  );
}
