import { getCounts } from "../netlify/functions/lib/discord.mjs";
let fails = 0; const t = (n, c) => { console.log((c ? "OK   " : "FAIL ") + n); if (!c) fails++; };
let url = "";
const ok = async (u) => { url = u; return { ok: true, json: async () => ({ approximate_member_count: 1234, approximate_presence_count: 56, guild: { name: "Test" } }) }; };
const r = await getCounts("abc", ok);
t("Zahlen werden gelesen", r.members === 1234 && r.online === 56 && r.name === "Test");
t("Einladung und with_counts in der Adresse", url.includes("/invites/abc") && url.includes("with_counts=true"));
let e1; try { await getCounts("abc", async () => ({ ok: false, status: 404 })); } catch (e) { e1 = e; }
t("Fehlerstatus wird weitergereicht", e1 && e1.status === 404);
let e2; try { await getCounts("abc", async () => ({ ok: true, json: async () => ({}) })); } catch (e) { e2 = e; }
t("Antwort ohne Zahl wird abgelehnt", !!e2);
process.exit(fails ? 1 : 0);
