import { useState, useEffect } from "react";
import EditImageForm from "./EditImageForm";
import EditStatusForm from "./EditStatusForm";
import EditPollForm from "./EditPollForm";
import EditMediaForm from "./EditMediaForm";
import "./EditPostModal.css";

export default function EditPostModal({ post, onClose, onSave }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async (updateData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(post.id, updateData);
      onClose();
    } catch (error) {
      console.error("Failed to edit post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditForm = () => {
    switch (post.type) {
      case "status":
        return (
          <EditStatusForm
            post={post}
            onSave={handleSave}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        );
      case "poll":
        return (
          <EditPollForm
            post={post}
            onSave={handleSave}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        );
      case "media":
        return (
          <EditMediaForm
            post={post}
            onSave={handleSave}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return (
          <EditImageForm
            post={post}
            onSave={handleSave}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        );
    }
  };

  return (
    <div className="edit-post-modal-overlay" onClick={onClose}>
      <div className="edit-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-post-modal-header">
          <h2>✏️ Edit Post</h2>
          <button className="edit-post-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="edit-post-modal-body">{renderEditForm()}</div>
      </div>
    </div>
  );
}
