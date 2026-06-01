// Shared external link constants. The Analytics SaaS is a separate Vercel
// project deployed at analytics.rinkglobal.com; the marketing site links
// to it as an external URL (different origin, different deployment).
//
// Override with VITE_ANALYTICS_URL in env (e.g. for preview / staging).
export const ANALYTICS_URL =
  import.meta.env.VITE_ANALYTICS_URL || "https://analytics.rinkglobal.com";

// Convenience builders so callers don't string-concat.
export const ANALYTICS = {
  home: ANALYTICS_URL,
  workspace: `${ANALYTICS_URL}/analytics-workspace`,
  signIn: `${ANALYTICS_URL}/auth?mode=login`,
  signUp: `${ANALYTICS_URL}/auth?mode=register`,
  profile: `${ANALYTICS_URL}/profile`,
};
