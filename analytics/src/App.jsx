import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIAssistant from "./components/AIAssistant";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import AnomalyDetection from "./pages/AnomalyDetection";
import ChurnPrediction from "./pages/ChurnPrediction";
import CustomerSegmentation from "./pages/CustomerSegmentation";
import ABTest from "./pages/ABTest";
import TSP from "./pages/TSP";
import VRP from "./pages/VRP";
import Profile from "./pages/Profile";
import Changelog from "./pages/Changelog";

// All marketing pages (About, Careers, Contact) and legal pages (Privacy /
// Terms / DPA / Cookies / Security) live on the marketing site at
// rinkglobal.com. This SaaS only owns the product surface.
const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || "https://rinkglobal.com";

// Floating AI assistant — everywhere except the auth route.
function GlobalAssistant() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/auth")) return null;
  return <AIAssistant />;
}

// Anything we don't own here (e.g. /privacy, /terms, /contact, /about,
// /careers) bounces to the marketing site preserving the path so the
// user lands on the canonical version, not on a 404.
function RedirectToMarketing() {
  useEffect(() => {
    const target = `${MARKETING_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-gray-900 to-blue-900 text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Product surface */}
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              {/* Back-compat: old /analytics bookmarks → new workspace path. */}
              <Route path="/analytics" element={<Navigate to="/analytics-workspace" replace />} />
              <Route
                path="/analytics-workspace"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/insights"
                element={
                  <ProtectedRoute>
                    <Insights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/anomaly"
                element={
                  <ProtectedRoute>
                    <AnomalyDetection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/churn"
                element={
                  <ProtectedRoute>
                    <ChurnPrediction />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/segmentation"
                element={
                  <ProtectedRoute>
                    <CustomerSegmentation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/abtest"
                element={
                  <ProtectedRoute>
                    <ABTest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/tsp"
                element={
                  <ProtectedRoute>
                    <TSP />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/vrp"
                element={
                  <ProtectedRoute>
                    <VRP />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/changelog" element={<Changelog />} />

              {/* Everything else lives on the marketing site. */}
              <Route path="*" element={<RedirectToMarketing />} />
            </Routes>
          </main>
          <Footer />
          <GlobalAssistant />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
