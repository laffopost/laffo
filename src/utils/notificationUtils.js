import { db } from "../firebase/config";

import logger from "./logger";

// Notify all followers when a user creates a new post
export const notifyFollowersOfNewPost = async ({
  authorId,
  authorUsername,
  postId,
  postTitle,
}) => {
  if (!authorId) return;

  try {
    const { getDocs, addDoc, collection, query, where, serverTimestamp } =
      await import("firebase/firestore");

    // Get all users who follow this author
    const followsQuery = query(
      collection(db, "follows"),
      where("followingId", "==", authorId),
    );
    const followsSnap = await getDocs(followsQuery);

    if (followsSnap.empty) return;

    const message = `${authorUsername || "Someone"} published a new post`;

    const promises = followsSnap.docs.map((followDoc) => {
      const followerId = followDoc.data().followerId;
      return addDoc(collection(db, "notifications"), {
        userId: followerId,
        fromUserId: authorId,
        fromUsername: authorUsername || "Anonymous",
        type: "new_post",
        postId,
        postTitle: postTitle || "Untitled Post",
        message,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(promises);
    logger.log(
      `✅ Notified ${followsSnap.size} followers about new post ${postId}`,
    );
  } catch (error) {
    logger.error("❌ Error notifying followers of new post:", error);
  }
};

// Utility to create notifications outside of React context
export const createNotificationForPost = async (notificationData) => {
  const {
    type,
    postId,
    postAuthorId,
    postTitle,
    currentUserId,
    currentUsername,
    commentText,
  } = notificationData;

  logger.log("🔔 Creating notification:", {
    type,
    postId,
    postAuthorId,
    currentUserId,
    currentUsername,
    willSkip: currentUserId === postAuthorId,
  });

  // Skip if user is reacting to their own post
  if (currentUserId === postAuthorId) {
    logger.log("⚠️ Skipping notification: User is reacting to their own post");
    return;
  }

  if (!postAuthorId) {
    logger.log("⚠️ Skipping notification: No post author ID found");
    return;
  }

  try {
    // Import Firebase functions
    const { addDoc, collection, serverTimestamp } =
      await import("firebase/firestore");

    let message;
    const notificationDoc = {
      userId: postAuthorId,
      fromUserId: currentUserId,
      fromUsername: currentUsername || "Anonymous",
      type,
      postId,
      postTitle: postTitle || "Untitled Post",
      read: false,
      createdAt: serverTimestamp(),
    };

    if (type === "like") {
      message = `${currentUsername || "Anonymous"} liked your post`;
      notificationDoc.message = message;
    } else if (type === "comment") {
      message = `${currentUsername || "Anonymous"} commented on your post`;
      notificationDoc.message = message;
      notificationDoc.commentText = commentText?.slice(0, 100) || "";
    }

    await addDoc(collection(db, "notifications"), notificationDoc);
    logger.log(
      `✅ ${type} notification created successfully for user ${postAuthorId}:`,
      notificationDoc,
    );
  } catch (error) {
    logger.error(`❌ Error creating ${type} notification:`, error);
    logger.error("Notification data was:", notificationData);
  }
};
