import { useState, useRef, useEffect, useMemo } from "react";

import { usePosts } from "../../../context/PostContext";
import { useAuth } from "../../../context/AuthContext";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import "./PostModalImageSection.css";
import MediaPlayer from "../MediaPlayer";
import StatusRenderer from "../StatusRenderer";
import PollRenderer from "../PollRenderer";
import CountdownRenderer from "../CountdownRenderer";
import QuizRenderer from "../QuizRenderer";
import useRequireAuth from "../../../hooks/useRequireAuth";
import { EmojiIcon, EditIcon, DeleteIcon, MessageIcon, UserProfileIcon, ChevronRightIcon, UsersIcon, BookmarkIcon, UserPlusIcon, UserCheckIcon, EyeIcon } from "../../../utils/icons";
import PostShareButton from "../PostShareButton";
import { useBookmarks } from "../../../hooks/useBookmarks";
import { useFollow } from "../../../hooks/useFollow";
import FollowListModal from "../../profile/FollowListModal";
import ReactorsModal from "../../common/ReactorsModal";

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

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [activeTab, setActiveTab] = useState("post");
  const [userData, setUserData] = useState(post.userProfileData || null);
  const reactionPickerRef = useRef(null);

  const { firebaseUser, userProfile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isFollowing, loading: followLoading, canFollow, toggle: toggleFollow } = useFollow(post.uploadedBy);

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


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target)
      ) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Increment view count once per session per post
  useEffect(() => {
    if (!post?.id) return;
    const key = `viewed_${post.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    updateDoc(doc(db, "posts", post.id), { viewCount: increment(1) }).catch(() => {});
  }, [post?.id]);

  // Followers / following counts for the user tab
  useEffect(() => {
    if (!post.uploadedBy) return;
    const unsubs = [];
    const followersQ = query(collection(db, "follows"), where("followingId", "==", post.uploadedBy));
    unsubs.push(onSnapshot(followersQ, (snap) => setFollowersCount(snap.size)));
    const followingQ = query(collection(db, "follows"), where("followerId", "==", post.uploadedBy));
    unsubs.push(onSnapshot(followingQ, (snap) => setFollowingCount(snap.size)));
    return () => unsubs.forEach((u) => u());
  }, [post.uploadedBy]);

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
            {canFollow && (
                <>
                  <button
                    className={`postmodal-user-follow-btn ${isFollowing ? "postmodal-user-follow-btn--following" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFollow(); }}
                    disabled={followLoading}
                  >
                    {followLoading ? "..." : isFollowing
                      ? <><UserCheckIcon size={13} /> Following</>
                      : <><UserPlusIcon size={13} /> Follow</>}
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

            {displayedReactions.length > 0 && (
              <button
                className="reactions-who-btn"
                title="See who reacted"
                onClick={() => setShowReactors(true)}
              >
                <UsersIcon size={15} />
              </button>
            )}
            {showReactors && (
              <ReactorsModal
                reactors={post.reactors || {}}
                reactionCounts={reactions}
                onClose={() => setShowReactors(false)}
              />
            )}

            {(livePost.viewCount > 0) && (
              <span className="postmodal-view-count">
                <EyeIcon size={14} />
                {livePost.viewCount.toLocaleString()}
              </span>
            )}

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

              <button
                className={`reaction-bookmark-btn${isBookmarked(post.id) ? " bookmarked" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!requireAuth("bookmark a post")) return;
                  toggleBookmark(post.id);
                }}
                title={isBookmarked(post.id) ? "Remove bookmark" : "Bookmark"}
              >
                <BookmarkIcon size={16} />
              </button>

              <PostShareButton post={post} variant="modal" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
