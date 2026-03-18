import { useState } from "react";
import { TOKEN_CONTRACT } from "../constants/token";
import toast from "react-hot-toast";
import { CheckIcon } from "../utils/icons";
import "./Sponsors.css";

const SPONSOR_TIERS = [
  {
    name: "🥇 Diamond",
    minSol: 10,
    color: "#b9f2ff",
    glow: "rgba(185, 242, 255, 0.4)",
    perks: [
      "Logo on homepage banner",
      "Dedicated sponsor spotlight post",
      "Custom role in Discord & Telegram",
      "Direct access to dev team",
      "Priority feature requests",
    ],
  },
  {
    name: "🥈 Gold",
    minSol: 5,
    color: "#ffd700",
    glow: "rgba(255, 215, 0, 0.35)",
    perks: [
      "Logo in sponsors section",
      "Shoutout on social media",
      "Custom Discord role",
      "Early access to new features",
    ],
  },
  {
    name: "🥉 Silver",
    minSol: 2,
    color: "#c0c0c0",
    glow: "rgba(192, 192, 192, 0.3)",
    perks: [
      "Name listed on sponsors page",
      "Sponsor badge on profile",
      "Access to sponsors-only chat",
    ],
  },
  {
    name: "💜 Supporter",
    minSol: 0.5,
    color: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.3)",
    perks: [
      "Name on sponsors page",
      "Supporter badge on profile",
      "Our eternal gratitude 💜",
    ],
  },
];

const SPONSOR_WALLET = "HLwEbTsxQDwSPjLMm5bcrQhQZBB9z7cgvZSjsHhEPkz";

const CURRENT_SPONSORS = [
  {
    name: "mi1x2",
    tier: "Diamond",
    avatar: null,
    message: "Laffo to the moon! 🚀😂",
  },
];

export default function Sponsors() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SPONSOR_WALLET);
      setCopied(true);
      toast.success("Wallet address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="sponsors-page">
      {/* Hero */}
      <section className="sponsors-hero">
        <h1>
          <span className="sponsors-emoji">🤝</span> Become a Sponsor
        </h1>
        <p className="sponsors-subtitle">
          Help us grow the $LAFFO community and get awesome perks in return!
          Every contribution goes directly to development, marketing, and
          community events.
        </p>
      </section>

      {/* Wallet */}
      <section className="sponsors-wallet-section">
        <h2>💳 Sponsor Wallet</h2>
        <p className="sponsors-wallet-desc">
          Send SOL to the wallet below to become a sponsor. After sending, reach
          out on{" "}
          <a
            href="https://t.me/laughcoinlaffo"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram
          </a>{" "}
          or{" "}
          <a
            href="https://x.com/laughcoinlaffo"
            target="_blank"
            rel="noopener noreferrer"
          >
            X/Twitter
          </a>{" "}
          to claim your tier and perks!
        </p>
        <div className="sponsors-wallet-card">
          <span className="sponsors-wallet-label">SOL Wallet Address</span>
          <div className="sponsors-wallet-address-row">
            <code className="sponsors-wallet-address">{SPONSOR_WALLET}</code>
            <button
              className="sponsors-copy-btn"
              onClick={handleCopy}
              title="Copy wallet address"
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>
        <div className="sponsors-token-note">
          <span>🪙</span>
          <p>
            Or buy $LAFFO directly:{" "}
            <code className="sponsors-ca">{TOKEN_CONTRACT}</code>
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="sponsors-tiers-section">
        <h2>🏆 Sponsor Tiers</h2>
        <div className="sponsors-tiers-grid">
          {SPONSOR_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="sponsors-tier-card"
              style={{
                "--tier-color": tier.color,
                "--tier-glow": tier.glow,
              }}
            >
              <h3 className="sponsors-tier-name">{tier.name}</h3>
              <div className="sponsors-tier-min">{tier.minSol}+ SOL</div>
              <ul className="sponsors-tier-perks">
                {tier.perks.map((perk, i) => (
                  <li key={i}>
                    <span className="sponsors-perk-check"><CheckIcon size={16} style={{display: 'inline'}} /></span> {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Current sponsors */}
      <section className="sponsors-current-section">
        <h2>⭐ Our Sponsors</h2>
        {CURRENT_SPONSORS.length === 0 ? (
          <p className="sponsors-none">Be the first sponsor! 🚀</p>
        ) : (
          <div className="sponsors-current-list">
            {CURRENT_SPONSORS.map((s, i) => (
              <div key={i} className="sponsors-current-card">
                <div className="sponsors-current-avatar">
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.name} />
                  ) : (
                    <span>{s.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="sponsors-current-info">
                  <span className="sponsors-current-name">{s.name}</span>
                  <span className="sponsors-current-tier">{s.tier}</span>
                </div>
                {s.message && (
                  <p className="sponsors-current-msg">"{s.message}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="sponsors-how-section">
        <h2>📋 How It Works</h2>
        <div className="sponsors-steps">
          <div className="sponsors-step">
            <div className="sponsors-step-num">1</div>
            <h4>Choose Your Tier</h4>
            <p>Pick a sponsorship level that works for you</p>
          </div>
          <div className="sponsors-step">
            <div className="sponsors-step-num">2</div>
            <h4>Send SOL</h4>
            <p>Transfer SOL to the sponsor wallet above</p>
          </div>
          <div className="sponsors-step">
            <div className="sponsors-step-num">3</div>
            <h4>Reach Out</h4>
            <p>Message us on Telegram or X with your TX hash</p>
          </div>
          <div className="sponsors-step">
            <div className="sponsors-step-num">4</div>
            <h4>Get Perks!</h4>
            <p>We'll activate your tier and all its benefits</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sponsors-faq-section">
        <h2>❓ FAQ</h2>
        <div className="sponsors-faq-list">
          <details className="sponsors-faq-item">
            <summary>Is this a one-time payment?</summary>
            <p>
              Yes! One-time contribution gets you lifetime perks at your tier
              level. We may introduce monthly tiers in the future with extra
              benefits.
            </p>
          </details>
          <details className="sponsors-faq-item">
            <summary>Can I upgrade my tier later?</summary>
            <p>
              Absolutely! Just send the difference to reach the next tier and
              let us know.
            </p>
          </details>
          <details className="sponsors-faq-item">
            <summary>Where do the funds go?</summary>
            <p>
              100% of sponsor funds go to: development costs, marketing &
              promotions, community events & giveaways, and server/hosting
              costs.
            </p>
          </details>
          <details className="sponsors-faq-item">
            <summary>Can I sponsor anonymously?</summary>
            <p>
              Yes! Just let us know you'd like to remain anonymous and we'll
              list you as "Anonymous Sponsor" or not at all — your choice.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
