import { useAuth } from "../../context/AuthContext";
import { usePosts } from "../../context/PostContext";
import PostGallery from "../post/PostGallery";
import { Notification } from "../common";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNotifications } from "../../context/NotificationContext";
import TikTokLogo from "../../assets/tiktok.png";
import TwitterLogo from "../../assets/twitter.png";
import TelegramLogo from "../../assets/telegram.png";
import SpotifyLogo from "../../assets/spotify.png";
import InstagramLogo from "../../assets/instagram.png";
import FacebookLogo from "../../assets/facebook.png";
import ProfileEditForm from "./ProfileEditForm";
import AddPostModal from "../post/AddPostModal";
import CreatePostButton from "../post/CreatePostButton";
import ProfileImageModal from "./ProfileImageModal";
import FollowListModal from "./FollowListModal";
import { EditIcon, MessageIcon, ChevronRightIcon } from "../../utils/icons";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { firebaseUser, userProfile } = useAuth();
  const { images, getReactions, addPost } = usePosts();
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [publicProfile, setPublicProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [followListMode, setFollowListMode] = useState(null); // "followers" | "following" | null
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const { createFollowNotification } = useNotifications();

  // Format Firestore timestamp to readable date
  function formatTimestamp(ts) {
    if (!ts) return "N/A";
    const toShort = (date) => {
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      let h = date.getHours();
      const min = String(date.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${d}.${m}.${y} ${h}:${min}${ampm}`;
    };
    if (typeof ts === "object" && ts.seconds) {
      return toShort(new Date(ts.seconds * 1000));
    }
    if (typeof ts === "string" || typeof ts === "number") {
      return toShort(new Date(ts));
    }
    return "N/A";
  }

  // Helper to build correct social URLs
  function getSocialUrl(type, value) {
    if (!value) return null;
    if (value.startsWith("http")) return value;
    switch (type) {
      case "facebook":
        return `https://facebook.com/${value.replace(/^@/, "")}`;
      case "instagram":
        return `https://instagram.com/${value.replace(/^@/, "")}`;
      case "telegram":
        return `https://t.me/${value.replace(/^@/, "")}`;
      case "spotify":
        return `https://open.spotify.com/user/${value.replace(/^@/, "")}`;
      case "tiktok":
        return `https://tiktok.com/@${value.replace(/^@/, "")}`;
      case "twitter":
        return `https://twitter.com/${value.replace(/^@/, "")}`;
      default:
        return value;
    }
  }

  // Fetch public profile by username from Firestore
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      setProfileLoading(true);
      setPublicProfile(null);

      const usernameQuery = routeUsername?.toLowerCase();

      // Try to find by AuthContext if it's the current user
      if (
        userProfile &&
        userProfile.username &&
        userProfile.username.toLowerCase() === usernameQuery
      ) {
        if (isMounted) {
          setPublicProfile(userProfile);
          setProfileLoading(false);
        }
        return;
      }
      // Query users collection for username (lowercase)
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("username", "==", usernameQuery),
        );
        const snapshot = await getDocs(usersQuery);
        let userData = null;
        if (!snapshot.empty) {
          userData = snapshot.docs[0].data();
        }
        if (isMounted) {
          setPublicProfile(userData);
          setProfileLoading(false);
        }
      } catch (_e) {
        if (isMounted) {
          setPublicProfile(null);
          setProfileLoading(false);
        }
      }
    }
    if (routeUsername) fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [routeUsername, userProfile]);

  // Subscribe to followers count (people following this profile)
  useEffect(() => {
    if (!publicProfile?.uid) return;
    const q = query(
      collection(db, "follows"),
      where("followingId", "==", publicProfile.uid),
    );
    const unsub = onSnapshot(q, (snap) => setFollowersCount(snap.size));
    return () => unsub();
  }, [publicProfile?.uid]);

  // Subscribe to following count (people this profile follows)
  useEffect(() => {
    if (!publicProfile?.uid) return;
    const q = query(
      collection(db, "follows"),
      where("followerId", "==", publicProfile.uid),
    );
    const unsub = onSnapshot(q, (snap) => setFollowingCount(snap.size));
    return () => unsub();
  }, [publicProfile?.uid]);

  // Check if current user follows this profile
  useEffect(() => {
    if (!firebaseUser?.uid || !publicProfile?.uid || firebaseUser.uid === publicProfile.uid) {
      setIsFollowing(false);
      return;
    }
    const docId = `${firebaseUser.uid}_${publicProfile.uid}`;
    const unsub = onSnapshot(doc(db, "follows", docId), (snap) => {
      setIsFollowing(snap.exists());
    });
    return () => unsub();
  }, [firebaseUser?.uid, publicProfile?.uid]);

  // Follow / unfollow handler
  const handleFollowToggle = useCallback(async () => {
    if (!firebaseUser?.uid || !publicProfile?.uid || followLoading) return;
    if (firebaseUser.isAnonymous) return;

    const docId = `${firebaseUser.uid}_${publicProfile.uid}`;
    const followRef = doc(db, "follows", docId);

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        setNotification({ message: `Unfollowed ${publicProfile.username}`, type: "info" });
      } else {
        await setDoc(followRef, {
          followerId: firebaseUser.uid,
          followingId: publicProfile.uid,
          createdAt: serverTimestamp(),
        });
        createFollowNotification(publicProfile.uid);
        setNotification({ message: `Following ${publicProfile.username}!`, type: "success" });
      }
    } catch (err) {
      setNotification({ message: "Failed to update follow status", type: "error" });
    } finally {
      setFollowLoading(false);
    }
  }, [firebaseUser, publicProfile, isFollowing, followLoading, createFollowNotification]);

  const handlePostDelete = useCallback((error) => {
    setTimeout(() => {
      if (error) {
        setNotification({
          message: "Failed to delete post. Please try again.",
          type: "error",
        });
      } else {
        setNotification({
          message: "Post deleted successfully! 🗑️",
          type: "success",
        });
      }
    }, 200);
  }, []);

  const handleAddPost = (newPost) => {
    addPost(newPost);
    setShowAddModal(false);
    setNotification({
      message: "Post created successfully! 🎉",
      type: "success",
    });
  };

  if (profileLoading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div className="profile-skeleton-banner shimmer" />
          <div className="profile-skeleton-identity">
            <div className="profile-skeleton-avatar shimmer" />
            <div className="profile-skeleton-name-area">
              <div
                className="profile-skeleton-line shimmer"
                style={{ width: "55%", height: 20 }}
              />
              <div
                className="profile-skeleton-line shimmer"
                style={{ width: "35%", height: 13, marginTop: 7 }}
              />
            </div>
          </div>
          <div className="profile-skeleton-stats">
            {[1, 2, 3].map((i) => (
              <div key={i} className="profile-skeleton-stat shimmer" />
            ))}
          </div>
          <div className="profile-skeleton-body">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="profile-skeleton-line shimmer"
                style={{ width: i % 2 === 0 ? "78%" : "60%", height: 28 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!publicProfile) {
    return (
      <div className="profile-page-not-logged-in">
        <div className="profile-page-card">
          <h2>User not found</h2>
        </div>
      </div>
    );
  }

  // User info
  const displayName =
    publicProfile?.username ||
    publicProfile?.displayName ||
    publicProfile?.email ||
    publicProfile?.uid ||
    routeUsername;
  const avatar = publicProfile?.avatar ? (
    <img
      src={publicProfile.avatar}
      alt="avatar"
      className="profile-avatar-img"
      onClick={() => setShowImageModal(true)}
      style={{ cursor: "pointer" }}
      title="Click to view full image"
    />
  ) : (
    <span className="profile-avatar-fallback">
      {displayName[0]?.toUpperCase() || "U"}
    </span>
  );

  // Use user ID for filtering instead of username to handle username changes
  const usernameForFilter = publicProfile?.uid;

  // User's posts and stats
  const userPosts = images.filter(
    (img) =>
      img.author?.toLowerCase() === publicProfile.username?.toLowerCase() ||
      img.uploadedBy === publicProfile.uid,
  );
  const totalPosts = userPosts.length;
  const totalReactions = userPosts.reduce((sum, post) => {
    const reactions = getReactions(post.id);
    return sum + Object.values(reactions).reduce((a, b) => a + b, 0);
  }, 0);
  const totalComments = userPosts.reduce(
    (sum, post) => sum + (post.commentCount || 0),
    0,
  );

  // Only show logout if this is the logged-in user's profile
  const isOwnProfile =
    firebaseUser &&
    publicProfile &&
    (firebaseUser.uid === publicProfile.uid ||
      firebaseUser.email === publicProfile.email);

  // Logout handler
  const handleLogout = async () => {
    setError("");
    setLoggingOut(true);
    try {
      await signOut(auth);
      setNotification({
        message: "Logged out successfully!",
        type: "info",
      });
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err.message);
      setNotification({
        message: err.message,
        type: "error",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  // Open edit form with prefilled data
  const openEdit = () => {
    setEditFormData({
      username: publicProfile.username || "",
      email: publicProfile.email || "",
      status: publicProfile.status || "",
      facebook: publicProfile.facebook || "",
      instagram: publicProfile.instagram || "",
      telegram: publicProfile.telegram || "",
      spotify: publicProfile.spotify || "",
      tiktok: publicProfile.tiktok || "",
      twitter: publicProfile.twitter || "",
      solana: publicProfile.solana || "",
      website: publicProfile.website || "",
      favoriteSong: publicProfile.favoriteSong || "",
      location: publicProfile.location || "",
      birthday: publicProfile.birthday || "",
      avatar: publicProfile.avatar || "",
    });
    setShowEdit(true);
  };

  // Save handler
  const handleEditSave = async (formData) => {
    setEditSaving(true);
    setError("");
    try {
      // Update Firestore user doc
      await setDoc(
        doc(db, "users", publicProfile.uid),
        {
          ...formData,
          username: formData.username.trim().toLowerCase(),
        },
        { merge: true },
      );
      // Only update Firebase Auth displayName/photoURL if avatar is a short URL
      if (firebaseUser) {
        const profileUpdate = { displayName: formData.username };
        if (
          formData.avatar &&
          typeof formData.avatar === "string" &&
          formData.avatar.length < 900 &&
          formData.avatar.startsWith("http")
        ) {
          profileUpdate.photoURL = formData.avatar;
        }
        await updateProfile(firebaseUser, profileUpdate);
      }
      setNotification({
        message: "Profile updated successfully! 🎉",
        type: "success",
      });
      setShowEdit(false);
      setEditFormData(null);
      // Delay reload to show notification
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError("Failed to update profile: " + err.message);
      setNotification({
        message: err.message,
        type: "error",
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Online indicator ──
  const isOnline = (() => {
    const ls = publicProfile?.lastSeen;
    if (!ls) return false;
    const ms = ls?.seconds
      ? ls.seconds * 1000
      : typeof ls === "string" || typeof ls === "number"
        ? new Date(ls).getTime()
        : null;
    return ms ? Date.now() - ms < 5 * 60 * 1000 : false;
  })();

  // ── Song chip renderer ──
  function renderSong(song) {
    if (!song) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
    const isSpotify =
      song.includes("spotify.com") || song.startsWith("spotify:");
    const isYoutube = song.includes("youtube.com") || song.includes("youtu.be");
    if (isSpotify) {
      return (
        <a
          href={song}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-song-chip profile-song-chip--spotify"
        >
          🎵 Spotify
        </a>
      );
    }
    if (isYoutube) {
      return (
        <a
          href={song}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-song-chip profile-song-chip--youtube"
        >
          ▶️ YouTube
        </a>
      );
    }
    if (song.startsWith("http")) {
      return (
        <a
          href={song}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-song-chip"
        >
          🔗 {song.replace(/^https?:\/\//, "").slice(0, 22)}…
        </a>
      );
    }
    return song;
  }

  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}

      <ProfileImageModal
        isOpen={showImageModal}
        imageUrl={publicProfile?.avatar}
        displayName={publicProfile?.username}
        onClose={() => setShowImageModal(false)}
      />

      <FollowListModal
        isOpen={!!followListMode}
        onClose={() => setFollowListMode(null)}
        userId={publicProfile?.uid}
        mode={followListMode}
      />

      <div className="profile-page">
        <div className="profile-main-card">
          {/* ── Hero Banner ── */}
          <div className="profile-hero-banner">
            {isOwnProfile && (
              <div className="profile-hero-actions">
                <CreatePostButton onClick={() => setShowAddModal(true)} />
                <button className="profile-edit-btn" onClick={openEdit}>
                  <EditIcon size={14} /> Edit
                </button>
                <button
                  className="profile-logout-btn"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            )}
            {!isOwnProfile &&
              firebaseUser &&
              !firebaseUser.isAnonymous &&
              publicProfile?.uid && (
                <div className="profile-hero-actions">
                  <button
                    className={`profile-hero-follow-btn ${isFollowing ? "profile-hero-follow-btn--following" : ""}`}
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? "..."
                      : isFollowing
                        ? "Following"
                        : "Follow"}
                  </button>
                  <button
                    className="profile-hero-dm-btn"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("openDM", {
                          detail: {
                            uid: publicProfile.uid,
                            username: publicProfile.username || routeUsername,
                            avatar: publicProfile.avatar || null,
                          },
                        }),
                      );
                    }}
                  >
                    <MessageIcon size={14} /> Message
                  </button>
                </div>
              )}
          </div>

          {/* ── Identity Row ── */}
          <div className="profile-identity-row">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">{avatar}</div>
              {isOnline && (
                <span className="profile-online-dot" title="Online now" />
              )}
            </div>
            <div className="profile-name-area">
              <h1 className="profile-display-name">{displayName}</h1>
              <div className="profile-username-row">
                <span className="profile-username">
                  @{publicProfile?.username || routeUsername}
                </span>
                <button
                  className="profile-share-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://laughcoin.xyz/@${publicProfile?.username || routeUsername}`,
                    );
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 1500);
                  }}
                  title="Copy profile link"
                >
                  {copiedShare ? "✅" : "🔗"}
                </button>
              </div>
              {publicProfile.status && (
                <p className="profile-status-text">{publicProfile.status}</p>
              )}
            </div>
          </div>

          {error && <div className="profile-auth-error">{error}</div>}

          {/* ── Stats ── */}
          <div className="profile-stats-section">
            <div className="profile-stat">
              <span className="profile-stat-value">{totalPosts}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{totalReactions}</span>
              <span className="profile-stat-label">Reactions</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{totalComments}</span>
              <span className="profile-stat-label">Comments</span>
            </div>
          </div>
          <div className="profile-stats-section profile-stats-follow-row">
            <div
              className="profile-stat profile-stat--clickable"
              onClick={() => setFollowListMode("followers")}
            >
              <span className="profile-stat-value">{followersCount}</span>
              <span className="profile-stat-label">
                Followers <ChevronRightIcon size={18} className="profile-stat-arrow" />
              </span>
            </div>
            <div
              className="profile-stat profile-stat--clickable"
              onClick={() => setFollowListMode("following")}
            >
              <span className="profile-stat-value">{followingCount}</span>
              <span className="profile-stat-label">
                Following <ChevronRightIcon size={18} className="profile-stat-arrow" />
              </span>
            </div>
          </div>

          {/* ── About ── */}
          <div className="profile-section">
            <div className="profile-details-grid">
              <div className="profile-detail-row">
                <span className="profile-detail-label">🎵 Favorite Song</span>
                <span className="profile-detail-value">
                  {renderSong(publicProfile.favoriteSong)}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">📍 Location</span>
                <span className="profile-detail-value">
                  {publicProfile.location || "—"}
                </span>
              </div>
              {publicProfile.website && (
                <div className="profile-detail-row">
                  <span className="profile-detail-label">🌐 Website</span>
                  <a
                    href={
                      publicProfile.website.startsWith("http")
                        ? publicProfile.website
                        : `https://${publicProfile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-detail-value profile-website-link"
                  >
                    {publicProfile.website
                      .replace(/^https?:\/\//, "")
                      .replace(/\/$/, "")}
                  </a>
                </div>
              )}
              <div className="profile-detail-row">
                <span className="profile-detail-label">🎂 Birthday</span>
                <span className="profile-detail-value">
                  {publicProfile.birthday
                    ? (() => {
                        const b = new Date(publicProfile.birthday);
                        const today = new Date();
                        let age = today.getFullYear() - b.getFullYear();
                        const m = today.getMonth() - b.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < b.getDate()))
                          age--;
                        return `${String(b.getDate()).padStart(2, "0")}.${String(b.getMonth() + 1).padStart(2, "0")}.${b.getFullYear()} · ${age} yrs`;
                      })()
                    : "—"}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">📧 Email</span>
                <span className="profile-detail-value profile-detail-value--truncate">
                  {publicProfile.email || "—"}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">📅 Created</span>
                <span className="profile-detail-value">
                  {formatTimestamp(publicProfile.createdAt)}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">🕐 Login</span>
                <span className="profile-detail-value">
                  {formatTimestamp(publicProfile.lastLogin)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Socials ── */}
          <div className="profile-section">
            <div className="profile-socials-icons">
              <a
                href={getSocialUrl("facebook", publicProfile.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                className={`profile-social-icon${publicProfile.facebook ? "" : " disabled"}`}
                tabIndex={publicProfile.facebook ? 0 : -1}
              >
                <img src={FacebookLogo} alt="Facebook" />
              </a>
              <a
                href={getSocialUrl("instagram", publicProfile.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                className={`profile-social-icon${publicProfile.instagram ? "" : " disabled"}`}
                tabIndex={publicProfile.instagram ? 0 : -1}
              >
                <img src={InstagramLogo} alt="Instagram" />
              </a>
              <a
                href={getSocialUrl("telegram", publicProfile.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram"
                className={`profile-social-icon${publicProfile.telegram ? "" : " disabled"}`}
                tabIndex={publicProfile.telegram ? 0 : -1}
              >
                <img src={TelegramLogo} alt="Telegram" />
              </a>
              <a
                href={getSocialUrl("spotify", publicProfile.spotify)}
                target="_blank"
                rel="noopener noreferrer"
                title="Spotify"
                className={`profile-social-icon${publicProfile.spotify ? "" : " disabled"}`}
                tabIndex={publicProfile.spotify ? 0 : -1}
              >
                <img src={SpotifyLogo} alt="Spotify" />
              </a>
              <a
                href={getSocialUrl("tiktok", publicProfile.tiktok)}
                target="_blank"
                rel="noopener noreferrer"
                title="TikTok"
                className={`profile-social-icon${publicProfile.tiktok ? "" : " disabled"}`}
                tabIndex={publicProfile.tiktok ? 0 : -1}
              >
                <img src={TikTokLogo} alt="TikTok" />
              </a>
              <a
                href={getSocialUrl("twitter", publicProfile.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                title="Twitter"
                className={`profile-social-icon${publicProfile.twitter ? "" : " disabled"}`}
                tabIndex={publicProfile.twitter ? 0 : -1}
              >
                <img src={TwitterLogo} alt="Twitter" />
              </a>
            </div>
          </div>

          {/* ── Wallet ── */}
          {publicProfile.solana && (
            <div className="profile-section">
              <div className="profile-solana-row">
                <span className="profile-solana-address">
                  {publicProfile.solana}
                </span>
                <button
                  className="profile-solana-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(publicProfile.solana);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                  title="Copy Solana address"
                >
                  {copied ? "✅" : "📋"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="profile-gallery-section">
          <PostGallery
            filterByUsername={usernameForFilter}
            showHeader={false}
            onPostDelete={handlePostDelete}
          />
        </div>
      </div>

      {showAddModal && (
        <AddPostModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPost}
        />
      )}

      {showEdit && isOwnProfile && editFormData && (
        <ProfileEditForm
          initialData={editFormData}
          onSave={handleEditSave}
          onClose={() => {
            setShowEdit(false);
            setEditFormData(null);
          }}
          saving={editSaving}
        />
      )}
    </>
  );
}
