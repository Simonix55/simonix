// Logik für den KI-Chat (ohne Netlify-Abhängigkeiten, daher testbar)
export const MODEL = "claude-haiku-4-5-20251001";
export const MAX_MSGS = 12;       // so viele letzte Nachrichten gehen mit
export const MAX_LEN = 1000;      // Zeichen pro Nachricht
export const MAX_TOKENS = 500;    // Länge der Antwort
export const DEFAULT_LIMIT = 20;  // Nachrichten pro Person und Tag

export const SYSTEM =
  "Du bist AgentSuper, ein freundlicher KI-Assistent auf der Website AgentSuper. " +
  "Antworte standardmäßig auf Deutsch (oder in der Sprache der Nutzerin bzw. des Nutzers), klar und kurz. " +
  "Hilf bei Fragen, Texten, Ideen, Rechnen und Programmieren. Wenn du etwas nicht sicher weißt, sag es ehrlich.";

// Prüft und kürzt den Verlauf. Gibt null zurück, wenn er ungültig ist.
export function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const m = input.slice(-MAX_MSGS).map((x) => ({ role: x && x.role, content: String((x && x.content) || "").slice(0, MAX_LEN) }));
  if (m.length && m[0].role === "assistant") m.shift(); // beim Kürzen darf der Verlauf nicht mit der KI beginnen
  if (!m.length || m[0].role !== "user" || m[m.length - 1].role !== "user") return null;
  for (let i = 0; i < m.length; i++) {
    if (m[i].role !== (i % 2 === 0 ? "user" : "assistant") || !m[i].content.trim()) return null;
  }
  return m;
}

export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export async function askClaude({ apiKey, model = MODEL, messages, fetchFn = fetch }) {
  const r = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: SYSTEM, messages }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw Object.assign(new Error("anthropic"), { status: r.status });
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  if (!text) throw Object.assign(new Error("empty"), { status: 0 });
  return text;
}
