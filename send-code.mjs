import { getStore } from "@netlify/blobs";
import { getSecret, issue, normEmail, validEmail } from "./lib/auth.mjs";
import { sendMail } from "./lib/mail.mjs";

// "strong": Lesen sieht sofort den zuletzt geschriebenen Code (Standard wäre "eventual", bis zu 60 s verzögert)
const codes = () => getStore({ name: "auth-codes", consistency: "strong" });
const cfg = () => getStore({ name: "auth-config", consistency: "strong" });

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Pflicht ist nur der Resend-Key. MAIL_FROM und CODE_SECRET sind optional.
// Leerzeichen werden entfernt; auch ein leicht abweichender Name (z. B. RESEND_KEY) wird erkannt.
function findKey() {
  const e = process.env;
  const direct = (e.RESEND_API_KEY || "").trim();
  if (direct) return direct;
  for (const n of Object.keys(e)) {
    if (/^\s*resend/i.test(n) && (e[n] || "").trim().startsWith("re_")) return e[n].trim();
  }
  return "";
}
const env = () => ({
  secret: (process.env.CODE_SECRET || "").trim(),
  apiKey: findKey(),
  from: (process.env.MAIL_FROM || "").trim() || "AgentSuper <onboarding@resend.dev>",
});

export default async (req) => {
  const { secret, apiKey, from } = env();
  const configured = !!apiKey;

  // GET = Gesundheitscheck (wird von der Statusleiste der Website genutzt)
  if (req.method === "GET") return json({ ok: configured }, configured ? 200 : 503);
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!configured) return json({ error: "config" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }
  const email = normEmail(body.email);
  if (!validEmail(email)) return json({ error: "email" }, 400);

  try {
    const r = await issue({
      store: codes(),
      secret: await getSecret(secret, cfg()),
      email,
      send: async (to, code) => {
        try { await sendMail({ apiKey, from, to, code }); }
        catch (e) { console.error("Mailversand fehlgeschlagen:", e.message); throw e; }
      },
    });
    return json(r.status === 200 ? { ok: true, ttl: r.ttl } : { error: r.error, retryIn: r.retryIn, code: r.code }, r.status);
  } catch (e) {
    console.error("send-code Fehler:", e);
    return json({ error: "server" }, 500);
  }
};

export const config = { path: "/api/send-code" };
