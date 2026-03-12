import { Link } from "react-router-dom";
import laughLogo from "../../assets/laugh.png";
import solanaLogo from "../../assets/solanaLogo.png";
import { SOCIAL_LINKS } from "../../constants/token";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section footer-brand">
          <img src={laughLogo} alt="LaughCoin" className="footer-logo" />
          <h3>LAFFO</h3>
          <p className="footer-tagline">
            The meme coin that makes you smile while you HODL! 😂💎
          </p>
          <div className="footer-social">
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
            >
              𝕏
            </a>
            <a
              href={SOCIAL_LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
            >
              💬
            </a>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              💭
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/buy">Buy LAFFO</Link>
            </li>
            <li>
              <Link to="/chart">Chart</Link>
            </li>
            <li>
              <Link to="/dao">DAO</Link>
            </li>
            <li>
              <Link to="/messages">Messages</Link>
            </li>
            <li>
              <Link to="/sponsors">Sponsors</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li>
              <a
                href="https://solscan.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Solscan
              </a>
            </li>
            <li>
              <a
                href="https://dexscreener.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dexscreener
              </a>
            </li>
            <li>
              <a
                href="https://raydium.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Raydium
              </a>
            </li>
            <li>
              <a
                href="https://jup.ag"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jupiter
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Community</h4>
          <ul>
            <li>
              <a href="#whitepaper">Whitepaper</a>
            </li>
            <li>
              <a href="#tokenomics">Tokenomics</a>
            </li>
            <li>
              <a href="#roadmap">Roadmap</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Stats</h4>
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="stat-label">Total Supply</span>
              <span className="stat-value">1B LAUGH</span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Holders</span>
              <span className="stat-value">12,012</span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Network</span>
              <span className="stat-value">
                <img
                  src={solanaLogo}
                  alt="Solana"
                  className="solana-logo"
                  style={{
                    width: "auto",
                    height: 16,
                    verticalAlign: "middle",
                    marginRight: 4,
                    marginBottom: 2,
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          © {currentYear} LAFFO. All rights reserved. Built with 😂 on Solana.
        </p>
        <p className="footer-disclaimer">
          Cryptocurrency investments carry risk. Always DYOR. Not financial
          advice.
        </p>
      </div>
    </footer>
  );
}
