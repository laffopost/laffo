import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import "./TargetGame.css";

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   duration: 40, size: 70, multiplier: 1 },
  { key: "normal", label: "Normal", duration: 30, size: 55, multiplier: 1.5 },
  { key: "hard",   label: "Hard",   duration: 20, size: 38, multiplier: 2.5 },
];

const GAME_W = 400;
const GAME_H = 300;

export default function TargetGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [gameState, setGameState]   = useState("idle"); // idle | playing | paused | over
  const [timeLeft, setTimeLeft]     = useState(30);
  const [target, setTarget]         = useState(null);
  const [score, setScore]           = useState(0);
  const [missCount, setMissCount]   = useState(0);
  const [bestScore, setBestScore]   = useState(0);

  const scoreRef   = useRef(0);
  const missRef    = useRef(0);
  const diffRef    = useRef(DIFFICULTIES[1]);
  const timerRef   = useRef(null);
  const pausedTimeRef = useRef(0);
  const [globalHigh, setGlobalHigh] = useState(null);

  useEffect(() => { getGlobalHighScore("target").then(setGlobalHigh); }, []);

  const generateTarget = useCallback((diff = diffRef.current) => {
    const s = diff.size;
    setTarget({
      x: Math.random() * (GAME_W - s),
      y: Math.random() * (GAME_H - s),
      id: Math.random(),
    });
  }, []);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    setGameState("over");
    const weighted = Math.round(scoreRef.current * diffRef.current.multiplier);
    setBestScore((b) => Math.max(b, weighted));
    if (firebaseUser && !firebaseUser.isAnonymous && weighted > 0) {
      saveGameScore("target", weighted, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  }, [firebaseUser, userProfile]);

  const startTimer = (from) => {
    setTimeLeft(from);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { endGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    scoreRef.current = 0;
    missRef.current  = 0;
    setScore(0);
    setMissCount(0);
    setGameState("playing");
    generateTarget(diff);
    startTimer(diff.duration);
  };

  const pauseGame = () => {
    clearInterval(timerRef.current);
    setTimeLeft((t) => { pausedTimeRef.current = t; return t; });
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
    startTimer(pausedTimeRef.current);
  };

  const quitGame = () => {
    clearInterval(timerRef.current);
    setGameState("idle");
    setTarget(null);
    setScore(0);
    setMissCount(0);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleTargetClick = (e) => {
    e.stopPropagation();
    if (gameState !== "playing") return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    generateTarget();
  };

  const handleMiss = (e) => {
    if (gameState !== "playing") return;
    if (e.target === e.currentTarget) {
      missRef.current += 1;
      setMissCount(missRef.current);
    }
  };

  const weighted = Math.round(score * diffRef.current.multiplier);
  const accuracy = score + missCount > 0
    ? Math.round((score / (score + missCount)) * 100)
    : 0;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>🎯 Target Practice</h2>
        <p className="game-desc">
          Click targets as fast as you can — smaller targets score higher on harder modes!
        </p>
        {gameState === "idle" && (
          <>
            <div className="game-difficulty-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  className={`game-diff-btn ${difficulty === d.key ? "active" : ""}`}
                  onClick={() => setDifficulty(d.key)}
                >
                  {d.label}
                  <span className="game-diff-sub">{d.duration}s · ×{d.multiplier}</span>
                </button>
              ))}
            </div>
            {globalHigh && (
              <div className="game-global-banner">
                Record: <strong>{globalHigh.score}</strong> by @{globalHigh.username}
              </div>
            )}
          </>
        )}
      </div>

      <div className="game-card-body">
        <div className="game-stats">
          <div className="game-stat">
            <div className="game-stat-label">Score</div>
            <div className="game-stat-value">{score}</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-label">Time</div>
            <div className="game-stat-value">{timeLeft}s</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-label">Misses</div>
            <div className="game-stat-value">{missCount}</div>
          </div>
          {bestScore > 0 && (
            <div className="game-stat">
              <div className="game-stat-label">Best</div>
              <div className="game-stat-value">{bestScore}</div>
            </div>
          )}
        </div>

        {(gameState === "playing" || gameState === "paused") && (
          <div style={{ position: "relative" }}>
            <div
              className="target-game-area"
              onClick={handleMiss}
              style={{ opacity: gameState === "paused" ? 0.4 : 1 }}
            >
              {target && gameState === "playing" && (
                <div
                  className="target"
                  style={{
                    left: `${target.x}px`,
                    top:  `${target.y}px`,
                    width:    `${diffRef.current.size}px`,
                    height:   `${diffRef.current.size}px`,
                    fontSize: `${diffRef.current.size * 0.6}px`,
                  }}
                  onClick={handleTargetClick}
                >
                  🎯
                </div>
              )}
            </div>

            {gameState === "paused" && (
              <div className="game-pause-overlay">
                <h3>Paused</h3>
                <button className="game-btn" onClick={resumeGame}>Resume</button>
              </div>
            )}
          </div>
        )}

        {(gameState === "playing" || gameState === "paused") && (
          <div className="game-controls-bar">
            {gameState === "playing"
              ? <button className="game-btn pause" onClick={pauseGame}>⏸ Pause</button>
              : <button className="game-btn pause" onClick={resumeGame}>▶ Resume</button>
            }
            <button className="game-btn secondary" onClick={quitGame}>✕ Quit</button>
          </div>
        )}

        {gameState === "over" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "0.4rem" }}>
              Hits: {score} × {diffRef.current.multiplier} = <strong>{weighted}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Accuracy: {accuracy}%
            </div>
            {weighted >= bestScore && bestScore > 0 && <div className="new-best">🏆 New Best!</div>}
            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({
                    game: "Target Practice",
                    score: weighted,
                    extra: `${accuracy}% accuracy`,
                    difficulty: diffRef.current.label,
                  })}
                >
                  📢 Share
                </button>
              )}
              <button className="game-btn secondary" onClick={quitGame}>Menu</button>
            </div>
          </div>
        )}

        {gameState === "idle" && (
          <button className="game-btn" onClick={startGame}>Start Game</button>
        )}
      </div>
    </div>
  );
}
