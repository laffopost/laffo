import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { usePosts } from "../../../context/PostContext";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import "./PostModalImageSection.css";
import MediaPlayer from "../MediaPlayer";
import StatusRenderer from "../StatusRenderer";
import PollRenderer from "../PollRenderer";
import useRequireAuth from "../../../hooks/useRequireAuth";
import { ShareIcon, EmojiIcon, EditIcon, DeleteIcon, ShuffleIcon, MessageIcon } from "../../../utils/icons";

export default function PostModalImageSection({
  image,
  isMediaPost,
  canDelete,
  onRandom,
  onDeleteRequest,
  canEdit,
  onEditRequest,
}) {
  const {
    toggleReaction,
    getReactions,
    getUserReaction,
    images,
    votePoll,
    getUserPollVote,
  } = usePosts();

  // Always use live data from context so votes update immediately without reload
  const liveImage = images.find((img) => img.id === image.id) || image;

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("post");
  const [userData, setUserData] = useState(image.userProfileData || null);
  const shareMenuRef = useRef(null);
  const reactionPickerRef = useRef(null);

  const { firebaseUser } = useAuth();
  const { requireAuth } = useRequireAuth();

  const availableReactions = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];
  const reactions = getReactions(image.id);
  const userReaction = getUserReaction(image.id);
  const allReactions = Object.entries(reactions).sort((a, b) => b[1] - a[1]);
  const displayedReactions = allReactions.slice(0, 5);

  const toggleReactionPicker = (e) => {
    e.stopPropagation();
    if (!requireAuth("react to a post")) return;
    setShowReactionPicker((prev) => !prev);
  };

  const handleReactionClick = (emoji, _e) => {
    _e.stopPropagation();
    if (!requireAuth("react to a post")) return;
    toggleReaction(image.id, emoji);
    setShowReactionPicker(false);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/image/${image.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const shareToSocial = (platform) => {
    const text = `Check out this post on LaughCoin!`;
    const url = `${window.location.origin}/image/${image.id}`;
    const links = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text,
      )}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(
        url,
      )}&text=${encodeURIComponent(text)}`,
      discord: `https://discord.com/channels/@me?message=${encodeURIComponent(
        `${text} ${url}`,
      )}`,
      reddit: `https://reddit.com/submit?url=${encodeURIComponent(
        url,
      )}&title=${encodeURIComponent(text)}`,
    };
    if (links[platform]) {
      window.open(links[platform], "_blank");
    }
    setShowShareMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target)
      ) {
        setShowReactionPicker(false);
      }
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target)
      ) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchUser() {
      if (image.uploadedBy) {
        try {
          const userDoc = await getDoc(doc(db, "users", image.uploadedBy));
          if (userDoc.exists() && !ignore) {
            setUserData(userDoc.data());
          }
        } catch (_e) {
          // fallback to image.userProfileData if exists
        }
      }
    }
    fetchUser();
    return () => {
      ignore = true;
    };
  }, [image.uploadedBy]);

  // Tabs UI
  const showTabs = image.type === "user-profile" || !!userData;

  // Calculate user stats
  const userPosts = images.filter(
    (img) =>
      img.author?.toLowerCase() === image.author?.toLowerCase() ||
      img.uploadedBy === image.uploadedBy,
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

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    if (typeof ts === "object" && ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    if (typeof ts === "string" || typeof ts === "number") {
      return new Date(ts).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return null;
  };

  const renderUserTab = () => {
    // User details tab
    const profile = userData || {};
    const avatar =
      profile.avatar ||
      image.authorAvatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.username || image.author || "U",
      )}&background=8b5cf6&color=fff&size=200`;

    const hasInfo = profile.location || profile.solana || profile.lastLogin;

    return (
      <div className="postmodal-user-card">
        <div className="postmodal-user-card-body">
          <img src={avatar} alt="avatar" className="postmodal-user-avatar" />
          <div className="postmodal-user-header">
            <div className="postmodal-user-info-top">
              <div className="postmodal-user-username">
                @{profile.username || image.author}
              </div>
              {profile.status && (
                <div className="postmodal-user-status">{profile.status}</div>
              )}
            </div>
          </div>

          <div className="postmodal-user-stats">
            <div className="postmodal-stat-card">
              <span className="postmodal-stat-value">{totalPosts}</span>
              <span className="postmodal-stat-label">Posts</span>
            </div>
            <div className="postmodal-stat-card">
              <span className="postmodal-stat-value">{totalReactions}</span>
              <span className="postmodal-stat-label">Reactions</span>
            </div>
            <div className="postmodal-stat-card">
              <span className="postmodal-stat-value">{totalComments}</span>
              <span className="postmodal-stat-label">Comments</span>
            </div>
          </div>

          {hasInfo && (
            <div className="postmodal-user-details">
              {profile.location && (
                <div className="postmodal-detail-item">
                  <span className="postmodal-detail-icon">📍</span>
                  <span className="postmodal-detail-text">
                    {profile.location}
                  </span>
                </div>
              )}
              {profile.lastLogin && (
                <div className="postmodal-detail-item">
                  <span className="postmodal-detail-icon">🕒</span>
                  <span className="postmodal-detail-text">
                    Active: {formatTimestamp(profile.lastLogin)}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="postmodal-user-actions">
            <button
              className="postmodal-user-profile-btn"
              onClick={() =>
                window.location.assign(
                  `/profile/${encodeURIComponent(profile.username || image.author)}`,
                )
              }
            >
              👤 View Profile
            </button>
            {firebaseUser &&
              !firebaseUser.isAnonymous &&
              image.uploadedBy &&
              image.uploadedBy !== firebaseUser.uid && (
                <button
                  className="postmodal-user-dm-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent("openDM", {
                        detail: {
                          uid: image.uploadedBy,
                          username: profile.username || image.author,
                          avatar: profile.avatar || image.authorAvatar || null,
                        },
                      }),
                    );
                  }}
                >
                  <MessageIcon size={14} /> Send DM
                </button>
              )}
          </div>
        </div>
      </div>
    );
  };

  const displayUsername = userData?.username || image.author || "User";
  const displayAvatar =
    userData?.avatar ||
    image.authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayUsername,
    )}&background=8b5cf6&color=fff&size=64`;

  // Single unified render — toolbar always visible below content
  return (
    <div className="postmodal-content-wrapper">
      {/* Toolbar — above content */}
      <div className="postmodal-toolbar">
        {showTabs && (
          <div className="postmodal-tabs">
            <button
              className={`postmodal-tab-btn${
                activeTab === "post" ? " active" : ""
              }`}
              onClick={() => setActiveTab("post")}
            >
              📸 Post
            </button>
            <button
              className={`postmodal-tab-btn${
                activeTab === "user" ? " active" : ""
              }`}
              onClick={() => setActiveTab("user")}
            >
              <img
                src={displayAvatar}
                alt={displayUsername}
                className="postmodal-tab-avatar"
              />
              <span>@{displayUsername}</span>
            </button>
          </div>
        )}
        <div className="postmodal-toolbar-actions">
          {image.type && (
            <span className="postmodal-type-badge-inline">{image.type}</span>
          )}
          {canEdit && onEditRequest && (
            <button
              className="postmodal-action-btn postmodal-action-btn--edit"
              onClick={onEditRequest}
              title="Edit post"
            >
              <EditIcon size={14} />
            </button>
          )}
          {canDelete && onDeleteRequest && (
            <button
              className="postmodal-action-btn postmodal-action-btn--delete"
              onClick={onDeleteRequest}
              title="Delete post"
            >
              <DeleteIcon size={14} />
            </button>
          )}
          {onRandom && (
            <button
              className="image-modal-random"
              onClick={onRandom}
              title="Random post"
            >
              <ShuffleIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {showTabs && activeTab === "user" ? (
        renderUserTab()
      ) : (
        <div className="image-modal-display">
          {image.type === "status" ? (
            <StatusRenderer
              status={image.status}
              bgColor={image.bgColor}
              textColor={image.textColor}
              className="modal-status"
            />
          ) : image.type === "poll" ? (
            <PollRenderer
              question={liveImage.question}
              description={liveImage.description}
              options={liveImage.options || []}
              bgColor={liveImage.bgColor}
              voteCounts={liveImage.voteCounts}
              userVote={getUserPollVote(liveImage.id)}
              endsAt={liveImage.endsAt}
              onVote={(optionIndex) => {
                if (!requireAuth("vote on a poll")) return;
                votePoll(liveImage.id, optionIndex);
              }}
              compact={false}
              className="modal-poll"
            />
          ) : isMediaPost ? (
            <MediaPlayer image={image} />
          ) : (
            <img
              src={image.image || image.imageUrl}
              alt={image.title}
              className="modal-image"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Reactions + info — post tab only */}
      {(!showTabs || activeTab === "post") && (
        <>
          <div className="image-modal-reactions">
            <div className="reactions-display">
              {displayedReactions.length > 0 ? (
                <>
                  {displayedReactions.map(([emoji, count]) => (
                    <button
                      key={emoji}
                      className={`reaction-bubble ${
                        userReaction === emoji ? "active" : ""
                      }`}
                      onClick={(e) => handleReactionClick(emoji, e)}
                      title={`${count} reaction${count !== 1 ? "s" : ""}`}
                    >
                      <span className="reaction-emoji">{emoji}</span>
                      <span className="reaction-count">{count}</span>
                    </button>
                  ))}
                </>
              ) : (
                <span className="no-reactions">No reactions yet</span>
              )}
            </div>

            <div className="reaction-actions-group">
              <div className="reaction-add-container" ref={reactionPickerRef}>
                <button
                  className="add-reaction-btn"
                  onClick={toggleReactionPicker}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  onMouseLeave={() => setShowReactionPicker(false)}
                >
                  <EmojiIcon size={14} />
                  React
                </button>
                {showReactionPicker && (
                  <div
                    className="reaction-picker"
                    onMouseEnter={() => setShowReactionPicker(true)}
                    onMouseLeave={() => setShowReactionPicker(false)}
                  >
                    {availableReactions.map((emoji) => (
                      <button
                        key={emoji}
                        className={`reaction-option ${
                          userReaction === emoji ? "selected" : ""
                        }`}
                        onClick={(e) => handleReactionClick(emoji, e)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="reaction-picker-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionPicker(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              <div className="reaction-share-container" ref={shareMenuRef}>
                <button
                  className="reaction-share-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareMenu(!showShareMenu);
                  }}
                >
                  <ShareIcon size={14} />
                  Share
                </button>
                {showShareMenu && (
                  <div className="reaction-share-menu">
                    <button onClick={copyLink} className="share-option">
                      <span>🔗</span> Copy Link
                    </button>
                    <button
                      onClick={() => shareToSocial("twitter")}
                      className="share-option"
                    >
                      <span>🐦</span> Twitter
                    </button>
                    <button
                      onClick={() => shareToSocial("telegram")}
                      className="share-option"
                    >
                      <span>✈️</span> Telegram
                    </button>
                    <button
                      onClick={() => shareToSocial("discord")}
                      className="share-option"
                    >
                      <span>💬</span> Discord
                    </button>
                    <button
                      onClick={() => shareToSocial("reddit")}
                      className="share-option"
                    >
                      <span>🤖</span> Reddit
                    </button>
                    <button
                      className="share-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShareMenu(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
