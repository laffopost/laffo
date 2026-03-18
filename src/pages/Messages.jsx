import { Link } from "react-router-dom";
import { useConversations } from "../hooks/useConversations";
import ChatUI from "../components/features/chat/ChatUI";
import { ChatIcon } from "../utils/icons";
import "./Messages.css";

export default function MessagesPage() {
  const chat = useConversations();

  if (!chat.currentUser) {
    return (
      <div className="messages-page">
        <div className="messages-login-prompt">
          <span className="messages-login-icon"><ChatIcon size={32} /></span>
          <h2>Direct Messages</h2>
          <p>Log in to send and receive messages</p>
          <Link to="/profile" className="messages-login-btn">
            Log in / Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-wrapper">
        <ChatUI {...chat} variant="page" />
      </div>
    </div>
  );
}
