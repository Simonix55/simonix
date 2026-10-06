import { clean, limited, sendToDiscord } from "../netlify/functions/lib/chat.mjs";
let fails = 0; const t = (n, c) => { console.log((c ? "OK   " : "FAIL ") + n); if (!c) fails++; };
const hook = "https://discord.com/api/webhooks/123456/abc-DEF_1";
t("Name und Text werden gelesen", JSON.stringify(clean({ name: " Max ", text: " Hi " })) === '{"name":"Max","text":"Hi"}');
t("Leere Eingaben abgelehnt", clean({ name: "", text: "x" }) === null && clean({ name: "a", text: "  " }) === null && clean(null) === null);
t("Honeypot blockt Bots", clean({ name: "a", text: "b", website: "x" }) === null);
t("Text auf 500 Zeichen gekürzt", clean({ name: "a", text: "x".repeat(900) }).text.length === 500);
t("'discord' im Namen entfernt", !/discord/i.test(clean({ name: "Discord Max", text: "x" }).name));
let sent; await sendToDiscord({ name: "Max", text: "@everyone hi" }, hook, async (u, o) => { sent = JSON.parse(o.body); return { ok: true }; });
t("Mentions sind abgeschaltet", sent.allowed_mentions.parse.length === 0 && sent.username === "Max (Website)");
let e1; try { await sendToDiscord({ name: "a", text: "b" }, "https://evil.example/x", async () => ({ ok: true })); } catch (e) { e1 = e; }
t("Fremde Webhook-Adresse abgelehnt", e1 && e1.status === 503);
let e2; try { await sendToDiscord({ name: "a", text: "b" }, hook, async () => ({ ok: false, status: 404 })); } catch (e) { e2 = e; }
t("Discord-Fehler wird weitergereicht", e2 && e2.status === 404);
t("Rate-Limit: zweite Nachricht sofort gebremst", limited("ip1", 1000) === false && limited("ip1", 2000) === true && limited("ip1", 9000) === false);
process.exit(fails ? 1 : 0);
