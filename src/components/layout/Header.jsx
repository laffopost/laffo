import { useState, useEffect, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../features/utilities";
import { ThemeToggle, Dropdown } from "../common";
import { VolumeUpIcon, VolumeMuteIcon, HomeIcon, GamesIcon, SportsIcon, WeatherIcon, GridIcon2, MessageIcon } from "../../utils/icons";
import laughLogo from "../../assets/laugh.png";
import "./Header.css";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

const MOTTOS = [
  "Because laughter is the best investment.",
  "HODL and laugh your way to the moon!",
  "Where memes meet money.",
  "The only coin that makes you smile.",
  "Serious gains, hilarious community.",
  "Laughing all the way to the bank.",
  "Making crypto fun again!",
];

const SOUND_KEY = "laughcoin_sound_on";

// Cycle mottos every 6 seconds instead of per-character setTimeout (was ~15-33 re-renders/sec)
function TypingMotto() {
  const [mottoIndex, setMottoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMottoIndex((i) => (i + 1) % MOTTOS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="logo-desc motto-fade" key={mottoIndex}>
      {MOTTOS[mottoIndex]}
    </span>
  );
}

const Header = memo(function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, userProfile } = useAuth();
  // Removed useUnreadMessageCount — it was a duplicate Firestore listener.
  // The badge on /messages nav link is now driven by a lightweight event from DirectMessages.
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  useEffect(() => {
    const handler = (e) => setUnreadMessageCount(e.detail ?? 0);
    window.addEventListener("dm-unread-count", handler);
    return () => window.removeEventListener("dm-unread-count", handler);
  }, []);
  const [soundOn, setSoundOn] = useState(() => {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
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


  // Helper for profile navigation
  const goToProfile = () => {
    if (userProfile?.username) {
      navigate(`/profile/${userProfile.username}`);
    } else {
      navigate("/profile");
    }
  };

  // Log out handler
  const handleLogout = async () => {
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
    const username = userProfile?.username;

    const userLabel = (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
      </span>
    );

    userSection = (
      <Dropdown
        label={userLabel}
        variant="user"
        items={[
          { label: "Profile", onClick: goToProfile },
          { label: "Log out", onClick: handleLogout, isDanger: true },
        ]}
      />
    );
  } else {
    userSection = (
      <button
        className="header-login-btn"
        onClick={() => {
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
    <>
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
                <VolumeUpIcon size={20} className="sound-icon" title="Sound is ON" />
              ) : (
                <VolumeMuteIcon size={20} className="sound-icon" title="Sound is OFF" />
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
          <Dropdown
            label="More"
            items={[
              { label: "Stocks", onClick: () => navigate("/stocks") },
              { label: "Trade / Chart", onClick: () => navigate("/trade") },
              { label: "Sponsors", onClick: () => navigate("/sponsors") },
            ]}
          />
          {/* --- User section at the end of nav --- */}
          <div className="nav-desktop-only">
            {firebaseUser && <NotificationBell />}
          </div>
          <div className="header-user-section">{userSection}</div>
        </nav>
      </div>

    </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <Link to="/" className={`bottom-nav-item${location.pathname === "/" ? " active" : ""}`}>
          <HomeIcon size={22} />
          <span>Home</span>
        </Link>
        <Link to="/games" className={`bottom-nav-item${location.pathname === "/games" ? " active" : ""}`}>
          <GamesIcon size={22} />
          <span>Games</span>
        </Link>
        <Link to="/messages" className={`bottom-nav-item${location.pathname === "/messages" ? " active" : ""}`} style={{ position: "relative" }}>
          <MessageIcon size={22} />
          {unreadMessageCount > 0 && (
            <span className="bottom-nav-badge">{unreadMessageCount}</span>
          )}
          <span>Messages</span>
        </Link>
        <Link to="/sports" className={`bottom-nav-item${location.pathname === "/sports" ? " active" : ""}`}>
          <SportsIcon size={22} />
          <span>Sports</span>
        </Link>
        <Link to="/weather" className={`bottom-nav-item${location.pathname === "/weather" ? " active" : ""}`}>
          <WeatherIcon size={22} />
          <span>Weather</span>
        </Link>
        <button
          className={`bottom-nav-item${["/stocks","/trade","/sponsors"].includes(location.pathname) ? " active" : ""}`}
          onClick={() => setMobileMenuOpen(v => !v)}
        >
          <GridIcon2 size={22} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
});

export default Header;
