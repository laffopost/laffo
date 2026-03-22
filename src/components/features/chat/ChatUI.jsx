import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { EmojiPicker } from "../utilities";
import { formatTime } from "../../../utils/formatters";
import { GifPicker } from "../../common";
import {
  DeleteIcon,
  CloseIcon,
  BackIcon,
  SendIcon,
  EmojiIcon,
  EditIcon,
  CheckIcon,
  ChatIcon,
} from "../../../utils/icons";
import LinkPreview from "../../common/LinkPreview";
import ConfirmModal from "../../common/ConfirmModal";
import "./ChatUI.css";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function ChatUI({
  // data
  currentUser,
  conversations,
  activeConvo,
  setActiveConvo,
  messages,
  newMessage,
  setNewMessage,
  searchQuery,
  searchResults,
  searching,
  editingMessage,
  editText,
  setEditText,
  showEmojiPicker,
  setShowEmojiPicker,
  pendingGif,
  setPendingGif,
  gifBtnRef,
  onlineUsers = {},
  messagesEndRef,
  messagesContainerRef,
  inputRef,
  // callbacks
  handleSend,
  handleSearchUsers,
  handleReaction,
  handleEditMessage,
  handleDeleteMessage,
  deleteConversation,
  openConversation,
  startConversation,
  startEditing,
  cancelEditing,
  handleEmojiSelect,
  getOtherUser,
  sendTypingIndicator,
  otherUserTyping,
  // layout
  variant = "page",
  onClose,
}) {
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }
  const [showGifPicker, setShowGifPicker] = useState(false);
  const inputWrapperRef = useRef(null);

  const askConfirm = (title, message, onConfirm) =>
    setConfirm({ title, message, onConfirm });

  return (
    <div className="chat-ui">
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className={`chat-sidebar ${activeConvo ? "hide-mobile" : ""}`}>
        <div className="chat-sidebar-header">
          <h3>Messages</h3>
          {variant === "overlay" && (
            <button
              className="close-btn"
              onClick={onClose}
              title="Close"
            >
              <CloseIcon size={20} />
            </button>
          )}
        </div>

        {/* Always-visible search */}
        <div className="chat-search-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchUsers(e.target.value)}
            placeholder="Search users..."
            className="chat-search-input"
          />
          {(searching || searchResults.length > 0 || searchQuery.length >= 2) && (
            <div className="chat-search-results">
              {searching && (
                <div className="chat-search-status">Searching...</div>
              )}
              {searchResults.map((user) => (
                <button
                  key={user.uid}
                  className="chat-search-result"
                  onClick={() => startConversation(user)}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="chat-avatar-img"
                    />
                  ) : (
                    <span className="chat-avatar-placeholder">
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                  <span className="chat-search-name">
                    {user.username || "User"}
                  </span>
                </button>
              ))}
              {!searching &&
                searchQuery.length >= 2 &&
                searchResults.length === 0 && (
                  <div className="chat-search-status">No users found</div>
                )}
            </div>
          )}
        </div>

        {/* Conversations list */}
        <div className="chat-convo-list">
          {conversations.length === 0 ? (
            <div className="chat-empty-state">
              <ChatIcon size={32} className="text-purple-500" />
              <p>No messages yet. Search for a user above to start chatting.</p>
            </div>
          ) : (
            conversations.map((convo) => {
              const other = getOtherUser(convo);
              const isUnread =
                convo.lastSenderId !== currentUser.uid &&
                !convo[`read_${currentUser.uid}`];
              return (
                <button
                  key={convo.id}
                  className={`chat-convo-item${activeConvo?.id === convo.id ? " active" : ""}${isUnread ? " unread" : ""}`}
                  onClick={() => openConversation(convo)}
                >
                  <div className="chat-avatar-wrap">
                    {other.avatar ? (
                      <img src={other.avatar} alt="" className="chat-avatar-img" />
                    ) : (
                      <span className="chat-avatar-placeholder">
                        {other.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                    {isUnread && <span className="chat-avatar-badge" />}
                    {onlineUsers[other.uid] && <span className="chat-online-dot" title="Online" />}
                  </div>
                  <div className="chat-convo-info">
                    <span className="chat-convo-name">{other.name}</span>
                    <span className={`chat-convo-preview${isUnread ? " unread" : ""}`}>
                      {convo.lastMessage || "No messages yet"}
                    </span>
                  </div>
                  <div className="chat-convo-meta">
                    <span className="chat-convo-time">
                      {formatTime(convo.lastMessageAt)}
                    </span>
                    {isUnread && <span className="chat-unread-dot" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────── */}
      <div className={`chat-area ${!activeConvo ? "hide-mobile" : ""}`}>
        {activeConvo ? (
          <>
            <header className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => setActiveConvo(null)}
                title="Back"
              >
                <BackIcon size={20} />
              </button>
              <div className="chat-header-user">
                {(() => {
                  const other = getOtherUser(activeConvo);
                  return (
                    <>
                      {other.avatar ? (
                        <img
                          src={other.avatar}
                          alt=""
                          className="chat-avatar-img"
                        />
                      ) : (
                        <span className="chat-avatar-placeholder">
                          {other.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                      <div className="chat-header-user-info">
                        <span className="chat-username">
                          {other.name}
                          {onlineUsers[other.uid] && <span className="chat-online-dot chat-online-dot--inline" title="Online" />}
                        </span>
                        {variant === "page" && (
                          <Link
                            to={`/profile/${other.name}`}
                            className="chat-view-profile"
                          >
                            View Profile
                          </Link>
                        )}
                        {onlineUsers[other.uid] && (
                          <span className="chat-online-label">Online now</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                className="chat-delete-btn"
                onClick={() => askConfirm(
                  "Delete Conversation?",
                  "All messages will be permanently deleted. This cannot be undone.",
                  () => deleteConversation(activeConvo.id),
                )}
                title="Delete conversation"
              >
                <DeleteIcon size={20} />
              </button>
            </header>

            <div className="chat-messages" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="chat-messages-empty">
                  <span className="text-4xl">👋</span>
                  <p>Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.senderId === currentUser.uid}
                    currentUid={currentUser.uid}
                    editingMessage={editingMessage}
                    editText={editText}
                    setEditText={setEditText}
                    handleEditMessage={handleEditMessage}
                    cancelEditing={cancelEditing}
                    startEditing={startEditing}
                    handleDeleteMessage={handleDeleteMessage}
                    handleReaction={handleReaction}
                    askConfirm={askConfirm}
                  />
                ))
              )}
              {otherUserTyping && (
                <div className="chat-typing-indicator">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
              {pendingGif && (
                <div className="chat-gif-preview">
                  <img src={pendingGif.url} alt="GIF" />
                  <button type="button" className="chat-gif-preview-remove" onClick={() => setPendingGif(null)}>✕</button>
                </div>
              )}
              <div className="chat-input-wrap" ref={inputWrapperRef}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); sendTypingIndicator?.(); }}
                  placeholder="Type a message..."
                  maxLength={500}
                  className="chat-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="chat-emoji-btn"
                  onClick={() => setShowEmojiPicker(true)}
                  title="Add emoji"
                >
                  <EmojiIcon size={20} />
                </button>
                <button
                  type="button"
                  ref={gifBtnRef}
                  className="chat-gif-btn"
                  onClick={() => setShowGifPicker((v) => !v)}
                  title="Add GIF"
                >
                  GIF
                </button>
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!newMessage.trim() && !pendingGif}
              >
                <SendIcon size={20} />
              </button>
              {showGifPicker && (
                <GifPicker
                  anchorRef={inputWrapperRef}
                  onSelect={(gif) => { setPendingGif(gif); setShowGifPicker(false); }}
                  onClose={() => setShowGifPicker(false)}
                />
              )}
            </form>
          </>
        ) : (
          <div className="chat-empty-area">
            <ChatIcon size={48} className="text-purple-500" />
            <h4>Your Messages</h4>
            <p>Select or start a conversation.</p>
          </div>
        )}
      </div>

      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  currentUid,
  editingMessage,
  editText,
  setEditText,
  handleEditMessage,
  cancelEditing,
  startEditing,
  handleDeleteMessage,
  handleReaction,
  askConfirm,
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactions = msg.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  return (
    <div className={`chat-msg${isOwn ? " own" : ""}`}>
      {/* Reaction trigger — sits beside the bubble, always accessible */}
      <div className="chat-msg-react-wrap">
        <button
          className="chat-msg-react-trigger"
          title="React"
          onClick={() => setShowReactionPicker((v) => !v)}
        >
          <EmojiIcon size={18} />
        </button>
        {showReactionPicker && (
          <div className={`chat-reaction-picker${isOwn ? " own" : ""}`}
               onMouseLeave={() => setShowReactionPicker(false)}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                className="chat-reaction-option"
                onClick={() => { handleReaction(msg.id, emoji); setShowReactionPicker(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chat-bubble-col">
        <div className="chat-bubble">
          {editingMessage === msg.id ? (
            <div className="chat-edit-form">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="chat-edit-input"
                autoFocus
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleEditMessage(msg.id, editText); }
                  else if (e.key === "Escape") { cancelEditing(); }
                }}
              />
              <div className="chat-edit-actions">
                <button type="button" onClick={() => handleEditMessage(msg.id, editText)} className="chat-edit-save"><CheckIcon size={18} /></button>
                <button type="button" onClick={cancelEditing} className="chat-edit-cancel"><CloseIcon size={18} /></button>
              </div>
            </div>
          ) : (
            <>
              {msg.gifUrl && (
                <img src={msg.gifUrl} alt="GIF" className="chat-msg-gif" />
              )}
              {msg.text && (
                <p>
                  {msg.text}
                  {msg.edited && <span className="chat-edited"> (edited)</span>}
                </p>
              )}
              <LinkPreview text={msg.text} />
              {isOwn && (
                <div className="chat-msg-actions">
                  <button onClick={() => startEditing(msg)} className="chat-action-btn" title="Edit"><EditIcon size={16} /></button>
                  <button
                    onClick={() => askConfirm("Delete Message?", "This message will be permanently deleted.", () => handleDeleteMessage(msg.id))}
                    className="chat-action-btn"
                    title="Delete"
                  ><DeleteIcon size={16} /></button>
                </div>
              )}
            </>
          )}
          <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
        </div>

        {reactionEntries.length > 0 && (
          <div className={`chat-reactions${isOwn ? " own" : ""}`}>
            {reactionEntries.map(([emoji, uids]) => (
              <button
                key={emoji}
                className={`chat-reaction-pill${uids.includes(currentUid) ? " active" : ""}`}
                onClick={() => handleReaction(msg.id, emoji)}
                title={`${uids.length} reaction${uids.length !== 1 ? "s" : ""}`}
              >
                {emoji}{uids.length > 1 && ` ${uids.length}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
