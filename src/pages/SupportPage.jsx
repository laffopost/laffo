import "./SupportPage.css";

const PERKS = [
  { emoji: "☕", label: "Coffee tier", desc: "You're officially a laffo legend." },
  { emoji: "🍕", label: "Pizza tier", desc: "We name a meme after you. Probably." },
  { emoji: "🚀", label: "Rocket tier", desc: "Your joke gets pinned for a week." },
];

export default function SupportPage() {
  return (
    <div className="support-page">
      <div className="support-hero">
        <span className="support-hero-emoji">☕</span>
        <h1 className="support-title">Buy us a coffee</h1>
        <p className="support-subtitle">
          LAFFO is built with love (and caffeine). If it made you laugh at least once,
          consider buying us a coffee. Every cup helps keep the jokes flowing.
        </p>
        <a
          className="support-cta"
          href="https://buymeacoffee.com/laffo"
          target="_blank"
          rel="noopener noreferrer"
        >
          ☕ Buy us a coffee
        </a>
        <p className="support-note">No pressure. We'll still make you laugh either way.</p>
      </div>

      <div className="support-perks">
        {PERKS.map((p) => (
          <div key={p.label} className="support-perk">
            <span className="support-perk-emoji">{p.emoji}</span>
            <span className="support-perk-label">{p.label}</span>
            <span className="support-perk-desc">{p.desc}</span>
          </div>
        ))}
      </div>

      <div className="support-footer">
        <p>Built by humans. Powered by laughter. Fuelled by your generosity.</p>
      </div>
    </div>
  );
}
