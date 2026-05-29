import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll position on every route change so a fresh page never opens
 * scrolled to the bottom — and handles in-page anchors like /#use-cases
 * arriving from another route by waiting briefly for the target section to
 * mount, then scrolling it into view.
 *
 * Mounted once inside <BrowserRouter> in App.jsx.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // No hash → just jump to the top of the new page.
    if (!hash) {
      // Use 'auto' (instant) — smooth is jarring on a route transition.
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    // Hash present → try to scroll the section into view. The section may
    // not be mounted yet on first paint when arriving from another route,
    // so retry a handful of times over ~600ms.
    const id = hash.replace(/^#/, "");
    let attempts = 0;
    const maxAttempts = 12;
    const interval = 50;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (++attempts < maxAttempts) {
        setTimeout(tryScroll, interval);
      } else {
        // Final fallback: at least put us at the top of the route.
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };

    tryScroll();
  }, [pathname, hash]);

  return null;
}
