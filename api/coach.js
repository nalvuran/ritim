/**
 * İsteğe bağlı AI koç sunucusu (Vercel Serverless Function örneği).
 * API anahtarı tarayıcıya hiç gönderilmez; yalnızca bu fonksiyonda kullanılır.
 *
 * Ortam değişkenleri:
 *   ANTHROPIC_API_KEY   (zorunlu)
 *   ANTHROPIC_MODEL     (isteğe bağlı; güncel model adları: https://docs.claude.com/en/docs/about-claude/models)
 * İstemci tarafında: VITE_COACH_ENDPOINT=/api/coach
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "missing_api_key" });
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!messages || !messages.length) return res.status(400).json({ error: "bad_request" });
  // Basit doğrulama ve boyut sınırı
  const clean = messages
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-14)
    .map(m => ({ role: m.role, content: m.content.slice(0, 40000) }));
  // Ardışık aynı rolleri birleştir (API sırayla user/assistant bekler)
  const merged = [];
  for (const m of clean) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content; else merged.push({ ...m });
  }
  if (!merged.length || merged[0].role !== "user") return res.status(400).json({ error: "bad_request" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 800, messages: merged }),
    });
    if (r.status === 429) return res.status(429).json({ error: "rate_limited" });
    if (!r.ok) return res.status(502).json({ error: "upstream_error" });
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "upstream_error" });
  }
}
