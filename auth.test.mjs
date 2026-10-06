import { getSecret, issue, check, TTL, COOLDOWN, MAX_TRIES, hashCode, keyFor } from "../netlify/functions/lib/auth.mjs";
const mem = () => { const m = new Map(); return { get: async (k) => m.has(k) ? JSON.parse(m.get(k)) : null, setJSON: async (k, v) => { m.set(k, JSON.stringify(v)); }, delete: async (k) => { m.delete(k); }, _m: m }; };
let fails = 0; const t = (n, c) => { console.log((c ? "OK   " : "FAIL ") + n); if (!c) fails++; };
const S = "geheim", E = "a@b.de";
let store = mem(), sent = [];
const send = async (to, code) => sent.push(code);
const T0 = 1_000_000;

let r = await issue({ store, secret: S, email: E, send, now: T0 });
t("Code wird erzeugt und gesendet", r.status === 200 && sent.length === 1 && /^\d{6}$/.test(sent[0]));
t("Code liegt nicht im Klartext im Speicher", ![...store._m.values()].some(v => v.includes(sent[0]) && !v.includes('"h"')) && !JSON.stringify([...store._m.values()]).includes('"'+sent[0]+'"'));

r = await issue({ store, secret: S, email: E, send, now: T0 + 5000 });
t("Zweiter Code innerhalb 60 s wird abgelehnt (429)", r.status === 429 && r.retryIn === 55 && sent.length === 1);

const good = sent[0], bad = good === "000000" ? "111111" : "000000";
r = await check({ store, secret: S, email: E, code: bad, now: T0 + 1000 });
t("Falscher Code: 400, 4 Versuche übrig", r.status === 400 && r.error === "wrong" && r.left === 4);
r = await check({ store, secret: S, email: E, code: good, now: T0 + 2000 });
t("Richtiger Code wird akzeptiert", r.status === 200 && r.ok);
r = await check({ store, secret: S, email: E, code: good, now: T0 + 3000 });
t("Derselbe Code ist nur einmal verwendbar", r.status === 400 && r.error === "none");

// Sperre
store = mem(); sent = [];
await issue({ store, secret: S, email: E, send, now: T0 });
const g2 = sent[0], b2 = g2 === "000000" ? "111111" : "000000";
let last; for (let i = 0; i < MAX_TRIES; i++) last = await check({ store, secret: S, email: E, code: b2, now: T0 + i });
t("Nach 5 Fehlversuchen gesperrt (429)", last.status === 429 && last.error === "locked");
r = await check({ store, secret: S, email: E, code: g2, now: T0 + 10 });
t("Auch der richtige Code ist danach gesperrt", r.status === 429 && r.error === "locked");
r = await issue({ store, secret: S, email: E, send, now: T0 + 20_000 });
t("Neuer Code direkt nach Sperre nicht möglich (60 s Pause)", r.status === 429);
r = await issue({ store, secret: S, email: E, send, now: T0 + COOLDOWN + 1 });
t("Nach 60 s gibt es einen neuen Code", r.status === 200 && sent.length === 2);
r = await check({ store, secret: S, email: E, code: sent[1], now: T0 + COOLDOWN + 2 });
t("Der neue Code funktioniert", r.status === 200);

// Ablauf
store = mem(); sent = [];
await issue({ store, secret: S, email: E, send, now: T0 });
r = await check({ store, secret: S, email: E, code: sent[0], now: T0 + TTL + 1 });
t("Abgelaufener Code wird abgelehnt", r.status === 400 && r.error === "expired");

// Andere E-Mail / anderes Secret
store = mem(); sent = [];
await issue({ store, secret: S, email: E, send, now: T0 });
r = await check({ store, secret: S, email: "x@y.de", code: sent[0], now: T0 + 1 });
t("Code gilt nicht für andere E-Mail", r.status === 400);
r = await check({ store, secret: "anderes", email: E, code: sent[0], now: T0 + 1 });
t("Code gilt nicht mit anderem Secret", r.status === 400 && r.error === "wrong");

// Mailfehler
store = mem();
r = await issue({ store, secret: S, email: E, send: async () => { const e = new Error("x"); e.status = 403; throw e; }, now: T0 });
t("Mailfehler: 502, Statuscode 403 durchgereicht, nichts gespeichert", r.status === 502 && r.code === 403 && store._m.size === 0);
// Geheimnis automatisch
store = mem();
const s1 = await getSecret("", store), s2 = await getSecret("", store);
t("Geheimnis wird automatisch erzeugt (64 Zeichen) und bleibt gleich", s1.length === 64 && s1 === s2);
t("Gesetzte Variable CODE_SECRET hat Vorrang", (await getSecret("meins", store)) === "meins");
console.log(fails ? fails + " FEHLER" : "Alle Tests bestanden"); process.exit(fails ? 1 : 0);
