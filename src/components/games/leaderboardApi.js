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
 * Internal helper: dedup by user (best score per user) and sort descending.
 */
function buildRankedScores(rawScores) {
  const bestByUser = {};
  rawScores.forEach((score) => {
    const uid = score.userId;
    if (!bestByUser[uid] || score.score > bestByUser[uid].score) {
      bestByUser[uid] = score;
    } else if (score.score === bestByUser[uid].score) {
      const t1 = score.timestamp?.toDate?.() || new Date(score.createdAt || 0);
      const t2 = bestByUser[uid].timestamp?.toDate?.() || new Date(bestByUser[uid].createdAt || 0);
      if (t1 < t2) bestByUser[uid] = score;
    }
  });
  return Object.values(bestByUser).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tA = a.timestamp?.toDate?.() || new Date(a.createdAt || 0);
    const tB = b.timestamp?.toDate?.() || new Date(b.createdAt || 0);
    return tA - tB;
  });
}

/**
 * Fetch all raw scores for a game (client-side only — no compound index needed).
 */
async function fetchRawScores(gameKey) {
  const q = query(collection(db, "gameScores"), where("game", "==", gameKey));
  const snap = await getDocs(q);
  const scores = [];
  snap.forEach((doc) => scores.push({ id: doc.id, ...doc.data() }));
  return scores;
}

/**
 * Save a game score to Firebase
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
      score,
      userId: user.uid,
      username: user.username || user.displayName || "Anonymous",
      avatar: user.avatar || null,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "gameScores"), scoreData);
    logger.log("✅ Game score saved:", docRef.id);
    return true;
  } catch (error) {
    logger.error("❌ Error saving game score:", error.message);
    return false;
  }
};

/**
 * Get top scores for a specific game
 */
export const getGameLeaderboard = async (gameKey, limitCount = 10) => {
  logger.log(`🔍 Loading leaderboard for ${gameKey}`);
  try {
    const raw = await fetchRawScores(gameKey);
    logger.log(`📊 Raw scores: ${raw.length}`);
    const ranked = buildRankedScores(raw).slice(0, limitCount);
    logger.log(`📊 Final leaderboard (${gameKey}):`, ranked);
    return ranked;
  } catch (error) {
    logger.error("❌ Error loading leaderboard:", error.message);
    return [];
  }
};

/**
 * Get the current user's rank for a game (1-based).
 * Returns null if the user has no score.
 */
export const getUserRank = async (gameKey, userId) => {
  if (!userId) return null;
  try {
    const raw = await fetchRawScores(gameKey);
    const ranked = buildRankedScores(raw);
    const idx = ranked.findIndex((s) => s.userId === userId);
    return idx === -1 ? null : idx + 1;
  } catch (error) {
    logger.error("❌ Error getting user rank:", error.message);
    return null;
  }
};

/**
 * Get the #1 global score for a game.
 * Returns { score, username, avatar } or null.
 */
export const getGlobalHighScore = async (gameKey) => {
  try {
    const raw = await fetchRawScores(gameKey);
    if (!raw.length) return null;
    const ranked = buildRankedScores(raw);
    if (!ranked.length) return null;
    const top = ranked[0];
    return { score: top.score, username: top.username, avatar: top.avatar };
  } catch (error) {
    logger.error("❌ Error getting global high score:", error.message);
    return null;
  }
};

/**
 * Get user's best score for a game
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
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data();
  } catch (error) {
    logger.error("❌ Error loading user best score:", error.message);
    return null;
  }
};
