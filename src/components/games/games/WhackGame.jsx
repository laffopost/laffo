import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./WhackGame.css";

import logger from "../../../utils/logger";

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   duration: 30, cols: 3, rows: 3,  showMs: 900,  multiplier: 1   },
  { key: "normal", label: "Normal", duration: 25, cols: 4, rows: 3,  showMs: 700,  multiplier: 1.5 },
  { key: "hard",   label: "Hard",   duration: 20, cols: 4, rows: 4,  showMs: 480,  multiplier: 2.5 },
];

// Emoji pool for whackable memes
const MEMES = ["😂", "🚀", "💎", "🌕", "🐸", "🦍", "🔥", "💰", "🎯", "⚡"];

function WhackGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [gameState, setGameState]   = useState("idle"); // idle | playing | paused | over
  const [score, setScore]           = useState(0);
  const [misses, setMisses]         = useState(0);
  const [timeLeft, setTimeLeft]     = useState(25);
  const [activeCells, setActiveCells] = useState(new Set()); // indices that are "up"
  const [hitCells, setHitCells]     = useState(new Set());  // brief hit animation
  const [bestScore, setBestScore]   = useState(0);
  const [globalHigh, setGlobalHigh] = useState(null);

  const scoreRef      = useRef(0);
  const missRef       = useRef(0);
  const diffRef       = useRef(DIFFICULTIES[1]);
  const cellEmojis    = useRef({}); // cellIndex → emoji
  const cellTimestamps = useRef({}); // cellIndex → spawn time
  const spawnRef      = useRef(null);
  const timerRef      = useRef(null);
  const rafRef        = useRef(null);
  const pausedTimeRef = useRef(0);

  useEffect(() => { getGlobalHighScore("whack").then(setGlobalHigh); }, []);

  const totalCells = () => diffRef.current.cols * diffRef.current.rows;

  // RAF loop: expire cells that have been up too long
  const tickExpiry = useCallback(() => {
    const now = Date.now();
    const { showMs } = diffRef.current;
    setActiveCells((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const idx of prev) {
        if (now - (cellTimestamps.current[idx] || now) > showMs) {
          next.delete(idx);
          delete cellTimestamps.current[idx];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    rafRef.current = requestAnimationFrame(tickExpiry);
  }, []);

  const spawnMole = useCallback(() => {
    const total = totalCells();
    setActiveCells((prev) => {
      // Don't overcrowd — max 40% of cells active
      if (prev.size >= Math.ceil(total * 0.4)) return prev;
      const available = [];
      for (let i = 0; i < total; i++) {
        if (!prev.has(i)) available.push(i);
      }
      if (!available.length) return prev;
      const idx = available[Math.floor(Math.random() * available.length)];
      cellEmojis.current[idx] = MEMES[Math.floor(Math.random() * MEMES.length)];
      cellTimestamps.current[idx] = Date.now();
      return new Set([...prev, idx]);
    });
  }, []);

  const endGame = useCallback(() => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setActiveCells(new Set());
    const weighted = Math.round(scoreRef.current * diffRef.current.multiplier);
    setBestScore((b) => Math.max(b, weighted));
    setGameState("over");
    if (firebaseUser && !firebaseUser.isAnonymous && weighted > 0) {
      logger.log("🎮 Saving Whack score:", weighted);
      saveGameScore("whack", weighted, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  }, [firebaseUser, userProfile]);

  const startTimers = (remaining) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    if (remaining !== undefined) setTimeLeft(remaining);

    clearInterval(spawnRef.current);
    const spawnInterval = Math.max(300, diffRef.current.showMs * 0.6);
    spawnRef.current = setInterval(spawnMole, spawnInterval);
  };

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    scoreRef.current = 0;
    missRef.current  = 0;
    cellEmojis.current    = {};
    cellTimestamps.current = {};
    setScore(0);
    setMisses(0);
    setActiveCells(new Set());
    setHitCells(new Set());
    setGameState("playing");
    rafRef.current = requestAnimationFrame(tickExpiry);
    startTimers(diff.duration);
    // Spawn first mole immediately
    setTimeout(spawnMole, 300);
  };

  const pauseGame = () => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setTimeLeft((t) => { pausedTimeRef.current = t; return t; });
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
    rafRef.current = requestAnimationFrame(tickExpiry);
    startTimers(pausedTimeRef.current);
  };

  const quitGame = () => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setActiveCells(new Set());
    scoreRef.current = 0;
    missRef.current  = 0;
    setScore(0);
    setMisses(0);
    setGameState("idle");
  };

  useEffect(() => () => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handleCellClick = (idx) => {
    if (gameState !== "playing") return;
    if (activeCells.has(idx)) {
      // Hit!
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setActiveCells((prev) => { const n = new Set(prev); n.delete(idx); return n; });
      delete cellTimestamps.current[idx];
      setHitCells((prev) => {
        const n = new Set(prev);
        n.add(idx);
        setTimeout(() => setHitCells((p) => { const c = new Set(p); c.delete(idx); return c; }), 200);
        return n;
      });
    } else {
      // Miss
      missRef.current += 1;
      setMisses(missRef.current);
    }
  };

  const diff = diffRef.current;
  const weighted = Math.round(score * diff.multiplier);
  const accuracy = score + misses > 0 ? Math.round((score / (score + misses)) * 100) : 0;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>
          <img src={laughIcon} alt="" className="game-title-icon" />
          Whack-a-Meme
        </h2>
        <p className="game-desc">
          Click the memes before they disappear — faster difficulty = smaller window!
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
            <div className="game-stat-label">Hits</div>
            <div className="game-stat-value">{score}</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-label">Time</div>
            <div className="game-stat-value">{timeLeft}s</div>
          </div>
          <div className="game-stat">
            <div className="game-stat-label">Misses</div>
            <div className="game-stat-value">{misses}</div>
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
              className="whack-grid"
              style={{
                gridTemplateColumns: `repeat(${diffRef.current.cols}, 1fr)`,
                width: `${diffRef.current.cols * 76 + (diffRef.current.cols - 1) * 6}px`,
                maxWidth: "100%",
                opacity: gameState === "paused" ? 0.35 : 1,
              }}
            >
              {Array.from({ length: diffRef.current.cols * diffRef.current.rows }, (_, i) => (
                <div
                  key={i}
                  className={`whack-cell ${activeCells.has(i) ? "active" : ""} ${hitCells.has(i) ? "hit" : ""}`}
                  onClick={() => handleCellClick(i)}
                >
                  {activeCells.has(i) && !hitCells.has(i)
                    ? (cellEmojis.current[i] || "😂")
                    : hitCells.has(i) ? "💥" : null
                  }
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
              🔨 {score} hits × {diff.multiplier} = <strong>{weighted}</strong>
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
                    game: "Whack-a-Meme",
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

export default memo(WhackGame);
