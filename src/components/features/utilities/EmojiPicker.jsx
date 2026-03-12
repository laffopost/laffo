import "./EmojiPicker.css";

const EMOJIS = [
  // Most used reactions from the community
  "😂", // Laugh - most popular
  "🚀", // Rocket/To the moon
  "💎", // Diamond hands
  "🔥", // Fire/Hot
  "🙌", // Celebration/Hands up
  "💰", // Money
  "💪", // Strong/Power
  "🌙", // Moon
  "📈", // Chart up/Bullish
  "🐋", // Whale
  "👍", // Thumbs up
  "❤️", // Heart/Love
  "🤩", // Star eyes/Excited
  "😱", // Shocked/FOMO
  "🎯", // Target/Accurate
];

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="emoji-picker-overlay" onClick={onClose}>
      <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <span>Choose an emoji</span>
          <button onClick={onClose} className="emoji-picker-close">
            ×
          </button>
        </div>
        <div className="emoji-grid">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="emoji-button"
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
