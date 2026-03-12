import { useEffect } from "react";
import "./ProfileImageModal.css";

export default function ProfileImageModal({
  isOpen,
  imageUrl,
  displayName,
  onClose,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="profile-image-modal-overlay" onClick={onClose}>
      <div
        className="profile-image-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="profile-image-modal-close"
          onClick={onClose}
          title="Close (ESC)"
        >
          ✕
        </button>

        <img
          src={imageUrl}
          alt={displayName}
          className="profile-image-modal-img"
        />

        {displayName && (
          <div className="profile-image-modal-name">@{displayName}</div>
        )}
      </div>
    </div>
  );
}
