import { useState } from "react";

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>{isLoginMode ? "Login" : "Sign Up"}</h2>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isLoginMode ? "Login" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
