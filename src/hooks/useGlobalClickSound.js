import { useEffect } from "react";
import clickSound from "../assets/click.mp3";

export default function useGlobalClickSound() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio(clickSound);
    let lastPlay = 0;

    const handleClick = () => {
      if (window.__LAUGHCOIN_SOUND_ON__ === false) return;
      const now = Date.now();
      if (now - lastPlay < 100) return; // Throttle to max 10 sounds per second

      lastPlay = now;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);
}
