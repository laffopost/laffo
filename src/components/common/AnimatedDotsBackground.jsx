import { useMemo, useEffect, useRef, memo } from "react";
import "./AnimatedDotsBackground.css";

// Project palette - subtle monochromatic approach (reduced to 4 colors)
const COLORS = [
  "rgba(139,92,246,0.35)",
  "rgba(99,102,241,0.25)",
  "rgba(168,85,247,0.3)",
  "rgba(255,255,255,0.08)",
];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function AnimatedDotsBackground() {
  const containerRef = useRef(null);

  // Pause CSS animations when the tab is hidden — avoids wasting GPU/CPU
  useEffect(() => {
    const handleVisibility = () => {
      if (containerRef.current) {
        containerRef.current.classList.toggle("paused", document.hidden);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Only generate dots once per mount - reduced to 3 for minimal CPU
  const dots = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => {
      const size = randomBetween(100, 160);
      const left = randomBetween(5, 90);
      const top = randomBetween(5, 90);
      const color = COLORS[i % COLORS.length];
      const delay = randomBetween(-90, 0);
      const duration = randomBetween(90, 120); // Very slow = very low CPU

      return (
        <div
          key={i}
          className="animated-dot"
          style={{
            width: size,
            height: size,
            left: `${left}vw`,
            top: `${top}vh`,
            background: color,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      );
    });
  }, []);

  return (
    <div ref={containerRef} className="animated-dots-bg">
      {dots}
    </div>
  );
}

export default memo(AnimatedDotsBackground);
