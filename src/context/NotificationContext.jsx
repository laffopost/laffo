import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./AuthContext";

import logger from "../utils/logger";
const NotificationContext = createContext();

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid;

  // Subscribe to user's notifications
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    logger.log("Setting up notifications listener for user:", userId);

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      limit(50), // Limit to last 50 notifications (removed orderBy to avoid index requirement)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        notificationsList.push(data);
        if (!data.read) unread++;
      });

      // Sort notifications by createdAt (most recent first) on client side
      notificationsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setNotifications(notificationsList);
      setUnreadCount(unread);
      setLoading(false);

      logger.log(
        `Loaded ${notificationsList.length} notifications, ${unread} unread`,
      );
    });

    return () => unsubscribe();
  }, [userId]);

  // Create notification when someone likes a post
  const createLikeNotification = useCallback(
    async (postId, postAuthorId, postTitle) => {
      if (!userId || !userProfile?.username || userId === postAuthorId) {
        return; // Don't notify yourself or if not properly authenticated
      }

      try {
        const message = `${userProfile.username} liked your post`;

        await addDoc(collection(db, "notifications"), {
          userId: postAuthorId,
          fromUserId: userId,
          fromUsername: userProfile.username,
          type: "like",
          postId,
          postTitle: postTitle || "Untitled Post",
          message,
          read: false,
          createdAt: serverTimestamp(),
        });

        logger.log("Like notification created");
      } catch (error) {
        logger.error("Error creating like notification:", error);
      }
    },
    [userId, userProfile],
  );

  // Create notification when someone comments on a post
  const createCommentNotification = useCallback(
    async (postId, postAuthorId, postTitle, commentText) => {
      if (!userId || !userProfile?.username || userId === postAuthorId) {
        return; // Don't notify yourself or if not properly authenticated
      }

      try {
        const message = `${userProfile.username} commented on your post`;

        await addDoc(collection(db, "notifications"), {
          userId: postAuthorId,
          fromUserId: userId,
          fromUsername: userProfile.username,
          type: "comment",
          postId,
          postTitle: postTitle || "Untitled Post",
          commentText: commentText?.slice(0, 100) || "", // Truncate long comments
          message,
          read: false,
          createdAt: serverTimestamp(),
        });

        logger.log("Comment notification created");
      } catch (error) {
        logger.error("Error creating comment notification:", error);
      }
    },
    [userId, userProfile],
  );

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      logger.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

      if (unreadNotifications.length === 0) return;

      const batch = writeBatch(db);

      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id);
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
      logger.log("All notifications marked as read");
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
    }
  }, [userId, notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const batch = writeBatch(db);

      notifications.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();
      logger.log("All notifications cleared");
    } catch (error) {
      logger.error("Error clearing notifications:", error);
    }
  }, [userId, notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      createLikeNotification,
      createCommentNotification,
      markAsRead,
      markAllAsRead,
      clearAllNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      createLikeNotification,
      createCommentNotification,
      markAsRead,
      markAllAsRead,
      clearAllNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
