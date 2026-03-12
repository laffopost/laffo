import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

/**
 * Hook that provides an auth gate for interactive actions.
 *
 * Usage:
 *   const { requireAuth, isLoggedIn } = useRequireAuth();
 *
 *   const handleLike = () => {
 *     if (!requireAuth("like a post")) return;
 *     // ... proceed with like
 *   };
 *
 * If the user is not logged in (anonymous), a toast is shown
 * prompting them to log in, and the function returns false.
 */
export default function useRequireAuth() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = firebaseUser && !firebaseUser.isAnonymous;

  const requireAuth = useCallback(
    (actionLabel = "do this") => {
      if (isLoggedIn) return true;

      toast(`Log in to ${actionLabel}`, {
        icon: "🔒",
        style: {
          background: "#23234a",
          color: "#fff",
          border: "1px solid #8b5cf6",
        },
        duration: 3000,
      });

      // Navigate to profile/login page after a short delay
      setTimeout(() => navigate("/profile"), 400);

      return false;
    },
    [isLoggedIn, navigate],
  );

  return { requireAuth, isLoggedIn };
}
