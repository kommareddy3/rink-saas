import React, { useState } from "react";

const PROVIDERS = [
  {
    id: "google",
    label: "Google",
    bg: "bg-white hover:bg-gray-100 text-gray-800",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 16.7 6l1.79-1.79A9.6 9.6 0 0 0 12 2.4a9.6 9.6 0 0 0-8.62 5.36l1.89 2z"/>
        <path fill="#34A853" d="M16.7 18l-1.79-1.79A7.07 7.07 0 0 1 5.27 14.24l-1.89 2A9.6 9.6 0 0 0 12 21.6c2.42 0 4.56-.94 6.17-2.5z"/>
        <path fill="#4A90E2" d="M18.17 19.1A9.62 9.62 0 0 0 21.6 12c0-.6-.06-1.18-.16-1.74H12v3.48h5.4a4.62 4.62 0 0 1-1.99 3.03z"/>
        <path fill="#FBBC05" d="M5.27 14.24a7.06 7.06 0 0 1 0-4.48l-1.89-2A9.55 9.55 0 0 0 2.4 12a9.55 9.55 0 0 0 .98 4.24z"/>
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    bg: "bg-[#181717] hover:bg-[#232323] text-white",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  {
    id: "azure",
    label: "Microsoft",
    bg: "bg-white hover:bg-gray-100 text-gray-800",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 23 23" aria-hidden="true">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
        <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
  },
  {
    id: "linkedin_oidc",
    label: "LinkedIn",
    bg: "bg-[#0A66C2] hover:bg-[#084e96] text-white",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.27c-.97 0-1.75-.79-1.75-1.76s.78-1.75 1.75-1.75 1.75.78 1.75 1.75-.78 1.76-1.75 1.76zm13.5 12.27h-3v-5.6c0-3.37-4-3.11-4 0v5.6h-3v-11h3v1.76c1.4-2.59 7-2.78 7 2.48v6.76z"/>
      </svg>
    ),
  },
];

export default function SocialLoginButtons({ onProvider, disabled, busyId }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled || busyId}
            onClick={() => onProvider(p.id)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
              border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${p.bg}`}
          >
            {busyId === p.id ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              p.icon
            )}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
