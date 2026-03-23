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
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
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
    if (!result?.token) {
      throw new Error("Login failed");
    }

    setAuthToken(result.token);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleSignUp = async ({ username, password }) => {
    await register({ username, password });
    await handleLogin({ username, password });
  };

  const handleLogout = () => {
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
