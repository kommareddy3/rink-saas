import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import AnomalyDetection from "./pages/AnomalyDetection";
import ChurnPrediction from "./pages/ChurnPrediction";
import CustomerSegmentation from "./pages/CustomerSegmentation";
import ABTest from "./pages/ABTest";
import TSP from "./pages/TSP";
import VRP from "./pages/VRP";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-gray-900 to-blue-900 text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
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
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
