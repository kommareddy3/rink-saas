/**
 * Passkey (WebAuthn) router
 * --------------------------
 * Implements the four endpoints needed for registration and authentication:
 *   POST /register/begin     — issues a credential-creation challenge
 *   POST /register/finish    — verifies the new credential and stores it
 *   POST /authenticate/begin — issues an authentication challenge (discoverable)
 *   POST /authenticate/finish— verifies the assertion and returns a Supabase
 *                              OTP token the client can exchange for a session
 *   GET  /                   — list the user's passkeys
 *   DELETE /:id              — delete one of the user's passkeys
 *
 * Storage lives in two Supabase tables (see supabase/migrations/20260513_passkeys.sql).
 *
 * Required env vars on the Vercel rink-api project:
 *   SUPABASE_SERVICE_ROLE_KEY  — service-role key (server-only secret)
 *   PASSKEY_RP_ID              — e.g. "rinkglobal.com" (omit for localhost)
 *   PASSKEY_RP_NAME            — display name shown in the OS dialog
 *   PASSKEY_RP_ORIGIN          — e.g. "https://rinkglobal.com"
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const RP_NAME = process.env.PASSKEY_RP_NAME || "RINK Global Services";
const RP_ID = process.env.PASSKEY_RP_ID || "localhost";
const RP_ORIGIN =
  process.env.PASSKEY_RP_ORIGIN ||
  (RP_ID === "localhost" ? "http://localhost:5173" : `https://${RP_ID}`);

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

if (!supabaseAdmin) {
  console.warn(
    "[passkeys] SUPABASE_SERVICE_ROLE_KEY not set — passkey endpoints will return 503."
  );
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function randomSessionToken() {
  return require("crypto").randomBytes(32).toString("base64url");
}

function notConfigured(res) {
  return res
    .status(503)
    .json({ error: "Passkey service is not configured on this deployment." });
}

async function storeChallenge({
  sessionToken,
  userId,
  email,
  challenge,
  type,
}) {
  const { error } = await supabaseAdmin
    .from("passkey_challenges")
    .insert({
      session_token: sessionToken,
      user_id: userId || null,
      email: email || null,
      challenge,
      challenge_type: type,
    });
  if (error) throw error;
}

async function consumeChallenge(sessionToken, expectedType) {
  // Fetch and delete in one round-trip (using a delete with returning).
  const { data, error } = await supabaseAdmin
    .from("passkey_challenges")
    .delete()
    .eq("session_token", sessionToken)
    .select()
    .maybeSingle();
  if (error || !data) throw new Error("Challenge expired or invalid");
  if (data.challenge_type !== expectedType) {
    throw new Error("Challenge type mismatch");
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("Challenge expired");
  }
  return data;
}

async function listUserCredentials(userId) {
  const { data, error } = await supabaseAdmin
    .from("passkey_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getCredentialById(credentialId) {
  const { data, error } = await supabaseAdmin
    .from("passkey_credentials")
    .select("*")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findUserByEmail(email) {
  // Admin API doesn't expose a "by-email" lookup directly; page through users.
  // For small deployments this is fine. For scale, replace with a SQL lookup
  // via a service-role select on auth.users (requires a custom policy).
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return (
    (data?.users || []).find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase()
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

/**
 * @param {Function} requireAuth Middleware that populates req.user from a
 *   Supabase access token. Must match the gateway's existing implementation.
 */
module.exports = function passkeyRouter(requireAuth) {
  const router = express.Router();

  // ---- Registration --------------------------------------------------------

  router.post("/register/begin", requireAuth, async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const user = req.user;
      const existing = await listUserCredentials(user.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        userDisplayName:
          user.user_metadata?.display_name || user.email || "RINK user",
        attestationType: "none",
        excludeCredentials: existing.map((c) => ({
          id: c.credential_id,
          type: "public-key",
          transports: c.transports || [],
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      const sessionToken = randomSessionToken();
      await storeChallenge({
        sessionToken,
        userId: user.id,
        challenge: options.challenge,
        type: "register",
      });

      res.json({ options, sessionToken });
    } catch (err) {
      console.error("[passkeys] register/begin failed:", err?.message || err);
      res.status(500).json({ error: err?.message || "register/begin failed" });
    }
  });

  router.post("/register/finish", requireAuth, async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const { sessionToken, response, friendlyName } = req.body || {};
      if (!sessionToken || !response) {
        return res
          .status(400)
          .json({ error: "Missing sessionToken or response." });
      }
      const challengeRow = await consumeChallenge(sessionToken, "register");
      if (challengeRow.user_id !== req.user.id) {
        return res.status(403).json({ error: "Challenge does not belong to you." });
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: "Verification failed." });
      }

      const { credential } = verification.registrationInfo;
      // credential.id is base64url string; credential.publicKey is Uint8Array
      const publicKeyB64 = Buffer.from(credential.publicKey).toString(
        "base64url"
      );

      const { error: insertErr } = await supabaseAdmin
        .from("passkey_credentials")
        .insert({
          user_id: req.user.id,
          credential_id: credential.id,
          public_key: publicKeyB64,
          counter: credential.counter || 0,
          transports: response?.response?.transports || [],
          device_type:
            verification.registrationInfo.credentialDeviceType || null,
          backed_up: !!verification.registrationInfo.credentialBackedUp,
          friendly_name:
            (friendlyName || "").toString().trim().slice(0, 80) || null,
        });
      if (insertErr) throw insertErr;

      res.json({ status: "registered" });
    } catch (err) {
      console.error("[passkeys] register/finish failed:", err?.message || err);
      res
        .status(400)
        .json({ error: err?.message || "register/finish failed" });
    }
  });

  // ---- Authentication ------------------------------------------------------

  // Unauthenticated. Browser will show discoverable credentials for this site.
  router.post("/authenticate/begin", async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const { email } = req.body || {};
      let allowCredentials;
      let userIdForChallenge;
      let emailForChallenge;

      if (email && typeof email === "string") {
        const user = await findUserByEmail(email.trim());
        if (!user) {
          // Don't reveal whether the user exists. Return an empty allow list
          // and let the assertion silently fail later.
          allowCredentials = [];
        } else {
          const creds = await listUserCredentials(user.id);
          allowCredentials = creds.map((c) => ({
            id: c.credential_id,
            type: "public-key",
            transports: c.transports || [],
          }));
          userIdForChallenge = user.id;
        }
        emailForChallenge = email.trim();
      }
      // If no email was supplied, fall back to discoverable-credentials
      // mode: allowCredentials undefined → browser asks the user to pick.

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "preferred",
        allowCredentials,
      });

      const sessionToken = randomSessionToken();
      await storeChallenge({
        sessionToken,
        userId: userIdForChallenge,
        email: emailForChallenge,
        challenge: options.challenge,
        type: "authenticate",
      });

      res.json({ options, sessionToken });
    } catch (err) {
      console.error(
        "[passkeys] authenticate/begin failed:",
        err?.message || err
      );
      res
        .status(500)
        .json({ error: err?.message || "authenticate/begin failed" });
    }
  });

  router.post("/authenticate/finish", async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const { sessionToken, response } = req.body || {};
      if (!sessionToken || !response) {
        return res
          .status(400)
          .json({ error: "Missing sessionToken or response." });
      }
      const challengeRow = await consumeChallenge(sessionToken, "authenticate");

      // Find the credential the browser used.
      const credentialId = response.id;
      if (!credentialId) {
        return res.status(400).json({ error: "Missing credential id." });
      }
      const dbCred = await getCredentialById(credentialId);
      if (!dbCred) {
        return res.status(401).json({ error: "Unknown passkey." });
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: dbCred.credential_id,
          publicKey: Buffer.from(dbCred.public_key, "base64url"),
          counter: Number(dbCred.counter) || 0,
          transports: dbCred.transports || [],
        },
      });

      if (!verification.verified) {
        return res.status(401).json({ error: "Passkey verification failed." });
      }

      // Bump counter + touch last-used timestamp.
      await supabaseAdmin
        .from("passkey_credentials")
        .update({
          counter: verification.authenticationInfo?.newCounter || 0,
          last_used_at: new Date().toISOString(),
        })
        .eq("credential_id", credentialId);

      // Look up the user the credential belongs to.
      const { data: userRes, error: userErr } =
        await supabaseAdmin.auth.admin.getUserById(dbCred.user_id);
      if (userErr || !userRes?.user) {
        throw userErr || new Error("User vanished");
      }
      const userEmail = userRes.user.email;
      if (!userEmail) {
        return res
          .status(500)
          .json({ error: "User has no email — cannot mint session." });
      }

      // Mint a one-time magic-link token without sending an email.
      const { data: linkData, error: linkErr } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
        });
      if (linkErr) throw linkErr;
      const hashedToken = linkData?.properties?.hashed_token;
      if (!hashedToken) {
        throw new Error("generateLink returned no hashed_token");
      }

      res.json({
        email: userEmail,
        token_hash: hashedToken,
        type: "magiclink",
      });
    } catch (err) {
      console.error(
        "[passkeys] authenticate/finish failed:",
        err?.message || err
      );
      res
        .status(401)
        .json({ error: err?.message || "authenticate/finish failed" });
    }
  });

  // ---- Manage --------------------------------------------------------------

  router.get("/", requireAuth, async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const creds = await listUserCredentials(req.user.id);
      res.json({
        passkeys: creds.map((c) => ({
          id: c.id,
          friendly_name: c.friendly_name,
          created_at: c.created_at,
          last_used_at: c.last_used_at,
          device_type: c.device_type,
          backed_up: c.backed_up,
          transports: c.transports,
        })),
      });
    } catch (err) {
      console.error("[passkeys] list failed:", err?.message || err);
      res.status(500).json({ error: err?.message || "list failed" });
    }
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    if (!supabaseAdmin) return notConfigured(res);
    try {
      const { id } = req.params;
      const { error, count } = await supabaseAdmin
        .from("passkey_credentials")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("user_id", req.user.id);
      if (error) throw error;
      if (!count) return res.status(404).json({ error: "Passkey not found." });
      res.json({ status: "deleted" });
    } catch (err) {
      console.error("[passkeys] delete failed:", err?.message || err);
      res.status(500).json({ error: err?.message || "delete failed" });
    }
  });

  return router;
};
