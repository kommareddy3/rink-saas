/**
 * RINK Global Services — API Gateway
 * ----------------------------------
 * Express server that:
 *   - serves the React build (when present),
 *   - proxies dataset / training / prediction calls to the FastAPI ML service,
 *   - hosts a Groq-backed AI assistant endpoint,
 *   - verifies Supabase access tokens on protected routes.
 *
 * All authentication is delegated to Supabase. There is intentionally no
 * local user store.
 */

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const FormData = require("form-data");
const Groq = require("groq-sdk");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || "5001", 10);
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
// Optional shared secret between Express ↔ FastAPI. Set the same value on
// both deployments to lock the ML service to gateway traffic only.
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || "";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://localhost:5001,https://rinkglobal.com,https://www.rinkglobal.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[startup] SUPABASE_URL / SUPABASE_ANON_KEY not set — protected routes will reject every request."
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your-api-key-here") {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn("[startup] GROQ_API_KEY missing — /api/ai-assistant will return 503.");
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no Origin header) and explicitly listed origins.
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Verifies the Authorization: Bearer <supabase_access_token> header.
async function requireAuth(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: "Auth service not configured" });
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = data.user;
    return next();
  } catch (err) {
    console.error("[auth] verification failed:", err?.message || err);
    return res.status(401).json({ error: "Token verification failed" });
  }
}

// Multer in-memory: required because Vercel's filesystem is read-only.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// Build the headers we forward to FastAPI on every authed call.
function mlHeaders(req, extra = {}) {
  const headers = {
    "X-User-ID": req.user?.id || "",
    ...extra,
  };
  if (GATEWAY_SECRET) headers["X-Gateway-Secret"] = GATEWAY_SECRET;
  return headers;
}

// Optionally serve the built frontend if a sibling client/dist exists.
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath, { fallthrough: true }));

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

app.get("/", (_req, res) => {
  res.json({ service: "RINK Global Services API", status: "ok" });
});

app.get("/api/health", async (_req, res) => {
  let mlStatus = "unknown";
  try {
    const r = await axios.get(`${ML_API_URL}/health`, { timeout: 4000 });
    mlStatus = r.data?.status || "ok";
  } catch (err) {
    mlStatus = `unreachable (${err?.code || err?.message || "error"})`;
  }
  res.json({
    api: "ok",
    ml: mlStatus,
    groq: groq ? "configured" : "missing",
    auth: supabase ? "configured" : "missing",
  });
});

// ---------------------------------------------------------------------------
// AI assistant (Groq)
// ---------------------------------------------------------------------------

app.post("/api/ai-assistant", async (req, res) => {
  if (!groq) {
    return res
      .status(503)
      .json({ error: "AI assistant is not configured on this deployment." });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Field 'message' is required." });
  }
  if (message.length > 4000) {
    return res.status(413).json({ error: "Message too long (max 4000 chars)." });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `You are RINK AI Assistant, an expert in machine learning and time-series analytics.
You help users understand:
- Time-series forecasting techniques (gradient boosting, ARIMA, Prophet, LSTM, etc.)
- Feature engineering with lags and rolling windows
- Model evaluation (RMSE, MAE, MAPE, backtesting)
- How to use the RINK platform: upload a CSV, train a model, and request multi-step forecasts

Keep replies concise, accurate, and practical. Use small examples where helpful.`,
        },
        { role: "user", content: message },
      ],
    });

    const response = completion.choices?.[0]?.message?.content?.trim() || "";
    res.json({ response });
  } catch (error) {
    console.error("[ai-assistant] error:", error?.message || error);
    const status = error?.status || error?.response?.status || 500;
    res.status(status).json({
      error:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Sorry, I'm having trouble processing your request right now.",
    });
  }
});

// ---------------------------------------------------------------------------
// Protected ML routes (auth required)
// ---------------------------------------------------------------------------

app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (field name 'file')." });
  }
  try {
    // Forward the file to the ML service as multipart, then auto-train.
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "uploaded.csv",
      contentType: req.file.mimetype || "text/csv",
    });

    await axios.post(`${ML_API_URL}/upload`, fd, {
      headers: mlHeaders(req, fd.getHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60_000,
    });

    const trainRes = await axios.post(
      `${ML_API_URL}/train`,
      {},
      { headers: mlHeaders(req), timeout: 120_000 }
    );
    res.json({ message: "Uploaded and trained successfully.", training: trainRes.data });
  } catch (err) {
    handleProxyError(err, res, "Upload or training failed");
  }
});

app.post("/api/train", requireAuth, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const r = await axios.post(`${ML_API_URL}/train`, body, {
      headers: mlHeaders(req),
      timeout: 120_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Training failed");
  }
});

app.post("/api/predict", requireAuth, async (req, res) => {
  try {
    const r = await axios.post(`${ML_API_URL}/predict`, req.body, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Prediction failed");
  }
});

app.get("/api/data", requireAuth, async (req, res) => {
  try {
    const r = await axios.get(`${ML_API_URL}/data`, {
      headers: mlHeaders(req),
      params: req.query,
      timeout: 15_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Data fetch failed");
  }
});

// Permanently delete the caller's uploaded CSV and trained model on the ML
// service. Called by the client on logout (manual or idle) so files don't
// linger after a session ends.
app.delete("/api/user-data", requireAuth, async (req, res) => {
  try {
    const r = await axios.delete(`${ML_API_URL}/user-data`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to delete user data");
  }
});

// ---------------------------------------------------------------------------
// SPA fallback (only when bundle exists)
// ---------------------------------------------------------------------------

app.get(/^\/(?!api\/).*/, (_req, res, next) => {
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) next();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function handleProxyError(err, res, fallback) {
  console.error(`[proxy] ${fallback}:`, err?.message || err);
  if (err?.response) {
    return res
      .status(err.response.status || 502)
      .json(err.response.data || { error: fallback });
  }
  if (err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND") {
    return res.status(502).json({ error: "ML service is unreachable." });
  }
  return res.status(500).json({ error: fallback });
}

// Express-level error handler (CORS rejections, multer size limits, etc.)
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith?.("Origin ")) {
    return res.status(403).json({ error: err.message });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (max 10MB)." });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[startup] RINK API listening on :${PORT}`);
    console.log(`[startup] ML_API_URL=${ML_API_URL}`);
    console.log(`[startup] CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}
