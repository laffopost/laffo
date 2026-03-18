import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon } from "../../utils/icons";
import { compressImage } from "../../utils/imageCompression";
import "./AddPostModal.css";
import "./CreatePostForm.css";

import logger from "../../utils/logger";
const POST_TYPES = [
  { value: "all", label: "General", emoji: "🖼️" },
  { value: "trending", label: "Trending", emoji: "🔥" },
  { value: "sponsored", label: "Sponsored", emoji: "💎" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "gaming", label: "Gaming", emoji: "🎮" },
  { value: "tech", label: "Tech", emoji: "💻" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "pov", label: "POV", emoji: "👀" },
  { value: "question", label: "Question", emoji: "❓" },
  { value: "news", label: "News", emoji: "📰" },
  { value: "crypto", label: "Crypto", emoji: "🪙" },
  { value: "memecoin", label: "Memecoin", emoji: "🐶" },
];

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

export default function CreatePostForm({ onSubmit, onClose, onBack, initialData = null, onSave = null }) {
  const { userProfile, firebaseUser } = useAuth();
  const isEditMode = !!onSave;
  const [postAsAnonymous, setPostAsAnonymous] = useState(false);
  const [duration, setDuration] = useState("never");
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    author: "",
    authorAvatar: null,
    imageFile: null,
    useCanvas: false,
    type: initialData?.type || "all",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [canvasBgColor, setCanvasBgColor] = useState("#8b5cf6");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    let author = userProfile?.username || "Anon";
    let authorAvatar = userProfile?.avatar || null;
    setFormData((prev) => ({
      ...prev,
      author,
      authorAvatar,
    }));
  }, [userProfile, firebaseUser]);

  useEffect(() => {
    if (canvasRef.current && formData.useCanvas) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.fillStyle = canvasBgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      setCtx(context);
    }
  }, [formData.useCanvas, canvasBgColor]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setFormData({
        ...formData,
        imageFile: file,
        useCanvas: false,
      });

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Use the centralized compression utility
          const result = await compressImage(reader.result);
          setPreviewUrl(result.data);
          logger.log(`✅ Image compressed by ${result.reduction}%`);
        } catch (error) {
          logger.error("❌ Compression failed:", error);
          setPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasToggle = () => {
    setFormData({
      ...formData,
      useCanvas: true,
      imageFile: null,
    });
    setPreviewUrl(null);
  };

  const handleBgColorChange = (color) => {
    setCanvasBgColor(color);
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const clearCanvas = () => {
    if (ctx) {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required!");
      return;
    }

    if (isEditMode) {
      onSave({
        title: formData.title.trim(),
        description: formData.description || "",
        type: formData.type,
      });
      onClose();
      return;
    }

    let finalImage = previewUrl;

    if (formData.useCanvas && canvasRef.current) {
      // Canvas: use same 55% quality
      finalImage = canvasRef.current.toDataURL("image/jpeg", 0.55);
    }

    if (!formData.imageFile && !formData.useCanvas) {
      toast.error("Please upload an image or draw something!");
      return;
    }

    const initialReactions = {
      "🔥": 0,
      "😂": 0,
      "🙌": 0,
      "🚀": 0,
      "👍": 0,
    };

    const author = postAsAnonymous
      ? "Anonymous"
      : (formData.author && formData.author.trim()) || "Anonymous";

    const authorAvatar =
      postAsAnonymous || !formData.authorAvatar ? null : formData.authorAvatar;

    const endsAt = DURATION_MS[duration]
      ? Date.now() + DURATION_MS[duration]
      : null;

    onSubmit({
      title: formData.title,
      description: formData.description || "No description provided.",
      author,
      authorAvatar,
      image: finalImage,
      imageFile: formData.useCanvas ? null : formData.imageFile,
      type: formData.type,
      reactions: initialReactions,
      endsAt,
    });
    onClose();
  };

  return (
    <form className="add-image-form" data-edit-mode={String(isEditMode)} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditMode ? '1rem' : '0' }}>
        <h3 style={{ margin: 0, fontSize: isEditMode ? '1.3rem' : '1.5rem' }}>
          {isEditMode ? "Edit Post" : "Create an Image Post"}
        </h3>
        {isEditMode && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-base)',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
            title="Close"
          >
            <CloseIcon size={20} />
          </button>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Give your post a title..."
          maxLength={50}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="What's your post about?"
          maxLength={200}
          rows={3}
        />
      </div>

      {!isEditMode && (
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
              onChange={() => setPostAsAnonymous((v) => !v)}
            />
            <span>Post as Anonymous</span>
          </label>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="type">Category *</label>
        <div className="type-selector">
          {POST_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`type-option ${
                formData.type === type.value ? "active" : ""
              }`}
              onClick={() => setFormData({ ...formData, type: type.value })}
            >
              <span className="type-emoji">{type.emoji}</span>
              <span className="type-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!isEditMode && (
        <>
          <div className="form-divider">
            <span>Image Source</span>
          </div>

          <div className="form-group">
            <label className="upload-label">
              📁 Upload from Device
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
            </label>
          </div>

          <div className="form-group">
            <button
              type="button"
              onClick={handleCanvasToggle}
              className="btn-canvas-toggle"
            >
              🎨 {formData.useCanvas ? "Hide Canvas" : "Draw Your Own"}
            </button>
          </div>
        </>
      )}

      {!isEditMode && formData.useCanvas && (
        <div className="canvas-section">
          <div className="canvas-controls">
            <div className="control-group">
              <label>Background:</label>
              <div className="color-picker-row">
                {[
                  "#8b5cf6",
                  "#10b981",
                  "#ef4444",
                  "#f59e0b",
                  "#3b82f6",
                  "#ec4899",
                  "#000000",
                  "#ffffff",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-btn${
                      canvasBgColor === color ? " active" : ""
                    }`}
                    style={{ background: color }}
                    onClick={() => handleBgColorChange(color)}
                  />
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Draw Color:</label>
              <div className="color-picker-row">
                {[
                  "#ffffff",
                  "#000000",
                  "#ef4444",
                  "#f59e0b",
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                  "#ec4899",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-btn${
                      drawColor === color ? " active" : ""
                    }`}
                    style={{ background: color }}
                    onClick={() => setDrawColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Brush Size: {brushSize}px</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="brush-slider"
              />
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              className="btn-clear-canvas"
            >
              🗑️ Clear Canvas
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      )}

      {!isEditMode && previewUrl && !formData.useCanvas && (
        <div className="image-preview">
          <label>Preview</label>
          <img src={previewUrl} alt="Preview" />
        </div>
      )}

      {!isEditMode && (
        <div className="form-group">
          <label>Post Duration</label>
          <div className="poll-duration-row">
            {DURATIONS.map((d) => (
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
      )}

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-back">
          ← Back
        </button>
        <button type="submit" className="btn-submit">
          {isEditMode ? "Save Changes ✓" : "Create Post ✨"}
        </button>
      </div>
    </form>
  );
}
