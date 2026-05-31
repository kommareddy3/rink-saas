import React from "react";

/**
 * Small "i" info icon with a hover/focus tooltip describing a metric or term.
 *
 * Usage:  <InfoTip text="Root Mean Squared Error — typical prediction error." />
 *
 * - Pure CSS tooltip (named group so it never conflicts with parent `group`s).
 * - Keyboard accessible: the icon is a focusable button; the tooltip also shows
 *   on focus-within. A native `title` is set as a robust fallback (and for
 *   touch devices that have no hover).
 */
export default function InfoTip({ text, label, side = "top", className = "" }) {
  if (!text) return null;
  const pos =
    side === "bottom"
      ? "top-full mt-1.5"
      : "bottom-full mb-1.5";
  return (
    <span className={`group/tip relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={label || "More information"}
        title={text}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/30 text-[9px] font-bold leading-none text-gray-300 hover:text-white hover:border-white/60 focus:outline-none focus:ring-1 focus:ring-blue-400/60 cursor-help select-none"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 hidden w-52 -translate-x-1/2 group-hover/tip:block group-focus-within/tip:block rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-[11px] font-normal normal-case tracking-normal leading-snug text-gray-200 shadow-xl ${pos}`}
      >
        {text}
      </span>
    </span>
  );
}
