// Integración con Holded. En DEMO se simula; en real llama a la Netlify Function
// /.netlify/functions/holded, que guarda la API key en el servidor (nunca en el navegador).

export const DEMO = true;

const toUnix = (iso) => Math.floor(new Date(`${iso}T09:00:00Z`).getTime() / 1000);
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

/** Cuerpo de POST /api/invoicing/v1/documents/{invoice|purchase}. */
export function buildPayload(form, inv) {
  const notes = [];
  if (inv.vat.mode === "isp") notes.push("Inversión del sujeto pasivo (art. 84 LIVA).");
  if (inv.vat.mode === "nosujeta") notes.push("Operación no sujeta a IVA (art. 69 LIVA). Inversión del sujeto pasivo en destino.");
  if (inv.vat.mode === "exento") notes.push("Operación exenta de IVA (art. 20 LIVA).");
  return {
    docType: inv.docType,
    body: {
      contactName: form.contactName.trim(),
      contactCode: inv.info.nif || undefined,
      date: toUnix(form.date),
      dueDate: toUnix(addDays(form.date, form.dueDays)),
      currency: "eur",
      notes: notes.join(" ") || undefined,
      approveDoc: false,
      items: [{
        name: form.concept.trim(),
        units: 1,
        subtotal: inv.base,
        tax: inv.vat.rate,
        retention: inv.irpf.rate,
        account: inv.category.account,
      }],
    },
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fakeId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});

/**
 * Sube la factura. `onStep(index, state)` va informando del progreso para la UI.
 * Devuelve { id, docNumber, simulated }.
 */
export async function submitInvoice(payload, file, onStep, nextNumber) {
  const steps = stepsFor(payload, file);
  if (DEMO) {
    for (let i = 0; i < steps.length; i++) {
      onStep(i, "running");
      await wait(450 + Math.random() * 350);
      onStep(i, "done");
    }
    return { id: fakeId(), docNumber: nextNumber, simulated: true };
  }
  onStep(0, "running");
  const body = { ...payload, attachment: file ? { name: file.name, type: file.type, base64: await fileToBase64(file) } : null };
  const res = await fetch("/.netlify/functions/holded", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Holded respondió ${res.status}`);
  steps.forEach((_, i) => onStep(i, "done"));
  return { id: data.id, docNumber: data.docNumber || nextNumber, simulated: false };
}

export function stepsFor(payload, file) {
  const isSale = payload.docType === "invoice";
  const steps = [
    "Validando datos fiscales",
    `Buscando ${isSale ? "cliente" : "proveedor"} en Holded`,
    `Creando factura de ${isSale ? "venta" : "compra"}`,
  ];
  if (file) steps.push(`Adjuntando ${file.name}`);
  steps.push(`Contabilizando en la cuenta ${payload.body.items[0].account}`);
  return steps;
}
