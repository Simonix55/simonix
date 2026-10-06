// Holt Mitglieder- und Online-Zahl eines Discord-Servers über den öffentlichen Einladungs-Endpunkt.
export const INVITE = "thjdns2Jyz";

export async function getCounts(code = INVITE, fetchFn = fetch) {
  const r = await fetchFn(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw Object.assign(new Error("discord"), { status: r.status });
  const j = await r.json();
  const members = Number(j.approximate_member_count), online = Number(j.approximate_presence_count);
  if (!Number.isFinite(members)) throw Object.assign(new Error("format"), { status: 0 });
  return { members, online: Number.isFinite(online) ? online : null, name: String((j.guild && j.guild.name) || "") };
}
