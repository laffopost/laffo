import { useState } from "react";
import toast from "react-hot-toast";

export default function EditPollForm({ post, onSave, onCancel, isSubmitting }) {
  const [question, setQuestion] = useState(post.question || "");
  const [description, setDescription] = useState(post.description || "");
  const [options, setOptions] = useState(post.options || ["", ""]);
  const [bgColor, setBgColor] = useState(post.bgColor || "#8b5cf6");

  const addOption = () => {
    if (options.length >= 6) {
      toast.error("Maximum 6 options allowed");
      return;
    }
    setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      toast.error("Poll must have at least 2 options");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("Poll question is required");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error("Poll must have at least 2 valid options");
      return;
    }

    const updateData = {
      question: question.trim(),
      description: description.trim(),
      options: validOptions.map((opt) => opt.trim()),
      bgColor,
    };

    onSave(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <div className="edit-form-group">
        <label className="edit-form-label">Poll Question *</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your question..."
          className="edit-form-input"
          maxLength={200}
          required
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details about your poll..."
          className="edit-form-textarea"
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Poll Options *</label>
        <div className="edit-poll-options">
          {options.map((option, index) => (
            <div key={index} className="edit-poll-option">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="edit-form-input"
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="edit-poll-remove-btn"
                  title="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="edit-poll-add-btn"
            >
              + Add Option
            </button>
          )}
        </div>
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Background Color</label>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          className="edit-color-input"
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Preview</label>
        <div
          style={{
            backgroundColor: bgColor,
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
        >
          <div
            style={{ color: "#fff", fontWeight: "600", marginBottom: "12px" }}
          >
            {question || "Your poll question will appear here..."}
          </div>
          {description && (
            <div
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.9rem",
                marginBottom: "16px",
              }}
            >
              {description}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {options
              .filter((opt) => opt.trim())
              .map((option, index) => (
                <div
                  key={index}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                >
                  {option}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="edit-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="edit-form-btn edit-form-btn-cancel"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="edit-form-btn edit-form-btn-save"
          disabled={
            isSubmitting ||
            !question.trim() ||
            options.filter((opt) => opt.trim()).length < 2
          }
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
