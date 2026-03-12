import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";

import logger from "../../utils/logger";
/**
 * Save a game score to Firebase
 * @param {string} gameKey - Game identifier (click, memory, reaction, snake)
 * @param {number} score - Player's score
 * @param {object} user - User object with uid and username
 */
export const saveGameScore = async (gameKey, score, user) => {
  if (!user || !user.uid) {
    logger.warn("⚠️ No user logged in, score not saved");
    return false;
  }

  logger.log("🎮 Attempting to save game score:", { gameKey, score, user });

  try {
    const scoreData = {
      game: gameKey,
      score: score,
      userId: user.uid,
      username: user.username || user.displayName || "Anonymous",
      avatar: user.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    logger.log("📝 Score data to save:", scoreData);
    const docRef = await addDoc(collection(db, "gameScores"), scoreData);
    logger.log("✅ Game score saved successfully with ID:", docRef.id);
    return true;
  } catch (error) {
    logger.error("❌ Error saving game score:", error);
    logger.error("Error details:", error.message, error.code);
    return false;
  }
};

/**
 * Get top scores for a specific game
 * @param {string} gameKey - Game identifier
 * @param {number} limitCount - Number of scores to retrieve (default 10)
 */
export const getGameLeaderboard = async (gameKey, limitCount = 10) => {
  logger.log(`🔍 Loading leaderboard for ${gameKey}, limit: ${limitCount}`);

  try {
    const scoresRef = collection(db, "gameScores");
    // Super simple query - only filter, no ordering (to avoid index requirement)
    const q = query(
      scoresRef,
      where("game", "==", gameKey),
      // No orderBy or limit - do everything client-side
    );

    logger.log(`📊 Executing leaderboard query for ${gameKey}`);
    const querySnapshot = await getDocs(q);
    const scores = [];

    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logger.log(`📊 Raw scores loaded: ${scores.length} total scores`);

    // Group scores by user and keep only the best score per user
    const bestScoresByUser = {};
    scores.forEach((score) => {
      const userId = score.userId;
      if (
        !bestScoresByUser[userId] ||
        score.score > bestScoresByUser[userId].score
      ) {
        bestScoresByUser[userId] = score;
      } else if (score.score === bestScoresByUser[userId].score) {
        // If scores are tied, keep the earlier one
        const currentTime =
          score.timestamp?.toDate?.() || new Date(score.createdAt || 0);
        const bestTime =
          bestScoresByUser[userId].timestamp?.toDate?.() ||
          new Date(bestScoresByUser[userId].createdAt || 0);
        if (currentTime < bestTime) {
          bestScoresByUser[userId] = score;
        }
      }
    });

    // Convert back to array and sort
    const uniqueScores = Object.values(bestScoresByUser);
    const sortedScores = uniqueScores
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score wins
        }
        // If scores are tied, earlier timestamp wins
        const timeA = a.timestamp?.toDate?.() || new Date(a.createdAt || 0);
        const timeB = b.timestamp?.toDate?.() || new Date(b.createdAt || 0);
        return timeA - timeB;
      })
      .slice(0, limitCount); // Limit after sorting

    logger.log(
      `📊 Final leaderboard for ${gameKey} (unique users):`,
      sortedScores,
    );
    return sortedScores;
  } catch (error) {
    logger.error("❌ Error loading leaderboard:", error);
    logger.error("Error details:", error.message, error.code);
    return [];
  }
};

/**
 * Get user's best score for a game
 * @param {string} gameKey - Game identifier
 * @param {string} userId - User's Firebase UID
 */
export const getUserBestScore = async (gameKey, userId) => {
  if (!userId) return null;

  try {
    const scoresRef = collection(db, "gameScores");
    const q = query(
      scoresRef,
      where("game", "==", gameKey),
      where("userId", "==", userId),
      orderBy("score", "desc"),
      limit(1),
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const bestScore = querySnapshot.docs[0].data();
    return bestScore;
  } catch (error) {
    logger.error("❌ Error loading user best score:", error);
    return null;
  }
};
