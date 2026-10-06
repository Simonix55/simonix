import { signSession, verifySession, SESSION_TTL } from "../netlify/functions/lib/session.mjs";
import { cleanMessages, askClaude, dayKey, MAX_LEN } from "../netlify/functions/lib/ai.mjs";
let fails = 0; const t = (n, c) => { console.log((c ? "OK   " : "FAIL ") + n); if (!c) fails++; };
const NOW = 1_700_000_000_000;
const tok = signSession("geheim", "A@B.de", NOW);
t("Token gilt und liefert kleingeschriebene E-Mail", verifySession("geheim", tok, NOW + 1000) === "a@b.de");
t("Token mit anderem Secret ungültig", verifySession("anders", tok, NOW + 1000) === null);
t("Abgelaufenes Token ungültig", verifySession("geheim", tok, NOW + SESSION_TTL + 1) === null);
const [p, s] = tok.split(".");
const fake = Buffer.from(JSON.stringify({ e: "evil@x.de", x: NOW + 99999999 })).toString("base64url") + "." + s;
t("Verändertes Token ungültig", verifySession("geheim", fake, NOW) === null);
t("Müll ist ungültig", verifySession("geheim", "abc", NOW) === null && verifySession("geheim", "", NOW) === null);

const u = (c) => ({ role: "user", content: c }), a = (c) => ({ role: "assistant", content: c });
t("Gültiger Verlauf", cleanMessages([u("hi"), a("hallo"), u("noch was")]).length === 3);
t("Verlauf muss mit user enden", cleanMessages([u("hi"), a("hallo")]) === null);
t("Zwei user hintereinander abgelehnt", cleanMessages([u("a"), u("b")]) === null);
t("Leere Nachricht abgelehnt", cleanMessages([u("  ")]) === null);
t("Kein Array abgelehnt", cleanMessages("x") === null);
t("Lange Nachricht wird gekürzt", cleanMessages([u("x".repeat(5000))])[0].content.length === MAX_LEN);
const many = []; for (let i = 0; i < 20; i++) { many.push(u("f" + i)); many.push(a("a" + i)); } many.push(u("ende"));
const cm = cleanMessages(many);
t("Langer Verlauf wird gekürzt und bleibt gültig", cm && cm.length <= 12 && cm[0].role === "user" && cm[cm.length - 1].content === "ende");

let sent;
const ok = async (url, o) => { sent = { url, o }; return { ok: true, json: async () => ({ content: [{ type: "text", text: "Hallo!" }] }) }; };
t("Antwort wird gelesen", (await askClaude({ apiKey: "k", messages: [u("hi")], fetchFn: ok })) === "Hallo!");
const body = JSON.parse(sent.o.body);
t("Anfrage an Anthropic korrekt", sent.url.includes("api.anthropic.com/v1/messages") && sent.o.headers["x-api-key"] === "k" && body.messages.length === 1 && body.max_tokens > 0 && !!body.system);
let e1; try { await askClaude({ apiKey: "k", messages: [u("hi")], fetchFn: async () => ({ ok: false, status: 401 }) }); } catch (e) { e1 = e; }
t("Fehlerstatus wird weitergereicht", e1 && e1.status === 401);
t("Tagesschlüssel hat Datumsformat", /^\d{4}-\d{2}-\d{2}$/.test(dayKey(NOW)));
process.exit(fails ? 1 : 0);
