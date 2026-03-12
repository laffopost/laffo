import { useMemo, memo } from "react";
import "./AnimatedDotsBackground.css";

// Project palette - subtle monochromatic approach
const COLORS = [
  "rgba(139,92,246,0.4)", // #8b5cf6 (main purple)
  "rgba(139,92,246,0.25)", // lighter purple
  "rgba(99,102,241,0.3)", // #6366f1 (indigo - similar to purple)
  "rgba(168,85,247,0.35)", // #a855f7 (slightly different purple)
  "rgba(255,255,255,0.08)", // very subtle white
  "rgba(255,255,255,0.12)", // slightly more white
  "rgba(139,92,246,0.15)", // very faint purple
  "rgba(200,200,220,0.1)", // very subtle cool gray
];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function AnimatedDotsBackground() {
  // Only generate dots once per mount - reduced from 8 to 5 for better performance
  const dots = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const size = randomBetween(80, 120);
      const left = randomBetween(0, 100);
      const top = randomBetween(0, 100);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const delay = randomBetween(-60, 0);
      const duration = randomBetween(60, 90); // Increased duration (slower = less CPU work)

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
            filter: "blur(16px)", // Slightly more blur for softer look with fewer dots
            willChange: "none", // Don't force GPU acceleration on static animations
          }}
        />
      );
    });
  }, []);

  return <div className="animated-dots-bg">{dots}</div>;
}

export default memo(AnimatedDotsBackground);
