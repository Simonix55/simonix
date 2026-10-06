import { getStore } from "@netlify/blobs";
import { verifyGoogleToken } from "./lib/google.mjs";
import { getSecret } from "./lib/auth.mjs";
import { signSession } from "./lib/session.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Die Client-ID ist öffentlich (kein Geheimnis). Die Variable GOOGLE_CLIENT_ID in Netlify hat Vorrang, falls gesetzt.
const DEFAULT_CLIENT_ID = "497100645111-rctq2u1p0pm75aebk871k30dr92l2960.apps.googleusercontent.com";
const clientId = () => (process.env.GOOGLE_CLIENT_ID || "").trim() || DEFAULT_CLIENT_ID;

export default async (req) => {
  const id = clientId();

  // GET: Die Seite holt sich hier die (öffentliche) Client-ID. Dient auch als Gesundheitscheck.
  if (req.method === "GET") return id ? json({ ok: true, clientId: id }) : json({ ok: false, error: "config" }, 503);
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!id) return json({ error: "config" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }

  try {
    const user = await verifyGoogleToken(body.credential, id);
    let token = null;
    try {
      const secret = await getSecret(process.env.CODE_SECRET, getStore({ name: "auth-config", consistency: "strong" }));
      token = signSession(secret, user.email);
    } catch (e) { console.error("Sitzung konnte nicht erstellt werden:", e); }
    return json({ ok: true, token, user: { email: user.email, name: user.name, picture: user.picture } });
  } catch (e) {
    if (e && e.reason === "certs") { console.error("Google-Schlüssel nicht abrufbar"); return json({ error: "server" }, 502); }
    console.warn("Google-Token abgelehnt:", e && e.reason ? e.reason : e);
    return json({ error: "token" }, 401);
  }
};

export const config = { path: "/api/google-login" };
