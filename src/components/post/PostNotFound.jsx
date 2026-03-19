export default function PostNotFound({ onClose }) {
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-not-found" onClick={(e) => e.stopPropagation()}>
        <div className="not-found-content">
          <span className="not-found-icon">🔍</span>
          <h2>Post Not Found</h2>
          <p>The post you're looking for doesn't exist or has been removed.</p>
          <button className="back-btn" onClick={onClose}>
            Back to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
