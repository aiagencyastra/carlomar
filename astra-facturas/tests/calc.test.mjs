import assert from "node:assert/strict";
import { test } from "node:test";

import { computeInvoice, nifInfo, suggestCategory, summarize } from "../js/calc.js";

const base = { date: "2026-10-07", dueDays: 30, hasAttachment: true };

test("NIF: DNI, CIF, NIE, UE y fuera de la UE", () => {
  assert.deepEqual([nifInfo("43123456C").person, nifInfo("43123456C").valid], [true, true]);
  assert.equal(nifInfo("43123456K").valid, false);
  assert.deepEqual([nifInfo("B57123456").person, nifInfo("B57123456").zone], [false, "ES"]);
  assert.equal(nifInfo("X1234567L").valid, true);
  assert.equal(nifInfo("IE9692928F").zone, "EU");
  assert.equal(nifInfo("US812345678").zone, "NONEU");
  assert.equal(nifInfo("ESB57123456").zone, "ES");
});

test("Compra nacional a empresa: 21 % y cuenta por concepto", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Vodafone España SAU", nif: "A80907397", concept: "Fibra + líneas móviles", amount: 135 });
  assert.equal(inv.category.account, "628");
  assert.equal(inv.vatAmount, 28.35);
  assert.equal(inv.total, 163.35);
  assert.equal(inv.counterpart, "410");
  assert.ok(inv.journal.balanced);
});

test("Freelance autónomo: IRPF 15 % y cuenta 623", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Laura Martí Ferrer", nif: "43123456C", concept: "Desarrollo web 40 horas", amount: 1800 });
  assert.equal(inv.category.account, "623");
  assert.equal(inv.irpf.rate, 15);
  assert.equal(inv.irpfAmount, 270);
  assert.equal(inv.total, 1908);
  const l4751 = inv.journal.lines.find((l) => l.account === "4751");
  assert.equal(l4751.haber, 270);
});

test("Proveedor UE: inversión del sujeto pasivo, asiento neutro 472/477", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Meta Platforms Ireland Ltd", nif: "IE9692928F", concept: "Campaña Meta Ads", amount: 1000 });
  assert.equal(inv.vat.mode, "isp");
  assert.equal(inv.category.account, "627");
  assert.equal(inv.vatAmount, 0);
  assert.equal(inv.total, 1000);
  const debe472 = inv.journal.lines.find((l) => l.account === "472").debe;
  const haber477 = inv.journal.lines.find((l) => l.account === "477").haber;
  assert.equal(debe472, 210);
  assert.equal(haber477, 210);
  assert.ok(inv.journal.balanced);
});

test("Hotel con IVA incluido: 10 % y base calculada hacia atrás", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Hotel X SL", nif: "B08888555", concept: "Hotel 2 noches", amount: 264, amountIncludesVat: true });
  assert.equal(inv.vat.rate, 10);
  assert.equal(inv.base, 240);
  assert.equal(inv.total, 264);
});

test("Seguro: exento de IVA y cuenta 625", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Mapfre España SA", nif: "A28141935", concept: "Seguro RC profesional", amount: 420 });
  assert.equal(inv.vat.mode, "exento");
  assert.equal(inv.category.account, "625");
  assert.equal(inv.total, 420);
});

test("Equipo informático: 217 si supera 300 €, gasto si no", () => {
  assert.equal(suggestCategory("compra", "MacBook Pro 14", "Apple", 2400).account, "217");
  assert.equal(suggestCategory("compra", "Monitor 24 pulgadas", "Amazon", 180).account, "629");
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Apple", nif: "B12345674", concept: "MacBook Pro", amount: 2400 });
  assert.equal(inv.counterpart, "523");
});

test("Venta nacional: 705, 21 %, sin IRPF, asiento 430/705/477", () => {
  const inv = computeInvoice({ ...base, kind: "venta", contactName: "Skyla Travel Tech SL", nif: "B57123456", concept: "Retainer mensual", amount: 7500 });
  assert.equal(inv.category.account, "705");
  assert.equal(inv.vatAmount, 1575);
  assert.equal(inv.irpf.rate, 0);
  assert.deepEqual(inv.journal.lines.map((l) => l.account), ["430", "705", "477"]);
  assert.ok(inv.journal.balanced);
});

test("«producto» suelto no convierte un servicio en venta de mercaderías", () => {
  assert.equal(suggestCategory("venta", "Retainer · equipo producto IA", "Skyla", 7500).account, "705");
  assert.equal(suggestCategory("venta", "Venta de productos de hardware", "X", 900).account, "700");
});

test("Venta a empresa UE: no sujeta", () => {
  const inv = computeInvoice({ ...base, kind: "venta", contactName: "Nordlicht Media GmbH", nif: "DE811569869", concept: "Workshop IA", amount: 4200 });
  assert.equal(inv.vat.mode, "nosujeta");
  assert.equal(inv.total, 4200);
});

test("Correcciones manuales ganan a lo automático", () => {
  const inv = computeInvoice({ ...base, kind: "compra", contactName: "Laura Martí Ferrer", nif: "43123456C", concept: "Desarrollo", amount: 1000,
    overrides: { account: "629", vatKey: "10", irpfRate: "7" } });
  assert.equal(inv.category.account, "629");
  assert.equal(inv.vat.rate, 10);
  assert.equal(inv.irpfAmount, 70);
});

test("Avisos: errores bloquean, avisos no", () => {
  const empty = computeInvoice({ ...base, kind: "compra", contactName: "", nif: "", concept: "", amount: 0 });
  assert.equal(empty.canSubmit, false);
  const noAttach = computeInvoice({ ...base, kind: "compra", contactName: "X SL", nif: "B57333444", concept: "Alquiler", amount: 100, hasAttachment: false });
  assert.equal(noAttach.canSubmit, true);
  assert.ok(noAttach.warnings.some((w) => w.text.includes("adjunto")));
});

test("Palabras clave solo desde inicio de palabra", () => {
  assert.equal(suggestCategory("compra", "Ampliación de capital", "Notaría", 100).account, "623"); // notari
  assert.equal(suggestCategory("compra", "Capital riesgo", "Fondo", 100).confidence, "baja");
});

test("Resumen para 303 y 111 incluye la autoliquidación ISP", () => {
  const recs = [
    computeInvoice({ ...base, kind: "venta", contactName: "A", nif: "B57123456", concept: "Servicio", amount: 1000 }),
    computeInvoice({ ...base, kind: "compra", contactName: "Meta", nif: "IE9692928F", concept: "Meta Ads", amount: 100 }),
    computeInvoice({ ...base, kind: "compra", contactName: "Laura", nif: "43123456C", concept: "Desarrollo", amount: 500 }),
  ];
  const s = summarize(recs);
  assert.equal(s.vatOut, 210 + 21);
  assert.equal(s.vatIn, 21 + 105);
  assert.equal(s.vatResult, 105);
  assert.equal(s.irpf, 75);
});
