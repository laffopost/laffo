import "./PostModal.css";

function formatDate(createdAt) {
  if (!createdAt) return "-";
  let dateObj = null;
  if (createdAt.toDate) {
    dateObj = createdAt.toDate();
  } else if (createdAt.seconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === "string" || typeof createdAt === "number") {
    dateObj = new Date(createdAt);
  }
  if (!dateObj || isNaN(dateObj.getTime())) return "-";
  return dateObj
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", " at");
}

export default function PostModalInfoSection({ image }) {
  const handleAuthorClick = () => {
    const username = image.author || "anonymous";
    window.location.href = `/profile/${username
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };

  if (image.type === "user-profile" && image.userProfileData) {
    const profile = image.userProfileData;
    return (
      <div className="image-modal-info">
        <h2>@{profile.username}</h2>
        <div className="image-modal-desc-row">
          <div className="image-modal-desc">
            {profile.status || "No bio yet."}
          </div>
        </div>
        <div className="profile-modal-info">
          <div>
            <b>Email:</b> {profile.email}
          </div>
          <div>
            <b>Location:</b> {profile.location || "N/A"}
          </div>
          <div>
            <b>Birthday:</b> {profile.birthday || "N/A"}
          </div>
          <div>
            <b>Favorite Song:</b> {profile.favoriteSong || "N/A"}
          </div>
          <div>
            <b>Solana:</b> {profile.solana || "N/A"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-modal-info">
      <h2>{image.title}</h2>
      <div className="image-modal-desc-row">
        <div className="image-modal-desc">
          {image.description || "No description provided."}
        </div>
        <div
          className="modal-author-overlay"
          onClick={handleAuthorClick}
          title="View profile"
        >
          {image.authorAvatar && (
            <img
              src={image.authorAvatar}
              alt="avatar"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #8b5cf6",
                background: "#23234a",
                marginRight: 6,
                flexShrink: 0,
              }}
            />
          )}
          <span className="author-name clickable-author-modal">
            {image.author || "Anonymous"}
          </span>
          {image.badge && <span className="stat-badge">{image.badge}</span>}
        </div>
      </div>
      <div className="image-modal-timestamp">
        📅 {formatDate(image.createdAt)}
      </div>
      {(image.socials ||
        image.webpage ||
        (image.extraLinks && image.extraLinks.length > 0)) && (
        <div className="image-modal-links">
          <h4>Links</h4>
          <ul>
            {image.socials && (
              <li>
                <a
                  href={
                    image.socials.startsWith("http")
                      ? image.socials
                      : `https://twitter.com/${image.socials.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {image.socials}
                </a>
              </li>
            )}
            {image.webpage && (
              <li>
                <a
                  href={image.webpage}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {image.webpage}
                </a>
              </li>
            )}
            {Array.isArray(image.extraLinks) &&
              image.extraLinks.map((link, idx) => (
                <li key={idx}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    {link}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
