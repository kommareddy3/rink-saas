import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCS_URL = "https://docs.rinkglobal.com";

// "What we do" mega-menu content (services + industries + engagement models)
const WHAT_WE_DO = {
  Services: [
    { label: "Cloud Migrations", to: "/#services", hint: "AWS · Azure · GCP" },
    { label: "IT Infrastructure", to: "/#services", hint: "Networks · hybrid · virtualisation" },
    { label: "Cybersecurity", to: "/#services", hint: "Zero-trust · IAM · SOC" },
    { label: "Managed Services", to: "/#services", hint: "24×7 ops & support" },
    { label: "Data Analytics & AI", to: "/analytics", hint: "Our own SaaS — RINK Data Analytics", badge: "Product" },
    { label: "IT Staff Augmentation", to: "/#how-we-engage", hint: "C2C and W2 talent" },
  ],
  Industries: [
    { label: "Financial Services", to: "/#use-cases", hint: "Banking · capital markets · insurance" },
    { label: "Healthcare & Life Sciences", to: "/#use-cases", hint: "HIPAA · HL7 · payer–provider" },
    { label: "Retail, Logistics & Supply Chain", to: "/#use-cases", hint: "Forecasting · routing · ops" },
    { label: "Energy, Utilities & Public Sector", to: "/#use-cases", hint: "OT/IT · NIST CSF" },
  ],
  "Engagement Models": [
    { label: "For Vendors (C2C)", to: "/#how-we-engage", hint: "Pre-vetted Corp-to-Corp consultants" },
    { label: "For End Clients", to: "/#how-we-engage", hint: "Projects · W2 placements · managed" },
    { label: "Talk to our team", to: "/contact?reason=sales", hint: "Request a consultation" },
  ],
};

// "About RINK" mega-menu content
const ABOUT_RINK = {
  Company: [
    { label: "About us", to: "/about" },
    { label: "Security & data protection", to: "/security" },
    { label: "Privacy policy", to: "/privacy" },
    { label: "Terms of service", to: "/terms" },
    { label: "Data processing addendum", to: "/dpa" },
    { label: "Cookies", to: "/cookies" },
  ],
  Updates: [
    { label: "Changelog", to: "/changelog" },
    { label: "Status", href: "https://status.rinkglobal.com", external: true },
  ],
};

// "What we think" — insights / docs / writing
const WHAT_WE_THINK = [
  { label: "Documentation", href: DOCS_URL, external: true, hint: "Product + API docs" },
  { label: "Changelog", to: "/changelog", hint: "What's shipped" },
  { label: "Security posture", to: "/security", hint: "How we protect your data" },
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

export default function Navbar() {
  const { user, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);          // mobile drawer
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openMega, setOpenMega] = useState(null);           // "do" | "about" | "think" | null
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const megaRef = useRef(null);

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
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-b from-black/70 via-black/60 to-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group flex-none">
            <img src={logo} alt="RINK" className="h-8 w-8 rounded-lg" />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="text-base font-bold text-white tracking-tight group-hover:opacity-90">RINK</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-blue-300/80 -mt-px">Global Services</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav ref={megaRef} className="hidden lg:flex items-center gap-1 text-sm">
            {/* What we do — mega menu */}
            <NavTrigger
              label="What we do"
              active={openMega === "do"}
              onToggle={() => setOpenMega(openMega === "do" ? null : "do")}
            />
            {/* What we think — popover */}
            <NavTrigger
              label="What we think"
              active={openMega === "think"}
              onToggle={() => setOpenMega(openMega === "think" ? null : "think")}
            />
            {/* Careers — direct link */}
            <NavLink
              to="/careers"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-gray-200 hover:text-white hover:bg-white/5 ${isActive ? "text-white bg-white/5" : ""}`
              }
              onClick={() => setOpenMega(null)}
            >
              Careers
            </NavLink>
            {/* Contact us — direct link */}
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-gray-200 hover:text-white hover:bg-white/5 ${isActive ? "text-white bg-white/5" : ""}`
              }
              onClick={() => setOpenMega(null)}
            >
              Contact us
            </NavLink>
            {/* About RINK — mega menu */}
            <NavTrigger
              label="About RINK"
              active={openMega === "about"}
              onToggle={() => setOpenMega(openMega === "about" ? null : "about")}
            />
          </nav>

          {/* User / CTA cluster */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/analytics"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-100 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30"
                >
                  Workspace
                </Link>
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
                <Link
                  to="/auth?mode=login"
                  className="hidden md:inline-flex px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-white/5"
                >
                  Sign in
                </Link>
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
              className="lg:hidden p-2 rounded-lg text-gray-200 hover:text-white hover:bg-white/5"
            >
              {Icon.menu}
            </button>
          </div>
        </div>

        {/* ============== MEGA MENU PANELS (desktop) ============== */}
        {openMega === "do" && (
          <MegaPanel onClose={() => setOpenMega(null)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6">
              {Object.entries(WHAT_WE_DO).map(([heading, items]) => (
                <MegaColumn key={heading} heading={heading} items={items} />
              ))}
            </div>
            <MegaFooter
              text="See how it all comes together"
              cta={{ label: "Explore services", to: "/#services" }}
            />
          </MegaPanel>
        )}

        {openMega === "think" && (
          <MegaPanel onClose={() => setOpenMega(null)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 max-w-3xl">
              <MegaColumn heading="Insights & writing" items={WHAT_WE_THINK} />
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">
                  Featured
                </div>
                <h3 className="text-base font-semibold text-white">
                  RINK Data Analytics — under the hood
                </h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  Our own SaaS. How forecasting, anomaly detection, segmentation, and routing
                  fit into client engagements.
                </p>
                <Link
                  to="/analytics"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-blue-200"
                >
                  Try the workspace
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </MegaPanel>
        )}

        {openMega === "about" && (
          <MegaPanel onClose={() => setOpenMega(null)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 max-w-3xl">
              {Object.entries(ABOUT_RINK).map(([heading, items]) => (
                <MegaColumn key={heading} heading={heading} items={items} />
              ))}
            </div>
            <MegaFooter
              text="Want to work with us?"
              cta={{ label: "Open roles", to: "/careers" }}
            />
          </MegaPanel>
        )}
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

function NavTrigger({ label, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={active}
      className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition ${
        active
          ? "text-white bg-white/10"
          : "text-gray-200 hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
      <span className={`transition-transform ${active ? "rotate-180" : ""}`}>
        {Icon.chevron}
      </span>
    </button>
  );
}

function MegaPanel({ children, onClose }) {
  return (
    <div
      className="hidden lg:block absolute left-0 right-0 top-full bg-gradient-to-b from-gray-950/95 to-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-blue-500/5 z-30"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">{children}</div>
    </div>
  );
}

function MegaColumn({ heading, items }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-blue-300 font-semibold mb-3">
        {heading}
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.label}>
            <MegaItem {...it} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MegaItem({ label, to, href, external, hint, badge }) {
  const body = (
    <div className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white flex items-center gap-2">
          <span>{label}</span>
          {badge && (
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-purple-500/30 border border-purple-400/30 text-purple-100">
              {badge}
            </span>
          )}
          {external && <span className="text-blue-300">{Icon.external}</span>}
        </div>
        {hint && <div className="text-xs text-gray-400 mt-0.5 leading-snug">{hint}</div>}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {body}
      </a>
    );
  }
  return <Link to={to}>{body}</Link>;
}

function MegaFooter({ text, cta }) {
  return (
    <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-sm">
      <span className="text-gray-400">{text}</span>
      <Link
        to={cta.to}
        className="inline-flex items-center gap-1.5 text-blue-300 hover:text-blue-200 font-medium"
      >
        {cta.label}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

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
            <Link to="/analytics" className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/5">
              Workspace
            </Link>
            <Link to="/profile" className="block px-4 py-2 text-sm text-gray-200 hover:bg-white/5">
              Profile &amp; settings
            </Link>
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
  const [section, setSection] = useState(null); // "do" | "think" | "about" | null
  return (
    <div className="lg:hidden fixed inset-0 z-50">
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
          <DrawerGroup
            label="What we do"
            open={section === "do"}
            onToggle={() => setSection(section === "do" ? null : "do")}
          >
            {Object.entries(WHAT_WE_DO).map(([heading, items]) => (
              <DrawerSubgroup key={heading} heading={heading} items={items} onClose={onClose} />
            ))}
          </DrawerGroup>

          <DrawerGroup
            label="What we think"
            open={section === "think"}
            onToggle={() => setSection(section === "think" ? null : "think")}
          >
            <DrawerSubgroup heading="Insights & writing" items={WHAT_WE_THINK} onClose={onClose} />
          </DrawerGroup>

          <DrawerLink to="/careers" label="Careers" onClose={onClose} />
          <DrawerLink to="/contact" label="Contact us" onClose={onClose} />

          <DrawerGroup
            label="About RINK"
            open={section === "about"}
            onToggle={() => setSection(section === "about" ? null : "about")}
          >
            {Object.entries(ABOUT_RINK).map(([heading, items]) => (
              <DrawerSubgroup key={heading} heading={heading} items={items} onClose={onClose} />
            ))}
          </DrawerGroup>
        </nav>

        <div className="border-t border-white/10 p-4 mt-2 space-y-2">
          {user ? (
            <>
              <div className="text-xs text-gray-400">{user.email}</div>
              <Link to="/analytics" onClick={onClose} className="block px-3 py-2 rounded-lg text-sm bg-blue-500/10 border border-blue-400/20 text-blue-100">
                Open workspace
              </Link>
              <Link to="/profile" onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5">
                Profile &amp; settings
              </Link>
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
              <Link to="/auth?mode=login" onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5">
                Sign in
              </Link>
              <Link to="/contact?reason=sales" onClick={onClose} className="block text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600">
                Contact sales
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerGroup({ label, open, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-white hover:bg-white/5"
      >
        <span>{label}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          {Icon.chevron}
        </span>
      </button>
      {open && <div className="pl-2 pb-2 space-y-3">{children}</div>}
    </div>
  );
}

function DrawerSubgroup({ heading, items, onClose }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-blue-300 font-semibold mt-2 mb-1 px-3">
        {heading}
      </div>
      <ul>
        {items.map((it) =>
          it.href ? (
            <li key={it.label}>
              <a
                href={it.href}
                target={it.external ? "_blank" : undefined}
                rel={it.external ? "noopener noreferrer" : undefined}
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5"
              >
                {it.label}
              </a>
            </li>
          ) : (
            <li key={it.label}>
              <Link
                to={it.to}
                onClick={onClose}
                className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5"
              >
                {it.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
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
