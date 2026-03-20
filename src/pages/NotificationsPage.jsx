import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { NotificationIcon, HeartIcon, ChatIcon, UserIcon, AddIcon } from "../utils/icons";
import "./NotificationsPage.css";
import ConfirmModal from "../components/common/ConfirmModal";

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();
  const { firebaseUser } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !firebaseUser) {
      navigate("/");
    }
  }, [firebaseUser, loading, navigate]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.type === "follow") {
      navigate(`/profile/${notification.fromUsername}`);
    } else {
      navigate(`/image/${notification.postId}`);
    }
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
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <HeartIcon size={20} />;
      case "comment":
        return <ChatIcon size={20} />;
      case "follow":
        return <UserIcon size={20} />;
      case "new_post":
        return <AddIcon size={20} />;
      case "mention":
        return <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-primary)" }}>@</span>;
      default:
        return <NotificationIcon size={20} />;
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <div className="notifications-title-section">
            <h1><NotificationIcon size={28} style={{display: 'inline', marginRight: '8px'}} />Notifications</h1>
            <p className="notifications-subtitle">
              Stay updated with likes and comments on your posts
            </p>
          </div>

          {notifications.length > 0 && (
            <div className="notifications-actions">
              {unreadNotifications.length > 0 && (
                <button
                  className="action-btn mark-all-btn"
                  onClick={markAllAsRead}
                >
                  Mark all read ({unreadNotifications.length})
                </button>
              )}
              <button
                className="action-btn clear-all-btn"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="notifications-content">
          {notifications.length === 0 ? (
            <div className="no-notifications-message">
              <div className="no-notifications-icon"><NotificationIcon size={48} /></div>
              <h3>No notifications yet</h3>
              <p>
                When someone likes or comments on your posts, you'll see
                notifications here.
              </p>
            </div>
          ) : (
            <>
              {/* Unread notifications */}
              {unreadNotifications.length > 0 && (
                <div className="notifications-section">
                  <h2 className="section-title">
                    New ({unreadNotifications.length})
                  </h2>
                  <div className="notifications-list">
                    {unreadNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="notification-card unread"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-icon-large">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-details">
                          <div className="notification-message-large">
                            {notification.message}
                          </div>
                          {notification.postTitle && (
                            <div className="notification-post-info">
                              <strong>"{notification.postTitle}"</strong>
                            </div>
                          )}
                          {notification.commentText && (
                            <div className="notification-comment-preview">
                              "{notification.commentText}"
                            </div>
                          )}
                          <div className="notification-timestamp">
                            {formatTimestamp(notification.createdAt)}
                          </div>
                        </div>
                        <div className="unread-dot"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <div className="notifications-section">
                  <h2 className="section-title">Earlier</h2>
                  <div className="notifications-list">
                    {readNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="notification-card read"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-icon-large">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-details">
                          <div className="notification-message-large">
                            {notification.message}
                          </div>
                          {notification.postTitle && (
                            <div className="notification-post-info">
                              <strong>"{notification.postTitle}"</strong>
                            </div>
                          )}
                          {notification.commentText && (
                            <div className="notification-comment-preview">
                              "{notification.commentText}"
                            </div>
                          )}
                          <div className="notification-timestamp">
                            {formatTimestamp(notification.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showClearConfirm && (
        <ConfirmModal
          title="Clear All Notifications?"
          message="This action cannot be undone."
          confirmLabel="Clear all"
          onConfirm={() => { clearAllNotifications(); setShowClearConfirm(false); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
