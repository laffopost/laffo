import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { saveGameScore, getGlobalHighScore } from "../leaderboardApi";
import "./QuizGame.css";

const QUIZZES = [
  {
    id: "crypto",
    title: "🪙 Crypto Knowledge",
    description: "Test your cryptocurrency knowledge!",
    questions: [
      { q: "What year was Bitcoin created?", options: ["2008", "2009", "2010", "2011"], correct: 1 },
      { q: "What does ETH stand for?", options: ["Ethereum", "Ethanol", "Ethernet", "Ether"], correct: 0 },
      { q: "What is the maximum supply of Bitcoin?", options: ["10M", "21M", "50M", "Unlimited"], correct: 1 },
      { q: "What is a blockchain?", options: ["A type of currency", "A ledger of transactions", "A mining device", "A digital wallet"], correct: 1 },
      { q: "What does NFT stand for?", options: ["New Form of Tech", "Non-Fungible Token", "Network File Transfer", "None of the above"], correct: 1 },
      { q: "Who created Bitcoin under the pseudonym Satoshi Nakamoto?", options: ["Unknown", "Vitalik Buterin", "Charles Hoskinson", "Craig Wright"], correct: 0 },
      { q: "What does DeFi stand for?", options: ["Decentralized Finance", "Digital Finance", "Distributed Finance", "Direct Finance"], correct: 0 },
      { q: "Which cryptocurrency uses Proof of Work?", options: ["Bitcoin", "Ripple", "Cardano", "Polkadot"], correct: 0 },
      { q: "What is a smart contract?", options: ["A legal document", "Self-executing code on blockchain", "A bank agreement", "A business deal"], correct: 1 },
      { q: "What year was Ethereum created?", options: ["2013", "2014", "2015", "2016"], correct: 2 },
      { q: "What does HODL mean to crypto investors?", options: ["Sell immediately", "Hold long-term despite volatility", "Use leverage trading", "Withdraw all funds"], correct: 1 },
      { q: "Which layer-1 blockchain has the fastest transaction speed?", options: ["Bitcoin", "Solana", "Ethereum", "Ripple"], correct: 1 },
      { q: "What is a fork in blockchain?", options: ["A eating utensil", "A protocol change that splits the chain", "A mining tool", "A wallet feature"], correct: 1 },
      { q: "What is staking in crypto?", options: ["Borrowing cryptocurrency", "Locking coins to validate network", "Buying call options", "Selling short"], correct: 1 },
      { q: "How many Bitcoin will ever exist?", options: ["10 million", "21 million", "100 million", "Unlimited"], correct: 1 },
      { q: "What does FOMO stand for?", options: ["Fear Of Missing Out", "Follow Or Miss Opportunities", "Fundamental Option Market Open", "For Official Market Operations"], correct: 0 },
      { q: "Which exchange is the largest crypto trading platform?", options: ["Kraken", "Coinbase", "Binance", "Gemini"], correct: 2 },
      { q: "What is a wallet in crypto?", options: ["A physical purse", "Software to store private keys", "A bank account", "A blockchain explorer"], correct: 1 },
      { q: "What is the most valuable cryptocurrency by market cap?", options: ["Ethereum", "Bitcoin", "BNB", "XRP"], correct: 1 },
      { q: "What does AltCoin mean?", options: ["Alternative coins (non-Bitcoin)", "High-risk coins", "Old cryptocurrencies", "Fake coins"], correct: 0 },
    ],
  },
  {
    id: "memes",
    title: "😂 Meme Culture",
    description: "How well do you know internet memes?",
    questions: [
      { q: "What does HODL stand for?", options: ["Hold On for Dear Life", "Hold Or Die Laughing", "Honest Obligation to Deliver", "Hold On Digital Ledger"], correct: 0 },
      { q: 'What is the "To The Moon" meme about?', options: ["Space exploration", "Crypto price increases", "Lunar missions", "Astronauts"], correct: 1 },
      { q: "What is diamond hands?", options: ["Actual diamonds", "Holding investments despite losses", "A jewelry brand", "A medical condition"], correct: 1 },
      { q: "What is a rug pull?", options: ["A carpet removal", "A scam where creators abandon a project", "A type of exercise", "A cleaning service"], correct: 1 },
      { q: "What does WAGMI mean?", options: ["We Are Going to Make It", "When Am I Getting Money", "What About Global Markets", "Will Anything Go Massively Insane"], correct: 0 },
      { q: "What does LAMBO mean in crypto?", options: ["A programming language", "Lamborghini (dream car from profits)", "A trading strategy", "A type of coin"], correct: 1 },
      { q: "What is a 'bagholder'?", options: ["Someone holding a bag", "Someone stuck with worthless coins", "A trader", "A bank teller"], correct: 1 },
      { q: "What does DYOR mean?", options: ["Do Your Own Research", "Describe Your Own Routine", "Download Your Official Report", "Deposit Your Orange Coins"], correct: 0 },
      { q: "What is FUD?", options: ["A type of coin", "Fear, Uncertainty, Doubt (negative sentiment)", "Future Use Date", "Fund Understanding Document"], correct: 1 },
      { q: "What does FOMO mean?", options: ["Fear Of Missing Out", "Follow Or Miss Opportunities", "Fundamental Option Market Open", "For Official Market Operations"], correct: 0 },
      { q: 'What is the "paper hands" meme?', options: ["Having wet hands", "Selling during downturns from panic", "A medical condition", "A type of printer"], correct: 1 },
      { q: "What does GBTC stand for?", options: ["Global Bitcoin Trust", "Grayscale Bitcoin Trust", "Gold Backed Token Currency", "Government Bitcoin Trading Commission"], correct: 1 },
      { q: "What is a 'whale' in crypto?", options: ["A large ocean animal", "Someone holding massive amounts of crypto", "A type of trading bot", "A blockchain node"], correct: 1 },
      { q: "What does REKT mean?", options: ["A positive outcome", "Destroyed/losing money (from 'wrecked')", "A blockchain", "A type of wallet"], correct: 1 },
      { q: "What is 'pump and dump'?", options: ["A type of exercise", "Artificially inflating then selling price", "A sports activity", "A water system"], correct: 1 },
      { q: "What does 'moon' as a verb mean in crypto?", options: ["Go to the actual moon", "Price increases dramatically", "Turn silver-colored", "Reflect light"], correct: 1 },
      { q: "What is a 'shill'?", options: ["A type of coin", "Someone promoting a project for profit", "A trading strategy", "A blockchain feature"], correct: 1 },
      { q: "What does 'DAPP' stand for?", options: ["Digital Application", "Decentralized Application", "Distributed Authentication Protocol", "Direct Automated Processing Platform"], correct: 1 },
      { q: "What is a 'wick' in candlestick charts?", options: ["Candle material", "The thin lines extending from candles", "A trading indicator", "A time period"], correct: 1 },
      { q: "What does 'NGMI' mean?", options: ["Never Gonna Make It", "New Generation Market Index", "Next Generation Mining Interface", "Non-Governmental Market Initiative"], correct: 0 },
    ],
  },
  {
    id: "general",
    title: "🧠 General Knowledge",
    description: "Test your general knowledge!",
    questions: [
      { q: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
      { q: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "What is the largest planet in our solar system?", options: ["Saturn", "Neptune", "Jupiter", "Venus"], correct: 2 },
      { q: "In what year did the Titanic sink?", options: ["1912", "1915", "1920", "1925"], correct: 0 },
      { q: "What is the smallest country in the world?", options: ["Monaco", "Liechtenstein", "Vatican City", "Malta"], correct: 2 },
      { q: "What is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
      { q: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"], correct: 2 },
      { q: "How many bones are in the human body?", options: ["186", "206", "226", "246"], correct: 1 },
      { q: "What is the highest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Denali"], correct: 2 },
      { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mercury", "Mars", "Jupiter"], correct: 2 },
      { q: "What is the currency of the United Kingdom?", options: ["Euro", "Dollar", "Pound Sterling", "Franc"], correct: 2 },
      { q: "How many letters are in the English alphabet?", options: ["24", "25", "26", "27"], correct: 2 },
      { q: "What is the deepest ocean trench?", options: ["Mariana Trench", "Tonga Trench", "Philippine Trench", "Kuril-Kamchatka Trench"], correct: 0 },
      { q: "Which country has the most populous city?", options: ["China", "India", "Japan", "USA"], correct: 0 },
      { q: "What is the smallest US state by area?", options: ["Delaware", "Rhode Island", "Connecticut", "Vermont"], correct: 1 },
      { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: 1 },
      { q: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2 },
      { q: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], correct: 1 },
      { q: "How many strings does a standard guitar have?", options: ["5", "6", "7", "8"], correct: 1 },
      { q: "What is the largest desert in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctica"], correct: 3 },
    ],
  },
  {
    id: "tech",
    title: "💻 Technology",
    description: "How much do you know about tech?",
    questions: [
      { q: "Who is known as the father of artificial intelligence?", options: ["Alan Turing", "John McCarthy", "Geoffrey Hinton", "Yann LeCun"], correct: 1 },
      { q: "What does AI stand for?", options: ["Automatic Intelligence", "Artificial Intelligence", "Advanced Integration", "Automated Input"], correct: 1 },
      { q: "In what year was the first iPhone released?", options: ["2005", "2007", "2009", "2010"], correct: 1 },
      { q: "What does GPU stand for?", options: ["General Purpose Unit", "Graphics Processing Unit", "Gaming Platform Unit", "Global Processing Utility"], correct: 1 },
      { q: "What is the most popular programming language?", options: ["Java", "Python", "C++", "JavaScript"], correct: 1 },
      { q: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"], correct: 0 },
      { q: "What year was the first web browser created?", options: ["1989", "1991", "1993", "1995"], correct: 2 },
      { q: "Who invented the World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Linus Torvalds"], correct: 2 },
      { q: "What does CPU stand for?", options: ["Central Processing Unit", "Central Program Utility", "Computer Programming Unit", "Central Performance Unit"], correct: 0 },
      { q: "What is open source software?", options: ["Software that costs money", "Code available for free modification", "Proprietary software", "Software with no source code"], correct: 1 },
      { q: "What does API stand for?", options: ["Application Programming Interface", "Application Program Integration", "Advanced Programming Interface", "Application Process Interface"], correct: 0 },
      { q: "What is machine learning?", options: ["Teaching humans with machines", "Machines learning from data", "Industrial learning process", "Computer maintenance"], correct: 1 },
      { q: "Who created JavaScript?", options: ["Guido van Rossum", "Brendan Eich", "Bjarne Stroustrup", "Dennis Ritchie"], correct: 1 },
      { q: "What does SQL stand for?", options: ["Structured Query Language", "Simple Question Language", "System Query Logic", "Sequential Question Language"], correct: 0 },
      { q: "What is cloud computing?", options: ["Using actual clouds", "Computing done on remote servers", "Weather forecasting", "Storage in the sky"], correct: 1 },
      { q: "What does VPN stand for?", options: ["Virtual Personal Network", "Virtual Private Network", "Verified Private Network", "Virtual Protocol Network"], correct: 1 },
      { q: "Who created Python?", options: ["Guido van Rossum", "David Heinemeier", "Rasmus Lerdorf", "Larry Wall"], correct: 0 },
      { q: "What is a framework in software development?", options: ["Metal structure", "Pre-built code for building apps", "A type of computer", "A programming language"], correct: 1 },
      { q: "What year was Linux created?", options: ["1989", "1991", "1993", "1995"], correct: 1 },
      { q: "What does MVP stand for in development?", options: ["Maximum Viable Product", "Minimum Viable Product", "Most Valuable Person", "Most Viable Product"], correct: 1 },
    ],
  },
];

export default function QuizGame({ onShareResult }) {
  const { firebaseUser } = useAuth();
  const [state, setState]               = useState("questionCount"); // questionCount | quizSelect | playing | complete
  const [questionCount, setQuestionCount] = useState(5);
  const [globalHigh, setGlobalHigh]       = useState(null);

  useEffect(() => { getGlobalHighScore("quiz_crypto_10").then(setGlobalHigh); }, []);
  const [selectedQuiz, setSelectedQuiz]   = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore]               = useState(0);
  const [answered, setAnswered]         = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const quizQuestions = useMemo(() => {
    if (!selectedQuiz) return [];
    return [...selectedQuiz.questions].sort(() => Math.random() - 0.5).slice(0, questionCount);
  }, [selectedQuiz, questionCount]);

  const handleQuestionCountSelect = (count) => {
    setQuestionCount(count);
    setState("quizSelect");
  };

  const handleSelectQuiz = (quizId) => {
    const quiz = QUIZZES.find((q) => q.id === quizId);
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setScore(0);
    setAnswered(false);
    setSelectedAnswer(null);
    setState("playing");
  };

  const handleAnswerSelect = (optionIndex) => {
    if (answered) return;
    setSelectedAnswer(optionIndex);
    setAnswered(true);
    if (optionIndex === quizQuestions[currentQuestion].correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setAnswered(false);
      setSelectedAnswer(null);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    setState("complete");
    if (firebaseUser && !firebaseUser.isAnonymous) {
      try {
        await saveGameScore(`quiz_${selectedQuiz.id}_${questionCount}`, score, firebaseUser.uid);
        toast.success(`Quiz Complete! Score: ${score}/${quizQuestions.length}`);
      } catch (_err) {
        toast.error("Failed to save score");
      }
    }
  };

  const resetGame = () => {
    setState("questionCount");
    setSelectedQuiz(null);
    setScore(0);
    setCurrentQuestion(0);
  };

  // ── Question count selection ──────────────────────────────────────────────
  if (state === "questionCount") {
    return (
      <div className="game-card">
        <div className="game-card-header">
          <h2>🧩 Quiz Games</h2>
          <p className="game-desc">
            Pick a category and test your knowledge — crypto, memes, general facts, and tech!
          </p>
        </div>
        <div className="game-card-body">
          <div className="question-count-selection">
            {[
              { count: 5,  label: "Quick Quiz",        time: "~2 min" },
              { count: 10, label: "Standard Quiz",      time: "~5 min" },
              { count: 20, label: "Ultimate Challenge",  time: "~10 min" },
            ].map(({ count, label, time }) => (
              <button key={count} className="count-btn" onClick={() => handleQuestionCountSelect(count)}>
                <div className="count-number">{count}</div>
                <div className="count-label">{label}</div>
                <div className="count-time">{time}</div>
              </button>
            ))}
          </div>
          {globalHigh && (
            <div className="game-global-banner">
              Top score: <strong>{globalHigh.score}</strong> by @{globalHigh.username}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz selection ────────────────────────────────────────────────────────
  if (state === "quizSelect") {
    return (
      <div className="game-card">
        <div className="game-card-header">
          <h2>🧩 Quiz Games</h2>
          <p className="game-desc">Choose a category — {questionCount} random questions</p>
        </div>
        <div className="game-card-body">
          <div className="quiz-list">
            {QUIZZES.map((quiz) => (
              <button key={quiz.id} className="quiz-card" onClick={() => handleSelectQuiz(quiz.id)}>
                <div className="quiz-card-title">{quiz.title}</div>
                <div className="quiz-card-desc">{quiz.description}</div>
                <div className="quiz-card-count">{questionCount} questions</div>
              </button>
            ))}
          </div>
          <button className="game-btn secondary" onClick={() => setState("questionCount")}>← Back</button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (state === "playing" && quizQuestions.length > 0) {
    const question = quizQuestions[currentQuestion];
    return (
      <div className="game-card">
        <div className="game-card-header">
          <h2>{selectedQuiz.title}</h2>
        </div>
        <div className="game-card-body">
          <div className="quiz-header">
            <div className="quiz-progress">Q {currentQuestion + 1}/{quizQuestions.length}</div>
          </div>

          <div className="game-stats">
            <div className="game-stat">
              <div className="game-stat-label">Question</div>
              <div className="game-stat-value">{currentQuestion + 1}/{quizQuestions.length}</div>
            </div>
            <div className="game-stat">
              <div className="game-stat-label">Score</div>
              <div className="game-stat-value">{score}</div>
            </div>
          </div>

          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }} />
          </div>

          <div className="quiz-question-container">
            <h3 className="quiz-question">{question.q}</h3>
            <div className="quiz-options">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  className={`quiz-option ${selectedAnswer === index ? "selected" : ""} ${
                    answered
                      ? index === question.correct
                        ? "correct"
                        : index === selectedAnswer
                          ? "incorrect"
                          : ""
                      : ""
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={answered}
                >
                  {option}
                </button>
              ))}
            </div>
            {answered && (
              <button className="game-btn" style={{ marginTop: "0.75rem" }} onClick={handleNextQuestion}>
                {currentQuestion === quizQuestions.length - 1 ? "See Results" : "Next →"}
              </button>
            )}
          </div>

          <div className="game-controls-bar">
            <button className="game-btn secondary" style={{ fontSize: "0.8rem" }} onClick={resetGame}>✕ Quit</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  if (state === "complete") {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const message =
      percentage === 100 ? "Perfect Score! 🌟" :
      percentage >= 80  ? "Excellent! 🎉" :
      percentage >= 60  ? "Good Job! 👍" :
      percentage >= 40  ? "Not Bad! 📚" :
                          "Keep Learning! 📖";

    return (
      <div className="game-card">
        <div className="game-card-header">
          <h2>✅ Quiz Complete!</h2>
          <p className="game-desc">{selectedQuiz.title}</p>
        </div>
        <div className="game-card-body">
          <div className="game-stats">
            <div className="game-stat">
              <div className="game-stat-label">Score</div>
              <div className="game-stat-value">{score}/{quizQuestions.length}</div>
            </div>
            <div className="game-stat">
              <div className="game-stat-label">Accuracy</div>
              <div className="game-stat-value">{percentage}%</div>
            </div>
          </div>

          <div className="quiz-results">
            <div className="quiz-result-message">{message}</div>
          </div>

          <div className="game-result-actions">
            <button className="game-btn" onClick={resetGame}>Try Another Quiz</button>
            {onShareResult && (
              <button
                className="game-share-btn"
                onClick={() => onShareResult({ game: selectedQuiz.title, score: `${score}/${quizQuestions.length}`, extra: message })}
              >
                📢 Share
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
