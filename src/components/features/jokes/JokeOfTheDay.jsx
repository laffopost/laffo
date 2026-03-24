import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./JokeOfTheDay.css";

const CACHE_KEY = "laffo_jokes_widget";

const FALLBACK_JOKES = [
  { setup: "Why don't scientists trust atoms?", delivery: "Because they make up everything!" },
  { setup: "Why did the crypto investor go broke?", delivery: "He put all his eggs in one blockchain." },
  { setup: "Why did the programmer quit his job?", delivery: "Because he didn't get arrays." },
  { setup: "What do you call a fish without eyes?", delivery: "A fsh." },
  { setup: "Why do Java developers wear glasses?", delivery: "Because they don't C#." },
  { setup: "What's a meme's favorite exercise?", delivery: "A viral workout." },
  { setup: "Why did the Bitcoin go to therapy?", delivery: "It had too many emotional swings." },
  { setup: "What do you call a fake noodle?", delivery: "An impasta." },
];

async function fetchJokes() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      "https://v3.jokeapi.dev/joke/Any?safe-mode&type=twopart&amount=5",
      { signal: controller.signal },
    );
    clearTimeout(timer);
    const data = await res.json();
    if (data.jokes?.length) {
      return data.jokes
        .filter((j) => j.setup && j.delivery)
        .map((j) => ({ setup: j.setup, delivery: j.delivery }));
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

export default function JokeOfTheDay() {
  const [jokes, setJokes] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached?.date === today && cached.jokes?.length) {
        setJokes(cached.jokes);
        setLoading(false);
        return;
      }
    } catch {}

    fetchJokes()
      .then((fetched) => {
        const list = fetched?.length ? fetched : FALLBACK_JOKES.slice(0, 5);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, jokes: list }));
        setJokes(list);
      })
      .catch(() => setJokes(FALLBACK_JOKES.slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  const total = jokes.length;
  const joke = jokes[index] ?? null;
  const totalRef = useRef(total);
  totalRef.current = total;

  const intervalRef = useRef(null);

  const startInterval = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % totalRef.current);
      setRevealed(false);
    }, 10000);
  }, []);

  useEffect(() => {
    if (!total) return;
    startInterval();
    return () => clearInterval(intervalRef.current);
  }, [total, startInterval]);

  const handleNext = () => {
    setIndex((i) => (i + 1) % total);
    setRevealed(false);
    startInterval(); // reset timer — no state change, no re-render
  };

  return (
    <div className="joke-widget">
      {/* Decorative accent */}
      <div className="joke-widget-accent" />

      <div className="joke-widget-header">
        <div className="joke-widget-header-left">
          <span className="joke-widget-emoji">😂</span>
          <span className="joke-widget-title">Jokes</span>
        </div>
        <Link to="/jokes" className="joke-more-link">See all</Link>
      </div>

      {loading || !joke ? (
        <div className="joke-loading">
          <div className="joke-skeleton" />
          <div className="joke-skeleton joke-skeleton--short" />
        </div>
      ) : (
        <>
          <div className="joke-body">
            <p className="joke-setup">{joke.setup}</p>
            {revealed ? (
              <p className="joke-delivery">{joke.delivery}</p>
            ) : (
              <button className="joke-reveal-btn" onClick={() => setRevealed(true)}>
                Tap to reveal 👀
              </button>
            )}
          </div>

          <div className="joke-footer">
            <div className="joke-dots">
              {jokes.map((_, i) => (
                <span
                  key={i}
                  className={`joke-dot${i === index ? " active" : ""}`}
                />
              ))}
            </div>
            <div className="joke-footer-actions">
              <Link to="/jokes" className="joke-next-btn">See all →</Link>
              <button className="joke-next-btn" onClick={handleNext}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
