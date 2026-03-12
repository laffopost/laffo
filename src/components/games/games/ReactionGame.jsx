import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import "./ReactionGame.css";

import logger from "../../../utils/logger";
export default function ReactionGame() {
  const { firebaseUser, userProfile } = useAuth();
  const [state, setState] = useState("idle"); // idle, waiting, ready, done
  const [time, setTime] = useState(null);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  const start = () => {
    setState("waiting");
    const delay = Math.random() * 3000 + 2000;
    timeoutRef.current = setTimeout(() => {
      setState("ready");
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (state === "waiting") {
      clearTimeout(timeoutRef.current);
      setState("idle");
      toast.error("Too early! Wait for green.");
    } else if (state === "ready") {
      const reactionTime = Date.now() - startTimeRef.current;
      setTime(reactionTime);
      setState("done");

      // Save score with user info
      if (firebaseUser && !firebaseUser.isAnonymous) {
        logger.log("🎮 Saving Reaction Game score:", reactionTime);
        saveGameScore("reaction", reactionTime, {
          uid: firebaseUser.uid,
          username:
            userProfile?.username || firebaseUser.displayName || "Anonymous",
          avatar: userProfile?.avatar,
        });
      }
    }
  };

  const reset = () => {
    setState("idle");
    setTime(null);
  };

  return (
    <div className="reaction-game">
      <h2>⚡ Reaction Test</h2>
      <p>Click as soon as the box turns green!</p>
      <div className={`reaction-box ${state}`} onClick={handleClick}>
        {state === "idle" && <div>Click "Start" to begin</div>}
        {state === "waiting" && <div>Wait for green...</div>}
        {state === "ready" && <div>CLICK NOW!</div>}
        {state === "done" && <div>{time} ms</div>}
      </div>
      {state === "idle" && (
        <button className="reaction-start-btn" onClick={start}>
          Start Test
        </button>
      )}
      {state === "done" && (
        <>
          <div className="reaction-result">
            Your reaction time: <strong>{time} ms</strong>
          </div>
          <button className="reaction-start-btn" onClick={reset}>
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
