// Prüft ein Google-ID-Token (JWT) ohne Zusatzpakete:
// Signatur (RS256 gegen Googles öffentliche Schlüssel), Aussteller, Client-ID, Ablauf, bestätigte E-Mail.
import { createPublicKey, verify } from "node:crypto";

const CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
let cache = { at: 0, keys: null };

const b64 = (s) => Buffer.from(s, "base64url");
const fail = (reason) => Object.assign(new Error(reason), { reason });

async function loadKeys(fetchFn, now, force) {
  if (!force && cache.keys && now - cache.at < 60 * 60 * 1000) return cache.keys;
  const r = await fetchFn(CERTS);
  if (!r.ok) throw fail("certs");
  const j = await r.json();
  cache = { at: now, keys: j.keys || [] };
  return cache.keys;
}

export function resetCache() { cache = { at: 0, keys: null }; }

export async function verifyGoogleToken(token, clientId, { fetchFn = fetch, now = Date.now() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw fail("format");
  let head, pay;
  try { head = JSON.parse(b64(parts[0])); pay = JSON.parse(b64(parts[1])); } catch { throw fail("format"); }
  if (head.alg !== "RS256") throw fail("alg");

  let jwk = (await loadKeys(fetchFn, now, false)).find((k) => k.kid === head.kid);
  if (!jwk) jwk = (await loadKeys(fetchFn, now, true)).find((k) => k.kid === head.kid); // Schlüssel evtl. neu
  if (!jwk) throw fail("kid");

  let ok = false;
  try {
    ok = verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), createPublicKey({ key: jwk, format: "jwk" }), b64(parts[2]));
  } catch { ok = false; }
  if (!ok) throw fail("signature");

  if (!ISSUERS.includes(pay.iss)) throw fail("iss");
  if (!clientId || pay.aud !== clientId) throw fail("aud");
  if (!(Number(pay.exp) * 1000 > now)) throw fail("exp");
  if (!pay.sub || !pay.email || pay.email_verified !== true) throw fail("email");

  return {
    sub: String(pay.sub),
    email: String(pay.email).toLowerCase(),
    name: String(pay.name || String(pay.email).split("@")[0]).slice(0, 100),
    picture: String(pay.picture || ""),
  };
}
