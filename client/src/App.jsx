import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIAssistant from "./components/AIAssistant";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { ANALYTICS } from "./links";

import Home from "./pages/Home";
import Industries from "./pages/Industries";
import HowWeWork from "./pages/HowWeWork";
import WhyRink from "./pages/WhyRink";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import Changelog from "./pages/Changelog";
import Security from "./pages/Security";
import Cookies from "./pages/Cookies";
import DPA from "./pages/DPA";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Floating AI assistant — every marketing page.
function GlobalAssistant() {
  return <AIAssistant />;
}

// The product surface (`/analytics`, `/auth`, `/tools/*`, `/profile`) lives
// in the separate analytics/ project deployed at analytics.rinkglobal.com.
// If someone hits one of those old URLs on the marketing site (e.g. an old
// bookmark), bounce them to the canonical product URL.
function RedirectToAnalytics() {
  useEffect(() => {
    const target = `${ANALYTICS.home}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Marketing surface */}
              <Route path="/" element={<Home />} />
              <Route path="/industries" element={<Industries />} />
              <Route path="/how-we-work" element={<HowWeWork />} />
              <Route path="/why-rink" element={<WhyRink />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/security" element={<Security />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/dpa" element={<DPA />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Legacy / cross-app paths — bounce to the SaaS deployment. */}
              <Route path="/auth" element={<RedirectToAnalytics />} />
              <Route path="/analytics" element={<RedirectToAnalytics />} />
              <Route path="/tools/*" element={<RedirectToAnalytics />} />
              <Route path="/profile" element={<RedirectToAnalytics />} />
            </Routes>
          </main>
          <Footer />
          <GlobalAssistant />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
