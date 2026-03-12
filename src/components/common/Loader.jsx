export default function Loader({ text = "Loading..." }) {
  return (
    <div className="gallery-initial-loading">
      <div className="gallery-loader-spinner"></div>
      <p className="gallery-loader-text">{text}</p>
    </div>
  );
}
