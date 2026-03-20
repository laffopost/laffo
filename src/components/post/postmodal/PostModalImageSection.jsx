import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { usePosts } from "../../../context/PostContext";
import { useAuth } from "../../../context/AuthContext";
import { useNotifications } from "../../../context/NotificationContext";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import "./PostModalImageSection.css";
import MediaPlayer from "../MediaPlayer";
import StatusRenderer from "../StatusRenderer";
import PollRenderer from "../PollRenderer";
import CountdownRenderer from "../CountdownRenderer";
import QuizRenderer from "../QuizRenderer";
import useRequireAuth from "../../../hooks/useRequireAuth";
import { ShareIcon, EmojiIcon, EditIcon, DeleteIcon, MessageIcon, UserProfileIcon, ChevronRightIcon } from "../../../utils/icons";
import FollowListModal from "../../profile/FollowListModal";

export default function PostModalImageSection({
  post,
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
    posts,
    votePoll,
    getUserPollVote,
    voteQuiz,
    getUserQuizVote,
  } = usePosts();

  // Always use live data from context so votes update immediately without reload
  const livePost = posts.find((p) => p.id === post.id) || post;

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("post");
  const [userData, setUserData] = useState(post.userProfileData || null);
  const shareMenuRef = useRef(null);
  const reactionPickerRef = useRef(null);

  const { firebaseUser } = useAuth();
  const { createFollowNotification } = useNotifications();
  const { requireAuth } = useRequireAuth();

  // Follow state for the user tab
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followListMode, setFollowListMode] = useState(null);

  const availableReactions = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];
  const reactions = getReactions(post.id);
  const userReaction = getUserReaction(post.id);
  const displayedReactions = useMemo(
    () => Object.entries(reactions).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [reactions],
  );

  const toggleReactionPicker = (e) => {
    e.stopPropagation();
    if (!requireAuth("react to a post")) return;
    setShowReactionPicker((prev) => !prev);
  };

  const handleReactionClick = (emoji, _e) => {
    _e.stopPropagation();
    if (!requireAuth("react to a post")) return;
    toggleReaction(post.id, emoji);
    setShowReactionPicker(false);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/image/${post.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const shareToSocial = (platform) => {
    const text = `Check out this post on LaughCoin!`;
    const url = `${window.location.origin}/image/${post.id}`;
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

  // Single consolidated follow listener — replaces 3 separate listeners
  useEffect(() => {
    if (!post.uploadedBy) return;
    const unsubs = [];

    // Followers count
    const followersQ = query(
      collection(db, "follows"),
      where("followingId", "==", post.uploadedBy),
    );
    unsubs.push(onSnapshot(followersQ, (snap) => setFollowersCount(snap.size)));

    // Following count
    const followingQ = query(
      collection(db, "follows"),
      where("followerId", "==", post.uploadedBy),
    );
    unsubs.push(onSnapshot(followingQ, (snap) => setFollowingCount(snap.size)));

    // Is current user following this author?
    if (firebaseUser?.uid && firebaseUser.uid !== post.uploadedBy) {
      const docId = `${firebaseUser.uid}_${post.uploadedBy}`;
      unsubs.push(
        onSnapshot(doc(db, "follows", docId), (snap) => setIsFollowing(snap.exists())),
      );
    } else {
      setIsFollowing(false);
    }

    return () => unsubs.forEach((unsub) => unsub());
  }, [post.uploadedBy, firebaseUser?.uid]);

  // Follow / unfollow handler
  const handleFollowToggle = useCallback(async () => {
    if (!firebaseUser?.uid || !post.uploadedBy || followLoading) return;
    if (firebaseUser.isAnonymous) return;

    const docId = `${firebaseUser.uid}_${post.uploadedBy}`;
    const followRef = doc(db, "follows", docId);

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
      } else {
        await setDoc(followRef, {
          followerId: firebaseUser.uid,
          followingId: post.uploadedBy,
          createdAt: serverTimestamp(),
        });
        createFollowNotification(post.uploadedBy);
      }
    } catch (_err) {
      // silently fail
    } finally {
      setFollowLoading(false);
    }
  }, [firebaseUser, post.uploadedBy, isFollowing, followLoading, createFollowNotification]);

  useEffect(() => {
    let ignore = false;
    async function fetchUser() {
      if (post.uploadedBy) {
        try {
          const userDoc = await getDoc(doc(db, "users", post.uploadedBy));
          if (userDoc.exists() && !ignore) {
            setUserData(userDoc.data());
          }
        } catch (_e) {
          // fallback to post.userProfileData if exists
        }
      }
    }
    fetchUser();
    return () => {
      ignore = true;
    };
  }, [post.uploadedBy]);

  // Tabs UI — hide user tab for anonymous posts
  const showTabs = !post.isAnonymousPost && (post.type === "user-profile" || !!userData);

  // Calculate user stats (memoized to avoid O(n²) on every render)
  const { totalPosts, totalReactions, totalComments } = useMemo(() => {
    // Exclude anonymous posts from author stats
    const authorPosts = posts.filter(
      (p) =>
        !p.isAnonymousPost &&
        (p.author?.toLowerCase() === post.author?.toLowerCase() ||
         p.uploadedBy === post.uploadedBy),
    );
    const reactions = authorPosts.reduce((sum, p) => {
      const r = p.reactions;
      if (!r) return sum;
      return sum + Object.values(r).reduce((a, b) => a + b, 0);
    }, 0);
    const comments = authorPosts.reduce(
      (sum, p) => sum + (p.commentCount || 0),
      0,
    );
    return { totalPosts: authorPosts.length, totalReactions: reactions, totalComments: comments };
  }, [posts, post.author, post.uploadedBy]);

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
      post.authorAvatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.username || post.author || "U",
      )}&background=8b5cf6&color=fff&size=200`;

    const hasInfo = profile.location || profile.solana || profile.lastLogin;

    return (
      <div className="postmodal-user-card">
        <div className="postmodal-user-card-body">
          <img src={avatar} alt="avatar" className="postmodal-user-avatar" />
          <div className="postmodal-user-header">
            <div className="postmodal-user-info-top">
              <div className="postmodal-user-username">
                @{profile.username || post.author}
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
          <div className="postmodal-user-stats postmodal-user-stats--2col">
            <div
              className="postmodal-stat-card postmodal-stat-card--clickable"
              onClick={() => setFollowListMode("followers")}
            >
              <span className="postmodal-stat-value">{followersCount}</span>
              <span className="postmodal-stat-label">
                Followers <ChevronRightIcon size={10} className="postmodal-stat-arrow" />
              </span>
            </div>
            <div
              className="postmodal-stat-card postmodal-stat-card--clickable"
              onClick={() => setFollowListMode("following")}
            >
              <span className="postmodal-stat-value">{followingCount}</span>
              <span className="postmodal-stat-label">
                Following <ChevronRightIcon size={10} className="postmodal-stat-arrow" />
              </span>
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
                  `/profile/${encodeURIComponent(profile.username || post.author)}`,
                )
              }
            >
              <UserProfileIcon size={14} style={{display: 'inline', marginRight: '4px'}} /> Profile
            </button>
            {firebaseUser &&
              !firebaseUser.isAnonymous &&
              post.uploadedBy &&
              post.uploadedBy !== firebaseUser.uid && (
                <>
                  <button
                    className={`postmodal-user-follow-btn ${isFollowing ? "postmodal-user-follow-btn--following" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle();
                    }}
                    disabled={followLoading}
                  >
                    {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    className="postmodal-user-dm-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent("openDM", {
                          detail: {
                            uid: post.uploadedBy,
                            username: profile.username || post.author,
                            avatar: profile.avatar || post.authorAvatar || null,
                          },
                        }),
                      );
                    }}
                  >
                    <MessageIcon size={14} /> DM
                  </button>
                </>
              )}
          </div>
        </div>
        <FollowListModal
          isOpen={!!followListMode}
          onClose={() => setFollowListMode(null)}
          userId={post.uploadedBy}
          mode={followListMode}
        />
      </div>
    );
  };

  const displayUsername = post.isAnonymousPost ? "Anonymous" : (userData?.username || post.author || "User");
  const displayAvatar = post.isAnonymousPost
    ? `https://ui-avatars.com/api/?name=A&background=666&color=fff&size=64`
    : (userData?.avatar ||
       post.authorAvatar ||
       `https://ui-avatars.com/api/?name=${encodeURIComponent(
         displayUsername,
       )}&background=8b5cf6&color=fff&size=64`);

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
        {activeTab !== "user" && (
          <div className="postmodal-toolbar-actions">
            {post.type && (
              <span className="postmodal-type-badge-inline">{post.type}</span>
            )}
            {canEdit && onEditRequest && (
              <button
                className="postmodal-action-btn postmodal-action-btn--edit"
                onClick={onEditRequest}
                title="Edit post"
              >
                <EditIcon size={15} />
              </button>
            )}
            {canDelete && onDeleteRequest && (
              <button
                className="postmodal-action-btn postmodal-action-btn--delete"
                onClick={onDeleteRequest}
                title="Delete post"
              >
                <DeleteIcon size={15} />
              </button>
            )}
            {onRandom && (
              <button
                className="postmodal-action-btn postmodal-action-btn--random"
                onClick={onRandom}
                title="Random post"
              >
                🎲
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      {showTabs && activeTab === "user" ? (
        renderUserTab()
      ) : (
        <div className="image-modal-display">
          {post.type === "status" ? (
            <StatusRenderer
              status={post.status}
              bgColor={post.bgColor}
              textColor={post.textColor}
              className="modal-status"
            />
          ) : post.type === "poll" ? (
            <PollRenderer
              question={livePost.question}
              description={livePost.description}
              options={livePost.options || []}
              bgColor={livePost.bgColor}
              voteCounts={livePost.voteCounts}
              userVote={getUserPollVote(livePost.id)}
              endsAt={livePost.endsAt}
              onVote={(optionIndex) => {
                if (!requireAuth("vote on a poll")) return;
                votePoll(livePost.id, optionIndex);
              }}
              compact={false}
              className="modal-poll"
            />
          ) : post.type === "countdown" ? (
            <CountdownRenderer
              targetDate={post.targetDate}
              emoji={post.emoji || "🎉"}
              bgColor={post.bgColor || "#1a1a2e"}
              compact={false}
              className="modal-countdown"
            />
          ) : post.type === "quiz" ? (
            <QuizRenderer
              question={livePost.question}
              options={livePost.options || []}
              correctIndex={livePost.correctIndex ?? 0}
              explanation={livePost.explanation}
              bgColor={livePost.bgColor || "#1a1a2e"}
              voteCounts={livePost.voteCounts}
              userVote={getUserQuizVote(livePost.id)}
              onVote={(optionIndex) => {
                if (!requireAuth("answer a quiz")) return;
                voteQuiz(livePost.id, optionIndex);
              }}
              compact={false}
              className="modal-quiz"
            />
          ) : isMediaPost ? (
            <MediaPlayer image={post} />
          ) : (
            <img
              src={post.image || post.imageUrl}
              alt={post.title}
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
                  title="React"
                >
                  <EmojiIcon size={16} />
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
                  title="Share"
                >
                  <ShareIcon size={16} />
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
