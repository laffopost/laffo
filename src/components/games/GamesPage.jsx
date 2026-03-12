import { useState } from "react";
import ClickGame from "./games/ClickGame";
import MemoryGame from "./games/MemoryGame";
import ReactionGame from "./games/ReactionGame";
import SnakeGame from "./games/SnakeGame";
import TargetGame from "./games/TargetGame";
import JuggleGame from "./games/JuggleGame";
import QuizGame from "./games/QuizGame";
import Leaderboard from "./Leaderboard";
import "./GamesPage.css";

const GAMES = [
  {
    key: "click",
    name: "Click Rush",
    desc: "Click as fast as you can!",
    icon: "🖱️",
  },
  {
    key: "target",
    name: "Target Practice",
    desc: "Hit the targets!",
    icon: "🎯",
  },
  {
    key: "quiz",
    name: "Quiz Game",
    desc: "Test your knowledge!",
    icon: "🧩",
  },
  {
    key: "juggle",
    name: "Juggle Game",
    desc: "Keep balls in the air!",
    icon: "🎪",
  },
  {
    key: "memory",
    name: "Memory Match",
    desc: "Match all the pairs",
    icon: "🧠",
  },
  {
    key: "reaction",
    name: "Reaction Test",
    desc: "Test your reflexes",
    icon: "⚡",
  },
  { key: "snake", name: "Snake Classic", desc: "Eat and grow!", icon: "🐍" },
];

export default function GamesPage() {
  const [selected, setSelected] = useState("click");

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
          {selected === "click" && <ClickGame />}
          {selected === "target" && <TargetGame />}
          {selected === "quiz" && <QuizGame />}
          {selected === "juggle" && <JuggleGame />}
          {selected === "memory" && <MemoryGame />}
          {selected === "reaction" && <ReactionGame />}
          {selected === "snake" && <SnakeGame />}
        </div>
        <Leaderboard gameKey={selected} />
      </div>
    </div>
  );
}
