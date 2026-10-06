// Kurze, signierte Anmelde-Token: beweisen dem Server, dass sich jemand per Google oder E-Mail-Code bestätigt hat.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 Tage

const sig = (secret, payload) => createHmac("sha256", secret).update("session|" + payload).digest("base64url");

export function signSession(secret, email, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ e: String(email).toLowerCase(), x: now + SESSION_TTL })).toString("base64url");
  return payload + "." + sig(secret, payload);
}

// Gibt die E-Mail zurück oder null, wenn das Token ungültig oder abgelaufen ist.
export function verifySession(secret, token, now = Date.now()) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const a = Buffer.from(parts[1]), b = Buffer.from(sig(secret, parts[0]));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return p && typeof p.e === "string" && p.x > now ? p.e : null;
  } catch { return null; }
}
