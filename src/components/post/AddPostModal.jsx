import { useState } from "react";
import CreatePostForm from "./CreatePostForm";
import CreateStatusForm from "./CreateStatusForm";
import CreatePollForm from "./CreatePollForm";
import CreateMediaForm from "./CreateMediaForm";
import "./AddPostModal.css";

export default function AddPostModal({ onClose, onSubmit }) {
  const [selectedType, setSelectedType] = useState(null);

  const handleBack = () => {
    setSelectedType(null);
  };

  if (!selectedType) {
    return (
      <div className="add-post-modal-overlay" onClick={onClose}>
        <div className="add-post-modal" onClick={(e) => e.stopPropagation()}>
          <div className="add-post-modal-header">
            <h2>✨ Add New Post</h2>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="post-options">
            <div
              className="option-card"
              onClick={() => setSelectedType("image")}
            >
              <span className="option-icon">🖼️</span>
              <h3 className="option-label">Image</h3>
              <p className="option-desc">Share photos and memes</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("status")}
            >
              <span className="option-icon">👀</span>
              <h3 className="option-label">Status</h3>
              <p className="option-desc">Share your thoughts</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("poll")}
            >
              <span className="option-icon">🎮</span>
              <h3 className="option-label">Poll</h3>
              <p className="option-desc">Ask the community</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("media")}
            >
              <span className="option-icon">🎵</span>
              <h3 className="option-label">Media</h3>
              <p className="option-desc">Share YouTube or Spotify</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-post-modal-overlay" onClick={onClose}>
      <div className="add-post-modal" onClick={(e) => e.stopPropagation()}>
        {selectedType === "image" && (
          <CreatePostForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
        {selectedType === "status" && (
          <CreateStatusForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
        {selectedType === "poll" && (
          <CreatePollForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
        {selectedType === "media" && (
          <CreateMediaForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
