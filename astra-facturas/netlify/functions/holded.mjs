// Proxy a la API de Holded. La clave vive en la variable de entorno HOLDED_API_KEY
// de Netlify y nunca llega al navegador. Mientras la demo tenga DEMO = true en
// js/holded.js, esta función no se llama.
//
// POST { docType: "invoice" | "purchase", body: {...}, attachment?: { name, type, base64 } }

const API = "https://api.holded.com/api/invoicing/v1";
const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  const key = process.env.HOLDED_API_KEY;
  if (!key) return json(501, { error: "HOLDED_API_KEY no configurada: la demo funciona en modo simulado." });

  let input;
  try { input = await req.json(); } catch { return json(400, { error: "JSON inválido" }); }
  const { docType, body, attachment } = input || {};
  if (!["invoice", "purchase"].includes(docType) || !body?.items?.length) {
    return json(400, { error: "Faltan datos de la factura" });
  }

  const created = await fetch(`${API}/documents/${docType}`, {
    method: "POST", headers: { key, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const doc = await created.json().catch(() => ({}));
  if (!created.ok || !doc.id) return json(502, { error: `Holded no creó el documento (${created.status})`, detail: doc });

  if (attachment?.base64) {
    const form = new FormData();
    const bytes = Buffer.from(attachment.base64, "base64");
    form.append("file", new Blob([bytes], { type: attachment.type || "application/octet-stream" }), attachment.name);
    const att = await fetch(`${API}/documents/${docType}/${doc.id}/attach`, { method: "POST", headers: { key }, body: form });
    if (!att.ok) return json(207, { id: doc.id, warning: `Factura creada, pero el adjunto falló (${att.status})` });
  }
  return json(200, { id: doc.id, docNumber: doc.docNumber || null });
};
