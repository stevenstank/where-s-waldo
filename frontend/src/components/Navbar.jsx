import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar({ user, onOpenLogin, onOpenSignUp, onLogout }) {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <nav className="top-nav__left">
          <Link to="/" className="top-nav__logo">
            Waldo Hunt
          </Link>
          <Link to="/leaderboard" className="top-nav__link">
            Leaderboard
          </Link>
        </nav>

        <div className="top-nav__right">
          {user ? (
            <>
              <span className="top-nav__user">Signed in as {user.username}</span>
              <button type="button" className="button-secondary" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <span className="top-nav__guest">Guest Mode</span>
              <button type="button" className="button-secondary" onClick={onOpenLogin}>
                Login
              </button>
              <button type="button" className="button-primary" onClick={onOpenSignUp}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
