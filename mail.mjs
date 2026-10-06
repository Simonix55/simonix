// Versand über Resend (https://resend.com)
export async function sendMail({ apiKey, from, to, code }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Dein AgentSuper-Code: " + code,
      text: "Dein Bestätigungscode lautet " + code + ".\nEr ist 10 Minuten gültig.\n\nWenn du dich nicht bei AgentSuper registriert hast, kannst du diese E-Mail ignorieren.",
      html: '<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px"><h2 style="margin:0 0 12px">AgentSuper</h2><p>Dein Bestätigungscode lautet:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">' + code + '</p><p style="color:#666">Der Code ist 10 Minuten gültig. Wenn du dich nicht registriert hast, ignoriere diese E-Mail.</p></div>',
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const err = new Error("Resend " + r.status + ": " + txt.slice(0, 300));
    err.status = r.status;
    throw err;
  }
}
