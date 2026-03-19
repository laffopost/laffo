import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";
import { NotificationIcon, ChatIcon, HeartIconSmall, MessageIcon, UserIcon, AddIcon } from "../../../utils/icons";
import logger from "../../../utils/logger";
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  // Listen for unread count from DirectMessages instead of creating a duplicate Firestore listener
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  useEffect(() => {
    const handler = (e) => setUnreadMessageCount(e.detail ?? 0);
    window.addEventListener("dm-unread-count", handler);
    return () => window.removeEventListener("dm-unread-count", handler);
  }, []);
  const totalUnread = unreadCount + unreadMessageCount;
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Removed debug useEffect that logged on every notification change

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "follow") {
      navigate(`/profile/${notification.fromUsername}`);
    } else {
      navigate(`/image/${notification.postId}`);
    }
    setIsOpen(false);
  };

  const formatTimestamp = (createdAt) => {
    if (!createdAt) return "";

    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <HeartIconSmall size={18} style={{ color: "#ec4899" }} />;
      case "comment":
        return <ChatIcon size={18} />;
      case "follow":
        return <UserIcon size={18} style={{ color: "#a78bfa" }} />;
      case "new_post":
        return <AddIcon size={18} style={{ color: "#4ade80" }} />;
      default:
        return <NotificationIcon size={18} />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className={`notification-bell-button ${totalUnread > 0 ? "has-notifications" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${totalUnread > 0 ? `(${totalUnread} unread)` : ""}`}
      >
        <NotificationIcon size={20} className="bell-icon" style={{display: 'inline-block'}} />
        {totalUnread > 0 && (
          <span className="notification-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          {unreadMessageCount > 0 && (
            <div
              className="notification-item unread"
              onClick={() => { navigate("/messages"); setIsOpen(false); }}
              style={{ cursor: "pointer" }}
            >
              <div className="notification-icon"><MessageIcon size={18} /></div>
              <div className="notification-content">
                <div className="notification-message">
                  {unreadMessageCount} unread message{unreadMessageCount > 1 ? "s" : ""}
                </div>
                <div className="notification-time">Tap to open Messages</div>
              </div>
              <div className="unread-indicator" />
            </div>
          )}

          <div className="notification-list">
            {notifications.length === 0 && unreadMessageCount === 0 ? (
              <div className="no-notifications">
                <NotificationIcon size={32} className="no-notifications-icon" style={{display: 'inline-block'}} />
                <p>No notifications yet</p>
              </div>
            ) : notifications.length === 0 ? null : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    {notification.postTitle && (
                      <div className="notification-post-title">
                        "{notification.postTitle}"
                      </div>
                    )}
                    {notification.commentText && (
                      <div className="notification-comment">
                        "{notification.commentText}"
                      </div>
                    )}
                    <div className="notification-time">
                      {formatTimestamp(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="view-all-btn"
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
