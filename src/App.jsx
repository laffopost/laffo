import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Header, Footer } from "./components/layout";
import {
  ErrorBoundary,
  Loader,
  AnimatedDotsBackground,
} from "./components/common";
import { ImageProvider } from "./context/PostContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { DirectMessages } from "./components/features/chat";
import useGlobalClickSound from "./hooks/useGlobalClickSound";
import "./App.css";

const MusicPlayer = lazy(() =>
  import("./components/features/music").then((m) => ({
    default: m.MusicPlayer,
  })),
);

// Lazy load pages to reduce initial bundle
const Home = lazy(() => import("./pages/Home"));
const Sports = lazy(() => import("./pages/Sports"));
const Stocks = lazy(() => import("./pages/Stocks"));
const Weather = lazy(() => import("./pages/Weather"));
const Trade = lazy(() => import("./pages/Trade"));
const Profile = lazy(() => import("./components/profile/Profile"));
const ProfilePage = lazy(() => import("./components/profile/ProfilePage"));
const Sponsors = lazy(() => import("./pages/Sponsors"));
const MessagesPage = lazy(() => import("./pages/Messages"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const GamesPage = lazy(() => import("./components/games/GamesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback
const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "50vh",
      color: "#8b5cf6",
      fontSize: "1.2rem",
    }}
  >
    <Loader text="Loading..." />
  </div>
);

function AppRoutes() {
  const location = useLocation();
  const state = location.state;

  return (
    <>
      <Routes location={state?.background || location}>
        <Route
          path="/"
          element={
            <ErrorBoundary name="Home">
              <Home />
            </ErrorBoundary>
          }
        />
        <Route
          path="/sports"
          element={
            <ErrorBoundary name="Sports">
              <Sports />
            </ErrorBoundary>
          }
        />
        <Route
          path="/stocks"
          element={
            <ErrorBoundary name="Stocks">
              <Stocks />
            </ErrorBoundary>
          }
        />
        <Route
          path="/weather"
          element={
            <ErrorBoundary name="Weather">
              <Weather />
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <ErrorBoundary name="Profile">
              <Profile />
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ErrorBoundary name="Profile">
              <ProfilePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/trade"
          element={
            <ErrorBoundary name="Trade">
              <Trade />
            </ErrorBoundary>
          }
        />
        <Route
          path="/sponsors"
          element={
            <ErrorBoundary name="Sponsors">
              <Sponsors />
            </ErrorBoundary>
          }
        />
        <Route
          path="/messages"
          element={
            <ErrorBoundary name="Messages">
              <MessagesPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/notifications"
          element={
            <ErrorBoundary name="Notifications">
              <NotificationsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/image/:id"
          element={
            <ErrorBoundary name="Home">
              <Home />
            </ErrorBoundary>
          }
        />
        <Route
          path="/games"
          element={
            <ErrorBoundary name="Games">
              <GamesPage />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  useGlobalClickSound();

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ImageProvider>
            <Router>
              <div className="App">
                <a href="#main-content" className="skip-to-content">
                  Skip to content
                </a>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: "#2a2a3a",
                      color: "#fff",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: "12px",
                      fontSize: "0.9rem",
                    },
                    success: {
                      iconTheme: { primary: "#10b981", secondary: "#fff" },
                    },
                    error: {
                      iconTheme: { primary: "#ef4444", secondary: "#fff" },
                    },
                  }}
                />
                <AnimatedDotsBackground />
                <Header />
                <DirectMessages />
                <Suspense fallback={null}>
                  <MusicPlayer />
                </Suspense>
                <main id="main-content" className="main-container">
                  <Suspense fallback={<LoadingFallback />}>
                    <AppRoutes />
                  </Suspense>
                </main>
                <Footer />
              </div>
            </Router>
          </ImageProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
