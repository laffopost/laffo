import { Link } from "react-router-dom";
import laughLogo from "../../assets/laugh.png";
import { SOCIAL_LINKS } from "../../constants/token";
import { ChatIcon } from "../../utils/icons";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section footer-brand">
          <div className="footer-brand-row">
            <img src={laughLogo} alt="LaughCoin" className="footer-logo" />
            <h3>LAFFO</h3>
          </div>
          <p className="footer-tagline">
            The community platform that makes you smile while you HODL!
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
              <ChatIcon size={18} />
            </a>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <ChatIcon size={18} />
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Explore</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/jokes">Jokes</Link></li>
            <li><Link to="/memes">Memes</Link></li>
            <li><Link to="/games">Games</Link></li>
            <li><Link to="/sports">Sports</Link></li>
            <li><Link to="/trade">Trade</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Social</h4>
          <ul>
            <li><Link to="/messages">Messages</Link></li>
            <li><Link to="/notifications">Notifications</Link></li>
            <li><Link to="/memes">Meme Generator</Link></li>
            <li><Link to="/support">Support Us ☕</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li>
              <a href="https://solscan.io" target="_blank" rel="noopener noreferrer">
                Solscan
              </a>
            </li>
            <li>
              <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer">
                Dexscreener
              </a>
            </li>
            <li>
              <a href="https://raydium.io" target="_blank" rel="noopener noreferrer">
                Raydium
              </a>
            </li>
            <li>
              <a href="https://jup.ag" target="_blank" rel="noopener noreferrer">
                Jupiter
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {currentYear} LAFFO &middot; Built on Solana
        </p>
        <p className="footer-disclaimer">
          Cryptocurrency investments carry risk. Always DYOR. Not financial advice.
        </p>
      </div>
    </footer>
  );
}
