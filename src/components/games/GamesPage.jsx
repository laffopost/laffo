import { useState, useCallback } from "react";
import ClickGame from "./games/ClickGame";
import MemoryGame from "./games/MemoryGame";
import ReactionGame from "./games/ReactionGame";
import SnakeGame from "./games/SnakeGame";
import TargetGame from "./games/TargetGame";
import JuggleGame from "./games/JuggleGame";
import QuizGame from "./games/QuizGame";
import WhackGame from "./games/WhackGame";
import WordScrambleGame from "./games/WordScrambleGame";
import NumberSequenceGame from "./games/NumberSequenceGame";
import Leaderboard from "./Leaderboard";
import AddPostModal from "../post/AddPostModal";
import { usePostActions } from "../../context/PostContext";
import { useAuth } from "../../context/AuthContext";
import "./GamesPage.css";

const GAMES = [
  { key: "click",       name: "Click Rush",      desc: "Click as fast as you can!", icon: "🖱️" },
  { key: "target",      name: "Target Practice",  desc: "Hit the targets!",           icon: "🎯" },
  { key: "whack",       name: "Whack-a-Meme",     desc: "Whack the memes!",           icon: "🔨" },
  { key: "quiz",        name: "Quiz Game",         desc: "Test your knowledge!",       icon: "🧩" },
  { key: "wordscramble",name: "Word Scramble",     desc: "Unscramble crypto words!",   icon: "🔤" },
  { key: "numberseq",   name: "Number Rush",       desc: "Click 1→N in order!",        icon: "🔢" },
  { key: "juggle",      name: "Juggle Master",     desc: "Keep balls in the air!",     icon: "🎪" },
  { key: "memory",      name: "Memory Match",      desc: "Match all the pairs",        icon: "🧠" },
  { key: "reaction",    name: "Reaction Test",     desc: "Test your reflexes",         icon: "⚡" },
  { key: "snake",       name: "Snake Classic",     desc: "Eat and grow!",              icon: "🐍" },
];

export default function GamesPage() {
  const [selected, setSelected] = useState("click");
  const [shareData, setShareData] = useState(null);
  const { addPost } = usePostActions();
  const { firebaseUser, loading } = useAuth();

  const isLoggedIn = !loading && firebaseUser && !firebaseUser.isAnonymous;

  const handleShareResult = useCallback(({ game, score, difficulty, extra }) => {
    const lines = [
      `🎮 ${game}`,
      `📊 Score: ${score}${difficulty ? ` · ${difficulty}` : ""}`,
      extra ? extra : null,
      ``,
      `Can you beat me? 🏆`,
      `#LAFFO #Games`,
    ].filter((l) => l !== null).join("\n");
    setShareData({ status: lines, bgColor: "#1e1e2e", textColor: "#ffffff" });
  }, []);

  return (
    <div className="games-page">
      <div className="games-selector-row">
        {GAMES.map((g) => (
          <button
            key={g.key}
            className={`game-selector-btn ${selected === g.key ? "active" : ""}`}
            onClick={() => setSelected(g.key)}
          >
            <div className="game-selector-icon">{g.icon}</div>
            <div className="game-selector-name">{g.name}</div>
          </button>
        ))}
      </div>

      <div className="games-container">
        <div className="game-area">
          {!isLoggedIn ? (
            <div className="game-login-gate">
              <div className="game-login-icon">🔒</div>
              <h3>Login Required</h3>
              <p>You need to be logged in to play games and appear on leaderboards.</p>
            </div>
          ) : (
            <>
              {selected === "click"        && <ClickGame          onShareResult={handleShareResult} />}
              {selected === "target"       && <TargetGame         onShareResult={handleShareResult} />}
              {selected === "whack"        && <WhackGame          onShareResult={handleShareResult} />}
              {selected === "quiz"         && <QuizGame           onShareResult={handleShareResult} />}
              {selected === "wordscramble" && <WordScrambleGame   onShareResult={handleShareResult} />}
              {selected === "numberseq"    && <NumberSequenceGame onShareResult={handleShareResult} />}
              {selected === "juggle"       && <JuggleGame         onShareResult={handleShareResult} />}
              {selected === "memory"       && <MemoryGame         onShareResult={handleShareResult} />}
              {selected === "reaction"     && <ReactionGame       onShareResult={handleShareResult} />}
              {selected === "snake"        && <SnakeGame          onShareResult={handleShareResult} />}
            </>
          )}
        </div>

        <div className="games-sidebar">
          <Leaderboard gameKey={selected} />
        </div>
      </div>

      {shareData && (
        <AddPostModal
          onClose={() => setShareData(null)}
          onSubmit={addPost}
          shareType="status"
          shareInitialData={shareData}
        />
      )}
    </div>
  );
}
