import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./MemoryGame.css";

import logger from "../../../utils/logger";
// Use JSX for the laugh icon card
const cards = [
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  <img src={laughIcon} alt="LaughCoin" className="memory-laugh-icon" />,
];
const shuffled = () => [...cards, ...cards].sort(() => Math.random() - 0.5);

export default function MemoryGame() {
  const { firebaseUser, userProfile } = useAuth();
  const [deck, setDeck] = useState(shuffled());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx))
      return;
    setFlipped((f) => [...f, idx]);
    if (flipped.length === 1) {
      setMoves((m) => m + 1);
      const first = deck[flipped[0]];
      const second = deck[idx];
      if (
        (typeof first === "string" && first === second) ||
        (typeof first !== "string" && typeof second !== "string")
      ) {
        setMatched((m) => [...m, flipped[0], idx]);
        if (matched.length + 2 === deck.length) {
          setWon(true);
          if (firebaseUser && !firebaseUser.isAnonymous) {
            logger.log("🎮 Saving Memory Game score:", moves + 1);
            saveGameScore("memory", moves + 1, {
              uid: firebaseUser.uid,
              username:
                userProfile?.username ||
                firebaseUser.displayName ||
                "Anonymous",
              avatar: userProfile?.avatar,
            });
          }
        }
      }
      setTimeout(() => setFlipped([]), 800);
    }
  };

  const reset = () => {
    setDeck(shuffled());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="memory-game">
      <h2>
        <img src={laughIcon} alt="" className="game-title-icon" />
        Memory Match
      </h2>
      <p>Match all the pairs in the fewest moves!</p>
      <div className="memory-stats">
        <div className="memory-stat">Moves: {moves}</div>
        {won && <div className="memory-won">🎉 You won in {moves} moves!</div>}
      </div>
      <div className="memory-grid">
        {deck.map((c, i) => (
          <button
            key={i}
            className={`memory-card ${
              flipped.includes(i) || matched.includes(i) ? "flipped" : ""
            } ${matched.includes(i) ? "matched" : ""}`}
            onClick={() => handleFlip(i)}
            disabled={matched.includes(i)}
          >
            <div className="memory-card-inner">
              <div className="memory-card-front">❓</div>
              <div className="memory-card-back">
                {typeof c === "string" ? c : c}
              </div>
            </div>
          </button>
        ))}
      </div>
      <button className="memory-restart-btn" onClick={reset}>
        {won ? "Play Again" : "Restart"}
      </button>
    </div>
  );
}
