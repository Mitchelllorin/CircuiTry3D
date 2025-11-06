import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/unified-nav.css";

export default function UnifiedNav() {
  const { currentUser } = useAuth();

  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(" ")
        .map((segment) => segment.trim()[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  return (
    <nav className="unified-nav">
      <Link to="/" className="unified-nav-brand">
        Circui<span>Try</span>3D
      </Link>
      <div className="unified-nav-links">
        <Link to="/app" className="unified-nav-link">Workspace</Link>
        <Link to="/pricing" className="unified-nav-link">Pricing</Link>
        <Link to="/community" className="unified-nav-link">Community</Link>
        <Link to="/account" className="unified-nav-link unified-nav-account">
          {currentUser ? (
            <>
              <span
                className="unified-nav-avatar"
                aria-hidden="true"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {initials ?? currentUser.displayName.slice(0, 2).toUpperCase()}
              </span>
              <span className="unified-nav-account-label">{currentUser.displayName}</span>
            </>
          ) : (
            <span className="unified-nav-account-label">Sign In</span>
          )}
        </Link>
      </div>
    </nav>
  );
}
