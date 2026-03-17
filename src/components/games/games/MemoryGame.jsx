import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import laughIcon from "../../../assets/laugh.png";
import "./MemoryGame.css";

import logger from "../../../utils/logger";

const CARD_SETS = {
  easy:   ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻"],
  normal: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨"],
  hard:   ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐸"],
};

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   pairs: 6  },
  { key: "normal", label: "Normal", pairs: 8  },
  { key: "hard",   label: "Hard",   pairs: 12 },
];

const makeCards = (difficulty) => {
  const set = CARD_SETS[difficulty];
  return [...set, ...set].sort(() => Math.random() - 0.5);
};

export default function MemoryGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty] = useState("normal");
  const [gameState, setGameState]   = useState("idle"); // idle | playing | won
  const [deck, setDeck]     = useState(null);
  const [globalHigh, setGlobalHigh] = useState(null);

  useEffect(() => { getGlobalHighScore("memory").then(setGlobalHigh); }, []);
  const [flipped, setFlipped]   = useState([]);
  const [matched, setMatched]   = useState([]);
  const [moves, setMoves]       = useState(0);
  const [bestMoves, setBestMoves] = useState({});

  const startGame = (diff = difficulty) => {
    setDifficulty(diff);
    setDeck(makeCards(diff));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameState("playing");
  };

  const quitGame = () => {
    setGameState("idle");
    setDeck(null);
  };

  const handleFlip = (idx) => {
    if (gameState !== "playing") return;
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [a, b] = newFlipped;
      if (deck[a] === deck[b]) {
        const newMatched = [...matched, a, b];
        setMatched(newMatched);
        setFlipped([]);
        if (newMatched.length === deck.length) {
          setGameState("won");
          setBestMoves((bm) => ({
            ...bm,
            [difficulty]: Math.min(bm[difficulty] ?? Infinity, nextMoves),
          }));
          if (firebaseUser && !firebaseUser.isAnonymous) {
            logger.log("🎮 Saving Memory Game score:", nextMoves);
            saveGameScore("memory", nextMoves, {
              uid: firebaseUser.uid,
              username: userProfile?.username || firebaseUser.displayName || "Anonymous",
              avatar: userProfile?.avatar,
            });
          }
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const gridCols = difficulty === "hard" ? 6 : 4;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>
          <img src={laughIcon} alt="" className="game-title-icon" />
          Memory Match
        </h2>
        <p className="game-desc">
          Flip cards to find all matching pairs in the fewest moves possible!
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
                  <span className="game-diff-sub">{d.pairs} pairs</span>
                </button>
              ))}
            </div>
            {globalHigh && (
              <div className="game-global-banner">
                Record: <strong>{globalHigh.score} moves</strong> by @{globalHigh.username}
              </div>
            )}
          </>
        )}
      </div>

      <div className="game-card-body">
        {gameState !== "idle" && deck && (
          <>
            <div className="game-stats">
              <div className="game-stat">
                <div className="game-stat-label">Moves</div>
                <div className="game-stat-value">{moves}</div>
              </div>
              <div className="game-stat">
                <div className="game-stat-label">Pairs</div>
                <div className="game-stat-value">{matched.length / 2}/{deck.length / 2}</div>
              </div>
              {bestMoves[difficulty] && (
                <div className="game-stat">
                  <div className="game-stat-label">Best</div>
                  <div className="game-stat-value">{bestMoves[difficulty]}</div>
                </div>
              )}
            </div>

            <div
              className="memory-grid"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {deck.map((c, i) => (
                <button
                  key={i}
                  className={`memory-card ${flipped.includes(i) || matched.includes(i) ? "flipped" : ""} ${matched.includes(i) ? "matched" : ""}`}
                  onClick={() => handleFlip(i)}
                  disabled={matched.includes(i) || gameState === "won"}
                >
                  <div className="memory-card-inner">
                    <div className="memory-card-front">❓</div>
                    <div className="memory-card-back">{c}</div>
                  </div>
                </button>
              ))}
            </div>

            {gameState === "playing" && (
              <div className="game-controls-bar">
                <button className="game-btn pause" onClick={() => startGame(difficulty)}>↺ Restart</button>
                <button className="game-btn secondary" onClick={quitGame}>✕ Quit</button>
              </div>
            )}

            {gameState === "won" && (
              <>
                {moves <= (bestMoves[difficulty] ?? Infinity) && <div className="new-best">🏆 New Best!</div>}
                <div className="game-result-actions">
                  <button className="game-btn" onClick={() => startGame(difficulty)}>Play Again</button>
                  {onShareResult && (
                    <button
                      className="game-share-btn"
                      onClick={() => onShareResult({ game: "Memory Match", score: moves, extra: `${difficulty} · ${moves} moves` })}
                    >
                      📢 Share
                    </button>
                  )}
                  <button className="game-btn secondary" onClick={quitGame}>Menu</button>
                </div>
              </>
            )}
          </>
        )}

        {gameState === "idle" && (
          <button className="game-btn" onClick={() => startGame(difficulty)}>Start Game</button>
        )}
      </div>
    </div>
  );
}
