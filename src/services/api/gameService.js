/**
 * Game Service
 * Handles game-related API and Firebase operations
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getFirestore } from "../../firebase/config";

const db = getFirestore();

/**
 * Save a game score to leaderboard
 */
export const saveGameScore = async (game, score, metadata = {}) => {
  try {
    const scoresCollection = collection(db, "gameScores");
    const docRef = await addDoc(scoresCollection, {
      game,
      score,
      ...metadata,
      timestamp: new Date(),
    });
    return { id: docRef.id, game, score };
  } catch (error) {
    console.error("Error saving game score:", error);
    throw error;
  }
};

/**
 * Get leaderboard for a specific game
 */
export const getGameLeaderboard = async (game, limitCount = 10) => {
  try {
    const scoresCollection = collection(db, "gameScores");
    const q = query(
      scoresCollection,
      orderBy("score", "desc"),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((score) => score.game === game);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
};

export default {
  saveGameScore,
  getGameLeaderboard,
};
