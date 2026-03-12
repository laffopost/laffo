import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import logger from "./logger";

/**
 * Utility for handling post expiration and automatic deletion
 */
export class PostExpiryService {
  constructor(firestore) {
    this.db = firestore;
    this.cleanupIntervalId = null;
    this.isRunning = false;
  }

  /**
   * Start automatic cleanup of expired posts
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
   */
  startCleanup(intervalMs = 300000) {
    // 5 minutes default
    if (this.isRunning) {
      logger.log("🧹 Post expiry cleanup already running");
      return;
    }

    this.isRunning = true;
    logger.log(
      `🧹 Starting post expiry cleanup (interval: ${intervalMs / 1000}s)`,
    );

    // Run initial cleanup
    this.cleanupExpiredPosts();

    // Set up recurring cleanup
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredPosts();
    }, intervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      this.isRunning = false;
      logger.log("🧹 Stopped post expiry cleanup");
    }
  }

  /**
   * Find and delete all expired posts
   */
  async cleanupExpiredPosts() {
    try {
      const now = Date.now();
      logger.log("🧹 Starting expired posts cleanup...");

      // Query for posts that have an endsAt timestamp and are expired
      const postsRef = collection(this.db, "images");
      const expiredQuery = query(
        postsRef,
        where("endsAt", "<=", now),
        where("endsAt", "!=", null),
      );

      const snapshot = await getDocs(expiredQuery);

      if (snapshot.empty) {
        logger.log("🧹 No expired posts found");
        return;
      }

      logger.log(`🧹 Found ${snapshot.size} expired posts to delete`);

      // Delete expired posts in batches
      const deletePromises = [];

      snapshot.forEach((postDoc) => {
        const postData = postDoc.data();
        logger.log(
          `🗑️ Deleting expired post: ${postData.title || postData.text || "Untitled"} (ID: ${postDoc.id})`,
        );

        deletePromises.push(
          deleteDoc(doc(this.db, "images", postDoc.id)).catch((error) => {
            logger.error(
              `❌ Failed to delete expired post ${postDoc.id}:`,
              error,
            );
          }),
        );
      });

      // Execute all deletions
      await Promise.all(deletePromises);
      logger.log(
        `✅ Successfully cleaned up ${deletePromises.length} expired posts`,
      );
    } catch (error) {
      logger.error("❌ Error during expired posts cleanup:", error);
    }
  }

  /**
   * Check if a post is expired
   * @param {Object} post - Post object with endsAt timestamp
   * @returns {boolean} - True if post is expired
   */
  isPostExpired(post) {
    if (!post.endsAt) return false;
    return Date.now() > post.endsAt;
  }

  /**
   * Get time remaining for a post
   * @param {Object} post - Post object with endsAt timestamp
   * @returns {Object|null} - Object with remaining time info or null if no expiry
   */
  getTimeRemaining(post) {
    if (!post.endsAt) return null;

    const ms = post.endsAt - Date.now();
    if (ms <= 0) return { expired: true, label: "Expired" };

    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (days > 0)
      return { expired: false, label: `${days}d left`, days, hours, minutes };
    if (hours > 0)
      return { expired: false, label: `${hours}h left`, hours, minutes };
    if (minutes > 0)
      return { expired: false, label: `${minutes}m left`, minutes };
    return { expired: false, label: "< 1m left" };
  }

  /**
   * Schedule deletion for a specific post
   * @param {string} postId - Post ID
   * @param {number} endsAt - Timestamp when post should be deleted
   */
  schedulePostDeletion(postId, endsAt) {
    if (!endsAt) return;

    const delay = endsAt - Date.now();
    if (delay <= 0) {
      // Post is already expired, delete immediately
      this.deleteExpiredPost(postId);
      return;
    }

    logger.log(
      `⏰ Scheduling deletion for post ${postId} in ${Math.floor(delay / 1000)}s`,
    );

    setTimeout(() => {
      this.deleteExpiredPost(postId);
    }, delay);
  }

  /**
   * Delete a specific expired post
   * @param {string} postId - Post ID to delete
   */
  async deleteExpiredPost(postId) {
    try {
      logger.log(`🗑️ Auto-deleting expired post: ${postId}`);
      await deleteDoc(doc(this.db, "images", postId));
      logger.log(`✅ Successfully deleted expired post: ${postId}`);
    } catch (error) {
      logger.error(`❌ Failed to delete expired post ${postId}:`, error);
    }
  }
}

// Create singleton instance
let expiryServiceInstance = null;

/**
 * Get the post expiry service instance
 * @param {Object} firestore - Firestore database instance
 * @returns {PostExpiryService} - Post expiry service instance
 */
export function getPostExpiryService(firestore) {
  if (!expiryServiceInstance) {
    expiryServiceInstance = new PostExpiryService(firestore);
  }
  return expiryServiceInstance;
}
