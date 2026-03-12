import "./CreatePostButton.css";

export default function CreatePostButton({ onClick }) {
  return (
    <button className="create-post-btn" onClick={onClick}>
      <span className="create-post-icon">➕</span>
      <span className="create-post-text">Add Post</span>
    </button>
  );
}
