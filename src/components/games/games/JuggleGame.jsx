import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./JuggleGame.css";

import logger from "../../../utils/logger";

const BALL_SIZE = 40;
const SCORE_INTERVAL = 250; // ms

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   gravity: 0.008, bounce: -1.2, balls: 1, multiplier: 1 },
  { key: "normal", label: "Normal", gravity: 0.015, bounce: -1.5, balls: 1, multiplier: 1.5 },
  { key: "hard",   label: "Hard",   gravity: 0.025, bounce: -1.8, balls: 2, multiplier: 2.5 },
];

function JuggleGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty]     = useState("normal");
  const [gameState, setGameState]       = useState("idle"); // idle | playing | paused | over
  const [balls, setBalls]               = useState([]);
  const [displayScore, setDisplayScore] = useState(0);
  const [finalScore, setFinalScore]     = useState(0);
  const [bestScore, setBestScore]       = useState(0);

  const gameAreaRef      = useRef(null);
  const animationRef     = useRef(null);
  const scoreIntervalRef = useRef(null);
  const scoreRef         = useRef(0);
  const diffRef          = useRef(DIFFICULTIES[1]);
  const startedRef       = useRef(false);
  const pausedBallsRef   = useRef([]);
  const [globalHigh, setGlobalHigh] = useState(null);

  useEffect(() => { getGlobalHighScore("juggle").then(setGlobalHigh); }, []); // snapshot when paused

  const createBalls = useCallback((diff) => {
    if (!gameAreaRef.current) return [];
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    const COLORS = ["🔴", "🟡", "🟢", "🔵", "🟣"];
    return Array.from({ length: diff.balls }, (_, i) => ({
      id: i,
      x: (width / (diff.balls + 1)) * (i + 1) - BALL_SIZE / 2,
      y: height / 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.5,
      color: COLORS[i % COLORS.length],
    }));
  }, []);

  const endGame = useCallback(() => {
    startedRef.current = false;
    clearInterval(scoreIntervalRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const seconds  = Math.floor(scoreRef.current / 4);
    const weighted = Math.round(seconds * diffRef.current.multiplier);
    setFinalScore(weighted);
    setBestScore((b) => Math.max(b, weighted));
    setGameState("over");

    if (firebaseUser && !firebaseUser.isAnonymous && weighted > 0) {
      logger.log("🎮 Saving Juggle score:", weighted);
      saveGameScore("juggle", weighted, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  }, [firebaseUser, userProfile]);

  const updateBalls = useCallback(() => {
    if (!gameAreaRef.current || !startedRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    const g = diffRef.current.gravity;

    setBalls((prev) => {
      const updated = prev.map((ball) => {
        let b = { ...ball, vy: ball.vy + g, x: ball.x + ball.vx, y: ball.y + ball.vy };
        if (b.x <= 0 || b.x >= width - BALL_SIZE) {
          b.vx *= -0.8;
          b.x = Math.max(0, Math.min(width - BALL_SIZE, b.x));
        }
        if (b.y >= height - BALL_SIZE) return null;
        return b;
      }).filter(Boolean);

      if (updated.length < prev.length) { endGame(); return []; }
      return updated;
    });
  }, [endGame]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;
    const loop = () => {
      updateBalls();
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, updateBalls]);

  useEffect(() => () => {
    clearInterval(scoreIntervalRef.current);
    cancelAnimationFrame(animationRef.current);
  }, []);

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    scoreRef.current = 0;
    setDisplayScore(0);
    setFinalScore(0);
    startedRef.current = true;
    setBalls(createBalls(diff));
    setGameState("playing");

    scoreIntervalRef.current = setInterval(() => {
      scoreRef.current += 1;
      setDisplayScore(Math.floor(scoreRef.current / 4));
    }, SCORE_INTERVAL);
  };

  const pauseGame = () => {
    startedRef.current = false;
    clearInterval(scoreIntervalRef.current);
    cancelAnimationFrame(animationRef.current);
    pausedBallsRef.current = balls;
    setGameState("paused");
  };

  const resumeGame = () => {
    startedRef.current = true;
    setBalls(pausedBallsRef.current);
    setGameState("playing");

    scoreIntervalRef.current = setInterval(() => {
      scoreRef.current += 1;
      setDisplayScore(Math.floor(scoreRef.current / 4));
    }, SCORE_INTERVAL);
  };

  const quitGame = () => {
    startedRef.current = false;
    clearInterval(scoreIntervalRef.current);
    cancelAnimationFrame(animationRef.current);
    setBalls([]);
    setDisplayScore(0);
    setGameState("idle");
  };

  const handleBallClick = (ballId) => {
    if (gameState !== "playing") return;
    setBalls((prev) =>
      prev.map((b) =>
        b.id === ballId
          ? { ...b, vy: diffRef.current.bounce, vx: b.vx + (Math.random() - 0.5) * 0.15 }
          : b,
      ),
    );
  };

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>
          <img src={laughIcon} alt="" className="game-title-icon" />
          Juggle Master
        </h2>
        <p className="game-desc">
          Click the balls to keep them in the air — don't let them hit the ground!
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
                  <span className="game-diff-sub">{d.balls} ball{d.balls > 1 ? "s" : ""} · ×{d.multiplier}</span>
                </button>
              ))}
            </div>
            {globalHigh && (
              <div className="game-global-banner">
                Record: <strong>{globalHigh.score}s</strong> by @{globalHigh.username}
              </div>
            )}
          </>
        )}
      </div>

      <div className="game-card-body">
        <div className="game-stats">
          <div className="game-stat">
            <div className="game-stat-label">Survived</div>
            <div className="game-stat-value">{displayScore}s</div>
          </div>
          {bestScore > 0 && (
            <div className="game-stat">
              <div className="game-stat-label">Best</div>
              <div className="game-stat-value">{bestScore}s</div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <div
            className={`juggle-game-area ${gameState === "playing" ? "active" : ""}`}
            ref={gameAreaRef}
          >
            {balls.map((ball) => (
              <div
                key={ball.id}
                className="juggle-ball"
                style={{ left: `${ball.x}px`, top: `${ball.y}px` }}
                onClick={() => handleBallClick(ball.id)}
              >
                {ball.color}
              </div>
            ))}
          </div>

          {gameState === "paused" && (
            <div className="game-pause-overlay">
              <h3>Paused</h3>
              <button className="game-btn" onClick={resumeGame}>Resume</button>
            </div>
          )}
        </div>

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
          <>
            <div style={{ textAlign: "center" }}>
              🎪 Survived {Math.floor(scoreRef.current / 4)}s × {diffRef.current.multiplier} = <strong>{finalScore}</strong>
            </div>
            {finalScore >= bestScore && bestScore > 0 && <div className="new-best">🏆 New Best!</div>}
            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({ game: "Juggle Master", score: finalScore, difficulty: diffRef.current.label })}
                >
                  📢 Share
                </button>
              )}
              <button className="game-btn secondary" onClick={quitGame}>Menu</button>
            </div>
          </>
        )}

        {gameState === "idle" && (
          <button className="game-btn" onClick={startGame}>Start Juggling</button>
        )}
      </div>
    </div>
  );
}

export default memo(JuggleGame);
