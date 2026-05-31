import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export default function Footer() {
  const location = useLocation();
  // Hide the footer on the auth route — that page has its own dedicated layout.
  if (location.pathname.startsWith("/auth")) return null;

  return (
    <footer className="mt-24 border-t border-white/10 bg-black/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="RINK" className="h-9 w-9" />
              <div>
                <div className="text-lg font-bold text-white">RINK</div>
                <div className="text-[10px] uppercase tracking-widest text-blue-300/80 -mt-0.5">
                  Global Services
                </div>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mt-4 max-w-sm leading-relaxed">
              Founder-led IT consulting and staffing firm. Cloud, infrastructure,
              cybersecurity, managed services, and data analytics — backed by
              our own production SaaS, RINK Data Analytics.
            </p>

            <address className="not-italic text-xs text-gray-500 mt-4 leading-relaxed">
              <div className="text-gray-300 font-medium">RINK Global Services</div>
              38214 Saratoga Cir<br />
              Farmington Hills, MI 48331 · USA<br />
              <a href="mailto:nikhila.vintha@rinkglobal.com" className="text-blue-300 hover:text-blue-200">
                nikhila.vintha@rinkglobal.com
              </a>
            </address>

            <NewsletterSignup />

            <div className="flex items-center gap-2 mt-5">
              <SocialLink
                href="https://www.linkedin.com/"
                label="LinkedIn"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.27c-.97 0-1.75-.79-1.75-1.76s.78-1.75 1.75-1.75 1.75.78 1.75 1.75-.78 1.76-1.75 1.76zm13.5 12.27h-3v-5.6c0-3.37-4-3.11-4 0v5.6h-3v-11h3v1.76c1.4-2.59 7-2.78 7 2.48v6.76z" />
                  </svg>
                }
              />
              <SocialLink
                href="https://github.com/"
                label="GitHub"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                }
              />
              <SocialLink
                href="https://x.com/"
                label="X (Twitter)"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                }
              />
              <SocialLink
                href="mailto:hello@rinkglobal.com"
                label="Email"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Product */}
          <FooterColumn title="Product" className="lg:col-span-2">
            <FooterLink to="/analytics">Workspace</FooterLink>
            <FooterAnchor href="/#features">Features</FooterAnchor>
            <FooterAnchor href="/#use-cases">Use Cases</FooterAnchor>
            <FooterLink to="/auth?mode=register">Get Started</FooterLink>
          </FooterColumn>

          {/* Company */}
          <FooterColumn title="Company" className="lg:col-span-2">
            <FooterAnchor href="/#about">About</FooterAnchor>
            <FooterLink to="/contact">Contact</FooterLink>
            <FooterLink to="/contact">Support</FooterLink>
            <FooterAnchor href="mailto:hello@rinkglobal.com">hello@rinkglobal.com</FooterAnchor>
          </FooterColumn>

          {/* Resources */}
          <FooterColumn title="Resources" className="lg:col-span-2">
            <FooterAnchor href="https://docs.rinkglobal.com">Documentation</FooterAnchor>
            <FooterAnchor href="https://status.rinkglobal.com">Status</FooterAnchor>
            <FooterAnchor href="/changelog">Changelog</FooterAnchor>
            <FooterAnchor href="/security">Security</FooterAnchor>
          </FooterColumn>

          {/* Legal */}
          <FooterColumn title="Legal" className="lg:col-span-2">
            <FooterLink to="/privacy">Privacy</FooterLink>
            <FooterLink to="/terms">Terms</FooterLink>
            <FooterAnchor href="/cookies">Cookies</FooterAnchor>
            <FooterAnchor href="/dpa">DPA</FooterAnchor>
          </FooterColumn>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} RINK Global Services · All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function FooterColumn({ title, className = "", children }) {
  return (
    <div className={className}>
      <h4 className="text-xs uppercase tracking-widest font-semibold text-white mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm text-gray-400">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="hover:text-white transition">{children}</Link>
    </li>
  );
}

function FooterAnchor({ href, children }) {
  const isExternal = /^https?:\/\//.test(href) || href.startsWith("mailto:");
  return (
    <li>
      <a
        href={href}
        target={isExternal && !href.startsWith("mailto:") ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="hover:text-white transition inline-flex items-center gap-1"
      >
        {children}
        {isExternal && !href.startsWith("mailto:") && (
          <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </a>
    </li>
  );
}

function SocialLink({ href, icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition"
    >
      {icon}
    </a>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // 'success' | 'error' | null

  const submit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }
    // No backend wired up yet — show optimistic confirmation. Hook this to
    // your mailing-list provider when you add one.
    setStatus("success");
    setEmail("");
  };

  return (
    <form onSubmit={submit} className="mt-5">
      <label className="block text-xs uppercase tracking-widest font-semibold text-white mb-2">
        Stay updated
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status) setStatus(null);
          }}
          placeholder="you@example.com"
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/20"
        >
          Subscribe
        </button>
      </div>
      {status === "success" && (
        <p className="text-xs text-emerald-300 mt-2">Thanks — we'll be in touch.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-300 mt-2">Please enter a valid email.</p>
      )}
    </form>
  );
}
