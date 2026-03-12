import toast from "react-hot-toast";
import "./ShareMenu.css";

export default function ShareMenu({ shareImage, onClose }) {
  if (!shareImage) return null;

  const shareToSocial = (platform) => {
    const text = `Check out this hilarious ${shareImage.title} on LaughCoin!`;
    const url = `${window.location.origin}/image/${shareImage.id}`;
    const links = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text,
      )}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(
        url,
      )}&text=${encodeURIComponent(text)}`,
      discord: `https://discord.com/channels/@me?message=${encodeURIComponent(
        `${text} ${url}`,
      )}`,
      reddit: `https://reddit.com/submit?url=${encodeURIComponent(
        url,
      )}&title=${encodeURIComponent(text)}`,
    };
    if (links[platform]) {
      window.open(links[platform], "_blank");
    }
    onClose();
  };

  const copyLink = () => {
    const link = `${window.location.origin}/image/${shareImage.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
    onClose();
  };

  return (
    <div className="gallery-share-menu-backdrop" onClick={onClose}>
      <div className="gallery-share-menu" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => shareToSocial("twitter")}
          className="share-option"
        >
          <span>𝕏</span> Twitter
        </button>
        <button
          onClick={() => shareToSocial("telegram")}
          className="share-option"
        >
          <span>💬</span> Telegram
        </button>
        <button
          onClick={() => shareToSocial("discord")}
          className="share-option"
        >
          <span>💭</span> Discord
        </button>
        <button
          onClick={() => shareToSocial("reddit")}
          className="share-option"
        >
          <span>🔗</span> Reddit
        </button>
        <button onClick={copyLink} className="share-option">
          <span>📋</span> Copy Link
        </button>
        <button onClick={onClose} className="share-option close">
          Close
        </button>
      </div>
    </div>
  );
}
