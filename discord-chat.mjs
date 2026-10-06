import { clean, limited, sendToDiscord } from "./lib/chat.mjs";
import { WEBHOOK_URL } from "./lib/webhook.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body; try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const m = clean(body);
  if (!m) return json({ ok: false, error: "invalid" }, 400);
  if (limited((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "x")) return json({ ok: false, error: "slow" }, 429);
  try {
    await sendToDiscord(m, process.env.DISCORD_WEBHOOK_URL || WEBHOOK_URL);
    return json({ ok: true });
  } catch (e) {
    console.warn("Discord-Chat fehlgeschlagen:", e && e.status ? e.status : e);
    return json({ ok: false, error: e && e.status === 503 ? "config" : "discord" }, e && e.status === 503 ? 503 : 502);
  }
};

export const config = { path: "/api/discord-chat" };
