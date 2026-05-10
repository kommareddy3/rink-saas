#!/usr/bin/env node
/**
 * RINK deployment smoke test
 * --------------------------
 * Hits each component of the production stack and reports pass/fail.
 *
 * Usage (loads env from server/.env automatically):
 *
 *   node scripts/check-deploy.js
 *
 * Or override the gateway URL to test the deployed Vercel app:
 *
 *   API_BASE=https://rink-api.vercel.app node scripts/check-deploy.js
 *   API_BASE=https://api.rinkglobal.com node scripts/check-deploy.js
 *
 * Required env vars (set in server/.env or pass inline):
 *   ML_API_URL, GROQ_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
 * Optional:
 *   API_BASE        default http://localhost:5001
 *   GROQ_MODEL      default llama-3.3-70b-versatile
 *   TEST_USER_TOKEN a Supabase access token, used to test authed routes
 */

const fs = require("fs");
const path = require("path");

// --- tiny .env loader so this script has zero npm deps -----------------------
function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, vRaw] = m;
    if (process.env[k]) continue; // don't override
    let v = vRaw.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}
loadEnvFile(path.resolve(__dirname, "../server/.env"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const API_BASE = (process.env.API_BASE || "http://localhost:5001").replace(/\/$/, "");
const ML_API_URL = (process.env.ML_API_URL || "").replace(/\/$/, "");
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || "";

// --- pretty print helpers ----------------------------------------------------
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
const results = [];
function record(name, ok, info = "") {
  results.push({ name, ok, info });
  const tag = ok ? c.green("PASS") : c.red("FAIL");
  console.log(`[${tag}] ${name}${info ? "  " + c.dim(info) : ""}`);
}

async function tryFetch(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeout || 30_000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* keep text */ }
    return { status: res.status, headers: res.headers, text, json, ok: res.ok };
  } finally {
    clearTimeout(t);
  }
}

// --- the actual checks -------------------------------------------------------
async function main() {
  console.log(c.bold(`\nRINK deployment check\n`));
  console.log(`  API_BASE     : ${API_BASE}`);
  console.log(`  ML_API_URL   : ${ML_API_URL || c.yellow("(unset)")}`);
  console.log(`  SUPABASE_URL : ${SUPABASE_URL || c.yellow("(unset)")}`);
  console.log(`  GROQ_MODEL   : ${GROQ_MODEL}`);
  console.log(`  GROQ key set : ${GROQ_API_KEY ? c.green("yes") : c.red("no")}`);
  console.log(`  SB anon set  : ${SUPABASE_ANON_KEY ? c.green("yes") : c.red("no")}`);
  console.log(`  user token   : ${TEST_USER_TOKEN ? c.green("yes") : c.dim("no (authed route checks will be skipped)")}\n`);

  // 1. Gateway root
  try {
    const r = await tryFetch(`${API_BASE}/`);
    record("Gateway / responds", r.ok, `HTTP ${r.status}`);
  } catch (e) {
    record("Gateway / responds", false, e.message);
  }

  // 2. Gateway health probe
  try {
    const r = await tryFetch(`${API_BASE}/api/health`, { timeout: 15_000 });
    const j = r.json || {};
    record("Gateway /api/health", r.ok, `api=${j.api} ml=${j.ml} groq=${j.groq} auth=${j.auth}`);
    record("  → ML reachable through gateway", j.ml === "ok" || j.ml === "ok", `ml="${j.ml}"`);
    record("  → Groq configured", j.groq === "configured", `groq="${j.groq}"`);
    record("  → Supabase configured", j.auth === "configured", `auth="${j.auth}"`);
  } catch (e) {
    record("Gateway /api/health", false, e.message);
  }

  // 3. ML service direct (skip the gateway)
  if (ML_API_URL) {
    try {
      const r = await tryFetch(`${ML_API_URL}/health`, { timeout: 35_000 });
      record("ML /health (direct)", r.ok, `HTTP ${r.status} body=${r.text.slice(0, 120)}`);
    } catch (e) {
      record("ML /health (direct)", false, e.message);
    }
  }

  // 4. Groq directly — proves the key works regardless of the gateway
  if (GROQ_API_KEY) {
    try {
      const r = await tryFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 16,
          messages: [{ role: "user", content: "Say ok" }],
        }),
      });
      const txt = r.json?.choices?.[0]?.message?.content || r.text.slice(0, 200);
      record("Groq API key + model", r.ok, `HTTP ${r.status} reply="${(txt || "").trim().slice(0, 60)}"`);
    } catch (e) {
      record("Groq API key + model", false, e.message);
    }
  }

  // 5. Supabase project responsive
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const r = await tryFetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      record("Supabase auth/v1/settings", r.ok, `HTTP ${r.status}`);
    } catch (e) {
      record("Supabase auth/v1/settings", false, e.message);
    }
  }

  // 6. Auth gate — unauthed request to protected route should be 401
  try {
    const r = await tryFetch(`${API_BASE}/api/data`);
    record("Protected route rejects unauthed", r.status === 401, `expected 401, got ${r.status}`);
  } catch (e) {
    record("Protected route rejects unauthed", false, e.message);
  }

  // 7. Auth gate — bogus bearer should be 401
  try {
    const r = await tryFetch(`${API_BASE}/api/data`, {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    record("Protected route rejects bad bearer", r.status === 401, `expected 401, got ${r.status}`);
  } catch (e) {
    record("Protected route rejects bad bearer", false, e.message);
  }

  // 8. AI assistant — rejects empty body
  try {
    const r = await tryFetch(`${API_BASE}/api/ai-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    record("AI assistant validates input", r.status === 400, `expected 400, got ${r.status}`);
  } catch (e) {
    record("AI assistant validates input", false, e.message);
  }

  // 9. AI assistant — real round trip
  try {
    const r = await tryFetch(`${API_BASE}/api/ai-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Reply with one short sentence: deployment check ok." }),
      timeout: 30_000,
    });
    const reply = (r.json?.response || "").trim();
    record("AI assistant end-to-end", r.ok && reply.length > 0, `HTTP ${r.status} reply="${reply.slice(0, 80)}"`);
  } catch (e) {
    record("AI assistant end-to-end", false, e.message);
  }

  // 10. CORS — disallowed origin should 403
  try {
    const r = await tryFetch(`${API_BASE}/api/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    // CORS rejection in Express returns 500-by-default unless we map it; our
    // server maps it to 403 via the error handler.
    record("CORS rejects unknown origin", r.status === 403, `expected 403, got ${r.status}`);
  } catch (e) {
    record("CORS rejects unknown origin", false, e.message);
  }

  // 11. Optional authed checks if a real token was provided
  if (TEST_USER_TOKEN) {
    try {
      const r = await tryFetch(`${API_BASE}/api/data`, {
        headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
      });
      record("Authed /api/data works", r.ok, `HTTP ${r.status} bytes=${r.text.length}`);
    } catch (e) {
      record("Authed /api/data works", false, e.message);
    }
  }

  // --- summary --------------------------------------------------------------
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log("");
  console.log(c.bold(`Summary: ${passed}/${results.length} passed`) + (failed ? c.red(`, ${failed} failed`) : ""));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(c.red("Script crashed:"), e);
  process.exit(2);
});
