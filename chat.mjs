// Schickt Chat-Nachrichten der Website über einen Discord-Webhook in einen Discord-Kanal.
const hits = new Map();
export function limited(ip, now = Date.now()) {
  const a = (hits.get(ip) || []).filter((t) => now - t < 600000);
  const bad = (a.length && now - a[a.length - 1] < 5000) || a.length >= 10;
  if (!bad) a.push(now);
  hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return bad;
}

export function clean(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = String(b.name || "").replace(/[\u0000-\u001f<>@`*_~|]/g, "").replace(/discord|clyde/gi, "").trim().slice(0, 24);
  const text = String(b.text || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, 500);
  if (b.website) return null; // Honeypot: nur Bots füllen das aus
  if (!name || !text) return null;
  return { name, text };
}

export async function sendToDiscord(m, hook, fetchFn = fetch) {
  if (!/^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(hook || "")) throw Object.assign(new Error("config"), { status: 503 });
  const r = await fetchFn(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: `${m.name} (Website)`, content: m.text, allowed_mentions: { parse: [] } }),
  });
  if (!r.ok) throw Object.assign(new Error("discord"), { status: r.status });
}
