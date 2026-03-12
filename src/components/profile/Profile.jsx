import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import TikTokLogo from "../../assets/tiktok.png";
import TwitterLogo from "../../assets/twitter.png";
import TelegramLogo from "../../assets/telegram.png";
import SpotifyLogo from "../../assets/spotify.png";
import InstagramLogo from "../../assets/instagram.png";
import FacebookLogo from "../../assets/facebook.png";
import { compressAvatar } from "../../utils/imageCompression";
import "./Profile.css";

import logger from "../../utils/logger";
export default function Profile() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [avatarPhoto, setAvatarPhoto] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarDraw, setAvatarDraw] = useState(false);
  const [status, setStatus] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [spotify, setSpotify] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [twitter, setTwitter] = useState("");
  const [solana, setSolana] = useState("");
  const [website, setWebsite] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (firebaseUser && !firebaseUser.isAnonymous && userProfile?.username) {
      const username = userProfile?.username;
      navigate(`/profile/${username}`, { replace: true });
    }
  }, [firebaseUser, userProfile, navigate]);

  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) {
      navigate("/profile", { replace: true });
    }
  }, [firebaseUser, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    let loginEmail = loginInput;
    if (!loginInput.trim()) {
      setError("Username or email is required.");
      setLoggingIn(false);
      return;
    }
    if (!loginInput.includes("@")) {
      try {
        const q = query(
          collection(db, "users"),
          where("username", "==", loginInput.trim().toLowerCase()),
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError("No user found with that username.");
          setLoggingIn(false);
          return;
        }
        const userDoc = querySnapshot.docs[0];
        loginEmail = userDoc.data().email;
      } catch (_err) {
        setError("Error looking up username.");
        setLoggingIn(false);
        return;
      }
    }
    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      setLoginInput("");
      setPassword("");
      // Success notification handled by parent
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setLoggingIn(false);
    }
  };

  const handleAvatarPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Avatar photo must be less than 5MB.");
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Compress avatar aggressively
          const result = await compressAvatar(reader.result);
          setAvatarPhoto(result.data);
          setAvatarPreview(result.data);
          logger.log(`✅ Avatar compressed by ${result.reduction}%`);
        } catch (error) {
          logger.error("❌ Avatar compression failed:", error);
          setError("Failed to process avatar image");
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPhoto(null);
      setAvatarPreview(null);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const userData = {
        username: username.trim().toLowerCase(),
        email: email.trim(),
        createdAt: userCredential.user.metadata?.creationTime
          ? Timestamp.fromDate(
              new Date(userCredential.user.metadata.creationTime),
            )
          : null,
        lastLogin: userCredential.user.metadata?.lastSignInTime
          ? Timestamp.fromDate(
              new Date(userCredential.user.metadata.lastSignInTime),
            )
          : null,
        uid: userCredential.user.uid,
        status,
        facebook,
        instagram,
        telegram,
        spotify,
        tiktok,
        twitter,
        solana,
        website,
        favoriteSong,
        location,
        birthday,
        avatar: avatarPhoto,
      };
      await setDoc(doc(db, "users", userCredential.user.uid), userData, {
        merge: true,
      });

      setEmail("");
      setPassword("");
      setUsername("");
      setAvatarPhoto(null);
      setAvatarPreview(null);
      setAvatarDraw(false);
      setStatus("");
      setFacebook("");
      setInstagram("");
      setTelegram("");
      setSpotify("");
      setTiktok("");
      setTwitter("");
      setSolana("");
      setWebsite("");
      setFavoriteSong("");
      setLocation("");
      setBirthday("");
      setIsSignUp(false);
      toast.success("Account created!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Logged in with Google!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setLoggingIn(false);
    }
  };

  if (loading || loggingIn) {
    return (
      <div className="profile-auth-loading">
        <div className="profile-spinner" />
        Loading...
      </div>
    );
  }

  if (!firebaseUser || firebaseUser.isAnonymous) {
    return (
      <>
        <div className="profile-auth-form">
          <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin}>
            {isSignUp ? (
              <>
                {/* Required fields */}
                <div>
                  <label>Username *</label>
                  <input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="profile-auth-input"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label>Email *</label>
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="profile-auth-input"
                  />
                </div>
                <div>
                  <label>Password *</label>
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="profile-auth-input"
                  />
                </div>

                {/* Optional fields toggle */}
                <button
                  type="button"
                  className="profile-optional-toggle"
                  onClick={() => setShowOptionalFields((v) => !v)}
                >
                  {showOptionalFields ? "− Hide" : "+ Add More Details"}{" "}
                  (Optional)
                </button>

                {showOptionalFields && (
                  <div className="profile-auth-form-grid">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label>Avatar Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarPhotoChange}
                        className="profile-auth-input"
                      />
                      <button
                        type="button"
                        className="profile-auth-toggle-btn"
                        style={{ marginTop: 6, marginBottom: 6 }}
                        onClick={() => setAvatarDraw((v) => !v)}
                      >
                        {avatarDraw ? "Cancel Drawing" : "🎨 Draw Avatar"}
                      </button>
                      {avatarDraw && (
                        <ImprovedAvatarCanvas
                          onSave={(img) => {
                            setAvatarPhoto(img);
                            setAvatarPreview(img);
                            setAvatarDraw(false);
                          }}
                        />
                      )}
                      {avatarPreview && (
                        <div style={{ marginTop: 8, textAlign: "center" }}>
                          <img
                            src={avatarPreview}
                            alt="Avatar Preview"
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "3px solid #8b5cf6",
                              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label>Status</label>
                      <input
                        type="text"
                        placeholder="Status (bio, mood, etc)"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                    {/* Socials in 2 columns */}
                    <div>
                      <label>Facebook</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={FacebookLogo}
                          alt="FB"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="Facebook"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Instagram</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={InstagramLogo}
                          alt="IG"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="Instagram"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Telegram</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={TelegramLogo}
                          alt="TG"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="Telegram"
                          value={telegram}
                          onChange={(e) => setTelegram(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Spotify</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={SpotifyLogo}
                          alt="Spotify"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="Spotify"
                          value={spotify}
                          onChange={(e) => setSpotify(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>TikTok</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={TikTokLogo}
                          alt="TikTok"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="TikTok"
                          value={tiktok}
                          onChange={(e) => setTiktok(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Twitter</label>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={TwitterLogo}
                          alt="Twitter"
                          width={18}
                          height={18}
                        />
                        <input
                          type="text"
                          placeholder="Twitter"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          className="profile-auth-input"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Solana</label>
                      <input
                        type="text"
                        placeholder="Solana Address"
                        value={solana}
                        onChange={(e) => setSolana(e.target.value)}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label>Website</label>
                      <input
                        type="url"
                        placeholder="Website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="profile-auth-input"
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label>Favorite Song</label>
                      <input
                        type="text"
                        placeholder="Song"
                        value={favoriteSong}
                        onChange={(e) => setFavoriteSong(e.target.value)}
                        className="profile-auth-input"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label>Location</label>
                      <input
                        type="text"
                        placeholder="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="profile-auth-input"
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <label>Birthday</label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="profile-auth-input"
                        style={{ color: "#a5b4fc" }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <input
                    type="text"
                    placeholder="Username or Email"
                    autoComplete="username"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                    className="profile-auth-input"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="profile-auth-input"
                  />
                </div>
              </>
            )}
            <button type="submit" className="profile-auth-login-btn">
              {isSignUp ? "Sign Up" : "Log in"}
            </button>
          </form>
          <div className="profile-auth-divider">or</div>
          <button
            className="profile-auth-google-btn"
            onClick={handleGoogleLogin}
          >
            <span className="google-icon" /> Log in with Google
          </button>
          <div style={{ marginTop: "1rem" }}>
            {isSignUp ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  className="profile-auth-toggle-btn"
                  onClick={() => setIsSignUp(false)}
                  style={{
                    color: "#8b5cf6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Log In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="profile-auth-toggle-btn"
                  onClick={() => setIsSignUp(true)}
                  style={{
                    color: "#8b5cf6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>
          {error && <div className="profile-auth-error">{error}</div>}
        </div>
      </>
    );
  }
}

function ImprovedAvatarCanvas({ onSave, width = 240, height = 240 }) {
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL("image/png"));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  };

  return (
    <div
      style={{
        margin: "12px 0",
        background: "rgba(0,0,0,0.2)",
        padding: 16,
        borderRadius: 12,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: "3px solid #8b5cf6",
          borderRadius: 12,
          cursor: "crosshair",
          display: "block",
          margin: "0 auto",
          maxWidth: "100%",
          height: "auto",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
      />
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <label
            style={{
              color: "#a5b4fc",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 6,
              display: "block",
            }}
          >
            Background
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBgColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: c,
                  border:
                    bgColor === c
                      ? "3px solid #8b5cf6"
                      : "2px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              color: "#a5b4fc",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 6,
              display: "block",
            }}
          >
            Brush Color
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BRUSH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: c,
                  border:
                    color === c
                      ? "3px solid #10b981"
                      : "2px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              color: "#a5b4fc",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 6,
              display: "block",
            }}
          >
            Brush Size: {brush}px
          </label>
          <input
            type="range"
            min={2}
            max={32}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#8b5cf6" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleClear}
            className="profile-auth-toggle-btn"
            style={{ flex: 1 }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="profile-auth-login-btn"
            style={{ flex: 1 }}
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
