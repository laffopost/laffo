import { memo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PostCard.css";
import { EditIcon, ChatIcon, ShareIcon, EmojiIcon, MusicIcon, BookmarkIcon } from "../../utils/icons";
import StatusRenderer from "./StatusRenderer";
import PollRenderer from "./PollRenderer";
import LinkPreview from "../common/LinkPreview";

const AVAILABLE_REACTIONS = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];

function formatCardDate(ts) {
  if (!ts) return null;
  let d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const PostCard = memo(
  ({
    post,
    onClick,
    sectionType,
    onShare,
    onComment,
    reactions,
    onReactionClick,
    userReaction,
    isSelected,
    canEdit,
    onEdit,
    isBookmarked,
    onToggleBookmark,
  }) => {
    const allReactions = Object.entries(reactions || {}).sort(
      (a, b) => b[1] - a[1],
    );
    const topReactions = allReactions.slice(0, 4);

    const [showMoreReactions, setShowMoreReactions] = useState(false);
    const moreBtnRef = useRef(null);
    const popoverRef = useRef(null);

    const navigate = useNavigate();

    const formatTimeLeft = (endsAt) => {
      if (!endsAt) return null;
      const ms = endsAt - Date.now();
      if (ms <= 0) return { label: "Expired", expired: true };

      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);

      if (days > 0) return { label: `${days}d left`, expired: false };
      if (hours > 0) return { label: `${hours}h left`, expired: false };
      if (minutes > 0) return { label: `${minutes}m left`, expired: false };
      return { label: `${seconds}s left`, expired: false };
    };

    const timeLeft = formatTimeLeft(post.endsAt);

    // Removed: was creating new Audio() on every hover = memory leak + CPU spike
    // The global click sound hook already handles interaction sounds
    const handleMouseEnter = () => {};

    const handleAuthorClick = (e) => {
      e.stopPropagation();
      if (post.author) {
        navigate(`/profile/${encodeURIComponent(post.author.toLowerCase())}`);
      }
    };

    const handlePopoverEnter = () => {
      setShowMoreReactions(true);
    };

    const handlePopoverLeave = () => {
      setTimeout(() => setShowMoreReactions(false), 150);
    };

    const handlePopoverToggle = (e) => {
      e.stopPropagation();
      setShowMoreReactions((prev) => !prev);
    };

    const authorAvatar = post.authorAvatar;

    return (
      <>
        <div
          className={`image-card${isSelected ? " selected" : ""}`}
          onMouseEnter={handleMouseEnter}
        >
          <div className="image-thumbnail" onClick={onClick}>
            {/* Show appropriate content based on post type */}
            {post.type === "status" ? (
              <StatusRenderer
                status={post.status}
                bgColor={post.bgColor}
                textColor={post.textColor}
                className="post-status-thumbnail"
              />
            ) : post.type === "poll" ? (
              <PollRenderer
                question={post.question}
                options={post.options || []}
                bgColor={post.bgColor}
                voteCounts={post.voteCounts}
                endsAt={post.endsAt}
                compact={true}
                className="post-poll-thumbnail"
              />
            ) : post.type === "media" && post.embedUrl ? (
              <div className="media-thumbnail-preview">
                {post.mediaType === "youtube" ? (
                  // Extract video ID and show YouTube thumbnail
                  <img
                    src={
                      post.image ||
                      `https://img.youtube.com/vi/${
                        post.embedUrl.match(/embed\/([^?]+)/)?.[1] || ""
                      }/maxresdefault.jpg`
                    }
                    alt={post.title}
                    className="post-image media-preview"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to default quality if maxres doesn't exist
                      e.target.src = `https://img.youtube.com/vi/${
                        post.embedUrl.match(/embed\/([^?]+)/)?.[1] || ""
                      }/hqdefault.jpg`;
                    }}
                  />
                ) : post.mediaType === "spotify" ? (
                  // Show Spotify icon for audio
                  <div className="spotify-thumbnail">
                    <MusicIcon size={18} className="spotify-icon" style={{color: '#1DB954'}} />
                    <span className="spotify-label">Spotify</span>
                  </div>
                ) : (
                  // Fallback for other media
                  <div className="media-fallback-thumbnail">
                    <span className="media-icon">🎥</span>
                  </div>
                )}
                {/* Media badge overlay */}
                <div className="media-type-badge">
                  {post.mediaType === "youtube" ? "▶️ YouTube" : <><MusicIcon size={14} style={{display: 'inline', marginRight: '4px'}} /> Spotify</>}
                </div>
              </div>
            ) : (
              <img
                src={post.image}
                alt={post.title}
                className="post-image"
                loading="lazy"
              />
            )}

            <div className="image-overlay">
              {post.badge && (
                <span className="image-badge sponsored">{post.badge}</span>
              )}
              <div className="image-meta-overlay">
                <span
                  className="image-author-overlay clickable-author"
                  onClick={handleAuthorClick}
                  title="View profile"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {authorAvatar && (
                    <img
                      src={authorAvatar}
                      alt="avatar"
                      loading="lazy"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginRight: 4,
                        border: "1.5px solid #8b5cf6",
                        background: "#23234a",
                      }}
                    />
                  )}
                  {post.author || "Anonymous"}
                </span>
                <span
                  className={
                    "image-type-badge-overlay" +
                    (post.type === "user" ? " user-type-badge" : "")
                  }
                >
                  {post.type || "all"}
                </span>
              </div>
              {/* Expiry chip positioned below type badge */}
              {timeLeft && (
                <div className="image-overlay-bottom">
                  <span
                    className={`image-expiry-chip${timeLeft.expired ? " expired" : ""}`}
                  >
                    ⏱ {timeLeft.label}
                  </span>
                </div>
              )}
            </div>
            <div className={`animated-image-bg bg-${sectionType}`}></div>
          </div>
          <div className="image-info">
            <div className="image-info-title-row">
              <h4 onClick={onClick}>
                {post.type === "user" ? post.author : post.title}
              </h4>
              {post.edited && (
                <span className="post-edited-chip">edited</span>
              )}
            </div>
            {post.type !== "user" && post.description && (
              <p className="image-info-desc">{post.description}</p>
            )}
            <LinkPreview text={post.description || post.status || ""} />

            {topReactions.length > 0 && (
              <div className="image-reactions-preview">
                {topReactions.map(([emoji, count]) => (
                  <button
                    key={emoji}
                    className={`reaction-preview clickable ${
                      userReaction === emoji ? "user-selected" : ""
                    }`}
                    title={`Click to react with ${emoji}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReactionClick(post.id, emoji);
                    }}
                  >
                    <span className="reaction-emoji-char">{emoji}</span>
                    <span className="reaction-count-char">{count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="image-actions-row">
              {canEdit && onEdit && (
                <button
                  className="image-action-btn edit-btn"
                  title="Edit post"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(post);
                  }}
                >
                  <EditIcon size={13} />
                </button>
              )}

              <button
                className="image-action-btn small-comment"
                title="Comment"
                onClick={(e) => {
                  e.stopPropagation();
                  onComment(post);
                }}
              >
                <ChatIcon size={15} />
                <span className="comment-count">{post.commentCount || 0}</span>
              </button>

              <div
                className="reaction-more-btn-wrapper"
                onMouseLeave={handlePopoverLeave}
              >
                <button
                  className="reaction-more-btn"
                  title="More reactions"
                  ref={moreBtnRef}
                  onMouseEnter={handlePopoverEnter}
                  onClick={handlePopoverToggle}
                  type="button"
                >
                  <EmojiIcon size={14} />
                </button>
                {showMoreReactions && (
                  <div
                    className="reaction-popover"
                    ref={popoverRef}
                    onMouseEnter={handlePopoverEnter}
                    onMouseLeave={handlePopoverLeave}
                  >
                    {AVAILABLE_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={`reaction-popover-btn${
                          userReaction === emoji ? " selected" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactionClick(post.id, emoji);
                          setShowMoreReactions(false);
                        }}
                        title={`React with ${emoji}`}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {onToggleBookmark && (
                <button
                  className={`image-action-btn small-bookmark${isBookmarked ? " bookmarked" : ""}`}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(post.id);
                  }}
                >
                  <BookmarkIcon size={15} />
                </button>
              )}

              <div className="share-container-gallery">
                <button
                  className="image-action-btn small-share"
                  title="Share"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(post);
                  }}
                >
                  <ShareIcon size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export default PostCard;
