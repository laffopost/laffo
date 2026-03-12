import { useState } from "react";
import toast from "react-hot-toast";

export default function EditStatusForm({
  post,
  onSave,
  onCancel,
  isSubmitting,
}) {
  const [status, setStatus] = useState(post.status || "");
  const [bgColor, setBgColor] = useState(post.bgColor || "#8b5cf6");
  const [textColor, setTextColor] = useState(post.textColor || "#ffffff");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!status.trim()) {
      toast.error("Status content is required");
      return;
    }

    const updateData = {
      status: status.trim(),
      bgColor,
      textColor,
      title:
        status.trim().substring(0, 50) +
        (status.trim().length > 50 ? "..." : ""), // Update title from status
    };

    onSave(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <div className="edit-form-group">
        <label className="edit-form-label">Status Content *</label>
        <textarea
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="What's on your mind?"
          className="edit-form-textarea"
          maxLength={280}
          rows={4}
          required
        />
        <small
          style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem" }}
        >
          {status.length}/280 characters
        </small>
      </div>

      <div className="edit-color-group">
        <div className="edit-color-picker">
          <label className="edit-form-label">Background Color</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="edit-color-input"
          />
        </div>

        <div className="edit-color-picker">
          <label className="edit-form-label">Text Color</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="edit-color-input"
          />
        </div>
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Preview</label>
        <div
          style={{
            backgroundColor: bgColor,
            color: textColor,
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            fontWeight: "600",
            lineHeight: "1.4",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
        >
          {status || "Your status will appear here..."}
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
          disabled={isSubmitting || !status.trim()}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
