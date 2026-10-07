// Motor de cálculo: funciones puras, sin DOM, testeadas en tests/calc.test.mjs.
import {
  ACCOUNTS, CONTACTS, DEFAULT_PURCHASE, DEFAULT_SALE, EU, IVA_OPTIONS, PURCHASE_CATEGORIES,
  SALE_CATEGORIES, VAT_HINTS,
} from "./rules.js";

export const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
export const fold = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Coincidencia desde el inicio de palabra: «anuncio» acierta en «anuncios», «api» no en «capital».
const hasWord = (text, k) => new RegExp(`(^|[^a-z0-9])${escapeRe(fold(k).trim())}`).test(text);
const cleanNif = (nif) => (nif || "").toUpperCase().replace(/[\s.\-]/g, "");

// ------------------------------------------------------------------ NIF
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

export function nifInfo(raw) {
  const nif = cleanNif(raw);
  if (!nif) return { nif, zone: "ES", country: "ES", person: false, valid: null };
  const prefix = nif.slice(0, 2);
  if (/^[A-Z]{2}/.test(prefix) && prefix !== "ES") {
    const zone = EU.has(prefix) ? "EU" : "NONEU";
    return { nif, zone, country: prefix, person: false, valid: nif.length >= 5 };
  }
  const local = prefix === "ES" ? nif.slice(2) : nif;
  if (/^\d{8}[A-Z]$/.test(local)) {
    const ok = DNI_LETTERS[Number(local.slice(0, 8)) % 23] === local[8];
    return { nif, zone: "ES", country: "ES", person: true, valid: ok };
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(local)) {
    const num = Number("XYZ".indexOf(local[0]) + local.slice(1, 8));
    return { nif, zone: "ES", country: "ES", person: true, valid: DNI_LETTERS[num % 23] === local[8] };
  }
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(local)) {
    return { nif, zone: "ES", country: "ES", person: false, valid: true };
  }
  return { nif, zone: "ES", country: "ES", person: false, valid: false };
}

export function findContact(name) {
  const f = fold(name).trim();
  if (!f) return null;
  return CONTACTS.find((c) => fold(c.name) === f) || null;
}

// ------------------------------------------------------------ categoría
export function suggestCategory(kind, concept, contactName, base) {
  const text = ` ${fold(concept)} ${fold(contactName)} `;
  const list = kind === "venta" ? SALE_CATEGORIES : PURCHASE_CATEGORIES;
  for (const cat of list) {
    const hit = cat.keywords.find((k) => hasWord(text, k));
    if (!hit) continue;
    if (cat.minBase && base < cat.minBase) {
      return { account: "629", label: "Otros servicios", confidence: "media",
        reason: `«${hit}» es equipo informático, pero por debajo de ${cat.minBase} € se puede llevar directamente a gasto.` };
    }
    return { account: cat.account, label: cat.label, confidence: "alta", reason: `Detectado «${hit}» en el concepto o el nombre.` };
  }
  const def = kind === "venta" ? DEFAULT_SALE : DEFAULT_PURCHASE;
  return {
    ...def,
    confidence: kind === "venta" ? "alta" : "baja",
    reason: kind === "venta" ? "Astra factura servicios: cuenta 705 por defecto."
      : "No reconozco el tipo de gasto: lo llevo a 629 «Otros servicios». Revísalo.",
  };
}

// ------------------------------------------------------------------ IVA
export function suggestVat(kind, zone, concept, contactName) {
  if (kind === "compra" && zone !== "ES") {
    return { key: "isp", mode: "isp", rate: 0, selfRate: 21,
      reason: "Proveedor extranjero: inversión del sujeto pasivo (art. 84 LIVA). La factura viene sin IVA y Astra lo autoliquida al 21 % (472 y 477 a la vez, efecto neutro)." };
  }
  if (kind === "venta" && zone === "EU") {
    return { key: "nosujeta", mode: "nosujeta", rate: 0,
      reason: "Servicio a empresa de la UE: no sujeto en España (art. 69 LIVA), el cliente aplica la inversión del sujeto pasivo. Hay que indicarlo en la factura y declararlo en el modelo 349." };
  }
  if (kind === "venta" && zone === "NONEU") {
    return { key: "nosujeta", mode: "nosujeta", rate: 0, reason: "Cliente fuera de la UE: servicio no sujeto a IVA español (art. 69 LIVA)." };
  }
  const text = ` ${fold(concept)} ${fold(contactName)} `;
  for (const h of VAT_HINTS) {
    if (h.keywords.some((k) => hasWord(text, k))) {
      const key = h.mode === "exento" ? "exento" : String(h.rate);
      return { key, mode: h.mode, rate: h.rate, reason: h.reason };
    }
  }
  return { key: "21", mode: "normal", rate: 21, reason: "Tipo general del 21 %." };
}

export function suggestIrpf(kind, info) {
  if (kind === "compra" && info.zone === "ES" && info.person) {
    return { rate: 15, reason: "Proveedor persona física (autónomo profesional): retención de IRPF del 15 %. Usa 7 % si es nuevo autónomo (primeros 3 años)." };
  }
  if (kind === "venta") return { rate: 0, reason: "Astra es sociedad: sus facturas no llevan retención de IRPF." };
  return { rate: 0, reason: "Proveedor empresa o extranjero: sin retención de IRPF." };
}

// --------------------------------------------------------------- factura
/**
 * @param {object} input
 *   kind: "venta" | "compra"; contactName; nif; concept; amount (número);
 *   amountIncludesVat (bool); date "YYYY-MM-DD"; dueDays; hasAttachment (bool);
 *   overrides: { account?, vatKey?, irpfRate? }
 */
export function computeInvoice(input) {
  const kind = input.kind === "venta" ? "venta" : "compra";
  const ov = input.overrides || {};
  const info = nifInfo(input.nif);
  const amount = Number(input.amount) || 0;

  const vatAuto = suggestVat(kind, info.zone, input.concept, input.contactName);
  const vatOpt = ov.vatKey ? IVA_OPTIONS.find((o) => o.key === ov.vatKey) : null;
  const vat = vatOpt
    ? { ...vatOpt, selfRate: vatOpt.mode === "isp" ? 21 : 0, reason: "Elegido a mano.", manual: true }
    : vatAuto;

  const irpfAuto = suggestIrpf(kind, info);
  const irpfRate = ov.irpfRate != null && ov.irpfRate !== "" ? Number(ov.irpfRate) : irpfAuto.rate;

  const base = round2(input.amountIncludesVat ? amount / (1 + vat.rate / 100) : amount);
  const vatAmount = round2((base * vat.rate) / 100);
  const irpfAmount = round2((base * irpfRate) / 100);
  const total = round2(base + vatAmount - irpfAmount);
  const selfVat = vat.mode === "isp" ? round2((base * (vat.selfRate || 21)) / 100) : 0;

  const catAuto = suggestCategory(kind, input.concept, input.contactName, base);
  const account = ov.account || catAuto.account;
  const category = ov.account
    ? { account, label: ACCOUNTS[account], confidence: "manual", reason: "Elegida a mano." }
    : catAuto;

  const counterpart = kind === "venta" ? "430" : account === "217" ? "523" : account.startsWith("60") ? "400" : "410";
  const lines = [];
  const add = (acc, debe, haber) => {
    if (debe || haber) lines.push({ account: acc, name: ACCOUNTS[acc] || acc, debe: round2(debe), haber: round2(haber) });
  };
  if (kind === "compra") {
    add(account, base, 0);
    add("472", vatAmount + selfVat, 0);
    add("477", 0, selfVat);
    add("4751", 0, irpfAmount);
    add(counterpart, 0, total);
  } else {
    add("430", total, 0);
    add("473", irpfAmount, 0);
    add(account, 0, base);
    add("477", 0, vatAmount);
  }
  const debe = round2(lines.reduce((s, l) => s + l.debe, 0));
  const haber = round2(lines.reduce((s, l) => s + l.haber, 0));

  const warnings = [];
  if (!input.contactName?.trim()) warnings.push({ level: "error", text: `Falta el nombre del ${kind === "venta" ? "cliente" : "proveedor"}.` });
  if (!input.concept?.trim()) warnings.push({ level: "error", text: "Falta el concepto." });
  if (!(amount > 0)) warnings.push({ level: "error", text: "El importe debe ser mayor que 0." });
  if (info.nif && info.valid === false) warnings.push({ level: "warn", text: `El NIF/CIF «${info.nif}» no parece válido. Revísalo antes de subir.` });
  if (!info.nif) warnings.push({ level: "warn", text: "Sin NIF/CIF: Hacienda lo exige en facturas completas." });
  if (kind === "compra" && !input.hasAttachment) warnings.push({ level: "warn", text: "Compra sin adjunto: sube el PDF o la foto de la factura del proveedor." });
  if (!ov.account && category.confidence === "baja") warnings.push({ level: "warn", text: "Cuenta contable puesta por defecto: confírmala." });

  return {
    kind, docType: kind === "venta" ? "invoice" : "purchase", info, base, vat, vatAmount, irpf: { rate: irpfRate, reason: ov.irpfRate != null && ov.irpfRate !== "" ? "Elegido a mano." : irpfAuto.reason },
    irpfAmount, total, selfVat, category, counterpart, journal: { lines, debe, haber, balanced: debe === haber },
    warnings, canSubmit: !warnings.some((w) => w.level === "error"),
  };
}

// Resumen de un conjunto de facturas registradas (para 303 / 111).
export function summarize(records) {
  const s = { sales: 0, purchases: 0, vatOut: 0, vatIn: 0, irpf: 0, count: records.length };
  for (const r of records) {
    if (r.kind === "venta") { s.sales += r.base; s.vatOut += r.vatAmount; }
    else { s.purchases += r.base; s.vatIn += r.vatAmount + (r.selfVat || 0); s.vatOut += r.selfVat || 0; s.irpf += r.irpfAmount; }
  }
  for (const k of ["sales", "purchases", "vatOut", "vatIn", "irpf"]) s[k] = round2(s[k]);
  s.vatResult = round2(s.vatOut - s.vatIn);
  return s;
}
