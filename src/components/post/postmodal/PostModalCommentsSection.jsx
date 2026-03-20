import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where,
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
        onClick={(e) => { e.stopPropagation(); onMentionClick(part.slice(1)); }}
      >
        {part}
      </span>
    ) : part,
  );
}

function fmtDate(ts) {
  if (!ts) return null;
  const d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCommentTime(ts) {
  if (!ts) return "";
  const d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
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
import { DeleteIcon, ChatIcon, EditIcon, SendIcon, CalendarIcon, MessageIcon, CloseIcon } from "../../../utils/icons";
import ConfirmModal from "../../common/ConfirmModal";

const PostModalCommentsSection = memo(function PostModalCommentsSection({
  post,
  onClose,
}) {
  const {
    addComment,
    deleteComment,
    toggleCommentReaction,
  } = usePosts();
  const { userProfile, firebaseUser } = useAuth();
  const { requireAuth, isLoggedIn } = useRequireAuth();
  const userId = firebaseUser?.uid;

  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentReactionPicker, setShowCommentReactionPicker] = useState(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState(null);
  const [avatars, setAvatars] = useState({});
  const commentReactionPickerRef = useRef(null);
  const inputRef = useRef(null);
  const mentionTimerRef = useRef(null);

  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionSuggestions([]);
    setMentionIndex(0);
  }, []);

  const handleCommentChange = useCallback((e) => {
    const val = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart;
    const match = val.slice(0, cursor).match(/@([a-zA-Z0-9_]*)$/);
    if (!match) { closeMentions(); return; }
    const q = match[1];
    setShowMentions(true);
    setMentionIndex(0);
    clearTimeout(mentionTimerRef.current);
    mentionTimerRef.current = setTimeout(async () => {
      try {
        const usersQuery = q
          ? query(collection(db, "users"), where("username", ">=", q), where("username", "<=", q + "\uf8ff"), limit(6))
          : query(collection(db, "users"), limit(6));
        const snap = await getDocs(usersQuery);
        setMentionSuggestions(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((u) => u.username));
      } catch { setMentionSuggestions([]); }
    }, 150);
  }, [db, closeMentions]);

  const selectMention = useCallback((username) => {
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? newComment.length;
    const before = newComment.slice(0, cursor).replace(/@([a-zA-Z0-9_]*)$/, `@${username} `);
    const after = newComment.slice(cursor);
    const next = before + after;
    setNewComment(next);
    closeMentions();
    setTimeout(() => { input?.focus(); input?.setSelectionRange(before.length, before.length); }, 0);
  }, [newComment, closeMentions]);

  const availableReactions = ["😂", "🚀", "💎", "🔥", "❤️", "👍", "🎉", "💰"];

  // Subscribe to comments subcollection in real-time
  useEffect(() => {
    if (!post?.id) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, "posts", post.id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"), limit(200));

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setComments(list);
    });

    return () => unsub();
  }, [post?.id]);

  // Fetch avatars for unique authors
  useEffect(() => {
    const uniqueAuthors = [
      ...new Set(comments.map((c) => c.author).filter(Boolean)),
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
  }, [comments]);

  const handleAddComment = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newComment.trim()) return;
      if (!requireAuth("comment on a post")) return;

      const commentText = newComment.trim();
      const avatar = userProfile?.avatar || firebaseUser?.photoURL || "😂";

      setNewComment("");
      addComment(post.id, commentText, avatar).catch((err) => {
        setNewComment(commentText);
        toast.error(err.message || "Failed to post comment");
      });
    },
    [newComment, post.id, userProfile, firebaseUser, addComment, requireAuth],
  );

  const handleInputClick = (e) => e.stopPropagation();

  const handleInputKeyDown = (e) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); selectMention(mentionSuggestions[mentionIndex].username); return; }
      if (e.key === "Escape") { closeMentions(); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleAddComment(e);
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

  return (
    <div className="comments-section">
      <div className="comments-close-row">
        <button className="comments-close-btn" onClick={onClose} title="Close">
          <CloseIcon size={14} />
        </button>
      </div>
      {/* Post description + meta */}
      {(post.type === "status" || post.description) && (
        <div className="comments-post-info">
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
              <CalendarIcon size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}} /> {fmtDate(post.createdAt)}
              {post.edited && fmtDate(post.updatedAt) && (
                <span> · <EditIcon size={12} style={{display: 'inline', marginRight: '4px'}} /> Edited {fmtDate(post.updatedAt)}</span>
              )}
            </p>
          )}
        </div>
      )}

      <h3 className="comments-header">Comments ({comments.length})</h3>
      <form
        className="add-comment-form"
        onSubmit={handleAddComment}
        onClick={handleInputClick}
      >
        <div className="comment-input-wrapper" onClick={handleInputClick} style={{ position: "relative" }}>
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="mention-dropdown">
              {mentionSuggestions.map((user, i) => (
                <button
                  key={user.uid}
                  type="button"
                  className={`mention-option${i === mentionIndex ? " active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); selectMention(user.username); }}
                >
                  {user.avatar && <img src={user.avatar} alt="" className="mention-avatar" />}
                  <span>@{user.username}</span>
                </button>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={handleCommentChange}
            onKeyDown={handleInputKeyDown}
            placeholder={isLoggedIn ? "Add a comment… type @ to mention" : "Log in to comment..."}
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
            type="submit"
            className="comment-submit"
            disabled={!newComment.trim()}
            onClick={handleInputClick}
          >
            <SendIcon size={16} />
          </button>
        </div>
      </form>
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. Be the first to comment! <ChatIcon size={16} style={{display: 'inline', marginLeft: '4px'}} /></p>
          </div>
        ) : (
          comments.map((comment) => {
            const reactions = getCommentReactionCounts(comment);
            const userReaction = getUserCommentReaction(comment);
            const reactionEntries = Object.entries(reactions);
            const isAnonymous =
              !comment.author ||
              comment.author.trim().toLowerCase() === "anonymous";

            const avatarUrl = comment.avatar ?? avatars[comment.author] ?? null;

            const avatarNode = avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="comment-avatar"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid #8b5cf6",
                  background: "#23234a",
                }}
              />
            ) : null;

            return (
              <div key={comment.id} className="comment-item">
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
                      {fmtCommentTime(comment.createdAt) || comment.timestamp || comment.time}
                    </span>
                    {firebaseUser &&
                      !firebaseUser.isAnonymous &&
                      (comment.userId === firebaseUser.uid ||
                        post.uploadedBy === firebaseUser.uid ||
                        post.userId === firebaseUser.uid) && (
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
                  </div>
                  <p className="comment-text">{renderMentions(comment.text, (username) => navigate(`/profile/${username.toLowerCase()}`))}</p>
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
                              toggleCommentReaction(
                                post.id,
                                comment.id,
                                emoji,
                              );
                            }}
                            title={`${count} reaction${count !== 1 ? "s" : ""}`}
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="comment-reaction-picker-container">
                      {(!firebaseUser || comment.userId !== firebaseUser.uid) && (
                      <button
                        className="comment-react-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!requireAuth("react to a comment")) return;
                          setShowCommentReactionPicker(
                            showCommentReactionPicker === comment.id
                              ? null
                              : comment.id,
                          );
                        }}
                      >
                        {userReaction ? "Change" : "React"}
                      </button>
                      )}
                      {showCommentReactionPicker === comment.id && (
                        <div
                          className="comment-reaction-picker"
                          ref={commentReactionPickerRef}
                        >
                          {availableReactions.map((emoji) => (
                            <button
                              key={emoji}
                              className={`comment-reaction-option ${
                                userReaction === emoji ? "selected" : ""
                              }`}
                              onClick={() => {
                                if (!requireAuth("react to a comment")) return;
                                toggleCommentReaction(
                                  post.id,
                                  comment.id,
                                  emoji,
                                );
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirmDeleteCommentId && (
        <ConfirmModal
          title="Delete Comment?"
          message="This action cannot be undone."
          onConfirm={() => { deleteComment(post.id, confirmDeleteCommentId); setConfirmDeleteCommentId(null); }}
          onCancel={() => setConfirmDeleteCommentId(null)}
        />
      )}
    </div>
  );
});

export default PostModalCommentsSection;
