// Holt das neueste Video eines YouTube-Kanals über den öffentlichen RSS-Feed (kein API-Key nötig).
export const CHANNEL_ID = "UC0Jsl4eV4bDdKUiLp5SainQ"; // @SimonixWad

const decode = (s) =>
  String(s)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

export function parseLatest(xml) {
  const entry = /<entry>([\s\S]*?)<\/entry>/.exec(xml);
  if (!entry) return null;
  const pick = (re) => { const m = re.exec(entry[1]); return m ? decode(m[1]).trim() : ""; };
  const id = pick(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return { id, title: pick(/<title>([^<]*)<\/title>/), published: pick(/<published>([^<]+)<\/published>/) };
}

export async function getLatest(channelId = CHANNEL_ID, fetchFn = fetch) {
  const r = await fetchFn(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
    headers: { Accept: "application/atom+xml,application/xml" },
  });
  if (!r.ok) throw Object.assign(new Error("youtube"), { status: r.status });
  const v = parseLatest(await r.text());
  if (!v) throw Object.assign(new Error("format"), { status: 0 });
  return v;
}
