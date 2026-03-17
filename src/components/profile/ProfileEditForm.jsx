import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { compressAvatar } from "../../utils/imageCompression";
import FacebookLogo from "../../assets/facebook.png";
import InstagramLogo from "../../assets/instagram.png";
import TelegramLogo from "../../assets/telegram.png";
import SpotifyLogo from "../../assets/spotify.png";
import TikTokLogo from "../../assets/tiktok.png";
import TwitterLogo from "../../assets/twitter.png";
import "./ProfileEditForm.css";

import logger from "../../utils/logger";
export default function ProfileEditForm({
  initialData,
  onSave,
  onClose,
  saving,
}) {
  const [form, setForm] = useState({ ...initialData });
  const [avatarPreview, setAvatarPreview] = useState(form.avatar || null);
  const [avatarDraw, setAvatarDraw] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("Avatar photo must be less than 3MB.");
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Compress avatar aggressively
          const result = await compressAvatar(reader.result);
          setForm((prev) => ({ ...prev, avatar: result.data }));
          setAvatarPreview(result.data);
          logger.log(`✅ Avatar compressed by ${result.reduction}%`);
        } catch (error) {
          logger.error("❌ Avatar compression failed:", error);
          toast.error("Failed to process avatar image");
        }
      };
      reader.readAsDataURL(file);
    } else {
      setForm((prev) => ({ ...prev, avatar: null }));
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(form);
      toast.success("Profile updated!");
    } catch (_err) {
      toast.error("Failed to update profile.");
    }
  };

  return (
    <div className="profile-edit-modal-overlay" onClick={onClose}>
      <div
        className="profile-edit-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="profile-edit-close" onClick={onClose}>
          ×
        </button>
        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <h2>Edit Profile</h2>

          {/* Avatar Section - Priority #1 */}
          <div className="form-section">
            <div className="form-section-title">Profile Picture</div>
            <div className="avatar-upload-area">
              {avatarPreview && (
                <div className="avatar-preview-large">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="avatar-preview-img-large"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarPhotoChange}
                className="profile-auth-input file-input"
              />
              <button
                type="button"
                className="avatar-draw-btn"
                onClick={() => setAvatarDraw((v) => !v)}
              >
                {avatarDraw ? "✖ Cancel" : "🎨 Draw"}
              </button>
            </div>
            {avatarDraw && (
              <ImprovedAvatarCanvas
                onSave={(img) => {
                  setForm((prev) => ({ ...prev, avatar: img }));
                  setAvatarPreview(img);
                  setAvatarDraw(false);
                }}
              />
            )}
          </div>

          {/* Status Section - Priority #2 */}
          <div className="form-section">
            <div className="form-section-title">Status / Bio</div>
            <textarea
              name="status"
              placeholder="What's on your mind?"
              value={form.status}
              onChange={handleChange}
              className="profile-auth-input status-textarea"
              maxLength={150}
              rows={2}
            />
          </div>

          {/* Essential Info - Priority #3 */}
          <div className="form-section">
            <div className="form-section-title">Account Info</div>
            <div className="form-field">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                disabled
                className="profile-auth-input profile-input-disabled"
              />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                disabled
                className="profile-auth-input profile-input-disabled"
              />
            </div>
          </div>

          {/* Optional Fields Toggle */}
          <button
            type="button"
            className="optional-fields-toggle"
            onClick={() => setShowOptional((v) => !v)}
          >
            {showOptional
              ? "− Hide Additional Fields"
              : "+ Show Additional Fields"}
          </button>

          {showOptional && (
            <>
              <div className="form-section">
                <div className="form-section-title">Personal Info</div>
                <div className="profile-auth-form-grid">
                  <div className="form-field">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      placeholder="City, Country"
                      value={form.location}
                      onChange={handleChange}
                      className="profile-auth-input"
                      maxLength={60}
                    />
                  </div>
                  <div className="form-field">
                    <label>Birthday</label>
                    <input
                      type="date"
                      name="birthday"
                      value={form.birthday}
                      onChange={handleChange}
                      className="profile-auth-input profile-date-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>Website</label>
                    <input
                      type="url"
                      name="website"
                      placeholder="https://example.com"
                      value={form.website}
                      onChange={handleChange}
                      className="profile-auth-input"
                      maxLength={200}
                    />
                  </div>
                  <div className="form-field">
                    <label>Favorite Song</label>
                    <input
                      type="text"
                      name="favoriteSong"
                      placeholder="Song title or link"
                      value={form.favoriteSong}
                      onChange={handleChange}
                      className="profile-auth-input"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Social Links</div>
                <div className="profile-auth-form-grid">
                  <div className="form-field">
                    <label>Facebook</label>
                    <div className="social-input-row">
                      <img
                        src={FacebookLogo}
                        alt="FB"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="facebook"
                        placeholder="Username"
                        value={form.facebook}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Instagram</label>
                    <div className="social-input-row">
                      <img
                        src={InstagramLogo}
                        alt="IG"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="instagram"
                        placeholder="Username"
                        value={form.instagram}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Twitter</label>
                    <div className="social-input-row">
                      <img
                        src={TwitterLogo}
                        alt="Twitter"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="twitter"
                        placeholder="Username"
                        value={form.twitter}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>TikTok</label>
                    <div className="social-input-row">
                      <img
                        src={TikTokLogo}
                        alt="TikTok"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="tiktok"
                        placeholder="Username"
                        value={form.tiktok}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Telegram</label>
                    <div className="social-input-row">
                      <img
                        src={TelegramLogo}
                        alt="TG"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="telegram"
                        placeholder="Username"
                        value={form.telegram}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Spotify</label>
                    <div className="social-input-row">
                      <img
                        src={SpotifyLogo}
                        alt="Spotify"
                        className="social-icon-small"
                      />
                      <input
                        type="text"
                        name="spotify"
                        placeholder="Username"
                        value={form.spotify}
                        onChange={handleChange}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Crypto</div>
                <div className="form-field">
                  <label>Solana Wallet Address</label>
                  <input
                    type="text"
                    name="solana"
                    placeholder="Solana address"
                    value={form.solana}
                    onChange={handleChange}
                    className="profile-auth-input"
                    maxLength={100}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-actions-centered">
            <button
              type="button"
              className="pef-btn pef-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pef-btn pef-btn-save"
              disabled={saving}
            >
              {saving ? (
                <><span className="pef-spinner" /> Saving…</>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImprovedAvatarCanvas({ onSave, width = 200, height = 200 }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#8b5cf6");
  const [brush, setBrush] = useState(8);
  const [bgColor, setBgColor] = useState("#ffffff");
  const BG_COLORS = [
    "#ffffff",
    "#f3f4f6",
    "#23234a",
    "#1a1a2e",
    "#fef3c7",
    "#dbeafe",
  ];
  const BRUSH_COLORS = [
    "#000000",
    "#8b5cf6",
    "#10b981",
    "#ef4444",
    "#f59e0b",
    "#3b82f6",
    "#ec4899",
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }, [bgColor, width, height]);

  const startDraw = (e) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brush;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const stopDraw = () => setDrawing(false);

  return (
    <div className="avatar-canvas-container-compact">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="avatar-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
      />
      <div className="canvas-controls-compact">
        <div className="canvas-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">BG</span>
            <div className="color-swatches-inline">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBgColor(c)}
                  className={`color-swatch-small${
                    bgColor === c ? " active" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">Brush</span>
            <div className="color-swatches-inline">
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`color-swatch-small${
                    color === c ? " active" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">Size: {brush}px</span>
            <input
              type="range"
              min={2}
              max={24}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              className="brush-slider-compact"
            />
          </div>
        </div>
        <div className="canvas-actions-compact">
          <button
            type="button"
            onClick={() => {
              const ctx = canvasRef.current.getContext("2d");
              ctx.fillStyle = bgColor;
              ctx.fillRect(0, 0, width, height);
            }}
            className="canvas-btn-secondary"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onSave(canvasRef.current.toDataURL("image/png"))}
            className="canvas-btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
