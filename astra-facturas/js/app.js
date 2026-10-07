import { computeInvoice, findContact, summarize } from "./calc.js";
import { buildPayload, submitInvoice, stepsFor } from "./holded.js";
import { ACCOUNTS, CONTACTS, IRPF_OPTIONS, IVA_OPTIONS, PURCHASE_CATEGORIES, SALE_CATEGORIES } from "./rules.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "astra-facturas-v2";

const eurFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", useGrouping: "always" });
const eur = (x) => eurFmt.format(x || 0);
const fmtDate = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, d) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + Number(d)); return t.toISOString().slice(0, 10); };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = { kind: "compra", file: null, fileUrl: null, records: [] };

// ----------------------------------------------------------- registro
function seedRecords() {
  const year = new Date().getFullYear();
  const mk = (form, docNumber, daysAgo, attachment) => {
    const date = addDays(todayIso(), -daysAgo);
    return toRecord({ ...form, date, dueDays: 30 }, computeInvoice({ ...form, date, hasAttachment: !!attachment }),
      { id: "demo" + docNumber, docNumber, simulated: true }, attachment);
  };
  const y = String(year).slice(2);
  return [
    mk({ kind: "venta", contactName: "Skyla Travel Tech SL", nif: "B57123456", concept: "Retainer mensual · equipo producto IA", amount: 7500 }, `F${y}-0041`, 6, null),
    mk({ kind: "compra", contactName: "Palma Hub Coworking SL", nif: "B57333444", concept: "Alquiler puestos coworking", amount: 1450 }, `C${y}-0118`, 5, { name: "coworking-octubre.pdf", size: 84211 }),
    mk({ kind: "compra", contactName: "Gestoría Rullán & Asociados SL", nif: "B07222111", concept: "Asesoría fiscal, contable y laboral", amount: 380 }, `C${y}-0119`, 4, { name: "gestoria.pdf", size: 61022 }),
    mk({ kind: "venta", contactName: "Orion Retail Group SA", nif: "A28456789", concept: "Plataforma BI y forecasting de demanda", amount: 5400 }, `F${y}-0042`, 2, null),
  ];
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    state.records = Array.isArray(saved) ? saved : seedRecords();
  } catch { state.records = seedRecords(); }
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records)); } catch { /* modo privado */ } }

function toRecord(form, inv, result, attachment) {
  return {
    id: result.id, docNumber: result.docNumber, simulated: result.simulated, date: form.date, kind: inv.kind,
    contactName: form.contactName.trim(), nif: inv.info.nif, concept: form.concept.trim(),
    account: inv.category.account, accountName: ACCOUNTS[inv.category.account], base: inv.base,
    vatAmount: inv.vatAmount, vatLabel: vatLabel(inv), selfVat: inv.selfVat, irpfAmount: inv.irpfAmount, total: inv.total,
    attachment: attachment ? { name: attachment.name, size: attachment.size } : null,
  };
}

function nextNumber(kind) {
  const y = String(new Date().getFullYear()).slice(2);
  const prefix = kind === "venta" ? `F${y}-` : `C${y}-`;
  const max = state.records.filter((r) => r.docNumber.startsWith(prefix))
    .reduce((m, r) => Math.max(m, Number(r.docNumber.slice(prefix.length)) || 0), 0);
  return prefix + String(max + 1).padStart(4, "0");
}

// --------------------------------------------------------- formulario
function readForm() {
  return {
    kind: state.kind,
    contactName: $("contactName").value,
    nif: $("nif").value,
    concept: $("concept").value,
    amount: parseFloat(String($("amount").value).replace(",", ".")),
    amountIncludesVat: $("inclVat").checked,
    date: $("date").value || todayIso(),
    dueDays: $("dueDays").value,
    hasAttachment: !!state.file,
    overrides: {
      account: $("account").value || undefined,
      vatKey: $("vatKey").value || undefined,
      irpfRate: $("irpf").value === "" ? undefined : $("irpf").value,
    },
  };
}

function vatLabel(inv) {
  if (inv.vat.mode === "isp") return "ISP";
  if (inv.vat.mode === "exento") return "Exento";
  if (inv.vat.mode === "nosujeta") return "No sujeta";
  return `${inv.vat.rate} %`;
}

function fillSelects(auto) {
  const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
  const cats = state.kind === "venta" ? SALE_CATEGORIES : PURCHASE_CATEGORIES;
  const codes = [...new Set([...cats.map((c) => c.account), state.kind === "compra" ? "629" : "705"])];
  keep($("account"), `<option value="">Auto · ${auto.category.account} ${esc(ACCOUNTS[auto.category.account])}</option>`
    + codes.sort().map((c) => `<option value="${c}">${c} · ${esc(ACCOUNTS[c])}</option>`).join(""));
  const vatOpts = IVA_OPTIONS.filter((o) => (state.kind === "venta" ? o.key !== "isp" : o.key !== "nosujeta"));
  keep($("vatKey"), `<option value="">Auto · ${esc(vatLabel(auto))}</option>`
    + vatOpts.map((o) => `<option value="${o.key}">${esc(o.label)}</option>`).join(""));
  keep($("irpf"), `<option value="">Auto · ${auto.irpf.rate} %</option>`
    + IRPF_OPTIONS.map((r) => `<option value="${r}">${r} %</option>`).join(""));
}

function render() {
  const form = readForm();
  const auto = computeInvoice({ ...form, overrides: {} });
  fillSelects(auto);
  const inv = computeInvoice(readForm());
  const isSale = inv.kind === "venta";

  $("contactLabel").textContent = isSale ? "Cliente" : "Proveedor";
  $("concept").placeholder = isSale ? "Ej.: Retainer mensual octubre" : "Ej.: Campaña Meta Ads octubre";
  $("attachWrap").hidden = isSale;
  document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.kind === state.kind)));

  // NIF
  const hint = $("nifHint");
  const zoneTxt = { ES: "España", EU: `UE (${inv.info.country})`, NONEU: `fuera de la UE (${inv.info.country})` }[inv.info.zone];
  if (!inv.info.nif) { hint.textContent = ""; hint.className = "hint"; }
  else if (inv.info.valid === false) { hint.textContent = `No parece un NIF válido · ${zoneTxt}`; hint.className = "hint bad"; }
  else { hint.textContent = `✓ ${inv.info.person ? "Persona física (autónomo)" : "Empresa"} · ${zoneTxt}`; hint.className = "hint ok"; }

  // Vista previa
  $("pvKind").textContent = isSale ? "Factura de venta" : "Factura de compra";
  $("pvKind").className = `pill ${inv.kind}`;
  $("pvPartyLabel").textContent = isSale ? "Cliente" : "Proveedor";
  $("pvParty").textContent = form.contactName.trim() || "—";
  $("pvNif").textContent = inv.info.nif || "";
  $("pvDates").textContent = `${fmtDate(form.date)} · ${fmtDate(addDays(form.date, form.dueDays))}`;
  $("pvBase").textContent = eur(inv.base);
  $("pvVatLabel").textContent = inv.vat.mode === "normal" ? `IVA ${inv.vat.rate} %` : `IVA (${{ isp: "inversión del sujeto pasivo", exento: "exento", nosujeta: "no sujeta" }[inv.vat.mode]})`;
  $("pvVat").textContent = eur(inv.vatAmount);
  $("pvIrpfRow").hidden = !inv.irpfAmount;
  $("pvIrpfLabel").textContent = `Retención IRPF ${inv.irpf.rate} %`;
  $("pvIrpf").textContent = `−${eur(inv.irpfAmount)}`;
  $("pvTotalLabel").textContent = isSale ? "Total a cobrar" : "Total a pagar";
  $("pvTotal").textContent = eur(inv.total);

  $("pvAccount").textContent = `${inv.category.account} · ${ACCOUNTS[inv.category.account]}`;
  $("pvAccountWhy").textContent = inv.category.reason;
  $("pvVatMode").textContent = inv.vat.mode === "isp" ? `Inversión del sujeto pasivo · autoliquidado ${eur(inv.selfVat)}`
    : inv.vat.mode === "normal" ? `${inv.vat.rate} % · ${eur(inv.vatAmount)}` : `${vatLabel(inv)} · 0,00 €`;
  $("pvVatWhy").textContent = inv.vat.reason;
  $("pvIrpfMode").textContent = inv.irpf.rate ? `${inv.irpf.rate} % · ${eur(inv.irpfAmount)} (modelo 111)` : "Sin retención";
  $("pvIrpfWhy").textContent = inv.irpf.reason;

  $("journal").innerHTML = inv.journal.lines.map((l) => `<tr>
      <td><span class="acc">${l.account}</span>${esc(l.name)}</td>
      <td class="num">${l.debe ? eur(l.debe) : ""}</td><td class="num">${l.haber ? eur(l.haber) : ""}</td></tr>`).join("");
  $("jDebe").textContent = eur(inv.journal.debe);
  $("jHaber").textContent = eur(inv.journal.haber);

  // Con el formulario vacío no se riñe: los avisos aparecen al empezar a rellenarlo.
  const pristine = !form.contactName.trim() && !form.concept.trim() && !(form.amount > 0);
  $("warnings").innerHTML = pristine ? "" : inv.warnings.map((w) => `<li class="${w.level}">${w.level === "error" ? "✕" : "!"} ${esc(w.text)}</li>`).join("");
  $("submit").disabled = !inv.canSubmit;
  $("submit").textContent = isSale ? "Emitir y subir a Holded" : "Registrar y subir a Holded";
  return { form, inv };
}

function setKind(kind) {
  if (kind === state.kind) return;
  state.kind = kind;
  ["account", "vatKey", "irpf"].forEach((id) => { $(id).value = ""; });
  if (kind === "venta") clearFile();
  fillContacts();
  render();
}

function fillContacts() {
  const want = state.kind === "venta" ? "cliente" : "proveedor";
  $("contacts").innerHTML = CONTACTS.filter((c) => c.kind === want).map((c) => `<option value="${esc(c.name)}">${esc(c.nif)}</option>`).join("");
}

// ------------------------------------------------------------ adjunto
function setFile(file) {
  if (!file) return;
  if (!/^(application\/pdf|image\/)/.test(file.type)) { toast("Solo PDF o imágenes (JPG, PNG)"); return; }
  clearFile();
  state.file = file;
  state.fileUrl = URL.createObjectURL(file);
  const thumb = file.type.startsWith("image/") ? `<img src="${state.fileUrl}" alt="" />` : `<span class="pdf">PDF</span>`;
  $("filePreview").innerHTML = `${thumb}<div class="meta"><strong>${esc(file.name)}</strong>
    <span class="muted small">${(file.size / 1024).toFixed(0)} KB · se adjuntará en Holded</span></div>
    <a class="btn" href="${state.fileUrl}" target="_blank" rel="noopener">Ver</a>
    <button type="button" class="btn ghost" id="removeFile" aria-label="Quitar adjunto">✕</button>`;
  $("filePreview").hidden = false;
  $("drop").hidden = true;
  $("removeFile").onclick = () => { clearFile(); render(); };
  render();
}

function clearFile() {
  if (state.fileUrl) URL.revokeObjectURL(state.fileUrl);
  state.file = null; state.fileUrl = null;
  $("file").value = "";
  $("filePreview").hidden = true; $("filePreview").innerHTML = "";
  $("drop").hidden = false;
}

// -------------------------------------------------------------- subir
async function submit() {
  const { form, inv } = render();
  if (!inv.canSubmit) return;
  const payload = buildPayload(form, inv);
  const file = state.kind === "compra" ? state.file : null;
  const steps = stepsFor(payload, file);
  const docNumber = nextNumber(inv.kind);

  $("m-title").textContent = "Subiendo a Holded…";
  $("steps").innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join("");
  $("mResult").hidden = true;
  $("mClose").disabled = true;
  $("modal").showModal();

  try {
    const result = await submitInvoice(payload, file, (i, st) => { $("steps").children[i].className = st; }, docNumber);
    const record = toRecord(form, inv, result, file);
    state.records.unshift(record);
    save();
    $("m-title").textContent = "Factura subida";
    $("mOk").textContent = `✓ ${inv.kind === "venta" ? "Factura de venta" : "Factura de compra"} ${result.docNumber} creada en Holded`
      + `${result.simulated ? " (simulado)" : ""} y contabilizada en la cuenta ${inv.category.account}.`;
    const shown = { method: "POST", url: `https://api.holded.com/api/invoicing/v1/documents/${payload.docType}`, body: payload.body };
    if (file) shown.attachment = { method: "POST", url: `…/documents/${payload.docType}/{id}/attach`, file: file.name };
    $("mPayload").textContent = JSON.stringify(shown, null, 2);
    $("mResult").hidden = false;
    renderRecords(record.id);
    resetForm();
  } catch (err) {
    $("m-title").textContent = "No se pudo subir";
    $("mOk").textContent = `✕ ${err.message}`;
    $("mResult").hidden = false;
  } finally {
    $("mClose").disabled = false;
    $("mClose").focus();
  }
}

function resetForm() {
  ["contactName", "nif", "concept", "amount"].forEach((id) => { $(id).value = ""; });
  $("inclVat").checked = false;
  ["account", "vatKey", "irpf"].forEach((id) => { $(id).value = ""; });
  clearFile();
  render();
}

// ----------------------------------------------------------- registro
function renderRecords(highlightId) {
  const s = summarize(state.records);
  const tiles = [
    ["Ventas (base)", eur(s.sales), `${state.records.filter((r) => r.kind === "venta").length} facturas`],
    ["Compras (base)", eur(s.purchases), `${state.records.filter((r) => r.kind === "compra").length} facturas`],
    ["IVA repercutido", eur(s.vatOut), "cuenta 477"],
    ["IVA soportado", eur(s.vatIn), "cuenta 472"],
    [s.vatResult >= 0 ? "IVA a ingresar" : "IVA a compensar", eur(Math.abs(s.vatResult)), "estimación modelo 303"],
    ["IRPF retenido", eur(s.irpf), "a ingresar · modelo 111"],
  ];
  $("summary").innerHTML = tiles.map(([k, v, f]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="f">${f}</div></div>`).join("");
  $("records").innerHTML = state.records.length ? state.records.map((r) => `<tr class="${r.id === highlightId ? "new" : ""}">
      <td>${fmtDate(r.date)}</td>
      <td><span class="tag ${r.kind}">${r.kind === "venta" ? "Venta" : "Compra"}</span></td>
      <td>${esc(r.docNumber)}</td>
      <td>${esc(r.contactName)}</td>
      <td class="concept">${esc(r.concept)}</td>
      <td title="${esc(r.accountName)}">${r.account}</td>
      <td class="num">${eur(r.base)}</td>
      <td class="num">${r.vatAmount ? eur(r.vatAmount) : esc(r.vatLabel)}</td>
      <td class="num">${r.irpfAmount ? `−${eur(r.irpfAmount)}` : "—"}</td>
      <td class="num"><strong>${eur(r.total)}</strong></td>
      <td>${r.attachment ? `📎 ${esc(r.attachment.name)}` : r.kind === "venta" ? "PDF de Holded" : "—"}</td>
      <td class="status-ok">✓ ${r.simulated ? "Subida (demo)" : "Subida"}</td></tr>`).join("")
    : `<tr class="empty"><td colspan="12">Aún no hay facturas.</td></tr>`;
}

function exportCsv() {
  const head = ["Fecha", "Tipo", "Número", "Contacto", "NIF", "Concepto", "Cuenta", "Base", "IVA", "IRPF", "Total", "Adjunto"];
  const num = (x) => String((x || 0).toFixed(2)).replace(".", ",");
  const rows = state.records.map((r) => [fmtDate(r.date), r.kind, r.docNumber, r.contactName, r.nif, r.concept,
    `${r.account} ${r.accountName}`, num(r.base), num(r.vatAmount), num(r.irpfAmount), num(r.total), r.attachment?.name || ""]);
  const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `facturas-astra-${todayIso()}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------ ejemplos
const EXAMPLES = {
  meta: { kind: "compra", contactName: "Meta Platforms Ireland Ltd", nif: "IE9692928F", concept: "Campaña Meta Ads octubre · Hornymoon", amount: 2450 },
  freelance: { kind: "compra", contactName: "Laura Martí Ferrer", nif: "43123456C", concept: "Desarrollo web · 40 horas", amount: 1800 },
  aws: { kind: "compra", contactName: "Amazon Web Services EMEA SARL", nif: "LU26888617", concept: "AWS · consumo de septiembre", amount: 612.4 },
  hotel: { kind: "compra", contactName: "Hotel Catalonia Atocha SL", nif: "B08888555", concept: "Hotel 2 noches · visita cliente en Madrid", amount: 264, incl: true },
  skyla: { kind: "venta", contactName: "Skyla Travel Tech SL", nif: "B57123456", concept: "Retainer mensual octubre · equipo producto IA", amount: 7500 },
  eu: { kind: "venta", contactName: "Nordlicht Media GmbH", nif: "DE811569869", concept: "Workshop de IA generativa para el equipo", amount: 4200 },
};

function applyExample(key) {
  const ex = EXAMPLES[key];
  setKind(ex.kind);
  $("contactName").value = ex.contactName;
  $("nif").value = ex.nif;
  $("concept").value = ex.concept;
  $("amount").value = ex.amount;
  $("inclVat").checked = !!ex.incl;
  $("date").value = todayIso();
  ["account", "vatKey", "irpf"].forEach((id) => { $(id).value = ""; });
  render();
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// -------------------------------------------------------------- arranque
function init() {
  load();
  $("date").value = todayIso();
  fillContacts();

  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setKind(b.dataset.kind)));
  document.querySelectorAll("[data-example]").forEach((b) => b.addEventListener("click", () => applyExample(b.dataset.example)));
  $("form").addEventListener("input", render);
  $("form").addEventListener("change", render);
  $("form").addEventListener("submit", (e) => e.preventDefault());
  $("contactName").addEventListener("input", () => {
    const c = findContact($("contactName").value);
    if (c && !$("nif").value) { $("nif").value = c.nif; render(); }
  });

  $("file").addEventListener("change", (e) => setFile(e.target.files[0]));
  const drop = $("drop");
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => setFile(e.dataTransfer.files[0]));

  $("submit").addEventListener("click", submit);
  $("mClose").addEventListener("click", () => { $("modal").close(); toast("Factura registrada ✓"); });
  $("exportCsv").addEventListener("click", exportCsv);
  $("resetDemo").addEventListener("click", () => {
    if (!confirm("¿Borrar las facturas registradas en esta demo y volver a los ejemplos iniciales?")) return;
    state.records = seedRecords();
    save();
    renderRecords();
    toast("Demo reiniciada");
  });

  render();
  renderRecords();
}

init();
