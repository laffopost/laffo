import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import "./NumberSequenceGame.css";

import logger from "../../../utils/logger";

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   gridN: 3, count: 9,  multiplier: 1   },
  { key: "normal", label: "Normal", gridN: 4, count: 16, multiplier: 1.5 },
  { key: "hard",   label: "Hard",   gridN: 5, count: 25, multiplier: 2.5 },
];

// Score: inverted time so leaderboard (higher = better) works correctly
const MAX_MS = 300_000; // 5-minute ceiling

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function NumberSequenceGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [gameState, setGameState]   = useState("idle"); // idle | playing | over
  const [cells, setCells]           = useState([]);
  const [nextTarget, setNextTarget] = useState(1);
  const [doneCells, setDoneCells]   = useState(new Set());
  const [wrongCell, setWrongCell]   = useState(null);
  const [elapsedMs, setElapsedMs]   = useState(0);
  const [bestTime, setBestTime]     = useState(null); // ms, lower = better
  const [globalHigh, setGlobalHigh] = useState(null);

  const startTimeRef   = useRef(null);
  const rafRef         = useRef(null);
  const nextTargetRef  = useRef(1);
  const doneCellsRef   = useRef(new Set());
  const diffRef        = useRef(DIFFICULTIES[1]);

  useEffect(() => { getGlobalHighScore("numberseq").then(setGlobalHigh); }, []);

  const tick = useCallback(() => {
    setElapsedMs(Date.now() - startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const endGame = useCallback((finalMs) => {
    cancelAnimationFrame(rafRef.current);
    const scored = Math.max(0, MAX_MS - finalMs);
    setBestTime((b) => b === null ? finalMs : Math.min(b, finalMs));
    setGameState("over");
    if (firebaseUser && !firebaseUser.isAnonymous) {
      logger.log("🎮 Saving Number Sequence score:", scored);
      saveGameScore("numberseq", scored, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  }, [firebaseUser, userProfile]);

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    const shuffled = shuffle(Array.from({ length: diff.count }, (_, i) => i + 1));
    nextTargetRef.current = 1;
    doneCellsRef.current  = new Set();
    setCells(shuffled);
    setNextTarget(1);
    setDoneCells(new Set());
    setWrongCell(null);
    setElapsedMs(0);
    setGameState("playing");
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const quitGame = () => {
    cancelAnimationFrame(rafRef.current);
    setGameState("idle");
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const handleCellClick = useCallback((cellValue, cellIndex) => {
    if (gameState !== "playing") return;
    if (doneCellsRef.current.has(cellIndex)) return;

    if (cellValue === nextTargetRef.current) {
      const newDone = new Set(doneCellsRef.current);
      newDone.add(cellIndex);
      doneCellsRef.current = newDone;
      setDoneCells(new Set(newDone));
      nextTargetRef.current += 1;
      setNextTarget(nextTargetRef.current);

      if (newDone.size === diffRef.current.count) {
        const finalMs = Date.now() - startTimeRef.current;
        setElapsedMs(finalMs);
        endGame(finalMs);
      }
    } else {
      // Wrong click — flash
      setWrongCell(cellIndex);
      setTimeout(() => setWrongCell(null), 300);
    }
  }, [gameState, endGame]);

  const formatTime = (ms) => {
    if (ms === null) return "--";
    const s = (ms / 1000).toFixed(2);
    return `${s}s`;
  };

  const diff = diffRef.current;
  const cellSize = diff.gridN <= 3 ? 80 : diff.gridN <= 4 ? 68 : 58;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>🔢 Number Rush</h2>
        <p className="game-desc">
          Click numbers 1 → {diff.count} in order as fast as possible — pure focus!
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
                  <span className="game-diff-sub">{d.gridN}×{d.gridN} grid</span>
                </button>
              ))}
            </div>
            {globalHigh && (
              <div className="game-global-banner">
                Fastest: <strong>{formatTime(MAX_MS - globalHigh.score)}</strong> by @{globalHigh.username}
              </div>
            )}
          </>
        )}
      </div>

      <div className="game-card-body">
        {gameState !== "idle" && (
          <div className="game-stats">
            <div className="game-stat">
              <div className="game-stat-label">Next</div>
              <div className="game-stat-value">{gameState === "playing" ? nextTarget : "✓"}</div>
            </div>
            <div className="game-stat">
              <div className="game-stat-label">Time</div>
              <div className="game-stat-value">{formatTime(elapsedMs)}</div>
            </div>
            {bestTime !== null && (
              <div className="game-stat">
                <div className="game-stat-label">Best</div>
                <div className="game-stat-value">{formatTime(bestTime)}</div>
              </div>
            )}
          </div>
        )}

        {gameState === "playing" && (
          <>
            <div
              className="numseq-grid"
              style={{
                gridTemplateColumns: `repeat(${diffRef.current.gridN}, ${cellSize}px)`,
              }}
            >
              {cells.map((num, i) => (
                <div
                  key={i}
                  className={`numseq-cell ${doneCells.has(i) ? "done" : ""} ${wrongCell === i ? "wrong" : ""}`}
                  onClick={() => handleCellClick(num, i)}
                >
                  {num}
                </div>
              ))}
            </div>

            <div className="game-controls-bar">
              <button className="game-btn secondary" onClick={quitGame}>✕ Quit</button>
            </div>
          </>
        )}

        {gameState === "over" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>
              🎉 Finished in <strong>{formatTime(elapsedMs)}</strong>
            </div>
            {bestTime !== null && elapsedMs <= bestTime && <div className="new-best">🏆 New Best!</div>}
            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({
                    game: "Number Rush",
                    score: formatTime(elapsedMs),
                    difficulty: diffRef.current.label,
                    extra: `${diffRef.current.gridN}×${diffRef.current.gridN} grid`,
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

export default memo(NumberSequenceGame);
