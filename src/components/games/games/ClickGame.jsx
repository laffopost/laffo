import { useState, useRef, useEffect, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./ClickGame.css";

import logger from "../../../utils/logger";
function ClickGame() {
  const { firebaseUser, userProfile } = useAuth();
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [timer, setTimer] = useState(10);
  const [shake, setShake] = useState(false);
  const intervalRef = useRef(null);

  const startGame = () => {
    setScore(0);
    setTimer(10);
    setStarted(true);
    intervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setStarted(false);

          // Save score when game ends - use callback to get current score
          setTimeout(() => {
            setScore((currentScore) => {
              if (
                firebaseUser &&
                !firebaseUser.isAnonymous &&
                currentScore > 0
              ) {
                logger.log("🎮 Saving Click Game score:", currentScore);
                saveGameScore("click", currentScore, {
                  uid: firebaseUser.uid,
                  username:
                    userProfile?.username ||
                    firebaseUser.displayName ||
                    "Anonymous",
                  avatar: userProfile?.avatar,
                });
              }
              return currentScore;
            });
          }, 100);

          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleClick = () => {
    if (!started) return;
    setScore((s) => s + 1);
    setShake(true);
    setTimeout(() => setShake(false), 100);
  };

  return (
    <div className="click-game">
      <h2>
        <img src={laughIcon} alt="" className="game-title-icon" />
        Click Rush
      </h2>
      <p>Click the laugh as many times as you can in 10 seconds!</p>
      <div className="click-stats">
        <div className="click-stat">
          <div className="click-stat-label">Time Left</div>
          <div className="click-stat-value">{timer}s</div>
        </div>
        <div className="click-stat">
          <div className="click-stat-label">Clicks</div>
          <div className="click-stat-value">{score}</div>
        </div>
      </div>
      <button
        className={`click-target ${shake ? "shake" : ""} ${
          started ? "active" : ""
        }`}
        onClick={handleClick}
        disabled={!started}
      >
        <img src={laughIcon} alt="Click me!" className="click-target-icon" />
      </button>
      {!started && timer === 0 && (
        <div className="click-result">
          <div>🎉 Final Score: {score} clicks!</div>
        </div>
      )}
      {!started && (
        <button className="click-start-btn" onClick={startGame}>
          {timer === 0 ? "Play Again" : "Start Game"}
        </button>
      )}
    </div>
  );
}

export default memo(ClickGame);
