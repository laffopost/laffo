import "./StatusRenderer.css";

export default function StatusRenderer({
  status,
  bgColor,
  textColor,
  className = "",
}) {
  return (
    <div
      className={`status-renderer ${className}`}
      style={{
        backgroundColor: bgColor || "#ffffff",
        color: textColor || "#000000",
      }}
    >
      <p className="status-renderer-text">{status}</p>
    </div>
  );
}
