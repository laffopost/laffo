import { Link } from "react-router-dom";
import "./Dao.css";

const ROADMAP = [
  {
    phase: "Phase 1",
    title: "Community Launch",
    items: [
      "Token launch on Solana",
      "Community chat & social feed",
      "Mini-games arcade",
    ],
    done: true,
  },
  {
    phase: "Phase 2",
    title: "Governance Foundation",
    items: [
      "DAO smart contract deployment",
      "Proposal & voting system",
      "Treasury management",
    ],
    done: false,
  },
  {
    phase: "Phase 3",
    title: "Ecosystem Growth",
    items: [
      "NFT collection for voters",
      "Staking rewards",
      "Partnership proposals",
    ],
    done: false,
  },
  {
    phase: "Phase 4",
    title: "Full Decentralization",
    items: [
      "Multi-sig treasury",
      "On-chain governance",
      "Cross-chain expansion",
    ],
    done: false,
  },
];

const Dao = () => {
  return (
    <div className="dao-page">
      <div className="dao-hero">
        <span className="dao-badge">Coming Soon</span>
        <h1 className="dao-title">
          LaughCoin <span className="dao-highlight">DAO</span>
        </h1>
        <p className="dao-subtitle">
          Decentralized governance for the funniest community in crypto.
          <br />
          Every $LAFFO holder gets a voice. Every vote counts. 🗳️
        </p>
      </div>

      <div className="dao-features">
        <div className="dao-feature-card">
          <span className="dao-feature-icon">📜</span>
          <h3>Create Proposals</h3>
          <p>
            Submit ideas for the community to vote on — from marketing campaigns
            to new features.
          </p>
        </div>
        <div className="dao-feature-card">
          <span className="dao-feature-icon">🗳️</span>
          <h3>Vote On-Chain</h3>
          <p>
            Your $LAFFO tokens are your voting power. Fully transparent, fully
            decentralized.
          </p>
        </div>
        <div className="dao-feature-card">
          <span className="dao-feature-icon">💰</span>
          <h3>Community Treasury</h3>
          <p>
            A shared treasury managed by the community for grants, rewards, and
            growth.
          </p>
        </div>
      </div>

      <div className="dao-roadmap">
        <h2 className="dao-section-title">Roadmap</h2>
        <div className="dao-roadmap-track">
          {ROADMAP.map((phase, i) => (
            <div
              key={i}
              className={`dao-roadmap-item ${phase.done ? "done" : ""}`}
            >
              <div className="dao-roadmap-dot" />
              <div className="dao-roadmap-content">
                <span className="dao-roadmap-phase">{phase.phase}</span>
                <h4>{phase.title}</h4>
                <ul>
                  {phase.items.map((item, j) => (
                    <li key={j}>
                      {phase.done ? "✅" : "⬜"} {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dao-cta">
        <h2>Ready to shape the future of LAFFO?</h2>
        <p>Join the community and stay tuned for the DAO launch.</p>
        <div className="dao-cta-buttons">
          <Link to="/buy" className="dao-btn-primary">
            Get $LAFFO
          </Link>
          <Link to="/" className="dao-btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dao;
