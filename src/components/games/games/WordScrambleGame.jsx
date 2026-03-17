import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import "./WordScrambleGame.css";

import logger from "../../../utils/logger";

const WORD_POOL = {
  easy:   ["moon", "doge", "pump", "bull", "bear", "coin", "nft", "dao", "meme", "hodl", "fud", "ape", "dip", "rekt", "gm"],
  normal: ["bitcoin", "altcoin", "airdrop", "staking", "wallet", "defi", "token", "yield", "crypto", "lambo", "whale", "shill", "wagmi", "ngmi"],
  hard:   ["blockchain", "liquidity", "metaverse", "tokenomics", "decentralized", "cryptography", "halving", "whitepaper", "governance", "derivatives"],
};

const DIFFICULTIES = [
  { key: "easy",   label: "Easy",   timePerWord: 15, rounds: 5, multiplier: 1   },
  { key: "normal", label: "Normal", timePerWord: 12, rounds: 5, multiplier: 2   },
  { key: "hard",   label: "Hard",   timePerWord: 8,  rounds: 5, multiplier: 3.5 },
];

function scramble(word) {
  const arr = word.split("");
  let result;
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    result = arr.join("");
    attempts++;
  } while (result === word && attempts < 10);
  return result;
}

function WordScrambleGame({ onShareResult }) {
  const { firebaseUser, userProfile } = useAuth();
  const [difficulty, setDifficulty]   = useState("normal");
  const [gameState, setGameState]     = useState("idle"); // idle | playing | over
  const [currentWord, setCurrentWord] = useState("");
  const [scrambled, setScrambled]     = useState("");
  const [input, setInput]             = useState("");
  const [feedback, setFeedback]       = useState(null); // null | "correct" | "wrong" | "timeout"
  const [round, setRound]             = useState(1);
  const [score, setScore]             = useState(0);
  const [timeLeft, setTimeLeft]       = useState(12);
  const [history, setHistory]         = useState([]); // [{word, result}]
  const [bestScore, setBestScore]     = useState(0);
  const [globalHigh, setGlobalHigh]   = useState(null);

  const timerRef    = useRef(null);
  const inputRef    = useRef(null);
  const usedWords   = useRef(new Set());
  const diffRef     = useRef(DIFFICULTIES[1]);
  const scoreRef    = useRef(0);
  const timeLeftRef = useRef(12);

  useEffect(() => { getGlobalHighScore("wordscramble").then(setGlobalHigh); }, []);

  const pickWord = useCallback((diff = diffRef.current) => {
    const pool = WORD_POOL[diff.key];
    const available = pool.filter((w) => !usedWords.current.has(w));
    const source = available.length ? available : pool; // recycle if exhausted
    const word = source[Math.floor(Math.random() * source.length)];
    usedWords.current.add(word);
    return word;
  }, []);

  const startRound = useCallback((roundNum, diff = diffRef.current) => {
    clearInterval(timerRef.current);
    const word = pickWord(diff);
    setCurrentWord(word);
    setScrambled(scramble(word));
    setInput("");
    setFeedback(null);
    setRound(roundNum);
    timeLeftRef.current = diff.timePerWord;
    setTimeLeft(diff.timePerWord);

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current);
        setFeedback("timeout");
        setHistory((h) => [...h, { word, result: "timeout" }]);
        if (roundNum < diff.rounds) {
          setTimeout(() => startRound(roundNum + 1, diff), 900);
        } else {
          finishGame(scoreRef.current, diff);
        }
      }
    }, 1000);

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [pickWord]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishGame = (finalScore, diff = diffRef.current) => {
    clearInterval(timerRef.current);
    const weighted = Math.round(finalScore * diff.multiplier);
    setBestScore((b) => Math.max(b, weighted));
    setScore(weighted);
    setGameState("over");
    if (firebaseUser && !firebaseUser.isAnonymous && weighted > 0) {
      logger.log("🎮 Saving Word Scramble score:", weighted);
      saveGameScore("wordscramble", weighted, {
        uid: firebaseUser.uid,
        username: userProfile?.username || firebaseUser.displayName || "Anonymous",
        avatar: userProfile?.avatar,
      });
    }
  };

  const startGame = () => {
    const diff = DIFFICULTIES.find((d) => d.key === difficulty);
    diffRef.current = diff;
    scoreRef.current = 0;
    usedWords.current = new Set();
    setScore(0);
    setHistory([]);
    setGameState("playing");
    startRound(1, diff);
  };

  const quitGame = () => {
    clearInterval(timerRef.current);
    setGameState("idle");
    setFeedback(null);
    setInput("");
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const submitAnswer = useCallback(() => {
    if (feedback) return;
    const diff = diffRef.current;
    const answer = input.toLowerCase().trim();
    const isCorrect = answer === currentWord;
    const timeBonus = Math.max(1, timeLeftRef.current);
    const roundScore = isCorrect ? timeBonus : 0;

    if (isCorrect) scoreRef.current += roundScore;

    const result = isCorrect ? "correct" : "wrong";
    setFeedback(result);
    setHistory((h) => [...h, { word: currentWord, result }]);
    clearInterval(timerRef.current);

    if (round < diff.rounds) {
      setTimeout(() => startRound(round + 1, diff), 800);
    } else {
      setTimeout(() => finishGame(scoreRef.current, diff), 800);
    }
  }, [input, currentWord, feedback, round, startRound]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submitAnswer();
  };

  const timerPct = (timeLeft / diffRef.current.timePerWord) * 100;
  const timerColor = timerPct > 50 ? "#10b981" : timerPct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="game-card">
      <div className="game-card-header">
        <h2>🔤 Word Scramble</h2>
        <p className="game-desc">
          Unscramble crypto &amp; meme words before time runs out — faster = more points!
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
                  <span className="game-diff-sub">{d.timePerWord}s/word · ×{d.multiplier}</span>
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
        {gameState === "playing" && (
          <>
            <div className="game-stats">
              <div className="game-stat">
                <div className="game-stat-label">Round</div>
                <div className="game-stat-value">{round}/{diffRef.current.rounds}</div>
              </div>
              <div className="game-stat">
                <div className="game-stat-label">Score</div>
                <div className="game-stat-value">{scoreRef.current}</div>
              </div>
              <div className="game-stat">
                <div className="game-stat-label">Time</div>
                <div className="game-stat-value">{timeLeft}s</div>
              </div>
            </div>

            <div className="scramble-timer-bar">
              <div className="scramble-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
            </div>

            <div className="scramble-word">{scrambled}</div>

            <div className="scramble-input-row">
              <input
                ref={inputRef}
                className={`scramble-input ${feedback || ""}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                disabled={!!feedback}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                className="game-btn"
                onClick={submitAnswer}
                disabled={!!feedback || !input.trim()}
                style={{ padding: "0.7rem 1rem", flexShrink: 0 }}
              >
                ✓
              </button>
            </div>

            {history.length > 0 && (
              <div className="scramble-history">
                {history.map((h, i) => (
                  <span key={i} className={`scramble-history-chip ${h.result}`}>
                    {h.word}
                  </span>
                ))}
              </div>
            )}

            <div className="game-controls-bar">
              <button className="game-btn secondary" onClick={quitGame}>✕ Quit</button>
            </div>
          </>
        )}

        {gameState === "over" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              Final Score: <strong>{score}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              {history.filter((h) => h.result === "correct").length}/{diffRef.current.rounds} correct
            </div>
            {score >= bestScore && bestScore > 0 && <div className="new-best">🏆 New Best!</div>}

            {history.length > 0 && (
              <div className="scramble-history" style={{ marginBottom: "0.75rem" }}>
                {history.map((h, i) => (
                  <span key={i} className={`scramble-history-chip ${h.result}`}>{h.word}</span>
                ))}
              </div>
            )}

            <div className="game-result-actions">
              <button className="game-btn" onClick={startGame}>Play Again</button>
              {onShareResult && (
                <button
                  className="game-share-btn"
                  onClick={() => onShareResult({
                    game: "Word Scramble",
                    score,
                    difficulty: diffRef.current.label,
                    extra: `${history.filter((h) => h.result === "correct").length}/${diffRef.current.rounds} correct`,
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

export default memo(WordScrambleGame);
