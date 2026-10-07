// Reglas fiscales y contables (PGC PYMES España). Todo lo "configurable" vive aquí.

export const EU = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "GR", "FI", "FR", "HR", "HU",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

export const ACCOUNTS = {
  "700": "Ventas de mercaderías",
  "705": "Prestaciones de servicios",
  "602": "Compras de otros aprovisionamientos",
  "621": "Arrendamientos y cánones",
  "622": "Reparaciones y conservación",
  "623": "Servicios de profesionales independientes",
  "624": "Transportes",
  "625": "Primas de seguros",
  "626": "Servicios bancarios y similares",
  "627": "Publicidad, propaganda y relaciones públicas",
  "628": "Suministros",
  "629": "Otros servicios",
  "217": "Equipos para procesos de información",
  "400": "Proveedores",
  "410": "Acreedores por prestaciones de servicios",
  "430": "Clientes",
  "472": "H.P. IVA soportado",
  "473": "H.P. retenciones y pagos a cuenta",
  "477": "H.P. IVA repercutido",
  "4751": "H.P. acreedora por retenciones practicadas",
  "523": "Proveedores de inmovilizado a corto plazo",
};

// Compras: el primer grupo cuyas palabras aparezcan en concepto/proveedor gana.
export const PURCHASE_CATEGORIES = [
  { account: "217", label: "Equipos informáticos", minBase: 300,
    keywords: ["ordenador", "portatil", "macbook", "imac", "monitor", "pantalla", "servidor", "tablet", "ipad", "iphone", "movil nuevo", "workstation"] },
  { account: "627", label: "Publicidad y marketing",
    keywords: ["publicidad", "anuncio", "ads", "campana", "marketing", "meta platforms", "facebook", "instagram", "google ads", "linkedin", "tiktok", "patrocinio", "ugc", "influencer"] },
  { account: "621", label: "Alquileres y coworking",
    keywords: ["alquiler", "arrendamiento", "coworking", "renting", "leasing", "local", "puesto de trabajo"] },
  { account: "623", label: "Servicios profesionales",
    keywords: ["gestoria", "asesoria", "asesor", "abogad", "notari", "consultor", "freelance", "diseno", "desarrollo", "programacion", "auditoria", "traduccion", "horas de", "honorarios"] },
  { account: "625", label: "Seguros", keywords: ["seguro", "poliza", "mapfre", "axa", "allianz", "mutua"] },
  { account: "626", label: "Comisiones bancarias", keywords: ["comision", "bancari", "tpv", "transferencia internacional"] },
  { account: "628", label: "Suministros",
    keywords: ["luz", "electricidad", "agua", "gas natural", "internet", "fibra", "telefono", "telefonia", "lineas moviles", "vodafone", "movistar", "orange", "digi", "endesa", "iberdrola", "naturgy"] },
  { account: "622", label: "Reparaciones y mantenimiento", keywords: ["reparacion", "mantenimiento", "averia", "arreglo"] },
  { account: "624", label: "Transportes y envíos", keywords: ["transporte", "envio", "mensajeria", "seur", "mrw", "dhl", "correos", "paqueteria"] },
  { account: "629", label: "Software, viajes y otros servicios",
    keywords: ["software", "suscripcion", "saas", "licencia", "hosting", "dominio", "aws", "amazon web services", "google workspace", "notion", "slack", "holded", "anthropic", "openai", "api", "cloud",
      "viaje", "hotel", "tren", "renfe", "vuelo", "taxi", "uber", "cabify", "dietas", "restaurante", "comida", "material de oficina", "papeleria", "material"] },
];
export const DEFAULT_PURCHASE = { account: "629", label: "Otros servicios" };

export const SALE_CATEGORIES = [
  { account: "700", label: "Venta de productos", keywords: ["venta de producto", "venta de productos", "mercancia", "mercaderia", "hardware", "dispositivos"] },
  { account: "705", label: "Prestación de servicios", keywords: [] },
];
export const DEFAULT_SALE = { account: "705", label: "Prestación de servicios" };

// Pistas de IVA para operaciones nacionales (si nada encaja: 21 %).
export const VAT_HINTS = [
  { mode: "exento", rate: 0, keywords: ["seguro", "poliza", "comision bancaria", "comision", "formacion reglada", "sanidad", "medico"],
    reason: "Operación exenta de IVA (art. 20 LIVA): seguros, servicios financieros, sanidad…" },
  { mode: "normal", rate: 4, keywords: ["libro", "periodico", "revista", "pan ", "leche", "fruta"],
    reason: "Tipo superreducido 4 % (libros, prensa, alimentos básicos)." },
  { mode: "normal", rate: 10, keywords: ["hotel", "alojamiento", "restaurante", "comida", "cena", "almuerzo", "tren", "renfe", "taxi", "uber", "cabify", "autobus", "vuelo", "billete"],
    reason: "Tipo reducido 10 % (hostelería, restauración, transporte de viajeros)." },
];

export const IVA_OPTIONS = [
  { key: "21", label: "21 % general", mode: "normal", rate: 21 },
  { key: "10", label: "10 % reducido", mode: "normal", rate: 10 },
  { key: "4", label: "4 % superreducido", mode: "normal", rate: 4 },
  { key: "exento", label: "Exento (0 %)", mode: "exento", rate: 0 },
  { key: "isp", label: "Inversión del sujeto pasivo", mode: "isp", rate: 0 },
  { key: "nosujeta", label: "No sujeta (0 %)", mode: "nosujeta", rate: 0 },
];

export const IRPF_OPTIONS = [0, 7, 15, 19];

// Contactos habituales de Astra (demo). En real vendrían de GET /invoicing/v1/contacts.
export const CONTACTS = [
  { name: "Skyla Travel Tech SL", nif: "B57123456", kind: "cliente" },
  { name: "Grupo Ethos Consulting SL", nif: "B07654321", kind: "cliente" },
  { name: "Hornymoon Experiences SL", nif: "B16987001", kind: "cliente" },
  { name: "Orion Retail Group SA", nif: "A28456789", kind: "cliente" },
  { name: "Nordlicht Media GmbH", nif: "DE811569869", kind: "cliente" },
  { name: "Laura Martí Ferrer", nif: "43123456C", kind: "proveedor" },
  { name: "Pau Serra Estudio", nif: "43987654Q", kind: "proveedor" },
  { name: "Meta Platforms Ireland Ltd", nif: "IE9692928F", kind: "proveedor" },
  { name: "Amazon Web Services EMEA SARL", nif: "LU26888617", kind: "proveedor" },
  { name: "Gestoría Rullán & Asociados SL", nif: "B07222111", kind: "proveedor" },
  { name: "Palma Hub Coworking SL", nif: "B57333444", kind: "proveedor" },
  { name: "Vodafone España SAU", nif: "A80907397", kind: "proveedor" },
  { name: "Mapfre España SA", nif: "A28141935", kind: "proveedor" },
  { name: "Hotel Catalonia Atocha SL", nif: "B08888555", kind: "proveedor" },
];
