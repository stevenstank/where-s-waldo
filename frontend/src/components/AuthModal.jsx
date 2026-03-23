import { useState } from "react";
import "./AuthModal.css";

function AuthModal({ mode, isOpen, onClose, onLogin, onSignUp }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const isLoginMode = mode === "login";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLoginMode) {
        await onLogin({ username: username.trim(), password });
      } else {
        await onSignUp({ username: username.trim(), password });
      }
      setUsername("");
      setPassword("");
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal card" onClick={(event) => event.stopPropagation()}>
        <h2 className="auth-modal__title">{isLoginMode ? "Login" : "Sign Up"}</h2>

        <form onSubmit={handleSubmit} className="auth-modal__form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="auth-modal__input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="auth-modal__input"
          />

          {error ? <p className="auth-modal__error">{error}</p> : null}

          <div className="auth-modal__actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isLoginMode ? "Login" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
