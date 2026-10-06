import { getStore } from "@netlify/blobs";
import { check, getSecret, normEmail, validEmail } from "./lib/auth.mjs";
import { signSession } from "./lib/session.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const codes = () => getStore({ name: "auth-codes", consistency: "strong" });
const cfg = () => getStore({ name: "auth-config", consistency: "strong" });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }
  const email = normEmail(body.email);
  const code = String(body.code || "").trim();
  if (!validEmail(email)) return json({ error: "email" }, 400);
  if (!/^\d{6}$/.test(code)) return json({ error: "code" }, 400);

  try {
    const secret = await getSecret(process.env.CODE_SECRET, cfg());
    const r = await check({ store: codes(), secret, email, code });
    return json(r.status === 200 ? { ok: true, token: signSession(secret, email) } : { error: r.error, left: r.left }, r.status);
  } catch (e) {
    console.error("verify-code Fehler:", e);
    return json({ error: "server" }, 500);
  }
};

export const config = { path: "/api/verify-code" };
