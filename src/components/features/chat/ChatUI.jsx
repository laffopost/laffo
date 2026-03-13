import { Link } from "react-router-dom";
import { EmojiPicker } from "../utilities";
import { formatTime } from "../../../utils/formatters";
import "./ChatUI.css";

/**
 * ChatUI — unified two-pane chat layout (sidebar + chat area).
 *
 * variant="overlay" — rendered inside the FAB popup (DirectMessages)
 * variant="page"    — rendered as the full Messages page
 */
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
  showNewChat,
  setShowNewChat,
  editingMessage,
  editText,
  setEditText,
  showEmojiPicker,
  setShowEmojiPicker,
  messagesEndRef,
  inputRef,
  // callbacks
  handleSend,
  handleSearchUsers,
  handleEditMessage,
  handleDeleteMessage,
  deleteConversation,
  startConversation,
  startEditing,
  cancelEditing,
  handleEmojiSelect,
  getOtherUser,
  // layout
  variant = "page",
  onClose,
}) {
  return (
    <div className="chat-ui">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className={`chat-sidebar ${activeConvo ? "hide-mobile" : ""}`}>
        <div className="chat-sidebar-header">
          <h3>Messages</h3>
          <div className="chat-header-actions">
            <button
              className="chat-new-btn"
              onClick={() => setShowNewChat(!showNewChat)}
              title="New conversation"
            >
              ✏️
            </button>
            {variant === "overlay" && (
              <button
                className="chat-close-btn"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Always-visible search */}
        <div className="chat-search-section">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchUsers(e.target.value)}
            placeholder="Search users..."
            className="chat-search-input"
            autoFocus={showNewChat}
          />
          {showNewChat && (
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
          {conversations.length === 0 && !showNewChat ? (
            <div className="chat-empty-state">
              <span>✉️</span>
              <p>No messages yet</p>
              <button
                className="chat-start-btn"
                onClick={() => setShowNewChat(true)}
              >
                Start a conversation
              </button>
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
                  onClick={() => setActiveConvo(convo)}
                >
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
                  <div className="chat-convo-info">
                    <span className="chat-convo-name">{other.name}</span>
                    <span className="chat-convo-preview">
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
                ←
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
                        <span className="chat-username">{other.name}</span>
                        {variant === "page" && (
                          <Link
                            to={`/profile/${other.name}`}
                            className="chat-view-profile"
                          >
                            View Profile
                          </Link>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                className="chat-delete-btn"
                onClick={() => deleteConversation(activeConvo.id)}
                title="Delete conversation"
              >
                🗑️
              </button>
            </header>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-messages-empty">
                  <span>👋</span>
                  <p>Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-msg${msg.senderId === currentUser.uid ? " own" : ""}`}
                  >
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
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleEditMessage(msg.id, editText);
                              } else if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                          />
                          <div className="chat-edit-actions">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditMessage(msg.id, editText)
                              }
                              className="chat-edit-save"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="chat-edit-cancel"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>
                            {msg.text}
                            {msg.edited && (
                              <span className="chat-edited"> (edited)</span>
                            )}
                          </p>
                          {msg.senderId === currentUser.uid && (
                            <div className="chat-msg-actions">
                              <button
                                onClick={() => startEditing(msg)}
                                className="chat-action-btn"
                                title="Edit message"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Delete this message?")) {
                                    handleDeleteMessage(msg.id);
                                  }
                                }}
                                className="chat-action-btn"
                                title="Delete message"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      <span className="chat-msg-time">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
              <div className="chat-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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
                  😀
                </button>
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!newMessage.trim()}
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-area">
            <span>💬</span>
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
