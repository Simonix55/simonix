import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { getSecret } from "./lib/auth.mjs";
import { verifySession } from "./lib/session.mjs";
import { askClaude, cleanMessages, dayKey, DEFAULT_LIMIT, MODEL } from "./lib/ai.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const usage = () => getStore({ name: "ai-usage", consistency: "strong" });
const cfg = () => getStore({ name: "auth-config", consistency: "strong" });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) return json({ error: "config" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }

  try {
    const secret = await getSecret(process.env.CODE_SECRET, cfg());
    const email = verifySession(secret, body.token);
    if (!email) return json({ error: "auth" }, 401);

    const messages = cleanMessages(body.messages);
    if (!messages) return json({ error: "messages" }, 400);

    const limit = Number(process.env.AI_DAILY_LIMIT) > 0 ? Number(process.env.AI_DAILY_LIMIT) : DEFAULT_LIMIT;
    const key = createHash("sha256").update(email).digest("hex") + ":" + dayKey();
    const cur = (await usage().get(key, { type: "json" })) || { n: 0 };
    if (cur.n >= limit) return json({ error: "limit", left: 0 }, 429);

    const reply = await askClaude({ apiKey, model: (process.env.AI_MODEL || "").trim() || MODEL, messages });
    cur.n += 1;
    await usage().setJSON(key, cur);
    return json({ ok: true, reply, left: Math.max(0, limit - cur.n) });
  } catch (e) {
    console.error("ai-chat Fehler:", e && e.status ? "Anthropic " + e.status : e);
    return json({ error: "ai", status: (e && e.status) || 0 }, 502);
  }
};

export const config = { path: "/api/ai-chat" };
