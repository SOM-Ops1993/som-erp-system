// ─────────────────────────────────────────────────────────────────────────────
// shared/constants.js
// Single source of truth for every constant in the Sales Order module.
// Import only what each component needs.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = "#1a4a22";
export const BRAND_LIGHT = "#f0fdf4";

// ── Companies & order config ──────────────────────────────────────────────────
export const COMPANIES = ["SOM", "DVS", "AL-IPL", "AL-LLC", "AL-PTE"];
export const ORDER_TYPES = ["DOMESTIC", "EXPORT", "ECOM", "SAMPLE"];
export const PRIORITIES = ["MODERATE", "URGENT", "VERY_URGENT"];
export const STATUSES = [
  "PENDING",
  "PLANNED",
  "UNDER_PRODUCTION",
  "IN_INVENTORY",
  "DISPATCHED",
];
export const SECTIONS = ["NANO", "BOTANICAL", "LIQUID", "POWDER", "GRANULES"];

export const UOMS = ["KG", "LTR", "GM", "ML", "Number"];

// ── Dropdown options ──────────────────────────────────────────────────────────
export const CARRIER_OPTIONS = [
  "",
  "Dextrose",
  "Talc",
  "Lactose",
  "HSCAS",
  "China Clay",
  "Diatomaceous Earth",
  "LSP",
  "Precipitated CaCO3",
  "Silica",
];

export const PRIMARY_PACKING = [
  "",
  "LD Pouch",
  "AL Pouch",
  "HDPE Jar",
  "100ml Bottle (Round)",
  "100ml Bottle (Regular)",
  "100ml Bottle (Triangle)",
  "200ml Bottle (Round)",
  "200ml Bottle (Regular)",
  "200ml Bottle (Triangle)",
  "500ml Bottle (Round)",
  "500ml Bottle (Regular)",
  "500ml Bottle (Triangle)",
  "1L Bottle (Round)",
  "1L Bottle (Regular)",
  "1L Bottle (Triangle)",
  "__CUSTOM__",
];

export const SECONDARY_PACKING = [
  "",
  "W-CBB",
  "B-CBB",
  "OMB 30 (30kg Drum)",
  "OMB 50 (50kg Drum)",
  "25Kg HDPE Bag",
  "50Kg HDPE Bag",
  "Cartons",
  "25L Jerry Can",
  "50L Barrel",
  "5L Can",
  "10L Can",
  "Others",
  "__CUSTOM__",
];

export const LABEL_TYPES = [
  { value: "", label: "— Select —" },
  { value: "CUSTOMER", label: "Customer Label" },
  { value: "COMPUTER", label: "Computer Label" },
  { value: "RETAIL", label: "Retail Label" },
  { value: "PACKING_SLIP", label: "Packing Slip" },
];

// Only these label types require batch / date / MRP fields
export const LABEL_NEEDS_DETAILS = new Set(["CUSTOMER", "COMPUTER", "RETAIL"]);

// ── Style maps ────────────────────────────────────────────────────────────────
export const PRIORITY_STYLE = {
  MODERATE: "bg-gray-100 text-gray-600",
  URGENT: "bg-orange-100 text-orange-700",
  VERY_URGENT: "bg-red-100 text-red-700",
};

export const STATUS_STYLE = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PLANNED: "bg-blue-100 text-blue-700",
  UNDER_PRODUCTION: "bg-indigo-100 text-indigo-700",
  IN_INVENTORY: "bg-teal-100 text-teal-700",
  DISPATCHED: "bg-gray-100 text-gray-500",
};

export const STATUS_LABELS = {
  PENDING: "Pending",
  PLANNED: "Planned",
  UNDER_PRODUCTION: "Under Production",
  IN_INVENTORY: "Inventory",
  DISPATCHED: "Dispatch",
};

// ── Blank line item — default shape for a new product line ───────────────────
export const BLANK_ITEM = {
  customerProductName: "",
  inhouseProductName: "",
  inhouseProductCode: "",
  activeIngredient: "",
  activeSpecs: "",
  carrier: "",
  sectionName: "",
  totalQty: "",
  totalUom: "KG",
  unitQty: "",
  unitUom: "KG",
  unitsPerCS: "",
  totalCS: "",
  unitPackType: "",
  packingType: "",
  labelType: "",
  batchNo: "",
  mfgDate: "",
  expDate: "",
  mrp: "",
};
