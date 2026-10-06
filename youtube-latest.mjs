import { getLatest } from "./lib/youtube.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "Content-Type": "application/json", "Cache-Control": s === 200 ? "public, max-age=300" : "no-store" },
  });

export default async () => {
  try {
    return json({ ok: true, ...(await getLatest()) });
  } catch (e) {
    console.warn("YouTube-Video nicht abrufbar:", e && e.status ? e.status : e);
    return json({ ok: false, error: "youtube", status: (e && e.status) || 0 }, 502);
  }
};

export const config = { path: "/api/youtube-latest" };
