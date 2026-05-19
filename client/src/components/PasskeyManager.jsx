import React, { useCallback, useEffect, useState } from "react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import api from "../api";

// ---------------------------------------------------------------------------
// Passkey manager — used inside the Profile page
// ---------------------------------------------------------------------------

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PasskeyManager({ onToast }) {
  const supported = typeof window !== "undefined" && browserSupportsWebAuthn();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [friendlyName, setFriendlyName] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/passkeys");
      setKeys(res.data?.passkeys || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        setKeys([]);
      } else {
        onToast?.error(err?.response?.data?.error || "Couldn't load passkeys.");
      }
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const beginRes = await api.post("/api/passkeys/register/begin", {});
      const { options, sessionToken } = beginRes.data;
      // @simplewebauthn/browser v10 expects the options object directly.
      // v11+ wraps it as { optionsJSON: options } — update both call-sites if
      // you bump the dependency.
      const attResp = await startRegistration(options);
      await api.post("/api/passkeys/register/finish", {
        sessionToken,
        response: attResp,
        friendlyName: friendlyName.trim() || undefined,
      });
      onToast?.success(`Passkey registered${friendlyName ? ` (${friendlyName.trim()})` : ""}.`);
      setFriendlyName("");
      load();
    } catch (err) {
      // The library throws specific errors when the user cancels.
      const msg = err?.response?.data?.error || err?.message || "Registration failed.";
      if (/cancell|abort/i.test(msg)) {
        onToast?.info("Passkey registration cancelled.");
      } else {
        onToast?.error(msg);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this passkey? You won't be able to sign in with it anymore.")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/api/passkeys/${id}`);
      onToast?.success("Passkey removed.");
      load();
    } catch (err) {
      onToast?.error(err?.response?.data?.error || "Couldn't remove passkey.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-100 text-sm">
        This browser doesn't support passkeys. Try Chrome, Safari, Firefox, or
        Edge on a modern OS to use this feature.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Add new */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-none">
            <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3 3h6l3-3v-4l-3-3" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">Add a passkey</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Sign in with Face ID, Touch ID, Windows Hello, or a hardware key —
              no password needed.
            </p>
          </div>
        </div>
        <label className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
          Friendly name (optional)
        </label>
        <input
          type="text"
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          maxLength={80}
          placeholder="e.g. MacBook Touch ID, YubiKey"
          className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border border-white/10 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={handleRegister}
          disabled={registering}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {registering ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Waiting for authenticator…
            </>
          ) : (
            "Register passkey"
          )}
        </button>
      </div>

      {/* Existing keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Registered passkeys</h3>
          {keys.length > 0 && (
            <span className="text-xs text-gray-400">{keys.length} active</span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No passkeys registered yet. Add one above to enable passwordless sign-in.
          </p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-none">
                  <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {k.friendly_name || "Unnamed passkey"}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>Added {formatDate(k.created_at)}</span>
                    {k.last_used_at && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span>Last used {formatDate(k.last_used_at)}</span>
                      </>
                    )}
                    {k.device_type === "multiDevice" && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-blue-300">synced</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                  className="text-xs px-3 py-1.5 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  {deletingId === k.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
