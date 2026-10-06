import { getLatest, parseLatest } from "../netlify/functions/lib/youtube.mjs";
let fails = 0; const t = (n, c) => { console.log((c ? "OK   " : "FAIL ") + n); if (!c) fails++; };
const xml = `<?xml version="1.0"?><feed><title>Simonix</title><entry><id>yt:video:abcdefghijk</id><yt:videoId>abcdefghijk</yt:videoId><title>Test &amp; Titel</title><published>2026-10-01T12:00:00+00:00</published></entry><entry><yt:videoId>zzzzzzzzzzz</yt:videoId><title>Älter</title><published>2026-09-01T12:00:00+00:00</published></entry></feed>`;
const v = parseLatest(xml);
t("neuestes (erstes) Video wird gelesen", v && v.id === "abcdefghijk" && v.published.startsWith("2026-10-01"));
t("HTML-Zeichen im Titel werden entschlüsselt", v && v.title === "Test & Titel");
t("leerer Feed gibt null", parseLatest("<feed></feed>") === null);
t("ungültige Video-ID wird abgelehnt", parseLatest("<entry><yt:videoId>x\"onload=1</yt:videoId></entry>") === null);
let url = "";
const r = await getLatest("UC123", async (u) => { url = u; return { ok: true, text: async () => xml }; });
t("Feed-Adresse enthält channel_id", url.includes("channel_id=UC123") && r.id === "abcdefghijk");
let e1; try { await getLatest("UC123", async () => ({ ok: false, status: 404 })); } catch (e) { e1 = e; }
t("Fehlerstatus wird weitergereicht", e1 && e1.status === 404);
process.exit(fails ? 1 : 0);
