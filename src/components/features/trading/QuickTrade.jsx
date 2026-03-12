import { useState } from "react";
import raydiumLogo from "../../../assets/radyium.jpg";
import pumpLogo from "../../../assets/pump.svg";
import jupiterLogo from "../../../assets/jupiter.png";
import dexscreenerLogo from "../../../assets/dex.png";
import { TOKEN_CONTRACT } from "../../../constants/token";
import "./QuickTrade.css";

export default function QuickTrade({
  title = "Quick Trade",
  showSteps = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(TOKEN_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    {
      name: "Raydium",
      logo: raydiumLogo,
      url: `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${TOKEN_CONTRACT}`,
      description: "Trade on Raydium DEX",
    },
    {
      name: "pump.fun",
      logo: pumpLogo,
      url: `https://pump.fun/${TOKEN_CONTRACT}`,
      description: "Launch & trade meme coins",
    },
    {
      name: "Jupiter",
      logo: jupiterLogo,
      url: `https://jup.ag/swap/SOL-${TOKEN_CONTRACT}`,
      description: "Best price aggregator",
    },
    {
      name: "Dexscreener",
      logo: dexscreenerLogo,
      url: `https://dexscreener.com/solana/${TOKEN_CONTRACT}`,
      description: "View charts & analytics",
    },
  ];

  return (
    <div className="quick-trade-section">
      <h2 className="quick-trade-title">{title}</h2>

      <div className="contract-section">
        <h3>Contract Address</h3>
        <div className="contract-box">
          <code className="contract-address">{TOKEN_CONTRACT}</code>
          <button
            className="copy-btn"
            onClick={handleCopyAddress}
            title="Copy to clipboard"
          >
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>

      <div className="platforms-grid">
        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-card"
          >
            <img
              src={platform.logo}
              alt={platform.name}
              className="platform-logo"
            />
            <h3 className="platform-name">{platform.name}</h3>
            <p className="platform-description">{platform.description}</p>
            <span className="platform-cta">Trade Now →</span>
          </a>
        ))}
      </div>

      {showSteps && (
        <div className="buy-steps-section">
          <h3>How to Buy</h3>
          <ol className="buy-steps">
            <li>Copy the contract address above</li>
            <li>Choose your preferred DEX platform</li>
            <li>Connect your Solana wallet</li>
            <li>Paste the contract address and swap SOL for LAFFO</li>
            <li>HODL and laugh! 😂</li>
          </ol>
        </div>
      )}
    </div>
  );
}
