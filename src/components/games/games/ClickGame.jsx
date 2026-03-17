import { useState, useRef, useEffect, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./ClickGame.css";

import logger from "../../../utils/logger";

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   duration: 15, multiplier: 1 },
  { key: "normal", label: "Normal", duration: 10, multiplier: 1.5 },
  { key: "hard",   label: "Hard",   duration: 5,  multiplier: 3 },
];

// Combo: each click within 200ms of the previous adds +0.5 to the per-click weight
const COMBO_WINDOW_MS = 200;
const COMBO_BONUS = 0.5;

function ClickGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [gameState, setGameState]   = useState("idle"); // idle | playing | paused | over
  const [timer, setTimer]           = useState(10);
  const [clicks, setClicks]         = useState(0);
  const [combo, setCombo]           = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore]   = useState(0);
  const [shake, setShake]           = useState(false);
  const [globalHigh, setGlobalHigh] = useState(null);

  const clicksRef         = useRef(0);
  const weightedClicksRef = useRef(0);
  const comboRef          = useRef(0);
  const lastClickTimeRef  = useRef(0);
  const intervalRef       = useRef(null);
  const pausedTimeRef     = useRef(0);

  const diff = DIFFICULTIES.find((d) => d.key === difficulty);

  useEffect(() => {
    getGlobalHighScore("click").then(setGlobalHigh);
  }, []);

  const clearTimer = () => clearInterval(intervalRef.current);

  const finishGame = (weighted) => {
    clearTimer();
    const scored = Math.round(weighted * diff.multiplier);
    setFinalScore(scored);
    setBestScore((b) => Math.max(b, scored));
    setGameState("over");
    if (firebaseUser && !firebaseUser.isAnonymous && scored > 0) {
      logger.log("🎮 Saving Click Game score:", scored);
      saveGameScore("click", scored, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  };

  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          finishGame(weightedClicksRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    clicksRef.current         = 0;
    weightedClicksRef.current = 0;
    comboRef.current          = 0;
    lastClickTimeRef.current  = 0;
    setClicks(0);
    setCombo(0);
    setFinalScore(0);
    setTimer(diff.duration);
    setGameState("playing");
    startInterval();
  };

  const pauseGame = () => {
    clearTimer();
    setTimer((t) => { pausedTimeRef.current = t; return t; });
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
    setTimer(pausedTimeRef.current);
    startInterval();
  };

  const quitGame = () => {
    clearTimer();
    clicksRef.current         = 0;
    weightedClicksRef.current = 0;
    comboRef.current          = 0;
    setClicks(0);
    setCombo(0);
    setTimer(diff.duration);
    setGameState("idle");
  };

  useEffect(() => () => clearTimer(), []);

  const handleClick = () => {
    if (gameState !== "playing") return;
    const now = Date.now();
    const gap = now - lastClickTimeRef.current;

    if (gap < COMBO_WINDOW_MS) {
      comboRef.current = Math.min(comboRef.current + 1, 20);
    } else {
      comboRef.current = 0;
    }
    lastClickTimeRef.current = now;

    const clickWeight = 1 + comboRef.current * COMBO_BONUS;
    weightedClicksRef.current += clickWeight;
    clicksRef.current += 1;
    setClicks(clicksRef.current);
    setCombo(comboRef.current);
    setShake(true);
    setTimeout(() => setShake(false), 100);
  };

  const timerPct = (timer / diff.duration) * 100;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>
          <img src={laughIcon} alt="" className="game-title-icon" />
          Click Rush
        </h2>
        <p className="game-desc">
          Click as fast as you can — chain rapid clicks for a combo bonus!
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
            <div className="game-stat-label">Time</div>
            <div className="game-stat-value">{timer}s</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-label">Clicks</div>
            <div className="game-stat-value">{clicks}</div>
          </div>
          {combo > 1 && (
            <div className="game-stat">
              <div className="game-stat-label">Combo</div>
              <div className="game-stat-value" style={{ color: "#f59e0b" }}>×{(1 + combo * COMBO_BONUS).toFixed(1)}</div>
            </div>
          )}
          {bestScore > 0 && (
            <div className="game-stat">
              <div className="game-stat-label">Best</div>
              <div className="game-stat-value">{bestScore}</div>
            </div>
          )}
        </div>

        {(gameState === "playing" || gameState === "paused") && (
          <div className="click-timer-bar">
            <div className="click-timer-fill" style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <div style={{ position: "relative" }}>
          <button
            className={`click-target ${shake ? "shake" : ""} ${gameState === "playing" ? "active" : ""}`}
            onClick={handleClick}
            disabled={gameState !== "playing"}
          >
            <img src={laughIcon} alt="Click me!" className="click-target-icon" />
          </button>
          {gameState === "paused" && (
            <div className="game-pause-overlay" style={{ borderRadius: "50%" }}>
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
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
              🎉 {clicks} clicks × {diff.multiplier} = <strong>{finalScore}</strong>
            </div>
            {finalScore >= bestScore && bestScore > 0 && <div className="new-best">🏆 New Best!</div>}
            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({ game: "Click Rush", score: finalScore, difficulty: diff.label })}
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

export default memo(ClickGame);
