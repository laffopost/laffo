import { useState, useEffect } from "react";
import MentionInput from "../common/MentionInput";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../../utils/icons";
import "./AddPostModal.css";
import "./CreateMediaForm.css";

import logger from "../../utils/logger";
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

export default function CreateMediaForm({ onSubmit, onClose, onBack, initialData = null, onSave = null }) {
  const { userProfile, firebaseUser } = useAuth();
  const isEditMode = !!onSave;
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [duration, setDuration] = useState("never");
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    author: "",
    authorAvatar: null,
    embedUrl: initialData?.embedUrl || "",
    mediaType: initialData?.mediaType || null,
  });
  const [mediaUrlInput, setMediaUrlInput] = useState(initialData?.url || "");
  const [error, setError] = useState("");

  useEffect(() => {
    const author = userProfile?.username || firebaseUser?.displayName || "Anon";
    const authorAvatar = userProfile?.avatar || null;
    setFormData((prev) => ({ ...prev, author, authorAvatar }));
  }, [userProfile, firebaseUser]);

  // Auto-parse URL when shared from music player
  useEffect(() => {
    if (initialData?.url && !isEditMode) {
      parseMediaUrl(initialData.url);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parseMediaUrl = (url) => {
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      )?.[1];
      if (videoId) {
        setFormData((prev) => ({
          ...prev,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          mediaType: "youtube",
        }));
        setError("");
        return true;
      }
    }
    // Spotify
    if (url.includes("spotify.com")) {
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      const playlistId = url.match(/playlist\/([a-zA-Z0-9]+)/)?.[1];
      const albumId = url.match(/album\/([a-zA-Z0-9]+)/)?.[1];

      if (trackId) {
        setFormData((prev) => ({
          ...prev,
          embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
          mediaType: "spotify",
        }));
        setError("");
        return true;
      }
      if (playlistId) {
        setFormData((prev) => ({
          ...prev,
          embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}`,
          mediaType: "spotify",
        }));
        setError("");
        return true;
      }
      if (albumId) {
        setFormData((prev) => ({
          ...prev,
          embedUrl: `https://open.spotify.com/embed/album/${albumId}`,
          mediaType: "spotify",
        }));
        setError("");
        return true;
      }
    }
    setFormData((prev) => ({ ...prev, embedUrl: "", mediaType: null }));
    if (url.trim()) {
      setError("Invalid URL. Please use YouTube or Spotify links.");
    }
    return false;
  };

  const handleMediaUrlChange = (e) => {
    const url = e.target.value;
    setMediaUrlInput(url);
    setFormData((prev) => ({ ...prev, embedUrl: "" }));
    if (url.trim()) {
      parseMediaUrl(url);
    } else {
      setFormData((prev) => ({ ...prev, embedUrl: "", mediaType: null }));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode) {
      onSave({
        description: formData.description || "",
      });
      onClose();
      return;
    }

    if (!formData.embedUrl) {
      setError("Please provide a valid YouTube or Spotify URL!");
      return;
    }

    const initialReactions = {
      "🔥": 0,
      "😂": 0,
      "🙌": 0,
      "🚀": 0,
      "👍": 0,
    };

    const author = postAsAnonymous ? "Anonymous" : formData.author;
    const authorAvatar = postAsAnonymous ? null : formData.authorAvatar;

    // For YouTube, use lower quality thumbnail (smaller file size)
    // For Spotify, use placeholder
    let thumbnailImage = null;

    if (formData.mediaType === "youtube" && formData.embedUrl) {
      const videoId = formData.embedUrl.match(/embed\/([^?]+)/)?.[1];
      if (videoId) {
        // Use 'mqdefault' (medium quality) instead of 'maxresdefault'
        // This is much smaller (~10-15KB vs 100KB+) and no CORS issues
        thumbnailImage = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        logger.log("✅ Using YouTube medium quality thumbnail");
      }
    } else if (formData.mediaType === "spotify") {
      thumbnailImage = "spotify-placeholder";
    }

    const endsAt = DURATION_MS[duration]
      ? Date.now() + DURATION_MS[duration]
      : null;

    const postData = {
      type: "media",
      mediaType: formData.mediaType,
      embedUrl: formData.embedUrl,
      description: formData.description || "",
      author,
      authorAvatar,
      reactions: initialReactions,
      image: thumbnailImage,
      endsAt,
      isAnonymousPost: postAsAnonymous,
    };

    logger.log("📤 CreateMediaForm - Submitting post data:", postData);
    logger.log("📤 Thumbnail:", thumbnailImage);

    onSubmit(postData);
    onClose();
  };

  return (
    <form className="add-image-form" data-edit-mode={String(isEditMode)} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        {!isEditMode ? (
          <button type="button" onClick={onBack} className="btn-back btn-back--top">← Back</button>
        ) : <div />}
        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
          {isEditMode ? "Edit Media" : "Share Media"}
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

      {!isEditMode && (
        <div className="form-group">
          <label htmlFor="mediaUrl">Media URL *</label>
          <input
            type="url"
            id="mediaUrl"
            value={mediaUrlInput}
            onChange={handleMediaUrlChange}
            placeholder="Paste YouTube or Spotify link..."
            required
          />
          <small className="form-hint">
            📺 YouTube videos | 🎵 Spotify tracks/playlists/albums
          </small>
        </div>
      )}

      {formData.embedUrl && (
        <div className="media-preview-section">
          <label className="media-preview-label">
            Preview ({formData.mediaType === "youtube" ? "YouTube" : "Spotify"})
          </label>
          <div className="media-embed-preview">
            <iframe
              src={formData.embedUrl}
              width="100%"
              height={formData.mediaType === "spotify" ? "152" : "240"}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="media-preview"
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="description">Caption</label>
        <MentionInput
          value={formData.description}
          onChange={(val) => setFormData({ ...formData, description: val })}
          placeholder="Write something about this media..."
          maxLength={200}
          rows={3}
        />
      </div>

      {!isEditMode && (
        <>
          <div className="form-group">
            <label htmlFor="author">Posting as</label>
            <input
              type="text"
              id="author"
              value={postAsAnonymous ? "Anonymous" : formData.author}
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

          <div className="form-group">
            <label>Post Duration</label>
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
        </>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={!isEditMode && !formData.embedUrl}
        >
          {isEditMode ? "Save Changes ✓" : "Share Media ✨"}
        </button>
      </div>
    </form>
  );
}
