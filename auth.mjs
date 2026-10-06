// Kernlogik für den E-Mail-Code (ohne Netlify-Abhängigkeiten, daher testbar)
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const TTL = 10 * 60 * 1000;     // Code ist 10 Minuten gültig
export const MAX_TRIES = 5;            // 5 Fehlversuche pro Code
export const COOLDOWN = 60 * 1000;     // 60 s Pause zwischen zwei Codes pro E-Mail

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normEmail = (v) => String(v || "").trim().toLowerCase();
export const validEmail = (e) => e.length <= 254 && EMAIL.test(e);
export const keyFor = (email) => createHash("sha256").update(email).digest("hex");
export const newCode = () => String(randomInt(0, 1000000)).padStart(6, "0");

// Der Code selbst wird nie gespeichert, nur ein HMAC davon.
export const hashCode = (secret, email, code) =>
  createHmac("sha256", secret).update(email + "|" + code).digest("hex");

function safeEq(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Geheimnis für die Code-Hashes: Variable CODE_SECRET, falls gesetzt.
// Sonst wird beim ersten Mal automatisch ein zufälliges erzeugt und im Speicher abgelegt.
export async function getSecret(envSecret, cfgStore) {
  if (envSecret) return envSecret;
  let r = await cfgStore.get("secret", { type: "json" });
  if (r && r.s) return r.s;
  const cand = randomBytes(32).toString("hex");
  try { await cfgStore.setJSON("secret", { s: cand }, { onlyIfNew: true }); } catch (e) { /* parallel angelegt */ }
  r = await cfgStore.get("secret", { type: "json" });
  return r && r.s ? r.s : cand;
}

export async function issue({ store, secret, email, send, now = Date.now() }) {
  const k = keyFor(email);
  const cur = await store.get(k, { type: "json" });
  if (cur && now - cur.sent < COOLDOWN) {
    return { status: 429, error: "wait", retryIn: Math.ceil((COOLDOWN - (now - cur.sent)) / 1000) };
  }
  const code = newCode();
  await store.setJSON(k, { h: hashCode(secret, email, code), exp: now + TTL, tries: 0, sent: now });
  try {
    await send(email, code);
  } catch (e) {
    await store.delete(k);
    return { status: 502, error: "mail", code: (e && e.status) || 0 };
  }
  return { status: 200, ok: true, ttl: TTL / 1000 };
}

export async function check({ store, secret, email, code, now = Date.now() }) {
  const k = keyFor(email);
  const rec = await store.get(k, { type: "json" });
  if (!rec) return { status: 400, error: "none" };
  if (now > rec.exp) { await store.delete(k); return { status: 400, error: "expired" }; }
  if (rec.tries >= MAX_TRIES) return { status: 429, error: "locked" };
  if (!safeEq(rec.h, hashCode(secret, email, code))) {
    rec.tries += 1;
    await store.setJSON(k, rec);
    if (rec.tries >= MAX_TRIES) return { status: 429, error: "locked" };
    return { status: 400, error: "wrong", left: MAX_TRIES - rec.tries };
  }
  await store.delete(k);               // Code ist nur einmal verwendbar
  return { status: 200, ok: true };
}
