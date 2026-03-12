import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <span style={{ fontSize: "5rem", marginBottom: "1rem" }}>😂</span>
      <h1
        style={{
          fontSize: "3rem",
          fontWeight: 800,
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem",
        }}
      >
        404
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "1.15rem",
          marginBottom: "2rem",
          maxWidth: 400,
        }}
      >
        This page got rugged! Nothing to see here.
      </p>
      <Link
        to="/"
        style={{
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          color: "#fff",
          textDecoration: "none",
          padding: "0.7rem 2rem",
          borderRadius: 999,
          fontWeight: 600,
          fontSize: "1rem",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        Take me home 🏠
      </Link>
    </div>
  );
}
