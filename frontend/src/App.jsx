import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AuthModal from "./components/AuthModal";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import {
  getAuthToken,
  getCurrentUser,
  login,
  logout,
  register,
  setAuthToken,
} from "./services/api";

function ProtectedRoute({ isAuthenticated, onRequireAuth, children }) {
  if (!isAuthenticated) {
    onRequireAuth();
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          // getCurrentUser will trigger refresh flow if refresh cookie is still valid.
        }
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setAuthToken("");
        setUser(null);
      }
    };

    bootstrapAuth();
  }, []);

  const openLogin = () => {
    setAuthMode("login");
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleLogin = async ({ username, password }) => {
    const result = await login({ username, password });
    if (!result?.accessToken) {
      throw new Error("Login failed");
    }

    setAuthToken(result.accessToken);
    setUser(result.user || null);
  };

  const handleSignUp = async ({ username, password }) => {
    const result = await register({ username, password });
    if (!result?.accessToken) {
      throw new Error("Sign up failed");
    }

    setAuthToken(result.accessToken);
    setUser(result.user || null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Clear local state even if remote logout fails.
    }
    setAuthToken("");
    setUser(null);
    navigate("/");
  };

  const handleRequireAuth = () => {
    setAuthMode("login");
    setIsAuthModalOpen(true);
  };

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onOpenLogin={openLogin}
        onOpenSignUp={openSignUp}
        onLogout={handleLogout}
      />

      <div className="app-main">
        <Routes>
          <Route path="/" element={<Home user={user} onRequireAuth={handleRequireAuth} />} />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute isAuthenticated={Boolean(user)} onRequireAuth={handleRequireAuth}>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      <footer className="app-footer">
        <p>
          made with ❤️ by{" "}
          <a
            href="https://github.com/stevenstank"
            target="_blank"
            rel="noreferrer"
          >
            stevenstank
          </a>
        </p>
      </footer>

      <AuthModal
        mode={authMode}
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />
    </div>
  );
}

export default App;
