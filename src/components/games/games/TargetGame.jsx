import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import "./TargetGame.css";

export default function TargetGame() {
  const { firebaseUser } = useAuth();
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [target, setTarget] = useState(null);
  const [gameWidth] = useState(400);
  const [gameHeight] = useState(300);
  const [missCount, setMissCount] = useState(0);

  // Generate random target position
  const generateTarget = useCallback(() => {
    const targetSize = 60;
    const x = Math.random() * (gameWidth - targetSize);
    const y = Math.random() * (gameHeight - targetSize);
    setTarget({ x, y, id: Math.random() });
  }, [gameWidth, gameHeight]);

  // Start game
  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setMissCount(0);
    setIsPlaying(true);
    generateTarget();
  };

  // End game
  const endGame = useCallback(async () => {
    setIsPlaying(false);
    if (firebaseUser && !firebaseUser.isAnonymous) {
      try {
        await saveGameScore("target", score, firebaseUser.uid);
        toast.success(`Game Over! Score: ${score}`);
      } catch (_err) {
        toast.error("Failed to save score");
      }
    }
  }, [firebaseUser, score]);

  // Timer effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // End game when timer reaches 0
  useEffect(() => {
    if (isPlaying && timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, isPlaying, endGame]);

  // Handle target click
  const handleTargetClick = (e) => {
    e.stopPropagation();
    if (!isPlaying) return;
    setScore((prev) => prev + 1);
    generateTarget();
  };

  // Handle missed click
  const handleGameAreaClick = (e) => {
    if (!isPlaying || !target) return;
    // Only count as miss if clicking on game area but not on target
    if (e.target === e.currentTarget) {
      setMissCount((prev) => prev + 1);
    }
  };

  return (
    <div className="target-game">
      <h2>🎯 Target Game</h2>
      <p>Click the targets as fast as you can!</p>

      <div className="target-stats">
        <div className="target-stat">
          <div className="target-stat-label">Score</div>
          <div className="target-stat-value">{score}</div>
        </div>
        <div className="target-stat">
          <div className="target-stat-label">Time</div>
          <div className="target-stat-value">{timeLeft}s</div>
        </div>
        <div className="target-stat">
          <div className="target-stat-label">Misses</div>
          <div className="target-stat-value">{missCount}</div>
        </div>
      </div>

      {!isPlaying ? (
        <>
          <button className="target-start-btn" onClick={startGame}>
            {score > 0 ? "Play Again" : "Start Game"}
          </button>
          {score > 0 && (
            <div className="target-final-score">
              Final Score: {score} | Accuracy:{" "}
              {Math.round((score / (score + missCount)) * 100) || 0}%
            </div>
          )}
        </>
      ) : (
        <div
          className="target-game-area"
          onClick={handleGameAreaClick}
          style={{ cursor: "crosshair" }}
        >
          {target && (
            <div
              className="target"
              style={{
                left: `${target.x}px`,
                top: `${target.y}px`,
              }}
              onClick={handleTargetClick}
            >
              🎪
            </div>
          )}
        </div>
      )}
    </div>
  );
}
