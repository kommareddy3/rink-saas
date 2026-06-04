import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";
import { ANALYTICS } from "../links";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCS_URL = "https://docs.rinkglobal.com";

// "What we do" mega-menu content (services + industries + engagement models)
// Top-level navigation — simple links to dedicated pages.
const NAV_LINKS = [
  { label: "Services", to: "/#services" },
  { label: "Industries", to: "/industries" },
  { label: "How we work", to: "/how-we-work" },
  { label: "Why RINK", to: "/why-rink" },
  { label: "Careers", to: "/careers" },
  { label: "Contact us", to: "/contact" },
];

const Icon = {
  menu: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  chevron: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  external: (
    <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialsFromUser(user, displayName) {
  const name = (displayName || user?.email || "").trim();
  if (!name) return "?";
  const parts = name.split(/[\s.@]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarColor(seed = "") {
  const palette = [
    "from-blue-500 to-purple-600",
    "from-emerald-500 to-cyan-600",
    "from-amber-500 to-red-500",
    "from-purple-500 to-pink-500",
    "from-rose-500 to-orange-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Same predicate ThemedShell uses — keep them in sync.
function isAppRoute(pathname) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/profile")
  );
}

export default function Navbar() {
  const { user, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);          // mobile drawer
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openMega, setOpenMega] = useState(null);           // "do" | "about" | "think" | null
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const megaRef = useRef(null);
  const dark = isAppRoute(location.pathname);

  // Theme tokens — keep all the route-aware styling in one place.
  const t = dark
    ? {
        header: "backdrop-blur-xl bg-gradient-to-b from-black/70 via-black/60 to-black/40 border-b border-white/10",
        brandText: "text-white",
        brandSub: "text-blue-300/80",
        navLink: "text-gray-200 hover:text-white hover:bg-white/5",
        navLinkActive: "text-white bg-white/5",
        navTrigger: "text-gray-200 hover:text-white hover:bg-white/5",
        navTriggerActive: "text-white bg-white/10",
        signInLink: "text-gray-200 hover:text-white hover:bg-white/5",
        megaPanel: "bg-gradient-to-b from-gray-950/95 to-black/90 border-b border-white/10",
        megaHeading: "text-blue-300",
        megaTitle: "text-white",
        megaHint: "text-gray-400",
        megaItemHover: "hover:bg-white/5",
        megaDivider: "border-white/10",
        mobileBtn: "text-gray-200 hover:text-white hover:bg-white/5",
        externalIcon: "text-blue-300",
      }
    : {
        header: "bg-white/95 backdrop-blur-xl border-b border-slate-200",
        brandText: "text-slate-900",
        brandSub: "text-blue-600/80",
        navLink: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
        navLinkActive: "text-slate-900 bg-slate-100",
        navTrigger: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
        navTriggerActive: "text-slate-900 bg-slate-100",
        signInLink: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
        megaPanel: "bg-white border-b border-slate-200",
        megaHeading: "text-blue-700",
        megaTitle: "text-slate-900",
        megaHint: "text-slate-500",
        megaItemHover: "hover:bg-slate-50",
        megaDivider: "border-slate-200",
        mobileBtn: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
        externalIcon: "text-blue-600",
      };

  // Close everything on route change.
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setOpenMega(null);
  }, [location.pathname, location.hash]);

  // Outside-click / Escape closes mega and user menus.
  useEffect(() => {
    const onClick = (e) => {
      if (megaRef.current && !megaRef.current.contains(e.target)) setOpenMega(null);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenMega(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMenuOpen(false);
    const { error } = await signOut();
    if (!error) navigate("/");
  };

  return (
    <header className={`sticky top-0 z-40 ${t.header}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand — always returns to the top of the home page */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group flex-none"
            onClick={() => {
              setOpenMega(null);
              if (location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <img src={logo} alt="RINK Global Services — home" className="h-8 w-8 rounded-lg" />
            <span className="hidden sm:flex flex-col leading-none">
              <span className={`text-base font-bold tracking-tight group-hover:opacity-90 ${t.brandText}`}>RINK</span>
              <span className={`text-[10px] uppercase tracking-[0.18em] -mt-px ${t.brandSub}`}>Global Services</span>
            </span>
          </Link>

          {/* Desktop nav — simple top-level links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {NAV_LINKS.map((l) =>
              l.to.includes("#") ? (
                <a
                  key={l.label}
                  href={l.to}
                  className={`px-3 py-2 rounded-lg font-semibold ${t.navLink}`}
                >
                  {l.label}
                </a>
              ) : (
                <NavLink
                  key={l.label}
                  to={l.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg font-semibold ${t.navLink} ${isActive ? t.navLinkActive : ""}`
                  }
                >
                  {l.label}
                </NavLink>
              )
            )}
          </nav>

          {/* User / CTA cluster */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <a
                  href={ANALYTICS.workspace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-100 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30"
                >
                  Workspace
                </a>
                <UserMenu
                  user={user}
                  displayName={displayName}
                  open={userMenuOpen}
                  setOpen={setUserMenuOpen}
                  onSignOut={handleLogout}
                  menuRef={userMenuRef}
                />
              </>
            ) : (
              <>
                <a
                  href={ANALYTICS.signIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hidden md:inline-flex px-3 py-2 rounded-lg text-sm ${t.signInLink}`}
                >
                  Sign in
                </a>
                <Link
                  to="/contact?reason=sales"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-md shadow-blue-500/20"
                >
                  Contact sales
                </Link>
              </>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={`lg:hidden p-2 rounded-lg ${t.mobileBtn}`}
            >
              {Icon.menu}
            </button>
          </div>
        </div>

      </div>

      {/* ============== MOBILE DRAWER ============== */}
      {menuOpen && (
        <MobileDrawer
          user={user}
          displayName={displayName}
          onSignOut={handleLogout}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserMenu({ user, displayName, open, setOpen, onSignOut, menuRef }) {
  const initials = initialsFromUser(user, displayName);
  const color = avatarColor(user?.id || user?.email || displayName);
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white text-xs font-bold flex items-center justify-center shadow-md shadow-blue-500/20 hover:opacity-90 transition`}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-sm font-semibold text-white truncate">{displayName || "Signed in"}</div>
            <div className="text-xs text-gray-400 truncate">{user?.email}</div>
          </div>
          <div className="py-1.5">
            <a
              href={ANALYTICS.workspace}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
            >
              Workspace
            </a>
            <a
              href={ANALYTICS.profile}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
            >
              Profile &amp; settings
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
            >
              Documentation
              {Icon.external}
            </a>
          </div>
          <div className="border-t border-white/10 py-1.5">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

function MobileDrawer({ user, displayName, onSignOut, onClose }) {
  // Render via a portal to <body> so the drawer's `fixed` positioning is
  // relative to the viewport. (The sticky header uses backdrop-blur, which
  // creates a containing block that would otherwise trap a fixed child inside
  // the ~64px header and clip the menu.)
  return createPortal(
    <div className="lg:hidden fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[88vw] max-w-sm bg-gradient-to-b from-gray-950 to-black border-l border-white/10 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <img src={logo} alt="RINK" className="h-7 w-7 rounded-md" />
            <span className="font-bold text-white">RINK</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg text-gray-300 hover:bg-white/5"
          >
            {Icon.close}
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_LINKS.map((l) =>
            l.to.includes("#") ? (
              <a
                key={l.label}
                href={l.to}
                onClick={onClose}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-white hover:bg-white/5"
              >
                {l.label}
              </a>
            ) : (
              <DrawerLink key={l.label} to={l.to} label={l.label} onClose={onClose} />
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-4 mt-2 space-y-2">
          {user ? (
            <>
              <div className="text-xs text-gray-400">{user.email}</div>
              <a
                href={ANALYTICS.workspace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm bg-blue-500/10 border border-blue-400/20 text-blue-100"
              >
                Open workspace
              </a>
              <a
                href={ANALYTICS.profile}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5"
              >
                Profile &amp; settings
              </a>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <a
                href={ANALYTICS.signIn}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5"
              >
                Sign in
              </a>
              <Link to="/contact?reason=sales" onClick={onClose} className="block text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600">
                Contact sales
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DrawerLink({ to, label, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-white hover:bg-white/5"
    >
      {label}
    </Link>
  );
}
