import { useState, useRef, useEffect, useCallback } from "react";
import { usePosts } from "../context/PostContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "./MemePage.css";

const TEMPLATES = [
  { name: "Drake", url: "https://i.imgflip.com/30b1gx.jpg" },
  { name: "Distracted BF", url: "https://i.imgflip.com/1ur9b0.jpg" },
  { name: "This Is Fine", url: "https://i.imgflip.com/wxica.jpg" },
  { name: "Two Buttons", url: "https://i.imgflip.com/1g8my4.jpg" },
  { name: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg" },
  { name: "Always Has Been", url: "https://i.imgflip.com/46e43q.jpg" },
  { name: "One Does Not Simply", url: "https://i.imgflip.com/1bij.jpg" },
  { name: "Sad Keanu", url: "https://i.imgflip.com/4t0m5.jpg" },
];

const COLORS = ["#ffffff", "#ffff00", "#ff4444", "#44ff44", "#4488ff", "#ff44ff", "#ff8c00", "#000000"];

const CANVAS_W = 600;
const CANVAS_H = 500;

function drawMemeOnCanvas(canvas, img, topText, bottomText, fontSize, textColor) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (img) {
    const imgAspect = img.width / img.height;
    const canvasAspect = CANVAS_W / CANVAS_H;
    let sx, sy, sw, sh;
    if (imgAspect > canvasAspect) {
      sh = img.height;
      sw = sh * canvasAspect;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / canvasAspect;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
  }

  if (!topText && !bottomText) return;

  ctx.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = Math.max(3, fontSize / 7);
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = textColor;
  ctx.lineJoin = "round";

  if (topText) {
    const y = 14;
    ctx.strokeText(topText.toUpperCase(), CANVAS_W / 2, y);
    ctx.fillText(topText.toUpperCase(), CANVAS_W / 2, y);
  }

  ctx.textBaseline = "bottom";
  if (bottomText) {
    const y = CANVAS_H - 14;
    ctx.strokeText(bottomText.toUpperCase(), CANVAS_W / 2, y);
    ctx.fillText(bottomText.toUpperCase(), CANVAS_W / 2, y);
  }
}

export default function MemePage() {
  const { addPost } = usePosts();
  const { firebaseUser, userProfile } = useAuth();

  const canvasRef = useRef(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(44);
  const [textColor, setTextColor] = useState("#ffffff");
  const [loadedImg, setLoadedImg] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(null);

  // Share overlay state
  const [shareOpen, setShareOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);

  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    drawMemeOnCanvas(canvasRef.current, loadedImg, topText, bottomText, fontSize, textColor);
  }, [loadedImg, topText, bottomText, fontSize, textColor]);

  useEffect(() => { redraw(); }, [redraw]);

  const loadTemplate = (template) => {
    setLoadingTemplate(template.name);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoadedImg(img);
      setLoadingTemplate(null);
    };
    img.onerror = () => {
      setLoadingTemplate(null);
      toast.error("Couldn't load template — try uploading your own image");
    };
    img.src = template.url;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("Image too large (max 15MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setLoadedImg(img);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "laffo-meme.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Meme downloaded!");
  };

  const handleShare = async () => {
    if (!firebaseUser || firebaseUser.isAnonymous) {
      toast.error("Please log in to share memes");
      return;
    }
    setSharing(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      await addPost({
        description: caption.trim(),
        author: userProfile?.username || firebaseUser.displayName || "Anonymous",
        authorAvatar: userProfile?.avatar || null,
        image: dataUrl,
        type: "all",
        reactions: { "🔥": 0, "😂": 0, "🙌": 0, "🚀": 0, "👍": 0 },
        endsAt: null,
        isAnonymousPost: false,
        mood: null,
      });
      toast.success("Meme posted! 🎭");
      setShareOpen(false);
      setCaption("");
    } catch (err) {
      toast.error(err.message || "Failed to share");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="meme-page">
      <div className="meme-hero">
        <h1 className="meme-title">🎭 Meme Generator</h1>
        <p className="meme-subtitle">Upload an image, add text, share the laugh</p>
      </div>

      <div className="meme-layout">
        {/* ── Canvas preview ── */}
        <div className="meme-canvas-section">
          <div className="meme-canvas-wrap">
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="meme-canvas" />
          </div>
          <div className="meme-canvas-actions">
            <button className="meme-btn meme-btn-download" onClick={handleDownload}>
              ⬇ Download
            </button>
            <button
              className="meme-btn meme-btn-share"
              onClick={() => setShareOpen(true)}
            >
              🚀 Share as Post
            </button>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="meme-controls">
          {/* Upload */}
          <div className="meme-section">
            <span className="meme-label">Upload Image</span>
            <label className="meme-upload-btn">
              📁 Choose Image
              <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
            </label>
          </div>

          {/* Templates */}
          <div className="meme-section">
            <span className="meme-label">Quick Templates</span>
            <div className="meme-templates">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  className={`meme-template-btn${loadingTemplate === t.name ? " loading" : ""}`}
                  onClick={() => loadTemplate(t)}
                  title={t.name}
                >
                  <img
                    src={t.url}
                    alt={t.name}
                    className="meme-template-img"
                    crossOrigin="anonymous"
                    loading="lazy"
                  />
                  <span className="meme-template-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div className="meme-section">
            <label className="meme-label" htmlFor="meme-top">Top Text</label>
            <input
              id="meme-top"
              className="meme-input"
              placeholder="TOP TEXT"
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="meme-section">
            <label className="meme-label" htmlFor="meme-bottom">Bottom Text</label>
            <input
              id="meme-bottom"
              className="meme-input"
              placeholder="BOTTOM TEXT"
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* Font size + color */}
          <div className="meme-row">
            <div className="meme-half">
              <span className="meme-label">Font Size: {fontSize}px</span>
              <input
                type="range"
                className="meme-range"
                min={20}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="meme-half">
              <span className="meme-label">Text Color</span>
              <div className="meme-colors">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`meme-color-swatch${textColor === c ? " active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setTextColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share overlay ── */}
      {shareOpen && (
        <div className="meme-share-overlay" onClick={() => setShareOpen(false)}>
          <div className="meme-share-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="meme-share-title">Share Your Meme 🎭</h3>
            <textarea
              className="meme-share-caption"
              placeholder="Add a caption… (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              rows={3}
            />
            <div className="meme-share-actions">
              <button className="meme-share-cancel" onClick={() => setShareOpen(false)}>
                Cancel
              </button>
              <button
                className="meme-share-confirm"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? "Posting…" : "🚀 Post It!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
