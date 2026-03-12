import "./PollRenderer.css";

function getContrastColor(hex) {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1a1a2e" : "#ffffff";
}

function formatTimeLeft(endsAt) {
  if (!endsAt) return null;
  const ms = endsAt - Date.now();
  if (ms <= 0) return "Closed";

  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${seconds}s left`;
}

/**
 * PollRenderer — always shows vote bars.
 * compact=true  → mini card for PostCard thumbnail
 * compact=false → full interactive poll for modal
 */
export default function PollRenderer({
  question,
  description,
  options = [],
  bgColor = "#1a1a2e",
  voteCounts = [],
  userVote = null,
  endsAt = null,
  onVote,
  compact = false,
  className = "",
}) {
  const textColor = getContrastColor(bgColor);
  const isDark = textColor === "#ffffff";

  const counts = options.map((_, i) => voteCounts[i] || 0);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts, 0);
  const hasVoted = userVote !== null && userVote !== undefined;
  const isExpired = endsAt && Date.now() > endsAt;
  const canVote = !hasVoted && !isExpired;
  const timeLeft = formatTimeLeft(endsAt);

  // Bar colours that work on any background
  const barTrack = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
  const barFillNormal = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.18)";
  const barFillWinner = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.32)";
  const barFillChosen = "rgba(139,92,246,0.7)"; // purple accent for your vote

  /* ── COMPACT ─────────────────────────────────────────────────────────── */
  if (compact) {
    return (
      <div
        className={`poll-renderer poll-renderer--compact ${className}`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <p className="poll-renderer__question">{question || "Poll question"}</p>
        <div className="poll-renderer__compact-options">
          {options.slice(0, 4).map((opt, i) => {
            const count = counts[i] || 0;
            const pct =
              totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isWinner = totalVotes > 0 && count === maxCount;
            const isChosen = hasVoted && userVote === i;
            const fill = isChosen
              ? barFillChosen
              : isWinner
                ? barFillWinner
                : barFillNormal;
            return (
              <div key={i} className="poll-renderer__compact-row">
                <span className="poll-renderer__compact-label">{opt}</span>
                <div
                  className="poll-renderer__compact-bar"
                  style={{ background: barTrack }}
                >
                  <div
                    className="poll-renderer__compact-fill"
                    style={{ width: `${pct}%`, background: fill }}
                  />
                </div>
                <span className="poll-renderer__compact-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
        <p className="poll-renderer__vote-count">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {timeLeft && ` · ${timeLeft}`}
        </p>
      </div>
    );
  }

  /* ── FULL ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className={`poll-renderer poll-renderer--full ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="poll-renderer__header">
        {timeLeft && (
          <span
            className={`poll-renderer__time-badge${isExpired ? " expired" : ""}`}
          >
            {isExpired ? "⏰ Closed" : `⏳ ${timeLeft}`}
          </span>
        )}
      </div>

      <p className="poll-renderer__question">{question}</p>
      {description && (
        <p className="poll-renderer__description">{description}</p>
      )}

      <div className="poll-renderer__options">
        {options.map((opt, i) => {
          const count = counts[i];
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isChosen = hasVoted && userVote === i;
          const isWinner = totalVotes > 0 && count === maxCount;
          const fill = isChosen
            ? barFillChosen
            : isWinner
              ? barFillWinner
              : barFillNormal;

          return (
            <button
              key={i}
              type="button"
              className={[
                "poll-renderer__option",
                canVote ? "poll-renderer__option--hoverable" : "",
                isChosen ? "poll-renderer__option--chosen" : "",
                isWinner && totalVotes > 0
                  ? "poll-renderer__option--winner"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ color: textColor }}
              onClick={() => canVote && onVote && onVote(i)}
              disabled={!canVote}
            >
              {/* Track */}
              <span
                className="poll-renderer__bar-track"
                style={{ background: barTrack }}
              />
              {/* Fill */}
              <span
                className="poll-renderer__bar"
                style={{ width: `${pct}%`, background: fill }}
              />
              <span className="poll-renderer__option-text">{opt}</span>
              <span className="poll-renderer__option-right">
                {isWinner && totalVotes > 0 && (
                  <span className="poll-renderer__crown">👑</span>
                )}
                {isChosen && <span className="poll-renderer__check">✓</span>}
                <span className="poll-renderer__option-pct">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="poll-renderer__footer">
        <span>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </span>
        <span className="poll-renderer__footer-sep">·</span>
        <span>
          {hasVoted
            ? "You voted"
            : isExpired
              ? "Closed"
              : "Tap an option to vote"}
        </span>
      </p>
    </div>
  );
}
