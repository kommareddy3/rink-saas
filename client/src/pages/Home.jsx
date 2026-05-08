// =========================
// LANDING PAGE UI (PRO SaaS)
// File: client/src/pages/Home.jsx
// =========================

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";
import AIAssistant from "../components/AIAssistant";

export default function Home() {
  const { user, displayName } = useAuth();

  return (
    <div className="text-white">
      {/* HERO SECTION */}
      <section className="text-center py-24 px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col items-center">
          <img src={logo} className="h-20 mb-4" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            RINK
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-2 tracking-widest">
            RESEARCH • INNOVATION • NEXT-GEN KNOWLEDGE
          </p>
        </div>

        {user && (
          <p className="text-base sm:text-lg text-blue-300 font-medium mt-6">
            Hi {displayName}, welcome back to RINK Global Services.
          </p>
        )}

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mt-8 max-w-3xl mx-auto">
          AI-Powered Time Series Analytics for Smarter Business Decisions
        </h2>

        <p className="mt-6 text-base sm:text-xl text-gray-300 max-w-2xl mx-auto">
          Transform your data into predictive insights with engineered time-series
          features and gradient-boosting models. Upload a dataset, train, and forecast
          in real time.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a href="/auth" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:from-blue-600 hover:to-purple-700 shadow-lg font-semibold transition-all duration-300">
            Start Free Trial
          </a>
          <a href="/analytics" className="px-8 py-4 border-2 border-white/30 rounded-xl hover:bg-white/10 hover:border-white/50 font-semibold transition-all duration-300">
            View Demo
          </a>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-3 sm:space-x-8 text-sm text-gray-400">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            No Setup Required
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
            Real-time Predictions
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
            Custom Models
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">What We Do</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Data Upload & Processing</h3>
              <p className="text-gray-400">
                Seamlessly upload your time series datasets in CSV format.
                Our platform automatically processes and validates your data for optimal model performance.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Model Training</h3>
              <p className="text-gray-400">
                Train gradient-boosting models with automatically engineered lag and
                rolling-window features, optimized for accuracy on real-world series.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔮</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Predictions</h3>
              <p className="text-gray-400">
                Generate accurate forecasts instantly. Input recent data points
                and receive multi-step predictions with confidence intervals.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Interactive Analytics</h3>
              <p className="text-gray-400">
                Visualize your data with interactive charts. Compare actual vs predicted values
                and track model performance over time.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Scalable</h3>
              <p className="text-gray-400">
                Authentication and identity backed by Supabase. Scale from small
                datasets to large-volume workloads on our cloud infrastructure.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">API Integration</h3>
              <p className="text-gray-400">
                Integrate predictions into your existing systems via REST APIs.
                Automate decision-making processes with real-time insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="px-4 sm:px-6 lg:px-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Perfect For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <h3 className="text-2xl font-semibold mb-4">Financial Forecasting</h3>
              <p className="text-gray-300">
                Predict stock prices, market trends, and economic indicators with high accuracy.
                Make informed investment decisions with data-driven insights.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-500/30">
              <h3 className="text-2xl font-semibold mb-4">Demand Planning</h3>
              <p className="text-gray-300">
                Optimize inventory and supply chain with accurate demand forecasts.
                Reduce costs and improve customer satisfaction.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <h3 className="text-2xl font-semibold mb-4">IoT Analytics</h3>
              <p className="text-gray-300">
                Analyze sensor data for predictive maintenance and anomaly detection.
                Prevent equipment failures and optimize operations.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <h3 className="text-2xl font-semibold mb-4">Sales Analytics</h3>
              <p className="text-gray-300">
                Forecast sales trends and customer behavior patterns.
                Drive revenue growth with predictive sales insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENT PORTAL CTA */}
      <section className="text-center py-20 px-4 sm:px-6 lg:px-10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Data?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Partner with RINK Global Services to transform your data into actionable intelligence with advanced AI analytics.
          </p>
          <a href="/analytics" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:from-blue-600 hover:to-purple-700 font-semibold shadow-lg transition-all duration-300">
            Access Analytics Platform
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-10 px-4 sm:px-6 lg:px-10 border-t border-white/20 text-gray-400">
        <div className="max-w-4xl mx-auto">
          <p className="mb-4">© {new Date().getFullYear()} RINK Global Services — Intelligent Data Analytics & Prediction Solutions</p>
          <p className="text-sm">Research Innovation & Next-gen Knowledge</p>
        </div>
      </footer>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
