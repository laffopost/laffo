import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getGameLeaderboard, getUserRank } from "./leaderboardApi";
import { formatTimeAgo } from "../../utils/gameUtils";
import "./Leaderboard.css";

import logger from "../../utils/logger";
import { MessageIcon } from "../../utils/icons";

export default function Leaderboard({ gameKey }) {
  const [scores, setScores]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [userRank, setUserRank] = useState(null);
  const { firebaseUser } = useAuth();

  const loadScores = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const leaderboard = await getGameLeaderboard(gameKey, 10);
    setScores(leaderboard);
    if (showSpinner) setLoading(false);

    // Check if user is outside top 10
    if (firebaseUser && !firebaseUser.isAnonymous) {
      const inTop = leaderboard.some((s) => s.userId === firebaseUser.uid);
      if (!inTop) {
        const rank = await getUserRank(gameKey, firebaseUser.uid);
        setUserRank(rank);
      } else {
        setUserRank(null);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setUserRank(null);
    loadScores(true);
    const interval = setInterval(() => loadScores(false), 30000);
    return () => clearInterval(interval);
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
        <>
          <ul className="leaderboard-list">
            {scores.map((score, index) => {
              const isCurrentUser = firebaseUser?.uid === score.userId;
              return (
                <li
                  key={score.id}
                  className={`leaderboard-item ${isCurrentUser ? "current-user" : ""}`}
                >
                  <div className="leaderboard-rank">{getMedalEmoji(index + 1)}</div>

                  <div className="leaderboard-name" title={score.username}>
                    {score.avatar
                      ? <img src={score.avatar} alt="" className="leaderboard-avatar" />
                      : <div className="leaderboard-avatar leaderboard-avatar-placeholder">
                          {score.username?.[0]?.toUpperCase() || "?"}
                        </div>
                    }
                    <span className="leaderboard-username">{score.username}</span>
                    {isCurrentUser && <span className="you-badge">YOU</span>}
                  </div>

                  <div className="leaderboard-score-col">
                    <div className="leaderboard-score">{score.score}</div>
                    <div className="leaderboard-time">{formatTimeAgo(score.createdAt)}</div>
                  </div>

                  {!isCurrentUser && firebaseUser && !firebaseUser.isAnonymous && score.userId && (
                    <button
                      className="leaderboard-dm-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("openDM", {
                          detail: { uid: score.userId, username: score.username, avatar: score.avatar || null },
                        }));
                      }}
                      title={`DM ${score.username}`}
                    >
                      <MessageIcon size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {userRank && (
            <div className="leaderboard-your-rank">
              Your rank: <strong>#{userRank}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
