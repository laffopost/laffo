import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import "./ReactionGame.css";

import logger from "../../../utils/logger";

const ROUNDS_BY_DIFF = { normal: 3, hard: 5 };
const FAKE_PROBABILITY = 0.3; // 30% chance of fake-green in hard mode

function getRating(ms) {
  if (ms < 150) return { label: "Superhuman ⚡", color: "#f59e0b" };
  if (ms < 200) return { label: "Excellent 🚀",  color: "#10b981" };
  if (ms < 250) return { label: "Great 👍",       color: "#8b5cf6" };
  if (ms < 350) return { label: "Good 😊",        color: "#3b82f6" };
  if (ms < 500) return { label: "Average 🙂",     color: "#6b7280" };
  return         { label: "Keep practicing 🐢",   color: "#ef4444" };
}

export default function ReactionGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [phase, setPhase]           = useState("idle"); // idle | waiting | fake_ready | ready | round_done | done
  const [time, setTime]             = useState(null);
  const [attempts, setAttempts]     = useState([]);
  const [round, setRound]           = useState(1);
  const [globalHigh, setGlobalHigh] = useState(null);

  const startTimeRef  = useRef(null);
  const timeoutRef    = useRef(null);
  const fakeTimeoutRef = useRef(null);

  const ROUNDS = ROUNDS_BY_DIFF[difficulty];

  useEffect(() => {
    getGlobalHighScore("reaction").then(setGlobalHigh);
  }, []);

  const clearAllTimers = () => {
    clearTimeout(timeoutRef.current);
    clearTimeout(fakeTimeoutRef.current);
  };

  const startRound = () => {
    const delay = Math.random() * 3000 + 1500;
    const makeFake = difficulty === "hard" && Math.random() < FAKE_PROBABILITY;

    setPhase("waiting");
    timeoutRef.current = setTimeout(() => {
      if (makeFake) {
        setPhase("fake_ready");
        // Auto-expire fake after 400ms if user doesn't click
        fakeTimeoutRef.current = setTimeout(() => {
          setPhase("waiting");
          timeoutRef.current = setTimeout(() => {
            setPhase("ready");
            startTimeRef.current = Date.now();
          }, Math.random() * 2000 + 1000);
        }, 400);
      } else {
        setPhase("ready");
        startTimeRef.current = Date.now();
      }
    }, delay);
  };

  const handleClick = () => {
    if (phase === "waiting") {
      clearAllTimers();
      setPhase("idle");
      toast.error("Too early! Wait for green.");
      return;
    }

    if (phase === "fake_ready") {
      clearAllTimers();
      toast.error("Fake! +1000ms penalty 🚫");
      const penaltyAttempts = [...attempts, 1000];
      setAttempts(penaltyAttempts);
      if (penaltyAttempts.length >= ROUNDS) {
        finishGame(penaltyAttempts);
      } else {
        setPhase("round_done");
        setTime(1000);
        setRound((r) => r + 1);
      }
      return;
    }

    if (phase !== "ready") return;

    const reactionTime = Date.now() - startTimeRef.current;
    setTime(reactionTime);
    const newAttempts = [...attempts, reactionTime];
    setAttempts(newAttempts);

    if (newAttempts.length >= ROUNDS) {
      finishGame(newAttempts);
    } else {
      setPhase("round_done");
      setRound((r) => r + 1);
    }
  };

  const finishGame = (finalAttempts) => {
    const avg = Math.round(finalAttempts.reduce((a, b) => a + b, 0) / finalAttempts.length);
    setPhase("done");
    if (firebaseUser && !firebaseUser.isAnonymous) {
      logger.log("🎮 Saving Reaction Game score:", avg);
      saveGameScore("reaction", avg, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  };

  const reset = () => {
    clearAllTimers();
    setPhase("idle");
    setTime(null);
    setAttempts([]);
    setRound(1);
  };

  useEffect(() => () => clearAllTimers(), []);

  const avg    = attempts.length > 0 ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length) : null;
  const rating = avg ? getRating(avg) : null;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>⚡ Reaction Test</h2>
        <p className="game-desc">
          Click the moment the box turns green — {ROUNDS} rounds, lowest average wins!
          {difficulty === "hard" && " Watch out for fake greens!"}
        </p>
        {phase === "idle" && (
          <>
            <div className="game-difficulty-row">
              {["normal", "hard"].map((d) => (
                <button
                  key={d}
                  className={`game-diff-btn ${difficulty === d ? "active" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d === "normal" ? "Normal" : "Hard"}
                  <span className="game-diff-sub">
                    {d === "normal" ? "3 rounds" : "5 rounds · fake greens"}
                  </span>
                </button>
              ))}
            </div>
            {globalHigh && (
              <div className="game-global-banner">
                Record: <strong>{globalHigh.score}ms</strong> by @{globalHigh.username}
              </div>
            )}
          </>
        )}
      </div>

      <div className="game-card-body">
        <div className="game-stats">
          <div className="game-stat">
            <div className="game-stat-label">Round</div>
            <div className="game-stat-value">{Math.min(round, ROUNDS)}/{ROUNDS}</div>
          </div>
          {time !== null && (
            <div className="game-stat">
              <div className="game-stat-label">Last</div>
              <div className="game-stat-value">{time}ms</div>
            </div>
          )}
          {avg !== null && phase === "done" && (
            <div className="game-stat">
              <div className="game-stat-label">Avg</div>
              <div className="game-stat-value">{avg}ms</div>
            </div>
          )}
        </div>

        {attempts.length > 0 && phase !== "done" && (
          <div className="reaction-attempts">
            {attempts.map((ms, i) => (
              <span key={i} className={`reaction-attempt-chip ${ms === 1000 ? "penalty" : ""}`}>
                {ms === 1000 ? "fake!" : `${ms}ms`}
              </span>
            ))}
          </div>
        )}

        <div
          className={`reaction-box ${phase === "round_done" ? "done" : phase}`}
          onClick={handleClick}
          role="button"
          tabIndex={0}
        >
          {phase === "idle"        && <div>Press Start to begin</div>}
          {phase === "waiting"     && <div>Wait for green...</div>}
          {phase === "fake_ready"  && <div>⚠️ DON&apos;T CLICK!</div>}
          {phase === "ready"       && <div>CLICK NOW!</div>}
          {phase === "round_done"  && <div>Round {round - 1}: {time === 1000 ? "fake penalty" : `${time}ms`} ✓<br /><small>Click Start for next round</small></div>}
          {phase === "done"        && <div>Done! Avg: {avg}ms</div>}
        </div>

        {(phase === "idle" || phase === "round_done") && (
          <div className="game-controls-bar">
            <button className="game-btn" onClick={startRound}>
              {phase === "round_done" ? `Round ${round} →` : "Start Test"}
            </button>
            {phase === "round_done" && (
              <button className="game-btn secondary" onClick={reset}>✕ Quit</button>
            )}
          </div>
        )}

        {phase === "done" && (
          <>
            <div className="reaction-result">
              <div className="reaction-rating" style={{ color: rating.color }}>{rating.label}</div>
              <div className="reaction-breakdown">
                {attempts.map((ms, i) => (
                  <span key={i}>{ms === 1000 ? `R${i+1}: fake` : `R${i+1}: ${ms}ms`}</span>
                ))}
              </div>
            </div>
            <div className="game-result-actions">
              <button className="game-btn" onClick={reset}>Try Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({ game: "Reaction Test", score: avg, extra: rating.label })}
                >
                  📢 Share
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
