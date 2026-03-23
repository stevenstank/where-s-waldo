import { Link } from "react-router-dom";

function Navbar({ user, onOpenLogin, onOpenSignUp, onLogout }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid #ddd",
      }}
    >
      <nav style={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#111", fontWeight: 700 }}>
          Where is Waldo
        </Link>
        <Link to="/leaderboard" style={{ textDecoration: "none", color: "#444" }}>
          Leaderboard
        </Link>
      </nav>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ color: "#333" }}>Signed in as {user.username}</span>
            <button type="button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <span style={{ color: "#666" }}>Guest Mode</span>
            <button type="button" onClick={onOpenLogin}>
              Login
            </button>
            <button type="button" onClick={onOpenSignUp}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
