import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

function renderMentions(text, onMentionClick) {
  if (!text) return text;
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) =>
    /^@[a-zA-Z0-9_]+$/.test(part) ? (
      <span
        key={i}
        className="mention-chip"
        onClick={(e) => {
          e.stopPropagation();
          onMentionClick(part.slice(1));
        }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function fmtDate(ts) {
  if (!ts) return null;
  const d =
    ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCommentTime(ts) {
  if (!ts) return "";
  const d =
    ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  if (isNaN(d)) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

import { usePosts } from "../../../context/PostContext";
import { useAuth } from "../../../context/AuthContext";
import useRequireAuth from "../../../hooks/useRequireAuth";
import {
  DeleteIcon,
  ChatIcon,
  EditIcon,
  SendIcon,
  CalendarIcon,
  MessageIcon,
  CloseIcon,
  EmojiIcon,
} from "../../../utils/icons";
import ConfirmModal from "../../common/ConfirmModal";
import MentionInput from "../../common/MentionInput";
import GifPicker from "../../common/GifPicker";
import "../../common/GifPicker.css";

const PostModalCommentsSection = memo(function PostModalCommentsSection({
  post,
  onClose,
}) {
  const { addComment, deleteComment, toggleCommentReaction } = usePosts();
  const { userProfile, firebaseUser } = useAuth();
  const { requireAuth, isLoggedIn } = useRequireAuth();
  const userId = firebaseUser?.uid;

  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [olderComments, setOlderComments] = useState([]);
  const [oldestDocRef, setOldestDocRef] = useState(null);
  const [hasOlderComments, setHasOlderComments] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showCommentReactionPicker, setShowCommentReactionPicker] =
    useState(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState(null);
  const [avatars, setAvatars] = useState({});
  const [replyTo, setReplyTo] = useState(null); // { id, author }
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState(null); // { url, preview, title }
  const commentReactionPickerRef = useRef(null);
  const inputRef = useRef(null);
  const gifBtnRef = useRef(null);
  const inputWrapperRef = useRef(null);

  const availableReactions = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];

  const COMMENTS_PAGE = 10;

  // Subscribe to the most recent 10 comments in real-time
  useEffect(() => {
    if (!post?.id) {
      setComments([]);
      setOlderComments([]);
      setOldestDocRef(null);
      setHasOlderComments(false);
      return;
    }

    const commentsRef = collection(db, "posts", post.id, "comments");
    // Fetch newest first so limit(10) gives us the 10 most recent
    const q = query(commentsRef, orderBy("createdAt", "desc"), limit(COMMENTS_PAGE));

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      // Reverse so oldest-first display order
      list.reverse();
      setComments(list);
      // Track the oldest doc in this window as the cursor for loading more
      if (snap.docs.length > 0) {
        setOldestDocRef(snap.docs[snap.docs.length - 1]);
        setHasOlderComments(snap.docs.length === COMMENTS_PAGE);
      }
    });

    return () => unsub();
  }, [post?.id]);

  const loadOlderComments = useCallback(async () => {
    if (!post?.id || !oldestDocRef || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const commentsRef = collection(db, "posts", post.id, "comments");
      const q = query(
        commentsRef,
        orderBy("createdAt", "desc"),
        startAfter(oldestDocRef),
        limit(COMMENTS_PAGE),
      );
      const snap = await getDocs(q);
      const older = [];
      snap.forEach((d) => older.push({ id: d.id, ...d.data() }));
      older.reverse();
      setOlderComments((prev) => [...older, ...prev]);
      if (snap.docs.length > 0) {
        setOldestDocRef(snap.docs[snap.docs.length - 1]);
      }
      setHasOlderComments(snap.docs.length === COMMENTS_PAGE);
    } finally {
      setLoadingOlder(false);
    }
  }, [post?.id, oldestDocRef, loadingOlder]);

  // Build a set of top-level IDs so we can resolve root parents
  // All replies flatten to level 2 max (no deeper nesting)
  const allComments = useMemo(
    () => [...olderComments, ...comments],
    [olderComments, comments],
  );

  const { topLevel, repliesByParent, replyCountByParent, topLevelIds } =
    useMemo(() => {
      const top = [];
      const topIds = new Set();
      const replies = {};
      const counts = {};

      // First pass: identify top-level comments
      for (const c of allComments) {
        if (!c.parentId) {
          top.push(c);
          topIds.add(c.id);
        }
      }

      // Second pass: group all replies under their root parent
      for (const c of allComments) {
        if (c.parentId) {
          // If parentId is a top-level comment, use it directly.
          // If parentId is itself a reply, find the root parent.
          const rootId = topIds.has(c.parentId)
            ? c.parentId
            : c.rootParentId || c.parentId;
          if (!replies[rootId]) replies[rootId] = [];
          replies[rootId].push(c);
          counts[rootId] = (counts[rootId] || 0) + 1;
        }
      }

      return {
        topLevel: top,
        repliesByParent: replies,
        replyCountByParent: counts,
        topLevelIds: topIds,
      };
    }, [allComments]);

  // Fetch avatars for unique authors
  useEffect(() => {
    const uniqueAuthors = [
      ...new Set(allComments.map((c) => c.author).filter(Boolean)),
    ];

    const loadAvatars = async () => {
      for (const author of uniqueAuthors) {
        if (avatars[author] !== undefined) continue;
        try {
          const userDocRef = doc(db, "users", author);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          setAvatars((prev) => ({
            ...prev,
            [author]: userData?.avatar || null,
          }));
        } catch {
          setAvatars((prev) => ({
            ...prev,
            [author]: null,
          }));
        }
      }
    };

    if (uniqueAuthors.length > 0) {
      loadAvatars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComments]);

  const handleAddComment = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newComment.trim() && !pendingGif) return;
      if (!requireAuth("comment on a post")) return;

      const commentText = newComment.trim();
      const avatar = userProfile?.avatar || firebaseUser?.photoURL || "😂";
      // replyTo.id is always the root parent (handleReply resolves it)
      const parentId = replyTo?.id || null;
      const replyToAuthor = replyTo?.author || null;
      const rootParentId = parentId;
      const gifUrl = pendingGif?.url || null;

      setNewComment("");
      setReplyTo(null);
      setPendingGif(null);

      if (parentId) {
        setExpandedReplies((prev) => new Set(prev).add(parentId));
      }

      addComment(
        post.id,
        commentText,
        avatar,
        parentId,
        replyToAuthor,
        rootParentId,
        gifUrl,
      ).catch((err) => {
        setNewComment(commentText);
        toast.error(err.message || "Failed to post comment");
      });
    },
    [
      newComment,
      pendingGif,
      post.id,
      userProfile,
      firebaseUser,
      addComment,
      requireAuth,
      replyTo,
    ],
  );

  const handleReply = useCallback(
    (comment) => {
      if (!requireAuth("reply to a comment")) return;
      // Always reply under the root parent (max 2 levels)
      const rootId = comment.parentId
        ? comment.rootParentId || comment.parentId
        : comment.id;
      setReplyTo({ id: rootId, author: comment.author });
      setNewComment(`@${comment.author} `);
      inputRef.current?.focus?.();
    },
    [requireAuth],
  );

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setNewComment("");
  }, []);

  const toggleReplies = useCallback((commentId) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const handleInputClick = (e) => e.stopPropagation();

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleAddComment(e);
    }
    if (e.key === "Escape" && replyTo) {
      cancelReply();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        commentReactionPickerRef.current &&
        !commentReactionPickerRef.current.contains(event.target)
      ) {
        setShowCommentReactionPicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Derive comment reaction counts from each comment's reactions map
  const getCommentReactionCounts = useCallback((comment) => {
    if (!comment?.reactions) return {};
    const counts = {};
    Object.values(comment.reactions).forEach((emoji) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return counts;
  }, []);

  const getUserCommentReaction = useCallback(
    (comment) => {
      if (!userId || !comment?.reactions) return null;
      return comment.reactions[userId] || null;
    },
    [userId],
  );

  // Render a single comment (used for both top-level and replies)
  const renderComment = (comment, isReply = false) => {
    const reactions = getCommentReactionCounts(comment);
    const userReaction = getUserCommentReaction(comment);
    const reactionEntries = Object.entries(reactions);
    const isAnonymous =
      !comment.author || comment.author.trim().toLowerCase() === "anonymous";

    const avatarUrl = comment.avatar ?? avatars[comment.author] ?? null;

    const avatarNode = avatarUrl ? (
      <img
        src={avatarUrl}
        alt="avatar"
        className="comment-avatar"
        style={{
          width: isReply ? 20 : 24,
          height: isReply ? 20 : 24,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1.5px solid #8b5cf6",
          background: "#23234a",
        }}
      />
    ) : null;

    return (
      <div
        key={comment.id}
        className={`comment-item ${isReply ? "comment-reply" : ""}`}
      >
        <div className="comment-content">
          <div
            className="comment-header"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {avatarNode}
            {isAnonymous ? (
              <span className="comment-user">{comment.author}</span>
            ) : (
              <a
                className="comment-user clickable-author-modal"
                href={`/profile/${encodeURIComponent(comment.author)}`}
                title={`View ${comment.author}'s profile`}
              >
                {comment.author}
              </a>
            )}
            {!isAnonymous &&
              comment.userId &&
              firebaseUser &&
              !firebaseUser.isAnonymous &&
              comment.userId !== firebaseUser.uid && (
                <button
                  className="comment-dm-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent("openDM", {
                        detail: {
                          uid: comment.userId,
                          username: comment.author,
                          avatar: avatarUrl || null,
                        },
                      }),
                    );
                  }}
                  title={`DM ${comment.author}`}
                >
                  <MessageIcon size={14} />
                </button>
              )}
            <span className="comment-time" style={{ marginLeft: 8 }}>
              {fmtCommentTime(comment.createdAt) ||
                comment.timestamp ||
                comment.time}
            </span>
            {firebaseUser &&
              !firebaseUser.isAnonymous &&
              comment.userId === firebaseUser.uid && (
                <button
                  className="comment-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteCommentId(comment.id);
                  }}
                  title="Delete comment"
                >
                  <DeleteIcon size={13} />
                </button>
              )}
            {(!firebaseUser || comment.userId !== firebaseUser.uid) && (
              <button
                className="comment-react-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!requireAuth("react to a comment")) return;
                  if (showCommentReactionPicker === comment.id) {
                    setShowCommentReactionPicker(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPickerPos({
                      top: rect.top - 8,
                      right: window.innerWidth - rect.right,
                    });
                    setShowCommentReactionPicker(comment.id);
                  }
                }}
                title={userReaction ? "Change reaction" : "Add reaction"}
              >
                <EmojiIcon size={13} />
              </button>
            )}
          </div>
          {comment.text && (
            <p className="comment-text">
              {renderMentions(comment.text, (username) =>
                navigate(`/profile/${username.toLowerCase()}`),
              )}
            </p>
          )}
          {comment.gifUrl && (
            <div className="comment-gif">
              <img src={comment.gifUrl} alt="GIF" loading="lazy" />
            </div>
          )}
          <div className="comment-reactions-row">
            {reactionEntries.length > 0 && (
              <div className="comment-reactions-display">
                {reactionEntries.map(([emoji, count]) => (
                  <button
                    key={emoji}
                    className={`comment-reaction-bubble ${
                      userReaction === emoji ? "active" : ""
                    }`}
                    onClick={() => {
                      if (!requireAuth("react to a comment")) return;
                      toggleCommentReaction(post.id, comment.id, emoji);
                    }}
                    title={`${count} reaction${count !== 1 ? "s" : ""}`}
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}
            <button
              className="comment-reply-btn"
              onClick={() => handleReply(comment)}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="comments-section">
      <div className="comments-close-row">
        <button className="close-btn" onClick={onClose} title="Close">
          <CloseIcon size={18} />
        </button>
      </div>
      {/* Post description + meta */}
      {(post.type === "status" || post.description || post.mood) && (
        <div className="comments-post-info">
          {post.mood && (
            <div className="comments-post-mood">
              is feeling {post.mood.emoji} <strong>{post.mood.label}</strong>
            </div>
          )}
          {post.type !== "status" && post.description && (
            <p className="comments-post-desc">{post.description}</p>
          )}
          {timeLeft && (
            <span
              className={`comments-post-expiry${timeLeft.expired ? " expired" : ""}`}
            >
              ⏱ {timeLeft.label}
            </span>
          )}
          {fmtDate(post.createdAt) && (
            <p className="comments-post-date">
              <CalendarIcon
                size={14}
                style={{
                  display: "inline",
                  marginRight: "4px",
                  verticalAlign: "middle",
                }}
              />{" "}
              {fmtDate(post.createdAt)}
              {post.edited && fmtDate(post.updatedAt) && (
                <span>
                  {" "}
                  ·{" "}
                  <EditIcon
                    size={12}
                    style={{ display: "inline", marginRight: "4px" }}
                  />{" "}
                  Edited {fmtDate(post.updatedAt)}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <h3 className="comments-header">Comments ({comments.length})</h3>

      {/* Reply indicator */}
      {replyTo && (
        <div className="comment-reply-indicator">
          <span>
            Replying to <strong>@{replyTo.author}</strong>
          </span>
          <button onClick={cancelReply} className="comment-reply-cancel">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      <form
        className="add-comment-form"
        onSubmit={handleAddComment}
        onClick={handleInputClick}
      >
        {pendingGif && (
          <div className="comment-gif-preview">
            <img src={pendingGif.preview} alt={pendingGif.title} />
            <button
              className="comment-gif-preview-remove"
              onClick={(e) => {
                e.preventDefault();
                setPendingGif(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div
          ref={inputWrapperRef}
          className="comment-input-wrapper"
          onClick={handleInputClick}
          style={{ position: "relative" }}
        >
          <MentionInput
            ref={inputRef}
            multiline={false}
            value={newComment}
            onChange={setNewComment}
            onKeyDown={handleInputKeyDown}
            placeholder={
              replyTo
                ? `Reply to @${replyTo.author}...`
                : isLoggedIn
                  ? "Comment, @mention, ..."
                  : "Log in to comment..."
            }
            className="comment-input"
            maxLength={200}
            onClick={handleInputClick}
            onFocus={(e) => {
              handleInputClick(e);
              if (!isLoggedIn) requireAuth("comment on a post");
            }}
          />
          {newComment.length > 0 && (
            <span
              className={`comment-char-counter${newComment.length >= 180 ? " warn" : ""}`}
            >
              {newComment.length}/200
            </span>
          )}
          <button
            type="button"
            ref={gifBtnRef}
            className={`comment-gif-btn${pendingGif ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!requireAuth("add a GIF")) return;
              setShowGifPicker((v) => !v);
            }}
            title="Add GIF"
          >
            GIF
          </button>
          <button
            type="submit"
            className="comment-submit"
            disabled={!newComment.trim() && !pendingGif}
            onClick={handleInputClick}
          >
            <SendIcon size={16} />
          </button>
        </div>
      </form>
      {showGifPicker && (
        <GifPicker
          anchorRef={inputWrapperRef}
          onSelect={(gif) => {
            setPendingGif(gif);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}
      <div className="comments-list">
        {hasOlderComments && (
          <button
            className="comments-load-older-btn"
            onClick={loadOlderComments}
            disabled={loadingOlder}
          >
            {loadingOlder ? "Loading…" : "Load older comments"}
          </button>
        )}
        {topLevel.length === 0 && allComments.length === 0 ? (
          <div className="no-comments">
            <p>
              No comments yet. Be the first to comment!{" "}
              <ChatIcon
                size={16}
                style={{ display: "inline", marginLeft: "4px" }}
              />
            </p>
          </div>
        ) : (
          topLevel.map((comment) => {
            const replyCount = replyCountByParent[comment.id] || 0;
            const replies = repliesByParent[comment.id] || [];
            const isExpanded = expandedReplies.has(comment.id);

            return (
              <div key={comment.id} className="comment-thread">
                {renderComment(comment, false)}
                {replyCount > 0 && (
                  <div className="comment-replies-section">
                    <button
                      className="comment-view-replies-btn"
                      onClick={() => toggleReplies(comment.id)}
                    >
                      <span className="comment-replies-line" />
                      {isExpanded
                        ? "Hide replies"
                        : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                    </button>
                    {isExpanded && (
                      <div className="comment-replies-list">
                        {replies.map((reply) => renderComment(reply, true))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {confirmDeleteCommentId && (
        <ConfirmModal
          title="Delete Comment?"
          message="This action cannot be undone."
          onConfirm={() => {
            deleteComment(post.id, confirmDeleteCommentId);
            setConfirmDeleteCommentId(null);
          }}
          onCancel={() => setConfirmDeleteCommentId(null)}
        />
      )}
      {showCommentReactionPicker &&
        createPortal(
          <div
            className="comment-reaction-picker"
            ref={commentReactionPickerRef}
            style={{
              position: "fixed",
              top: pickerPos.top,
              right: pickerPos.right,
              transform: "translateY(-100%)",
              zIndex: 99999,
            }}
          >
            {availableReactions.map((emoji) => {
              const activeComment = comments.find(
                (c) => c.id === showCommentReactionPicker,
              );
              const activeUserReaction = activeComment
                ? getUserCommentReaction(activeComment)
                : null;
              return (
                <button
                  key={emoji}
                  className={`comment-reaction-option ${activeUserReaction === emoji ? "selected" : ""}`}
                  onClick={() => {
                    if (!requireAuth("react to a comment")) return;
                    toggleCommentReaction(
                      post.id,
                      showCommentReactionPicker,
                      emoji,
                    );
                    setShowCommentReactionPicker(null);
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
});

export default PostModalCommentsSection;
