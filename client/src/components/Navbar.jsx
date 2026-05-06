import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// =========================
// Navbar.jsx
// =========================
import logo from "../assets/rink-logo.png";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, displayName, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      alert(error.message || "Logout failed");
      return;
    }
    setMenuOpen(false);
    navigate("/auth");
  };

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <img src={logo} className="h-10" alt="RINK logo" />
            <span className="font-bold text-xl">RINK</span>
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-black/20 p-2 text-white md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>

        <nav className={`${menuOpen ? "block" : "hidden"} mt-4 flex flex-col gap-3 text-sm text-white md:mt-0 md:flex md:flex-row md:items-center md:gap-6`}>
          <Link to="/" className="hover:text-blue-400" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          {!user && (
            <Link to="/auth" className="hover:text-blue-400" onClick={() => setMenuOpen(false)}>
              Auth
            </Link>
          )}
          <Link to="/analytics" className="hover:text-blue-400" onClick={() => setMenuOpen(false)}>
            Analytics
          </Link>
          <Link to="/contact" className="hover:text-blue-400" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
          {user && (
            <>
              <span className="hidden md:inline text-sm text-gray-200">Hi, {displayName}</span>
              <button
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
