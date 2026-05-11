import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialsFromUser(user, displayName) {
  const name = (displayName || user?.email || "").trim();
  if (!name) return "?";
  if (name.includes("@")) return name[0].toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed) {
  // Stable hue derived from email/name so each user gets the same color.
  let h = 0;
  for (const c of seed || "RINK") h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const DOCS_URL = "https://docs.rinkglobal.com";

const Icon = {
  sparkles: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.286 6.857L22 12l-6.714 2.143L13 21l-2.286-6.857L4 12l6.714-2.143L13 3z" />
    </svg>
  ),
  workspace: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
    </svg>
  ),
  help: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  docs: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  external: (
    <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  signOut: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  close: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { user, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Close mobile drawer on route change.
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Close user dropdown on outside click / Escape.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMenuOpen(false);
    const { error } = await signOut();
    if (error) {
      // Surface inline rather than alert
      console.error("Sign out failed:", error.message);
      return;
    }
    navigate("/", { replace: true });
  };

  // Public links (always visible).
  const publicLinks = [
    { to: "/#features", label: "Features", external: true },
    { to: "/#use-cases", label: "Use Cases", external: true },
    { to: DOCS_URL, label: "Docs", external: true, newTab: true, icon: Icon.docs },
    { to: "/contact", label: "Contact" },
  ];
  // Authed links — nav for signed-in users.
  const authedLinks = [
    { to: "/analytics", label: "Workspace", icon: Icon.workspace },
    { to: DOCS_URL, label: "Docs", external: true, newTab: true, icon: Icon.docs },
    { to: "/contact", label: "Help", icon: Icon.help },
  ];

  const links = user ? authedLinks : publicLinks;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 flex-none" onClick={() => setMenuOpen(false)}>
          <img src={logo} className="h-9 w-9" alt="RINK logo" />
          <div className="leading-none">
            <div className="text-lg font-bold text-white">RINK</div>
            <div className="text-[10px] uppercase tracking-widest text-blue-300/80 -mt-0.5">
              Global Services
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.to}
                href={l.to}
                target={l.newTab ? "_blank" : undefined}
                rel={l.newTab ? "noopener noreferrer" : undefined}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                {l.icon}
                {l.label}
                {l.newTab && Icon.external}
              </a>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {l.icon}
                {l.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                Sign in
              </Link>
              <Link
                to="/auth?mode=register"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white
                  bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                  shadow-lg shadow-blue-500/20 transition"
              >
                {Icon.sparkles}
                Get started
              </Link>
            </>
          ) : (
            <UserMenu
              user={user}
              displayName={displayName}
              open={userMenuOpen}
              setOpen={setUserMenuOpen}
              onSignOut={handleLogout}
              menuRef={userMenuRef}
            />
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? Icon.close : Icon.menu}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && <MobileDrawer user={user} displayName={displayName} onSignOut={handleLogout} onClose={() => setMenuOpen(false)} />}
    </header>
  );
}

// ---------------------------------------------------------------------------
// User menu (desktop)
// ---------------------------------------------------------------------------

function UserMenu({ user, displayName, open, setOpen, onSignOut, menuRef }) {
  const initials = initialsFromUser(user, displayName);
  const color = avatarColor(user?.email || displayName || "RINK");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner"
          style={{ backgroundColor: color }}
        >
          {initials}
        </span>
        <span className="hidden lg:block text-sm text-white max-w-[140px] truncate">
          {displayName || user?.email}
        </span>
        <span className="text-gray-400">{Icon.chevronDown}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl py-2 z-50 animate-[fadeIn_.12s_ease-out]"
        >
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {displayName || "Member"}
                </div>
                <div className="text-xs text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          <MenuItem to="/analytics" icon={Icon.workspace} label="Workspace" hint="Forecasting tools" />
          <MenuItem href={DOCS_URL} external icon={Icon.docs} label="Documentation" hint="Guides &amp; API reference" />
          <MenuItem to="/contact" icon={Icon.help} label="Help &amp; support" hint="Talk to the team" />

          <div className="border-t border-white/5 my-1" />

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition"
            role="menuitem"
          >
            <span className="text-red-300">{Icon.signOut}</span>
            Sign out
          </button>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  );
}

function MenuItem({ to, href, external, icon, label, hint }) {
  const body = (
    <>
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-sm text-white">
          {label}
          {external && Icon.external}
        </span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </>
  );
  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition"
      >
        {body}
      </a>
    );
  }
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition"
    >
      {body}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

function MobileDrawer({ user, displayName, onSignOut, onClose }) {
  const initials = initialsFromUser(user, displayName);
  const color = avatarColor(user?.email || displayName || "RINK");

  return (
    <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="px-4 py-4 space-y-1 max-w-7xl mx-auto">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10 mb-2">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{displayName || "Member"}</div>
                <div className="text-xs text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
            <DrawerLink to="/analytics" icon={Icon.workspace} label="Workspace" onClose={onClose} />
            <DrawerExternal href={DOCS_URL} icon={Icon.docs} label="Documentation" onClose={onClose} />
            <DrawerLink to="/contact" icon={Icon.help} label="Help & support" onClose={onClose} />
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition"
            >
              {Icon.signOut}
              Sign out
            </button>
          </>
        ) : (
          <>
            <a href="/#features" onClick={onClose} className="block px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/5">Features</a>
            <a href="/#use-cases" onClick={onClose} className="block px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/5">Use Cases</a>
            <DrawerExternal href={DOCS_URL} icon={Icon.docs} label="Documentation" onClose={onClose} />
            <DrawerLink to="/contact" icon={Icon.help} label="Contact" onClose={onClose} />
            <div className="border-t border-white/5 my-2" />
            <Link
              to="/auth"
              onClick={onClose}
              className="block px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              to="/auth?mode=register"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                shadow-lg shadow-blue-500/20"
            >
              {Icon.sparkles}
              Get started
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function DrawerLink({ to, icon, label, onClose }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
          isActive ? "bg-white/10 text-white" : "text-gray-200 hover:bg-white/5"
        }`
      }
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </NavLink>
  );
}

function DrawerExternal({ href, icon, label, onClose }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-white/5 transition"
    >
      <span className="text-gray-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {Icon.external}
    </a>
  );
}
