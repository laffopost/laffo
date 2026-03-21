import { useState, useRef, useEffect } from "react";
import MentionInput from "../common/MentionInput";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { CloseIcon, EraserIcon, UndoIcon, DeleteIcon, EditIcon } from "../../utils/icons";
import { compressImage } from "../../utils/imageCompression";
import { ColorPicker } from "../common";
import { MOODS } from "../../utils/postConstants";
import "./AddPostModal.css";
import "./CreatePostForm.css";
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
  const [mood, setMood] = useState(null);
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    author: "",
    authorAvatar: null,
    imageFile: null,
    useCanvas: false,
    type: initialData?.type || "all",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [canvasBgColor, setCanvasBgColor] = useState("#000000");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [eraserPos, setEraserPos] = useState(null);
  const [customCanvasBgColor, setCustomCanvasBgColor] = useState("#ff6b6b");
  const [customDrawColor, setCustomDrawColor] = useState("#ff6b6b");

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

  const saveToUndo = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    setUndoStack((prev) => [...prev.slice(-9), dataUrl]);
  };

  const undo = () => {
    if (undoStack.length === 0 || !ctx) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = prev;
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    saveToUndo();
    setIsDrawing(true);
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const getCanvasPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const draw = (e) => {
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    if (eraserMode) setEraserPos({ x: e.clientX - canvasRef.current.getBoundingClientRect().left, y: e.clientY - canvasRef.current.getBoundingClientRect().top });
    if (!isDrawing || !ctx) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = eraserMode ? canvasBgColor : drawColor;
    ctx.lineWidth = eraserMode ? brushSize * 2 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startDrawingTouch = (e) => {
    e.preventDefault();
    if (!ctx) return;
    saveToUndo();
    setIsDrawing(true);
    const touch = e.touches[0];
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawTouch = (e) => {
    e.preventDefault();
    if (!isDrawing || !ctx) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = eraserMode ? canvasBgColor : drawColor;
    ctx.lineWidth = eraserMode ? brushSize * 2 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditMode) {
      onSave({
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
      description: formData.description || "",
      author,
      authorAvatar,
      image: finalImage,
      imageFile: formData.useCanvas ? null : formData.imageFile,
      type: formData.type,
      reactions: initialReactions,
      endsAt,
      isAnonymousPost: postAsAnonymous,
      mood: mood || null,
    });
    onClose();
  };

  return (
    <form className="add-image-form" data-edit-mode={String(isEditMode)} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        {!isEditMode ? (
          <button type="button" onClick={onBack} className="btn-back btn-back--top">← Back</button>
        ) : <div />}
        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
          {isEditMode ? "Edit Post" : "Create an Image Post"}
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

      <div className="form-group">
        <label>Mood <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
        <div className="status-mood-row">
          {MOODS.map((m) => (
            <button key={m.emoji} type="button" title={m.label}
              className={`status-mood-btn${mood?.emoji === m.emoji ? " active" : ""}`}
              onClick={() => setMood(mood?.emoji === m.emoji ? null : m)}>
              {m.emoji}
            </button>
          ))}
        </div>
        {mood && <span className="status-mood-selected">Feeling {mood.emoji} {mood.label}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Caption</label>
        <MentionInput
          value={formData.description}
          onChange={(val) => setFormData({ ...formData, description: val })}
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
            <div className="canvas-tools-row">
              <button
                type="button"
                className={`canvas-tool-btn${!eraserMode ? " active" : ""}`}
                onClick={() => setEraserMode(false)}
                title="Draw"
              >
                <EditIcon size={14} /> Draw
              </button>
              <button
                type="button"
                className={`canvas-tool-btn${eraserMode ? " active" : ""}`}
                onClick={() => setEraserMode(true)}
                title="Eraser"
              >
                <EraserIcon size={14} /> Erase
              </button>
              <button
                type="button"
                className="canvas-tool-btn canvas-tool-btn--undo"
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo"
              >
                <UndoIcon size={14} /> Undo
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="canvas-tool-btn canvas-tool-btn--clear"
                title="Clear canvas"
              >
                <DeleteIcon size={14} /> Clear
              </button>
            </div>

            <div className="control-group">
              <label>Background:</label>
              <ColorPicker
                colors={["#8b5cf6","#10b981","#ef4444","#f59e0b","#3b82f6","#ec4899","#000000","#1a1a2e","#ffffff"]}
                value={canvasBgColor}
                onChange={handleBgColorChange}
                customColor={customCanvasBgColor}
                onCustomChange={setCustomCanvasBgColor}
              />
            </div>

            <div className="control-group">
              <label>Draw Color:</label>
              <ColorPicker
                colors={["#ffffff","#000000","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#fbbf24","#06b6d4"]}
                value={drawColor}
                onChange={(color) => { setDrawColor(color); setEraserMode(false); }}
                customColor={customDrawColor}
                onCustomChange={(color) => { setCustomDrawColor(color); setEraserMode(false); }}
              />
            </div>

            <div className="control-group">
              <label>Brush Size: {brushSize}px</label>
              <input
                type="range"
                min="1"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="brush-slider"
              />
            </div>
          </div>
          <div className="canvas-wrap">
            {eraserMode && eraserPos && (
              <div
                className="eraser-cursor"
                style={{
                  left: eraserPos.x,
                  top: eraserPos.y,
                  width: brushSize * 2,
                  height: brushSize * 2,
                }}
              />
            )}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className={`drawing-canvas${eraserMode ? " eraser-active" : ""}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={() => { stopDrawing(); setEraserPos(null); }}
              onTouchStart={startDrawingTouch}
              onTouchMove={drawTouch}
              onTouchEnd={stopDrawing}
            />
          </div>
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
