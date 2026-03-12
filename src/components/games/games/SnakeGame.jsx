import { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./SnakeGame.css";

import logger from "../../../utils/logger";
const GRID = 20;
const SIZE = 20;
const GAME_LOOP_SPEED = 200; // Increased from 150ms (less frequent updates = better performance)

function SnakeGame() {
  const { firebaseUser, userProfile } = useAuth();
  const [snake, setSnake] = useState([[10, 10]]);
  const [food, setFood] = useState([15, 15]);
  const [dir, setDir] = useState([0, -1]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const foodImgRef = useRef(null);

  // Load laugh icon
  useEffect(() => {
    const img = new Image();
    img.src = laughIcon;
    foodImgRef.current = img;
  }, []);

  const randomFood = () => {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    return [x, y];
  };

  const startGame = () => {
    setSnake([[10, 10]]);
    setFood(randomFood());
    setDir([0, -1]);
    setGameOver(false);
    setScore(0);
    setStarted(true);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (!started || gameOver) return;
      if (e.key === "ArrowUp" && dir[1] !== 1) setDir([0, -1]);
      if (e.key === "ArrowDown" && dir[1] !== -1) setDir([0, 1]);
      if (e.key === "ArrowLeft" && dir[0] !== 1) setDir([-1, 0]);
      if (e.key === "ArrowRight" && dir[0] !== -1) setDir([1, 0]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, gameOver, dir]);

  useEffect(() => {
    if (!started || gameOver) return;

    gameLoopRef.current = setInterval(() => {
      setSnake((s) => {
        const head = s[0];
        const newHead = [head[0] + dir[0], head[1] + dir[1]];

        // Wall collision
        if (
          newHead[0] < 0 ||
          newHead[0] >= GRID ||
          newHead[1] < 0 ||
          newHead[1] >= GRID
        ) {
          setGameOver(true);
          if (firebaseUser && !firebaseUser.isAnonymous) {
            logger.log("🎮 Saving Snake Game score:", score);
            saveGameScore("snake", score, {
              uid: firebaseUser.uid,
              username:
                userProfile?.username ||
                firebaseUser.displayName ||
                "Anonymous",
              avatar: userProfile?.avatar,
            });
          }
          return s;
        }

        // Self collision
        if (s.some((seg) => seg[0] === newHead[0] && seg[1] === newHead[1])) {
          setGameOver(true);
          if (firebaseUser && !firebaseUser.isAnonymous) {
            logger.log("🎮 Saving Snake Game score:", score);
            saveGameScore("snake", score, {
              uid: firebaseUser.uid,
              username:
                userProfile?.username ||
                firebaseUser.displayName ||
                "Anonymous",
              avatar: userProfile?.avatar,
            });
          }
          return s;
        }

        const newSnake = [newHead, ...s];

        // Food collision
        if (newHead[0] === food[0] && newHead[1] === food[1]) {
          setFood(randomFood());
          setScore((sc) => sc + 1);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, GAME_LOOP_SPEED);

    return () => clearInterval(gameLoopRef.current);
  }, [started, gameOver, dir, food, score, firebaseUser, userProfile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "#1e1e2e";
    ctx.fillRect(0, 0, GRID * SIZE, GRID * SIZE);

    // Draw grid
    ctx.strokeStyle = "rgba(139, 92, 246, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * SIZE, 0);
      ctx.lineTo(i * SIZE, GRID * SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * SIZE);
      ctx.lineTo(GRID * SIZE, i * SIZE);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#10b981" : "#8b5cf6";
      ctx.fillRect(seg[0] * SIZE, seg[1] * SIZE, SIZE, SIZE);
      ctx.strokeStyle = "#1e1e2e";
      ctx.lineWidth = 2;
      ctx.strokeRect(seg[0] * SIZE, seg[1] * SIZE, SIZE, SIZE);
    });

    // Draw food (laugh icon)
    if (foodImgRef.current && foodImgRef.current.complete) {
      ctx.drawImage(
        foodImgRef.current,
        food[0] * SIZE,
        food[1] * SIZE,
        SIZE,
        SIZE,
      );
    } else {
      // Fallback if image not loaded yet
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(food[0] * SIZE, food[1] * SIZE, SIZE, SIZE);
    }
  }, [snake, food]);

  return (
    <div className="snake-game">
      <h2>
        <img src={laughIcon} alt="" className="game-title-icon" />
        Snake Classic
      </h2>
      <p>Eat the laughs and grow! Use arrow keys to move.</p>
      <div className="snake-score">Score: {score}</div>
      <canvas
        ref={canvasRef}
        width={GRID * SIZE}
        height={GRID * SIZE}
        className="snake-canvas"
      />
      {gameOver && (
        <div className="snake-game-over">
          <div>Game Over!</div>
          <div>Final Score: {score}</div>
        </div>
      )}
      {!started || gameOver ? (
        <button className="snake-start-btn" onClick={startGame}>
          {gameOver ? "Play Again" : "Start Game"}
        </button>
      ) : null}
    </div>
  );
}

export default memo(SnakeGame);
