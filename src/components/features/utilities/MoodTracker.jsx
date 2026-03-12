import { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import "./MoodTracker.css";

import logger from "../../../utils/logger";
const MOOD_DOC_PATH = "app_state/mood_tracker";

const MOOD_QUESTIONS = [
  {
    id: "community",
    question: "Community mood check?",
    emojis: ["🎉", "👏", "😍", "🤝", "😬"],
  },
  {
    id: "future",
    question: "Bullish today?",
    emojis: ["🌕", "🐂", "💪", "🤷", "🐻"],
  },
  {
    id: "market",
    question: "Weather?",
    emojis: ["📈", "📉", "🤑", "😱", "🤔"],
  },
  {
    id: "portfolio",
    question: "Portfolio vibes?",
    emojis: ["💰", "🏆", "🎯", "💀", "🙏"],
  },
];

// Carousel/Question child component
const MoodQuestionCarousel = memo(function MoodQuestionCarousel({
  currentQuestion,
  setCurrentQuestion,
  isAutoplaying,
  setIsAutoplaying,
  moodCounts,
  loading,
  handleMoodSelect,
  votedQuestions,
}) {
  const autoplayTimeoutRef = useRef(null);
  const currentQ = MOOD_QUESTIONS[currentQuestion];
  const currentMoodCounts = moodCounts[currentQ.id] || {};
  const hasVoted = !!votedQuestions?.[currentQ.id];
  const votedEmoji = votedQuestions?.[currentQ.id] || null;

  // Auto-carousel effect
  useEffect(() => {
    if (!isAutoplaying) return;
    autoplayTimeoutRef.current = setTimeout(() => {
      setCurrentQuestion((prev) =>
        prev === MOOD_QUESTIONS.length - 1 ? 0 : prev + 1,
      );
    }, 5000);
    return () => {
      if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    };
  }, [currentQuestion, isAutoplaying, setCurrentQuestion]);

  // Pause autoplay on user interaction
  const pauseAutoplay = useCallback(() => {
    setIsAutoplaying(false);
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    autoplayTimeoutRef.current = setTimeout(() => {
      setIsAutoplaying(true);
    }, 10000);
  }, [setIsAutoplaying]);

  const handlePrevQuestion = () => {
    pauseAutoplay();
    setCurrentQuestion((prev) =>
      prev === 0 ? MOOD_QUESTIONS.length - 1 : prev - 1,
    );
  };

  const handleNextQuestion = () => {
    pauseAutoplay();
    setCurrentQuestion((prev) =>
      prev === MOOD_QUESTIONS.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <>
      <div className="mood-header">
        <button
          className="carousel-arrow left"
          onClick={handlePrevQuestion}
          aria-label="Previous question"
        >
          ‹
        </button>
        <h4 className="mood-question" key={currentQ.id}>
          {currentQ.question}
        </h4>
        <button
          className="carousel-arrow right"
          onClick={handleNextQuestion}
          aria-label="Next question"
        >
          ›
        </button>
      </div>

      <div className="mood-indicator">
        {MOOD_QUESTIONS.map((_, index) => (
          <span
            key={index}
            className={`mood-dot ${index === currentQuestion ? "active" : ""}`}
          />
        ))}
      </div>

      <div className="mood-options" key={`options-${currentQ.id}`}>
        {currentQ.emojis.map((emoji) => (
          <button
            key={emoji}
            className={`mood-btn${votedEmoji === emoji ? " voted" : ""}${hasVoted ? " disabled" : ""}`}
            onClick={() => {
              if (hasVoted) return;
              pauseAutoplay();
              handleMoodSelect(emoji, currentQ);
            }}
            disabled={loading || hasVoted}
            title={
              hasVoted
                ? `You voted ${votedEmoji}`
                : `${currentMoodCounts[emoji] || 0} people feel ${emoji}`
            }
          >
            <span className="mood-emoji">{emoji}</span>
            <span className="mood-count">{currentMoodCounts[emoji] || 0}</span>
          </button>
        ))}
      </div>
    </>
  );
});

const MoodTracker = memo(function MoodTracker() {
  const { firebaseUser } = useAuth();
  const userId = firebaseUser?.uid || null;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [moodCounts, setMoodCounts] = useState(() =>
    Object.fromEntries(
      MOOD_QUESTIONS.map((q) => [
        q.id,
        Object.fromEntries(q.emojis.map((e) => [e, 0])),
      ]),
    ),
  );
  const [votedQuestions, setVotedQuestions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mood_votes") || "{}");
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);
  const [isAutoplaying, setIsAutoplaying] = useState(true);

  const unsubscribeRef = useRef(null);

  const db = getFirestore();

  // Listen to Firestore
  useEffect(() => {
    const moodRef = doc(db, MOOD_DOC_PATH);
    let timeoutId = null;

    unsubscribeRef.current = onSnapshot(
      moodRef,
      { includeMetadataChanges: false },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMoodCounts(data.counts || {});
        } else {
          // Initialize document
          const initialCounts = Object.fromEntries(
            MOOD_QUESTIONS.map((q) => [
              q.id,
              Object.fromEntries(q.emojis.map((e) => [e, 0])),
            ]),
          );
          setDoc(moodRef, { counts: initialCounts }, { merge: true });
        }
        setLoading(false);
      },
      (error) => {
        logger.error("Firestore listener error:", error);
        setLoading(false);
      },
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [db]);

  // Increment mood count in Firestore (with per-user dedup)
  const handleMoodSelect = useCallback(
    async (emoji, questionObj) => {
      const questionId = questionObj.id;

      // Block anonymous users from voting
      if (!firebaseUser || firebaseUser.isAnonymous) return;

      // Prevent duplicate votes per question per user
      if (votedQuestions[questionId]) return;

      // Optimistic: mark as voted immediately
      const newVoted = { ...votedQuestions, [questionId]: emoji };
      setVotedQuestions(newVoted);
      localStorage.setItem("mood_votes", JSON.stringify(newVoted));

      try {
        const moodRef = doc(db, MOOD_DOC_PATH);
        await runTransaction(db, async (transaction) => {
          const moodDoc = await transaction.get(moodRef);
          let counts = moodDoc.exists() ? { ...moodDoc.data().counts } : {};
          if (!counts[questionId]) {
            counts[questionId] = Object.fromEntries(
              questionObj.emojis.map((e) => [e, 0]),
            );
          }

          // Also track voters server-side
          let voters = moodDoc.exists()
            ? { ...(moodDoc.data().voters || {}) }
            : {};
          if (!voters[questionId]) voters[questionId] = {};
          if (userId && voters[questionId][userId]) return; // Already voted server-side
          if (userId) voters[questionId][userId] = emoji;

          counts[questionId][emoji] = (counts[questionId][emoji] || 0) + 1;
          transaction.update(moodRef, { counts, voters });
        });
      } catch (error) {
        logger.error("Mood update error:", error);
        // Rollback on error
        setVotedQuestions(votedQuestions);
        localStorage.setItem("mood_votes", JSON.stringify(votedQuestions));
      }
    },
    [db, userId, votedQuestions, firebaseUser],
  );

  return (
    <div className="mood-tracker-card">
      <MoodQuestionCarousel
        currentQuestion={currentQuestion}
        setCurrentQuestion={setCurrentQuestion}
        isAutoplaying={isAutoplaying}
        setIsAutoplaying={setIsAutoplaying}
        moodCounts={moodCounts}
        loading={loading}
        handleMoodSelect={handleMoodSelect}
        votedQuestions={votedQuestions}
      />
    </div>
  );
});

export default MoodTracker;
