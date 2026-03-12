import { useState } from "react";
import toast from "react-hot-toast";

export default function EditMediaForm({
  post,
  onSave,
  onCancel,
  isSubmitting,
}) {
  const [title, setTitle] = useState(post.title || "");
  const [description, setDescription] = useState(post.description || "");
  const [embedUrl, setEmbedUrl] = useState(post.embedUrl || "");

  const validateMediaUrl = (url) => {
    if (!url) return null;

    // YouTube validation
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch) {
      return {
        type: "youtube",
        id: youtubeMatch[1],
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
        isValid: true,
      };
    }

    // Spotify validation
    const spotifyRegex = /spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const spotifyMatch = url.match(spotifyRegex);

    if (spotifyMatch) {
      return {
        type: "spotify",
        id: spotifyMatch[2],
        embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
        isValid: true,
      };
    }

    return { isValid: false };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!embedUrl.trim()) {
      toast.error("Media URL is required");
      return;
    }

    const validation = validateMediaUrl(embedUrl.trim());
    if (!validation.isValid) {
      toast.error("Please enter a valid YouTube or Spotify URL");
      return;
    }

    const updateData = {
      title: title.trim(),
      description: description.trim(),
      embedUrl: validation.embedUrl,
      mediaType: validation.type,
      mediaUrl: embedUrl.trim(), // Keep original URL for reference
    };

    onSave(updateData);
  };

  const mediaValidation = validateMediaUrl(embedUrl);

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <div className="edit-form-group">
        <label className="edit-form-label">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter media title"
          className="edit-form-input"
          maxLength={100}
          required
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your media post (optional)"
          className="edit-form-textarea"
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="edit-form-group">
        <label className="edit-form-label">Media URL *</label>
        <input
          type="url"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="Paste YouTube or Spotify URL here"
          className="edit-form-input"
          required
        />
        <small
          style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem" }}
        >
          Supported: YouTube videos, Spotify tracks/albums/playlists
        </small>
        {embedUrl && (
          <div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
            {mediaValidation.isValid ? (
              <span style={{ color: "#22c55e" }}>
                ✓ Valid {mediaValidation.type} URL detected
              </span>
            ) : (
              <span style={{ color: "#ef4444" }}>✗ Invalid URL format</span>
            )}
          </div>
        )}
      </div>

      {mediaValidation.isValid && (
        <div className="edit-form-group">
          <label className="edit-form-label">Preview</label>
          <div
            style={{
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
          >
            {mediaValidation.type === "youtube" ? (
              <iframe
                src={mediaValidation.embedUrl}
                width="100%"
                height="200"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube Preview"
              />
            ) : (
              <iframe
                src={mediaValidation.embedUrl}
                width="100%"
                height="200"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Preview"
              />
            )}
          </div>
        </div>
      )}

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
            !title.trim() ||
            !embedUrl.trim() ||
            !mediaValidation.isValid
          }
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
