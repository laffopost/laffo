import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getGameLeaderboard } from "./leaderboardApi";
import "./Leaderboard.css";

import logger from "../../utils/logger";
export default function Leaderboard({ gameKey }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { firebaseUser } = useAuth();

  const loadScores = async () => {
    logger.log(`🔄 Loading scores for ${gameKey}`);
    setLoading(true);
    const leaderboard = await getGameLeaderboard(gameKey, 10);
    logger.log(`📊 Leaderboard loaded:`, leaderboard);
    setScores(leaderboard);
    setLoading(false);
  };

  useEffect(() => {
    const loadScoresData = async () => {
      await loadScores();
    };

    const runLoadScores = async () => {
      await loadScoresData();
    };

    runLoadScores();

    // Refresh leaderboard every 10 seconds
    const interval = setInterval(loadScores, 10000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  const getMedalEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="leaderboard">
      <h3>🏆 Top Players</h3>

      {loading ? (
        <div className="leaderboard-loading">Loading...</div>
      ) : scores.length === 0 ? (
        <div className="leaderboard-empty">
          No scores yet. Be the first to play!
        </div>
      ) : (
        <ul className="leaderboard-list">
          {scores.map((score, index) => {
            const isCurrentUser = firebaseUser?.uid === score.userId;

            return (
              <li
                key={score.id}
                className={`leaderboard-item ${
                  isCurrentUser ? "current-user" : ""
                }`}
              >
                <div className="leaderboard-rank">
                  {getMedalEmoji(index + 1)}
                </div>
                <div className="leaderboard-name" title={score.username}>
                  {score.username}
                  {isCurrentUser && <span className="you-badge">YOU</span>}
                </div>
                <div className="leaderboard-score">{score.score}</div>
                {!isCurrentUser &&
                  firebaseUser &&
                  !firebaseUser.isAnonymous &&
                  score.userId && (
                    <button
                      className="leaderboard-dm-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(
                          new CustomEvent("openDM", {
                            detail: {
                              uid: score.userId,
                              username: score.username,
                              avatar: score.avatar || null,
                            },
                          }),
                        );
                      }}
                      title={`DM ${score.username}`}
                    >
                      ✉️
                    </button>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
