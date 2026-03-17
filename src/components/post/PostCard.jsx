import { memo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PostCard.css";
import clickSound from "../../assets/click.mp3";
import commentIcon from "../../assets/comment.png";
import shareIcon from "../../assets/share.png";
import moreIcon from "../../assets/more.png";
import StatusRenderer from "./StatusRenderer";
import PollRenderer from "./PollRenderer";

const AVAILABLE_REACTIONS = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];

const PostCard = memo(
  ({
    image,
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
  }) => {
    const allReactions = Object.entries(reactions || {}).sort(
      (a, b) => b[1] - a[1],
    );
    const topReactions = allReactions.slice(0, 5);

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

    const timeLeft = formatTimeLeft(image.endsAt);

    const handleMouseEnter = () => {
      if (
        typeof window !== "undefined" &&
        window.__LAUGHCOIN_SOUND_ON__ !== false
      ) {
        const audio = new Audio(clickSound);
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    };

    const handleAuthorClick = (e) => {
      e.stopPropagation();
      if (image.author) {
        navigate(`/profile/${encodeURIComponent(image.author.toLowerCase())}`);
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

    const authorAvatar = image.authorAvatar;

    return (
      <>
        <div
          className={`image-card${isSelected ? " selected" : ""}`}
          onMouseEnter={handleMouseEnter}
        >
          <div className="image-thumbnail" onClick={onClick}>
            {/* Show appropriate content based on post type */}
            {image.type === "status" ? (
              <StatusRenderer
                status={image.status}
                bgColor={image.bgColor}
                textColor={image.textColor}
                className="post-status-thumbnail"
              />
            ) : image.type === "poll" ? (
              <PollRenderer
                question={image.question}
                options={image.options || []}
                bgColor={image.bgColor}
                voteCounts={image.voteCounts}
                endsAt={image.endsAt}
                compact={true}
                className="post-poll-thumbnail"
              />
            ) : image.type === "media" && image.embedUrl ? (
              <div className="media-thumbnail-preview">
                {image.mediaType === "youtube" ? (
                  // Extract video ID and show YouTube thumbnail
                  <img
                    src={
                      image.image ||
                      `https://img.youtube.com/vi/${
                        image.embedUrl.match(/embed\/([^?]+)/)?.[1] || ""
                      }/maxresdefault.jpg`
                    }
                    alt={image.title}
                    className="post-image media-preview"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to default quality if maxres doesn't exist
                      e.target.src = `https://img.youtube.com/vi/${
                        image.embedUrl.match(/embed\/([^?]+)/)?.[1] || ""
                      }/hqdefault.jpg`;
                    }}
                  />
                ) : image.mediaType === "spotify" ? (
                  // Show Spotify icon for audio
                  <div className="spotify-thumbnail">
                    <span className="spotify-icon">🎵</span>
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
                  {image.mediaType === "youtube" ? "▶️ YouTube" : "🎵 Spotify"}
                </div>
              </div>
            ) : (
              <img
                src={image.image}
                alt={image.title}
                className="post-image"
                loading="lazy"
              />
            )}

            <div className="image-overlay">
              {image.badge && (
                <span className="image-badge sponsored">{image.badge}</span>
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
                  {image.author || "Anonymous"}
                </span>
                <span
                  className={
                    "image-type-badge-overlay" +
                    (image.type === "user" ? " user-type-badge" : "")
                  }
                >
                  {image.type || "all"}
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
                {image.type === "user" ? image.author : image.title}
              </h4>
              {image.edited && (
                <span className="post-edited-chip">edited</span>
              )}
            </div>
            {image.type !== "user" && image.description && (
              <p className="image-info-desc">{image.description}</p>
            )}
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
                      onReactionClick(image.id, emoji);
                    }}
                  >
                    {emoji} {count}
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
                    onEdit(image);
                  }}
                >
                  ✏️
                </button>
              )}

              <button
                className="image-action-btn small-comment"
                title="Comment"
                onClick={(e) => {
                  e.stopPropagation();
                  onComment(image);
                }}
              >
                <img src={commentIcon} alt="Comment" className="action-icon" />
                <span className="comment-count">{image.commentCount || 0}</span>
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
                  <img src={moreIcon} alt="More" className="more-icon" />
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
                          onReactionClick(image.id, emoji);
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

              <div className="share-container-gallery">
                <button
                  className="image-action-btn small-share"
                  title="Share"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(image);
                  }}
                >
                  <img src={shareIcon} alt="Share" className="action-icon" />
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
