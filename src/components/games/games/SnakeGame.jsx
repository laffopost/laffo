import { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./SnakeGame.css";

import logger from "../../../utils/logger";

const GRID = 20;
const SIZE = 20;

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   speed: 250, multiplier: 1 },
  { key: "normal", label: "Normal", speed: 170, multiplier: 1.5 },
  { key: "hard",   label: "Hard",   speed: 90,  multiplier: 2.5 },
];

function SnakeGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [wallsOff, setWallsOff]     = useState(false);
  const [gameState, setGameState]   = useState("idle"); // idle | playing | paused | over
  const [bestScore, setBestScore]   = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [finalScore,   setFinalScore]   = useState(0);
  const [globalHigh, setGlobalHigh]     = useState(null);

  // All mutable game state in refs to avoid stale closures
  const snakeRef    = useRef([[10, 10]]);
  const foodRef     = useRef([15, 15]);
  const dirRef      = useRef([0, -1]);
  const scoreRef    = useRef(0);
  const diffRef     = useRef(DIFFICULTIES[1]);
  const wallsOffRef = useRef(false);
  const intervalRef = useRef(null);
  const canvasRef   = useRef(null);
  const foodImgRef  = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = laughIcon;
    foodImgRef.current = img;
  }, []);

  useEffect(() => {
    getGlobalHighScore("snake").then(setGlobalHigh);
  }, []);

  const randomFood = (snake) => {
    let pos;
    do {
      pos = [
        Math.floor(Math.random() * GRID),
        Math.floor(Math.random() * GRID),
      ];
    } while (snake.some(([x, y]) => x === pos[0] && y === pos[1]));
    return pos;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext("2d");
    const snake = snakeRef.current;
    const food  = foodRef.current;

    ctx.fillStyle = "#1e1e2e";
    ctx.fillRect(0, 0, GRID * SIZE, GRID * SIZE);

    ctx.strokeStyle = "rgba(139, 92, 246, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * SIZE, 0); ctx.lineTo(i * SIZE, GRID * SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * SIZE); ctx.lineTo(GRID * SIZE, i * SIZE); ctx.stroke();
    }

    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#10b981" : "#8b5cf6";
      ctx.fillRect(seg[0] * SIZE + 1, seg[1] * SIZE + 1, SIZE - 2, SIZE - 2);
      if (idx === 0) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(seg[0] * SIZE + 5, seg[1] * SIZE + 4, 3, 3);
        ctx.fillRect(seg[0] * SIZE + 12, seg[1] * SIZE + 4, 3, 3);
      }
    });

    if (foodImgRef.current?.complete) {
      ctx.drawImage(foodImgRef.current, food[0] * SIZE, food[1] * SIZE, SIZE, SIZE);
    } else {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(food[0] * SIZE + 1, food[1] * SIZE + 1, SIZE - 2, SIZE - 2);
    }
  };

  const endGame = (score) => {
    clearInterval(intervalRef.current);
    const weighted = Math.round(score * diffRef.current.multiplier);
    setFinalScore(weighted);
    setBestScore((b) => Math.max(b, weighted));
    setGameState("over");

    if (firebaseUser && !firebaseUser.isAnonymous && weighted > 0) {
      logger.log("🎮 Saving Snake score:", weighted);
      saveGameScore("snake", weighted, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  };

  const launchInterval = (speed) => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const snake = snakeRef.current;
      if (!snake.length) return;

      const [hx, hy] = snake[0];
      const [dx, dy] = dirRef.current;
      let nx = hx + dx;
      let ny = hy + dy;

      if (wallsOffRef.current) {
        nx = (nx + GRID) % GRID;
        ny = (ny + GRID) % GRID;
      } else {
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) { endGame(scoreRef.current); return; }
      }
      if (snake.some(([x, y]) => x === nx && y === ny))  { endGame(scoreRef.current); return; }

      const newSnake = [[nx, ny], ...snake];
      const [fx, fy] = foodRef.current;
      if (nx === fx && ny === fy) {
        scoreRef.current += 1;
        setDisplayScore(scoreRef.current);
        foodRef.current = randomFood(newSnake);
      } else {
        newSnake.pop();
      }
      snakeRef.current = newSnake;
      draw();
    }, speed);
  };

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    wallsOffRef.current = wallsOff;
    snakeRef.current = [[10, 10]];
    foodRef.current  = randomFood([[10, 10]]);
    dirRef.current   = [0, -1];
    scoreRef.current = 0;
    setDisplayScore(0);
    setFinalScore(0);
    setGameState("playing");
    draw();
    launchInterval(diff.speed);
  };

  const pauseGame = () => {
    clearInterval(intervalRef.current);
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
    launchInterval(diffRef.current.speed);
  };

  const quitGame = () => {
    clearInterval(intervalRef.current);
    snakeRef.current = [[10, 10]];
    foodRef.current  = [15, 15];
    dirRef.current   = [0, -1];
    scoreRef.current = 0;
    setDisplayScore(0);
    setGameState("idle");
    draw();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (gameState === "paused" && e.key === "Escape") { resumeGame(); return; }
      if (gameState !== "playing") return;
      const [dx, dy] = dirRef.current;
      if (e.key === "ArrowUp"    && dy !== 1)  { e.preventDefault(); dirRef.current = [0, -1]; }
      if (e.key === "ArrowDown"  && dy !== -1) { e.preventDefault(); dirRef.current = [0,  1]; }
      if (e.key === "ArrowLeft"  && dx !== 1)  { e.preventDefault(); dirRef.current = [-1, 0]; }
      if (e.key === "ArrowRight" && dx !== -1) { e.preventDefault(); dirRef.current = [1,  0]; }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearInterval(intervalRef.current), []);
  useEffect(() => { draw(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>
          <img src={laughIcon} alt="" className="game-title-icon" />
          Snake Classic
        </h2>
        <p className="game-desc">
          Eat the laughs to grow longer — avoid walls and your own tail!
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
                  <span className="game-diff-sub">×{d.multiplier}</span>
                </button>
              ))}
              <button
                className={`game-diff-btn ${wallsOff ? "active" : ""}`}
                onClick={() => setWallsOff((w) => !w)}
              >
                Wrap
                <span className="game-diff-sub">{wallsOff ? "walls off" : "walls on"}</span>
              </button>
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
            <div className="game-stat-value">{displayScore}</div>
          </div>
          {bestScore > 0 && (
            <div className="game-stat">
              <div className="game-stat-label">Best</div>
              <div className="game-stat-value">{bestScore}</div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={GRID * SIZE}
            height={GRID * SIZE}
            className="snake-canvas"
          />
          {gameState === "paused" && (
            <div className="game-pause-overlay">
              <h3>Paused</h3>
              <button className="game-btn" onClick={resumeGame}>Resume</button>
            </div>
          )}
        </div>

        {gameState === "playing" && (
          <div className="snake-touch-controls">
            <button className="snake-touch-btn" onPointerDown={() => { if (dirRef.current[1] !== 1)  dirRef.current = [0, -1]; }}>▲</button>
            <div className="snake-touch-row">
              <button className="snake-touch-btn" onPointerDown={() => { if (dirRef.current[0] !== 1)  dirRef.current = [-1, 0]; }}>◀</button>
              <button className="snake-touch-btn" onPointerDown={() => { if (dirRef.current[1] !== -1) dirRef.current = [0,  1]; }}>▼</button>
              <button className="snake-touch-btn" onPointerDown={() => { if (dirRef.current[0] !== -1) dirRef.current = [1,  0]; }}>▶</button>
            </div>
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
              Score: {scoreRef.current} × {diffRef.current.multiplier} = <strong>{finalScore}</strong>
            </div>
            {finalScore >= bestScore && bestScore > 0 && <div className="new-best">🏆 New Best!</div>}
            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({ game: "Snake Classic", score: finalScore, difficulty: diffRef.current.label })}
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

export default memo(SnakeGame);
