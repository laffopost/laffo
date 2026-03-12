import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./JuggleGame.css";

import logger from "../../../utils/logger";
const GRAVITY = 0.015; // Extremely slow gravity
const BOUNCE_POWER = -1.5; // Extremely gentle bounce
const BALL_SIZE = 40;
const SCORE_UPDATE_INTERVAL = 250; // Increased from 100ms to 250ms (less frequent updates)

function JuggleGame() {
  const { firebaseUser, userProfile } = useAuth();
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState([]);
  const gameAreaRef = useRef(null);
  const animationRef = useRef(null);
  const scoreIntervalRef = useRef(null);

  const createInitialBalls = useCallback(() => {
    if (!gameAreaRef.current) return [];

    const gameArea = gameAreaRef.current.getBoundingClientRect();
    const initialBalls = [];

    // Create only 1 ball in the center
    initialBalls.push({
      id: 0,
      x: gameArea.width / 2 - BALL_SIZE / 2,
      y: gameArea.height / 2,
      vx: 0, // No horizontal movement
      vy: -0.3, // Very gentle initial bounce
      color: "🔴",
    });

    return initialBalls;
  }, []);

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setBalls(createInitialBalls());

    // Start score counter (score = time survived)
    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => prev + 1);
    }, SCORE_UPDATE_INTERVAL); // Reduced update frequency for better performance
  };

  const endGame = useCallback(() => {
    setStarted(false);
    setGameOver(true);
    setBalls([]);
    clearInterval(scoreIntervalRef.current);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Save score
    setTimeout(() => {
      setScore((currentScore) => {
        if (firebaseUser && !firebaseUser.isAnonymous && currentScore > 0) {
          logger.log(
            "🎮 Saving Juggle Game score:",
            Math.floor(currentScore / 10),
          ); // Convert to seconds
          saveGameScore("juggle", Math.floor(currentScore / 10), {
            uid: firebaseUser.uid,
            username:
              userProfile?.username || firebaseUser.displayName || "Anonymous",
            avatar: userProfile?.avatar,
          });
        }
        return currentScore;
      });
    }, 100);
  }, [firebaseUser, userProfile]);

  const updateBalls = useCallback(() => {
    if (!gameAreaRef.current || !started) return;

    const gameArea = gameAreaRef.current.getBoundingClientRect();

    setBalls((prevBalls) => {
      const updatedBalls = prevBalls
        .map((ball) => {
          let newBall = { ...ball };

          // Apply gravity
          newBall.vy += GRAVITY;

          // Update position
          newBall.x += newBall.vx;
          newBall.y += newBall.vy;

          // Bounce off walls
          if (newBall.x <= 0 || newBall.x >= gameArea.width - BALL_SIZE) {
            newBall.vx *= -0.8; // Reduce velocity and reverse direction
            newBall.x = Math.max(
              0,
              Math.min(gameArea.width - BALL_SIZE, newBall.x),
            );
          }

          // Check if ball hit the ground (game over)
          if (newBall.y >= gameArea.height - BALL_SIZE) {
            return null; // Mark for removal
          }

          return newBall;
        })
        .filter(Boolean); // Remove null balls

      // If any ball is missing, end the game
      if (updatedBalls.length < prevBalls.length) {
        endGame();
        return [];
      }

      return updatedBalls;
    });
  }, [started, endGame]);

  const handleBallClick = (ballId) => {
    if (!started) return;

    setBalls((prevBalls) =>
      prevBalls.map((ball) =>
        ball.id === ballId
          ? {
              ...ball,
              vy: BOUNCE_POWER * 0.8, // Gentle bounce - 80% of bounce power
              vx: ball.vx + (Math.random() - 0.5) * 0.1, // Minimal horizontal randomness
            }
          : ball,
      ),
    );
  };

  // Game loop
  useEffect(() => {
    if (!started) return;

    const gameLoop = () => {
      updateBalls();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [started, updateBalls]);

  useEffect(() => {
    return () => {
      clearInterval(scoreIntervalRef.current);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const displayScore = Math.floor(score / 10); // Convert to seconds

  return (
    <div className="juggle-game">
      <h2>
        <img src={laughIcon} alt="" className="game-title-icon" />
        Juggle Game
      </h2>
      <p>Click the balls to keep them in the air!</p>

      <div className="juggle-stats">
        <div className="juggle-stat">
          <div className="juggle-stat-label">Time Survived</div>
          <div className="juggle-stat-value">{displayScore}s</div>
        </div>
      </div>

      <div
        className={`juggle-game-area ${started ? "active" : ""}`}
        ref={gameAreaRef}
      >
        {balls.map((ball) => (
          <div
            key={ball.id}
            className="juggle-ball"
            style={{
              left: `${ball.x}px`,
              top: `${ball.y}px`,
            }}
            onClick={() => handleBallClick(ball.id)}
          >
            {ball.color}
          </div>
        ))}

        {!started && !gameOver && (
          <div className="juggle-game-overlay">
            <div className="juggle-game-message">
              Keep all balls in the air!
              <br />
              Click them to bounce them up.
            </div>
          </div>
        )}

        {gameOver && (
          <div className="juggle-game-overlay">
            <div className="juggle-game-message">
              <div className="juggle-final-score">
                🎪 Juggled for {displayScore} seconds!
              </div>
            </div>
          </div>
        )}
      </div>

      {!started && (
        <button className="juggle-start-btn" onClick={startGame}>
          {gameOver ? "Play Again" : "Start Juggling"}
        </button>
      )}
    </div>
  );
}

export default memo(JuggleGame);
