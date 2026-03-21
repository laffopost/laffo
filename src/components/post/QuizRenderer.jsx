import "./QuizRenderer.css";

function getContrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "#ffffff";
  if (hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1a1a2e" : "#ffffff";
}

/**
 * QuizRenderer
 * compact=true  → mini card thumbnail
 * compact=false → full interactive quiz for modal
 *
 * Props:
 *   question      string
 *   options       string[]
 *   correctIndex  number
 *   explanation   string | null
 *   bgColor       string
 *   voteCounts    number[]
 *   userVote      number | null   (index the user picked, or null)
 *   onVote        (index) => void
 *   compact       bool
 *   className     string
 */
export default function QuizRenderer({
  question,
  options = [],
  correctIndex = 0,
  explanation = null,
  bgColor = "#1a1a2e",
  voteCounts = [],
  userVote = null,
  onVote,
  compact = false,
  className = "",
}) {
  const textColor = getContrastColor(bgColor);
  const isDark = textColor === "#ffffff";

  const counts = options.map((_, i) => voteCounts[i] || 0);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const hasVoted = userVote !== null && userVote !== undefined;
  const correctCount = counts[correctIndex] || 0;
  const pctCorrect =
    totalVotes > 0 ? Math.round((correctCount / totalVotes) * 100) : null;

  const trackColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
  const correctFill = "rgba(16,185,129,0.7)";   // green
  const wrongFill = "rgba(239,68,68,0.6)";       // red
  const neutralFill = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";

  /* ── COMPACT ──────────────────────────────────────────────────────── */
  if (compact) {
    return (
      <div
        className={`quiz-renderer quiz-renderer--compact ${className}`}
        style={{ background: bgColor, color: textColor }}
      >
        <div className="quiz-renderer__badge">🧠 Quiz</div>
        <p className="quiz-renderer__question">{question || "Quiz question"}</p>
        <div className="quiz-renderer__compact-options">
          {options.slice(0, 4).map((opt, i) => (
            <div
              key={i}
              className={[
                "quiz-renderer__compact-row",
                hasVoted && i === correctIndex ? "quiz-renderer__compact-row--correct" : "",
                hasVoted && i === userVote && i !== correctIndex ? "quiz-renderer__compact-row--wrong" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="quiz-renderer__compact-label">{opt}</span>
              {hasVoted && i === correctIndex && <span className="quiz-renderer__mark">✓</span>}
            </div>
          ))}
        </div>
        <p className="quiz-renderer__compact-footer">
          {totalVotes} answered
          {pctCorrect !== null && ` · ${pctCorrect}% correct`}
        </p>
      </div>
    );
  }

  /* ── FULL ─────────────────────────────────────────────────────────── */
  return (
    <div
      className={`quiz-renderer quiz-renderer--full ${className}`}
      style={{ background: bgColor, color: textColor }}
    >
      <div className="quiz-renderer__badge quiz-renderer__badge--full">🧠 Quiz</div>
      <p className="quiz-renderer__question">{question}</p>

      {!hasVoted ? (
        /* ── Before answering: plain buttons ── */
        <div className="quiz-renderer__options">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="quiz-renderer__option quiz-renderer__option--hoverable"
              style={{ color: textColor, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }}
              onClick={() => onVote && onVote(i)}
            >
              <span className="quiz-renderer__option-letter">{String.fromCharCode(65 + i)}</span>
              <span className="quiz-renderer__option-text">{opt}</span>
            </button>
          ))}
        </div>
      ) : (
        /* ── After answering: results with ✅ / ❌ ── */
        <div className="quiz-renderer__options">
          {options.map((opt, i) => {
            const count = counts[i] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isCorrect = i === correctIndex;
            const isChosen = i === userVote;
            const fill = isCorrect ? correctFill : isChosen ? wrongFill : neutralFill;

            return (
              <div
                key={i}
                className={[
                  "quiz-renderer__result",
                  isCorrect ? "quiz-renderer__result--correct" : "",
                  isChosen && !isCorrect ? "quiz-renderer__result--wrong" : "",
                ].filter(Boolean).join(" ")}
                style={{ color: textColor }}
              >
                {/* bar track */}
                <span className="quiz-renderer__bar-track" style={{ background: trackColor }} />
                {/* bar fill */}
                <span className="quiz-renderer__bar" style={{ width: `${pct}%`, background: fill }} />
                <span className="quiz-renderer__option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="quiz-renderer__option-text">{opt}</span>
                <span className="quiz-renderer__result-right">
                  {isCorrect && <span className="quiz-renderer__icon">✅</span>}
                  {isChosen && !isCorrect && <span className="quiz-renderer__icon">❌</span>}
                  <span className="quiz-renderer__pct">{pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {hasVoted && (
        <div className="quiz-renderer__verdict">
          {userVote === correctIndex ? (
            <span className="quiz-renderer__verdict--correct">🎉 Correct!</span>
          ) : (
            <span className="quiz-renderer__verdict--wrong">
              ❌ Wrong — correct answer: <strong>{options[correctIndex]}</strong>
            </span>
          )}
        </div>
      )}

      {hasVoted && explanation && (
        <div className="quiz-renderer__explanation">
          <span className="quiz-renderer__explanation-label">💡 Explanation</span>
          <p>{explanation}</p>
        </div>
      )}

      <p className="quiz-renderer__footer">
        <span>{totalVotes} answered</span>
        {pctCorrect !== null && (
          <>
            <span className="quiz-renderer__footer-sep">·</span>
            <span>{pctCorrect}% got it right</span>
          </>
        )}
        <span className="quiz-renderer__footer-sep">·</span>
        <span>{hasVoted ? "You answered" : "Tap an option to answer"}</span>
      </p>
    </div>
  );
}
