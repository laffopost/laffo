import { useState, useEffect } from "react";
import { CloseIcon, MusicIcon, ImageIcon, EyeIcon, SparkleIcon } from "../../utils/icons";
import CreatePostForm from "./CreatePostForm";
import CreateStatusForm from "./CreateStatusForm";
import CreatePollForm from "./CreatePollForm";
import CreateMediaForm from "./CreateMediaForm";
import CreateCountdownForm from "./CreateCountdownForm";
import CreateQuizForm from "./CreateQuizForm";
import "./AddPostModal.css";

export default function AddPostModal({
  onClose,
  onSubmit,
  editMode = false,
  editPost = null,
  editPostData = null,
  // share mode: jump straight to a type with pre-filled text
  shareType = null,
  shareInitialData = null,
}) {
  const [selectedType, setSelectedType] = useState(
    editMode && editPostData ? editPostData.type : shareType,
  );

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBack = () => {
    if (editMode) { onClose(); return; }
    setSelectedType(null);
  };

  // In edit mode, resolve "image"-type posts (stored as non-status/poll/media types)
  const resolvedType = selectedType === "image" || (editMode && selectedType && selectedType !== "status" && selectedType !== "poll" && selectedType !== "media" && selectedType !== "countdown" && selectedType !== "quiz") ? "image" : selectedType;

  if (!resolvedType) {
    return (
      <div className="add-post-modal-overlay" onClick={onClose}>
        <div className="add-post-modal" onClick={(e) => e.stopPropagation()}>
          <div className="add-post-modal-header">
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <SparkleIcon size={24} style={{color: '#8b5cf6'}} />
              <h2 style={{margin: 0}}>Add New Post</h2>
            </div>
            <button className="close-btn" onClick={onClose} title="Close">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="post-options">
            <div
              className="option-card"
              onClick={() => setSelectedType("image")}
            >
              <div className="option-icon">
                <ImageIcon size={32} style={{color: '#8b5cf6'}} />
              </div>
              <h3 className="option-label">Image</h3>
              <p className="option-desc">Share photos and memes</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("status")}
            >
              <div className="option-icon">
                <EyeIcon size={32} style={{color: '#ec4899'}} />
              </div>
              <h3 className="option-label">Status</h3>
              <p className="option-desc">Share your thoughts</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("poll")}
            >
              <div className="option-icon">
                <SparkleIcon size={32} style={{color: '#f59e0b'}} />
              </div>
              <h3 className="option-label">Poll</h3>
              <p className="option-desc">Ask the community</p>
            </div>

            <div
              className="option-card"
              onClick={() => setSelectedType("media")}
            >
              <div className="option-icon">
                <MusicIcon size={32} style={{color: '#10b981'}} />
              </div>
              <h3 className="option-label">Media</h3>
              <p className="option-desc">Share YouTube or Spotify</p>
            </div>

            <div className="option-card" onClick={() => setSelectedType("countdown")}>
              <div className="option-icon">
                <span style={{ fontSize: "32px" }}>⏳</span>
              </div>
              <h3 className="option-label">Countdown</h3>
              <p className="option-desc">Count down to an event</p>
            </div>

            <div className="option-card" onClick={() => setSelectedType("quiz")}>
              <div className="option-icon">
                <span style={{ fontSize: "32px" }}>🧠</span>
              </div>
              <h3 className="option-label">Quiz</h3>
              <p className="option-desc">Test your community's knowledge</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-post-modal-overlay" onClick={onClose}>
      <div className="add-post-modal" onClick={(e) => e.stopPropagation()}>
        {(resolvedType === "image") && (
          <CreatePostForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
            initialData={editMode ? editPostData : null}
            onSave={editMode ? editPost : null}
          />
        )}
        {resolvedType === "status" && (
          <CreateStatusForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
            initialData={editMode ? editPostData : shareInitialData}
            onSave={editMode ? editPost : null}
          />
        )}
        {resolvedType === "poll" && (
          <CreatePollForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
            initialData={editMode ? editPostData : null}
            onSave={editMode ? editPost : null}
          />
        )}
        {resolvedType === "media" && (
          <CreateMediaForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
            initialData={editMode ? editPostData : shareInitialData}
            onSave={editMode ? editPost : null}
          />
        )}
        {resolvedType === "countdown" && (
          <CreateCountdownForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
        {resolvedType === "quiz" && (
          <CreateQuizForm
            onSubmit={onSubmit}
            onClose={onClose}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
