import { Component } from "react";

import logger from "../../utils/logger";
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            minHeight: "200px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "16px",
            color: "white",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>💥</span>
          <h3 style={{ margin: 0, color: "#f87171" }}>
            {this.props.name
              ? `${this.props.name} crashed`
              : "Something went wrong"}
          </h3>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.9rem",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              border: "none",
              color: "white",
              padding: "0.6rem 1.5rem",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
