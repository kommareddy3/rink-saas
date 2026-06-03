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
const passkeyRouter = require("./passkeys");

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
// Resend (transactional emails). Optional — when unset, the welcome-email
// route returns 503.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const WELCOME_FROM_EMAIL =
  process.env.WELCOME_FROM_EMAIL || "RINK <hello@rinkglobal.com>";
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || WELCOME_FROM_EMAIL;
const TEAM_EMAIL = process.env.TEAM_EMAIL || "hello@rinkglobal.com";
const APP_URL = process.env.APP_URL || "https://rinkglobal.com";
const DOCS_URL = process.env.DOCS_URL || "https://docs.rinkglobal.com";

// Parse the env var, then auto-expand each origin to ALSO accept the
// apex<->www counterpart so a misconfigured env var (or a deploy on the
// "other" canonical) never bricks the API with a CORS rejection.
function expandOrigins(list) {
  const out = new Set(list);
  for (const origin of list) {
    try {
      const u = new URL(origin);
      const host = u.hostname;
      if (host.startsWith("www.")) {
        const apex = host.slice(4);
        out.add(`${u.protocol}//${apex}${u.port ? ":" + u.port : ""}`);
      } else if (host && !host.startsWith("localhost") && host.includes(".")) {
        out.add(`${u.protocol}//www.${host}${u.port ? ":" + u.port : ""}`);
      }
    } catch {
      /* skip bad URLs */
    }
  }
  return [...out];
}

const ALLOWED_ORIGINS = expandOrigins(
  (process.env.ALLOWED_ORIGINS ||
    "http://localhost:5173,http://localhost:5001,https://rinkglobal.com,https://www.rinkglobal.com,https://analytics.rinkglobal.com,https://www.analytics.rinkglobal.com,https://*.rinkglobal.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

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

// CORS — must run before any other middleware that might throw, so that
// preflight responses (OPTIONS) always carry the right headers.
// Always trust the apex domain and any of its subdomains (analytics, docs,
// www, app, …) over https, so an incomplete ALLOWED_ORIGINS env var can never
// brick a first-party origin with a CORS rejection.
const TRUSTED_ROOT = process.env.TRUSTED_ROOT_DOMAIN || "rinkglobal.com";
function isTrustedOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    return host === TRUSTED_ROOT || host.endsWith(`.${TRUSTED_ROOT}`);
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, cb) => {
    // Same-origin / curl have no Origin header — always allow.
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Any first-party subdomain (analytics.rinkglobal.com, etc.) is allowed.
    if (isTrustedOrigin(origin)) return cb(null, true);
    // Surface rejections to the Vercel function logs.
    console.warn(
      `[cors] rejected origin: ${origin} (allow-list: ${ALLOWED_ORIGINS.join(", ")})`
    );
    // IMPORTANT: do NOT throw an Error here — that bypasses the cors
    // middleware and lets Express's error handler return a 500 with no
    // CORS headers, which the browser surfaces as the confusing
    // "No 'Access-Control-Allow-Origin' header" message. Returning
    // (null, false) just omits the Allow-Origin header (correct), and
    // the browser still blocks (correct), but no 500 confuses the dev.
    return cb(null, false);
  },
  credentials: true,
};
// `app.use(cors())` already handles OPTIONS preflights for every route in
// Express 5 — do NOT add `app.options("*", ...)` here. Express 5's
// path-to-regexp v8 rejects the bare "*" pattern and crashes the function
// at cold start (FUNCTION_INVOCATION_FAILED on Vercel).
app.use(cors(corsOptions));

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

// Contact form attachments (resumes, analytics data, job postings, etc.).
// Larger cap than CSV uploads; held in memory and forwarded to the email API.
const CONTACT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB per file
const contactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CONTACT_MAX_BYTES, files: 5 },
});

// Generated reports (PDF / XLSX / CSV / JSON exports) saved to cloud storage.
const REPORT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REPORT_MAX_BYTES },
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

  const { message, context } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Field 'message' is required." });
  }
  if (message.length > 4000) {
    return res.status(413).json({ error: "Message too long (max 4000 chars)." });
  }

  // Shared company facts — the only ground truth the assistant should rely on.
  const COMPANY_FACTS = `About RINK Global Services (the company):
- A founder-led IT consulting and staffing firm based in Farmington Hills, Michigan, USA, led by founder Nikhila Vintha.
- The name RINK stands for Research, Innovation, Next-gen, Knowledge.
- Services: IT staff augmentation (C2C and W2 talent), Data Analytics & AI, cloud migrations (AWS/Azure/GCP), IT infrastructure, cybersecurity, and managed services.
- RINK operates its own production SaaS, "RINK Data Analytics" (analytics.rinkglobal.com) — a workspace for forecasting, anomaly detection, churn prediction, customer segmentation, A/B testing, and route optimisation.
- Contact: hello@rinkglobal.com (general) or nikhila.vintha@rinkglobal.com (founder). Docs at docs.rinkglobal.com.`;

  // Marketing site = company/sales questions. Analytics app = product/ML help.
  const systemPrompt =
    context === "analytics"
      ? `You are the RINK Data Analytics in-app assistant. You help users get value from the RINK Data Analytics workspace and understand the analytics it runs.
Help users with:
- Using the workspace: uploading a CSV, training a model, and requesting multi-step forecasts
- The built-in tools: forecasting, anomaly detection, churn prediction, customer segmentation, A/B testing, and route optimisation (TSP/VRP)
- Practical interpretation of results (RMSE, MAE, MAPE, confidence bands, backtesting) in plain language

${COMPANY_FACTS}

Rules: Answer directly and concisely about RINK Data Analytics and the user's data task. Stay on RINK topics. If asked something unrelated to RINK or analytics, briefly say it's outside what you cover and steer back to the platform. Never invent features RINK does not have. Do not output generic filler or restate this prompt.`
      : `You are the RINK Global Services website assistant. You help visitors understand what RINK does and how to engage.
Help visitors with:
- RINK's services: IT staff augmentation (C2C/W2), Data Analytics & AI, cloud migrations, IT infrastructure, cybersecurity, and managed services
- Engagement models (C2C vs W2, fixed-bid projects, managed services) and how to start (request a consultation, send a JD)
- What RINK Data Analytics is and how to try it

${COMPANY_FACTS}

Rules: Answer directly and concisely using only the facts above. Stay on RINK topics. If asked something unrelated to RINK, briefly say it's outside what you cover and point them to the contact options. Never invent clients, numbers, certifications, or services RINK doesn't list. Do not output generic filler or restate this prompt.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
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

// Profile the uploaded CSV (schema, date/value/group detection, panel check).
app.post("/api/analyze", requireAuth, async (req, res) => {
  try {
    const r = await axios.post(`${ML_API_URL}/analyze`, {}, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Analysis failed");
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

// ---------------------------------------------------------------------------
// Welcome email (Resend)
// ---------------------------------------------------------------------------

// HTML body kept inline so the function works without filesystem access on
// Vercel. The canonical source is email-templates/welcome.html — keep them
// in sync when you customise.
const WELCOME_EMAIL_HTML = (vars) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Welcome to RINK</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:40px 20px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
<tr><td style="background:linear-gradient(135deg,#0b1b3d 0%,#3b0764 100%);padding:40px 32px 36px;text-align:center;">
<span style="font-size:24px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">RINK</span>
<div style="font-weight:400;color:#93c5fd;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;margin-top:4px;">Global Services</div>
<h1 style="margin:24px 0 6px;font-size:30px;line-height:1.2;font-weight:700;color:#ffffff;">Welcome aboard, ${escapeHtml(vars.first_name)}!</h1>
<p style="margin:0;font-size:15px;color:#cbd5e1;">Your forecasting workspace is ready.</p>
</td></tr>
<tr><td style="padding:36px 32px 8px;">
<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#374151;">Thanks for joining RINK. We built this platform for teams who need accurate, defensible forecasts without weeks of data-science setup.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.55;color:#374151;">Here's how to get the most out of it:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
<tr><td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;"><table role="presentation" width="100%"><tr><td valign="top" width="34" style="padding-right:12px;"><div style="width:30px;height:30px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:50%;color:#fff;text-align:center;line-height:30px;font-weight:700;font-size:14px;">1</div></td><td valign="top"><div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:2px;">Upload your first CSV</div><div style="font-size:13px;color:#6b7280;line-height:1.5;">Drag any time-series CSV (up to 10 MB) into the workspace. Date and value columns are detected automatically.</div></td></tr></table></td></tr>
<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;"><table role="presentation" width="100%"><tr><td valign="top" width="34" style="padding-right:12px;"><div style="width:30px;height:30px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:50%;color:#fff;text-align:center;line-height:30px;font-weight:700;font-size:14px;">2</div></td><td valign="top"><div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:2px;">Train and forecast</div><div style="font-size:13px;color:#6b7280;line-height:1.5;">Training is automatic on upload. Click Generate Forecast to predict the next N steps at your data's natural cadence.</div></td></tr></table></td></tr>
<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;"><table role="presentation" width="100%"><tr><td valign="top" width="34" style="padding-right:12px;"><div style="width:30px;height:30px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:50%;color:#fff;text-align:center;line-height:30px;font-weight:700;font-size:14px;">3</div></td><td valign="top"><div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:2px;">Ask the AI assistant</div><div style="font-size:13px;color:#6b7280;line-height:1.5;">Stuck on terminology or want a recommendation? Click the chat bubble in the bottom-right — it's a forecasting-savvy LLM.</div></td></tr></table></td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 28px;"><tr><td align="center" style="border-radius:10px;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);"><a href="${vars.workspace_url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Open my workspace →</a></td></tr></table>
<p style="margin:0 0 4px;text-align:center;font-size:13px;color:#6b7280;">Need help getting started? Check the <a href="${vars.docs_url}/getting-started" style="color:#3b82f6;text-decoration:none;">5-minute guide</a> or <a href="${vars.site_url}/contact" style="color:#3b82f6;text-decoration:none;">contact our team</a>.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;"><p style="margin:0 0 8px;font-size:12px;color:#6b7280;">You're receiving this because you just signed up at rinkglobal.com.</p><p style="margin:0;font-size:12px;color:#9ca3af;">© RINK Global Services</p></td></tr>
</table></td></tr></table></body></html>`;

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// POST /api/welcome-email — sends a one-shot welcome via Resend. The client
// is responsible for idempotency (it checks user_metadata.welcome_sent before
// calling and sets the flag on success).
app.post("/api/welcome-email", requireAuth, async (req, res) => {
  if (!RESEND_API_KEY) {
    return res
      .status(503)
      .json({ error: "Welcome email service is not configured." });
  }
  const userEmail = req.user?.email;
  if (!userEmail) {
    return res.status(400).json({ error: "Authenticated user has no email." });
  }
  const meta = req.user?.user_metadata || {};
  const firstName = (meta.first_name || meta.display_name || "there").toString().trim();

  const html = WELCOME_EMAIL_HTML({
    first_name: firstName,
    workspace_url: `${APP_URL}/analytics`,
    docs_url: DOCS_URL,
    site_url: APP_URL,
  });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: WELCOME_FROM_EMAIL,
        to: [userEmail],
        subject: "Welcome to RINK — let's forecast",
        html,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[welcome-email] resend error:", r.status, data);
      return res.status(r.status).json({ error: data?.message || "Resend rejected the request." });
    }
    res.json({ status: "sent", id: data?.id || null });
  } catch (err) {
    console.error("[welcome-email] network error:", err?.message || err);
    res.status(502).json({ error: "Failed to reach email provider." });
  }
});

// Passkey (WebAuthn) endpoints — see server/passkeys.js
app.use("/api/passkeys", passkeyRouter(requireAuth));

// ---------------------------------------------------------------------------
// Additional tools (anomaly / churn / TSP / VRP)
// ---------------------------------------------------------------------------

// CSV-based tools: forward multipart upload to FastAPI as-is.
app.post("/api/anomaly/detect", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "data.csv",
      contentType: req.file.mimetype || "text/csv",
    });
    if (req.body?.column) fd.append("column", req.body.column);
    if (req.body?.contamination) fd.append("contamination", req.body.contamination);
    const r = await axios.post(`${ML_API_URL}/anomaly/detect`, fd, {
      headers: mlHeaders(req, fd.getHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Anomaly detection failed");
  }
});

app.post("/api/churn/predict", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "data.csv",
      contentType: req.file.mimetype || "text/csv",
    });
    if (req.body?.label) fd.append("label", req.body.label);
    const r = await axios.post(`${ML_API_URL}/churn/predict`, fd, {
      headers: mlHeaders(req, fd.getHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Churn prediction failed");
  }
});

// JSON-based tools: TSP + VRP.
app.post("/api/tsp/solve", requireAuth, async (req, res) => {
  try {
    const r = await axios.post(`${ML_API_URL}/tsp/solve`, req.body, {
      headers: mlHeaders(req),
      timeout: 60_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "TSP solve failed");
  }
});

app.post("/api/segmentation/run", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "data.csv",
      contentType: req.file.mimetype || "text/csv",
    });
    if (req.body?.k) fd.append("k", req.body.k);
    if (req.body?.features) fd.append("features", req.body.features);
    const r = await axios.post(`${ML_API_URL}/segmentation/run`, fd, {
      headers: mlHeaders(req, fd.getHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Segmentation failed");
  }
});

// ---------------------------------------------------------------------------
// Public contact form — POST /api/contact (no auth)
// ---------------------------------------------------------------------------
//
// Spam guards:
//   - honeypot field "website" — bots fill, humans don't. Silent 200 if filled.
//   - server-side validation on every field.
//   - request size cap via Express json limit.
//
// Email delivery: Resend if configured, otherwise 503 with a helpful message
// directing the user to email hello@rinkglobal.com directly.

const CONTACT_REASONS = new Set([
  "general", "support", "feedback", "sales",
  "partnership", "security", "account", "other",
]);

function reasonLabel(r) {
  return {
    general: "General inquiry",
    support: "Technical support",
    feedback: "Feedback or feature request",
    sales: "Sales / Enterprise",
    partnership: "Partnership opportunity",
    security: "Security disclosure",
    account: "Account or billing",
    other: "Something else",
  }[r] || r;
}

app.post("/api/contact", contactUpload.array("attachments", 5), async (req, res) => {
  const {
    name, email, company, reason, message, website, // honeypot
  } = req.body || {};
  // Multipart sends booleans as strings ("true"/"false").
  const consent = req.body?.consent === true || req.body?.consent === "true";

  // Honeypot — bots fill this. Pretend success so they don't retry.
  if (website && typeof website === "string" && website.trim().length > 0) {
    console.warn("[contact] honeypot triggered, dropping silently");
    return res.json({ status: "sent" });
  }

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 1 || name.length > 100) {
    return res.status(400).json({ error: "Please provide your name (1–100 chars)." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (company && (typeof company !== "string" || company.length > 100)) {
    return res.status(400).json({ error: "Company name is too long." });
  }
  if (!reason || !CONTACT_REASONS.has(reason)) {
    return res.status(400).json({ error: "Please choose a reason for contacting us." });
  }
  if (!message || typeof message !== "string" || message.trim().length < 10 || message.length > 5000) {
    return res.status(400).json({ error: "Message must be between 10 and 5,000 characters." });
  }
  if (!consent) {
    return res.status(400).json({ error: "Please consent to be contacted about your request." });
  }

  if (!RESEND_API_KEY) {
    return res.status(503).json({
      error: `Contact form isn't configured on this deployment. Please email ${TEAM_EMAIL} directly.`,
    });
  }

  const subject = `[RINK · ${reasonLabel(reason)}] ${name.trim()}`;
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;padding:40px 20px;color:#111827;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
<tr><td style="background:linear-gradient(135deg,#0b1b3d 0%,#1e293b 100%);padding:24px 28px;">
  <div style="color:#fff;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">Contact form</div>
  <div style="color:#93c5fd;font-size:11px;margin-top:4px;">rinkglobal.com</div>
</td></tr>
<tr><td style="padding:28px;">
  <h2 style="margin:0 0 14px;font-size:20px;color:#0f172a;">New ${escapeHtml(reasonLabel(reason).toLowerCase())}</h2>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#475569;width:120px;">From</td><td style="padding:6px 0;color:#0f172a;"><b>${escapeHtml(name)}</b> &lt;<a href="mailto:${escapeHtml(email)}" style="color:#3b82f6;text-decoration:none;">${escapeHtml(email)}</a>&gt;</td></tr>
    ${company ? `<tr><td style="padding:6px 0;color:#475569;">Company</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(company)}</td></tr>` : ""}
    <tr><td style="padding:6px 0;color:#475569;">Topic</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(reasonLabel(reason))}</td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;"/>
  <div style="white-space:pre-wrap;color:#1f2937;line-height:1.6;font-size:14px;">${escapeHtml(message)}</div>
  ${(req.files && req.files.length)
    ? `<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:13px;color:#475569;"><b style="color:#0f172a;">Attachments (${req.files.length}):</b><ul style="margin:8px 0 0;padding-left:18px;">${req.files.map((f) => `<li>${escapeHtml(f.originalname)} — ${(f.size / 1024 / 1024).toFixed(2)} MB</li>`).join("")}</ul></div>`
    : ""}
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px;">
  Reply directly to this email to respond to the sender — Reply-To is set to ${escapeHtml(email)}.
</td></tr>
</table>
</body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [TEAM_EMAIL],
        reply_to: email,
        subject,
        html,
        ...(req.files && req.files.length
          ? {
              attachments: req.files.map((f) => ({
                filename: f.originalname,
                content: f.buffer.toString("base64"),
              })),
            }
          : {}),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[contact] resend error:", r.status, data);
      return res.status(r.status).json({ error: data?.message || "Could not deliver your message." });
    }
    console.log(`[contact] forwarded (${reason}) from ${email}`);
    res.json({ status: "sent", id: data?.id || null });
  } catch (err) {
    console.error("[contact] network error:", err?.message || err);
    res.status(502).json({ error: "Could not reach email provider. Please try again later." });
  }
});

// ---------------------------------------------------------------------------
// Report enrichment — AI executive narrative for a tool's report
// ---------------------------------------------------------------------------

app.post("/api/report/enrich", requireAuth, async (req, res) => {
  if (!groq) {
    return res
      .status(503)
      .json({ error: "AI assistant is not configured on this deployment." });
  }
  const { report, tool } = req.body || {};
  if (!report || typeof report !== "object") {
    return res.status(400).json({ error: "Missing report payload." });
  }

  // Build a structured user message — the LLM uses this as the brief.
  const metricsText = (report.metrics || [])
    .map((m) => `  - ${m.label}: ${m.value}${m.hint ? ` (${m.hint})` : ""}`)
    .join("\n");
  const insightsText = (report.insights || [])
    .map((i, idx) => `  ${idx + 1}. ${i}`)
    .join("\n");
  const recommendationsText = (report.recommendations || [])
    .map((r, idx) => `  ${idx + 1}. ${r}`)
    .join("\n");

  const userPrompt = [
    `Tool: ${tool || "analysis"}`,
    `Report title: ${report.title || "Report"}`,
    report.subtitle ? `Subtitle: ${report.subtitle}` : null,
    "",
    "Plain-language summary:",
    report.summary || "(none provided)",
    "",
    "Metrics:",
    metricsText || "  (none)",
    "",
    "Initial findings:",
    insightsText || "  (none)",
    "",
    "Proposed recommendations:",
    recommendationsText || "  (none)",
    "",
    "Write a 3-paragraph executive analysis for a non-technical business leader.",
    "",
    "Paragraph 1 — Headline: in plain language, what does the data show? Lead with the single most important finding.",
    "Paragraph 2 — What's notable: what's surprising, counter-intuitive, or worth a second look? Mention any caveats or limits.",
    "Paragraph 3 — Action: name 2-3 concrete decisions the business should make next quarter based on this analysis.",
    "",
    "Rules:",
    "- No bullet lists. Prose only.",
    "- Never invent numbers — synthesize what's given.",
    "- Avoid jargon (no 'silhouette', 'AUC', 'RMSE' — translate to plain language).",
    "- Professional, direct tone. No fluff.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are a senior business analyst at a top management-consulting firm. You write concise, action-oriented executive memos based on data analyses produced by other team members. Your tone is professional and plainspoken. You never invent numbers — you synthesize and contextualize the inputs given to you. You avoid jargon: translate ML terms into business language.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const narrative = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!narrative) {
      return res.status(502).json({ error: "Model returned an empty response." });
    }
    res.json({ narrative, model: GROQ_MODEL });
  } catch (err) {
    console.error("[report-enrich] error:", err?.message || err);
    const status = err?.status || err?.response?.status || 500;
    const message =
      err?.response?.data?.error?.message || err?.message || "Enrichment failed.";
    res.status(status).json({ error: message });
  }
});

// Express 5 / path-to-regexp v8 dropped `:param(regex)` constraints, so we
// validate the mode in the handler instead.
app.post("/api/abtest/:mode", requireAuth, async (req, res) => {
  const { mode } = req.params;
  if (mode !== "continuous" && mode !== "conversion") {
    return res.status(404).json({ error: `Unknown abtest mode: ${mode}` });
  }
  try {
    const r = await axios.post(
      `${ML_API_URL}/abtest/${mode}`,
      req.body,
      { headers: mlHeaders(req), timeout: 30_000 }
    );
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "A/B test analysis failed");
  }
});

app.post("/api/vrp/solve", requireAuth, async (req, res) => {
  try {
    const r = await axios.post(`${ML_API_URL}/vrp/solve`, req.body, {
      headers: mlHeaders(req),
      timeout: 60_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "VRP solve failed");
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
// Reports — store generated reports in cloud storage (encrypted + scanned in
// the ML service), list them, download, and delete.
// ---------------------------------------------------------------------------

app.post("/api/reports", requireAuth, reportUpload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No report file uploaded (field name 'file')." });
  }
  try {
    const fd = new FormData();
    fd.append("file", req.file.buffer, {
      filename: req.file.originalname || "report.bin",
      contentType: req.file.mimetype || "application/octet-stream",
    });
    if (req.body?.title) fd.append("title", String(req.body.title));
    if (req.body?.fmt) fd.append("fmt", String(req.body.fmt));
    const r = await axios.post(`${ML_API_URL}/reports`, fd, {
      headers: mlHeaders(req, fd.getHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to store report");
  }
});

app.get("/api/reports", requireAuth, async (req, res) => {
  try {
    const r = await axios.get(`${ML_API_URL}/reports`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to list reports");
  }
});

app.get("/api/reports/:id", requireAuth, async (req, res) => {
  try {
    const r = await axios.get(`${ML_API_URL}/reports/${encodeURIComponent(req.params.id)}`, {
      headers: mlHeaders(req),
      responseType: "arraybuffer",
      timeout: 60_000,
    });
    if (r.headers["content-type"]) res.setHeader("Content-Type", r.headers["content-type"]);
    if (r.headers["content-disposition"]) res.setHeader("Content-Disposition", r.headers["content-disposition"]);
    res.send(Buffer.from(r.data));
  } catch (err) {
    handleProxyError(err, res, "Failed to download report");
  }
});

app.delete("/api/reports/:id", requireAuth, async (req, res) => {
  try {
    const r = await axios.delete(`${ML_API_URL}/reports/${encodeURIComponent(req.params.id)}`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to delete report");
  }
});

// ---------------------------------------------------------------------------
// Dataset library — multiple uploaded files; list, activate (and re-train),
// delete one, delete all.
// ---------------------------------------------------------------------------

app.get("/api/datasets", requireAuth, async (req, res) => {
  try {
    const r = await axios.get(`${ML_API_URL}/datasets`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to list datasets");
  }
});

app.post("/api/datasets/:id/activate", requireAuth, async (req, res) => {
  try {
    await axios.post(
      `${ML_API_URL}/datasets/${encodeURIComponent(req.params.id)}/activate`,
      {},
      { headers: mlHeaders(req), timeout: 30_000 }
    );
    // Re-train on the newly-activated dataset, mirroring /api/upload.
    const trainRes = await axios.post(
      `${ML_API_URL}/train`,
      {},
      { headers: mlHeaders(req), timeout: 120_000 }
    );
    res.json({ message: "Dataset activated and model trained.", training: trainRes.data });
  } catch (err) {
    handleProxyError(err, res, "Failed to activate dataset");
  }
});

app.delete("/api/datasets/:id", requireAuth, async (req, res) => {
  try {
    const r = await axios.delete(`${ML_API_URL}/datasets/${encodeURIComponent(req.params.id)}`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to delete dataset");
  }
});

app.delete("/api/datasets", requireAuth, async (req, res) => {
  try {
    const r = await axios.delete(`${ML_API_URL}/datasets`, {
      headers: mlHeaders(req),
      timeout: 30_000,
    });
    res.json(r.data);
  } catch (err) {
    handleProxyError(err, res, "Failed to delete datasets");
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
