import { useState, useEffect } from "react";
import "./CountdownRenderer.css";

// Normalize Firestore Timestamp, plain number, or Date to ms
function toMs(targetDate) {
  if (!targetDate) return NaN;
  if (typeof targetDate === "object" && targetDate.seconds) return targetDate.seconds * 1000;
  return Number(targetDate);
}

function getTimeLeft(targetDate) {
  const ms = toMs(targetDate);
  if (isNaN(ms)) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default function CountdownRenderer({ targetDate, emoji = "🎉", bgColor = "#1a1a2e", compact = false, className = "" }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    // Cards (compact): update every 60s — no seconds shown, saves CPU
    // Modal (full): update every 1s to show live seconds
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, compact ? 60000 : 1000);
    return () => clearInterval(interval);
  }, [targetDate, compact]);

  const isExpired = !timeLeft;

  if (compact) {
    return (
      <div className={`countdown-renderer compact ${className}`} style={{ backgroundColor: bgColor }}>
        <span className="countdown-emoji-compact">{emoji}</span>
        {isExpired ? (
          <span className="countdown-expired-text">Time's up!</span>
        ) : (
          <div className="countdown-units-compact">
            <div className="countdown-unit-compact">
              <span className="countdown-value-compact">{String(timeLeft.days).padStart(2, "0")}</span>
              <span className="countdown-label-compact">d</span>
            </div>
            <span className="countdown-sep-compact">:</span>
            <div className="countdown-unit-compact">
              <span className="countdown-value-compact">{String(timeLeft.hours).padStart(2, "0")}</span>
              <span className="countdown-label-compact">h</span>
            </div>
            <span className="countdown-sep-compact">:</span>
            <div className="countdown-unit-compact">
              <span className="countdown-value-compact">{String(timeLeft.minutes).padStart(2, "0")}</span>
              <span className="countdown-label-compact">m</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`countdown-renderer full ${className}`} style={{ backgroundColor: bgColor }}>
      <span className="countdown-emoji-full">{emoji}</span>
      {isExpired ? (
        <div className="countdown-expired-full">
          <span className="countdown-expired-label">Time's up! 🎉</span>
        </div>
      ) : (
        <div className="countdown-units-full">
          {[
            { value: timeLeft.days, label: "Days" },
            { value: timeLeft.hours, label: "Hours" },
            { value: timeLeft.minutes, label: "Min" },
            { value: timeLeft.seconds, label: "Sec" },
          ].map(({ value, label }, i, arr) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "inherit" }}>
              <div className="countdown-unit-full">
                <span className="countdown-value-full">{String(value).padStart(2, "0")}</span>
                <span className="countdown-label-full">{label}</span>
              </div>
              {i < arr.length - 1 && <span className="countdown-sep-full">:</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
