import { useState, useEffect, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUnreadMessageCount } from "../../hooks/useUnreadMessageCount";
import { NotificationBell } from "../features/utilities";
import { ThemeToggle } from "../common";
import laughLogo from "../../assets/laugh.png";
import "./Header.css";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

const MOTTOS = [
  "Because laughter is the best investment.",
  "HODL and laugh your way to the moon! 🚀",
  "Where memes meet money. 💰",
  "The only coin that makes you smile. 😂",
  "Serious gains, hilarious community. 💎",
  "Laughing all the way to the bank. 🏦",
  "Degen by day, comedian by night. 🌙",
  "Making crypto fun again! 🎉",
];

const SOUND_KEY = "laughcoin_sound_on";

function TypingMotto() {
  const [mottoIndex, setMottoIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentMotto = MOTTOS[mottoIndex];
    const typingSpeed = isDeleting ? 30 : 80;
    const pauseAfterComplete = 3000;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentMotto.length) {
        setDisplayedText(currentMotto.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === currentMotto.length) {
        setTimeout(() => setIsDeleting(true), pauseAfterComplete);
      } else if (isDeleting && charIndex > 0) {
        setDisplayedText(currentMotto.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setMottoIndex((mottoIndex + 1) % MOTTOS.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, mottoIndex]);

  return (
    <span className="logo-desc">
      {displayedText}
      <span className="typing-cursor">|</span>
    </span>
  );
}

const Header = memo(function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, userProfile } = useAuth();
  const unreadMessageCount = useUnreadMessageCount();
  const [soundOn, setSoundOn] = useState(() => {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setNavDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundOn ? "true" : "false");
    window.__LAUGHCOIN_SOUND_ON__ = soundOn;
  }, [soundOn]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handler = (e) => {
      // Only close if click is outside BOTH the button and the dropdown
      if (
        !e.target.closest(".header-user-btn") &&
        !e.target.closest(".header-user-dropdown")
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userDropdownOpen]);

  // Helper for profile navigation
  const goToProfile = () => {
    // Always use username if present
    if (userProfile?.username) {
      navigate(`/profile/${userProfile.username}`);
    } else {
      navigate("/profile");
    }
    setUserDropdownOpen(false);
  };

  // Log out handler
  const handleLogout = async () => {
    setUserDropdownOpen(false);
    try {
      await signOut(auth);
      navigate("/profile", { replace: true });
    } catch (_err) {
      // Optionally handle error
    }
  };

  // --- User avatar/username logic ---
  let userSection = null;
  if (firebaseUser && !firebaseUser.isAnonymous) {
    const avatar = userProfile?.avatar || firebaseUser.photoURL || null;
    // Always use username if present
    const username = userProfile?.username;
    userSection = (
      <div style={{ position: "relative" }}>
        <button
          className="header-user-btn"
          onClick={() => setUserDropdownOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 8px",
          }}
          title="User menu"
        >
          {avatar ? (
            <img
              src={avatar}
              alt="avatar"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #8b5cf6",
                background: "#23234a",
              }}
            />
          ) : (
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#23234a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 18,
                border: "2px solid #8b5cf6",
              }}
            >
              {(username && username[0]?.toUpperCase()) || "U"}
            </span>
          )}
          <span
            style={{
              color: "#fff",
              fontWeight: 500,
              fontSize: 15,
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {username || "User"}
          </span>
          <span style={{ color: "#fff", fontSize: 18, marginLeft: 2 }}>▼</span>
        </button>
        {userDropdownOpen && (
          <div
            className="header-user-dropdown"
            style={{
              position: "absolute",
              right: 0,
              top: 40,
              background: "#23234a",
              borderRadius: 10,
              boxShadow: "0 4px 16px #23234a44",
              minWidth: 140,
              zIndex: 100,
              padding: "8px 0",
              border: "1px solid #8b5cf6",
            }}
          >
            <button
              className="header-user-dropdown-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "#fff",
                padding: "10px 18px",
                textAlign: "left",
                fontSize: 15,
                cursor: "pointer",
              }}
              onClick={goToProfile}
            >
              Profile
            </button>
            <button
              className="header-user-dropdown-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "#fff",
                padding: "10px 18px",
                textAlign: "left",
                fontSize: 15,
                cursor: "pointer",
              }}
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    );
  } else {
    userSection = (
      <button
        className="header-login-btn"
        onClick={() => {
          // Always go to /profile or /profile/{username} if available
          if (userProfile?.username) {
            navigate(`/profile/${userProfile.username}`);
          } else {
            navigate("/profile");
          }
        }}
        style={{
          background: "#8b5cf6",
          color: "#fff",
          border: "none",
          borderRadius: 18,
          padding: "6px 18px",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
          marginLeft: 12,
        }}
      >
        Log in
      </button>
    );
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <img src={laughLogo} alt="LaughCoin" className="logo-icon" />
            <div className="logo-text-container">
              <div className="token-name">LAFFO</div>
              <div className="token-motto">live & laugh</div>
            </div>
            <TypingMotto />
          </Link>
        </div>

        {/* Mobile: notification + hamburger toggle */}
        <div className="mobile-header-actions">
          {firebaseUser && <NotificationBell />}
          <button
            className={`hamburger-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>

        {/* Overlay for mobile menu */}
        {mobileMenuOpen && (
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <nav
          className={`nav ${mobileMenuOpen ? "nav-open" : ""}`}
          aria-label="Main navigation"
        >
          <div className="header-sound-toggle">
            <button
              className="sound-toggle-btn"
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              onClick={() => setSoundOn((v) => !v)}
              title={
                soundOn
                  ? "Sound is ON (click to mute)"
                  : "Sound is OFF (click to unmute)"
              }
            >
              {soundOn ? (
                <span role="img" aria-label="Sound on" className="sound-icon">
                  🔊
                </span>
              ) : (
                <span role="img" aria-label="Sound off" className="sound-icon">
                  🔇
                </span>
              )}
            </button>
          </div>
          <ThemeToggle />

          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/games"
            className={`nav-link ${
              location.pathname === "/games" ? "active" : ""
            }`}
          >
            Games
          </Link>
          <Link
            to="/messages"
            className={`nav-link ${
              location.pathname === "/messages" ? "active" : ""
            }`}
            style={{ position: "relative" }}
          >
            Messages
            {unreadMessageCount > 0 && (
              <span className="message-notification-badge">
                {unreadMessageCount}
              </span>
            )}
          </Link>
          <Link
            to="/weather"
            className={`nav-link ${
              location.pathname === "/weather" ? "active" : ""
            }`}
          >
            Weather
          </Link>
          <Link
            to="/sports"
            className={`nav-link ${
              location.pathname === "/sports" ? "active" : ""
            }`}
          >
            Sports
          </Link>

          {/* Dropdown Menu */}
          <div
            className="dropdown"
            onMouseLeave={() => setNavDropdownOpen(false)}
          >
            <button
              className="dropdown-toggle"
              onMouseEnter={() => setNavDropdownOpen(true)}
              onClick={() => setNavDropdownOpen(!navDropdownOpen)}
            >
              More ▼
            </button>
            {navDropdownOpen && (
              <div className="dropdown-menu">
                <Link
                  to="/dashboard"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/stocks"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Stocks
                </Link>
                <Link
                  to="/buy"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Buy
                </Link>
                <Link
                  to="/chart"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Chart
                </Link>
                <Link
                  to="/dao"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  DAO
                </Link>
                <Link
                  to="/sponsors"
                  className="dropdown-item"
                  onClick={() => setNavDropdownOpen(false)}
                >
                  Sponsors
                </Link>
              </div>
            )}
          </div>
          {/* --- User section at the end of nav --- */}
          <div className="nav-desktop-only">
            {firebaseUser && <NotificationBell />}
          </div>
          <div className="header-user-section">{userSection}</div>
        </nav>
      </div>
    </header>
  );
});

export default Header;
