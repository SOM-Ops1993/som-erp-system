/**
 
* MicrobialInward — Cold Room SFG Inward Recording
*    Container code pattern: {MICROBE_CODE}-{TYPE_CODE}-{SEQ}
*   TYPE: BM=Biomass | FSP=Spray Dried Powder-F | CSP=Spray Dried Powder-C
*   Fill: FULL (e.g. SDPs), PARTIAL (biomass)

*/

import { useState, useEffect, useRef } from "react";
import Pagination from "../../../../components/erp/Pagination.jsx";
import * as XLSX from "xlsx";
import { microbialSfgApi } from "../../../../api/microbial.js";

const MICROBE_TYPES = [
  { code: "BM", label: "Biomass", fill: "PARTIAL" },
  { code: "FSP", label: "Spray Dried Powder-F", fill: "FULL" },
  { code: "CSP", label: "Spray Dried Powder-C", fill: "FULL" },
];
const FILL_STATUS = ["FULL", "PARTIAL", "EMPTY"];
const FILL_COLOR = {
  FULL: { bg: "#dcfce7", c: "#166534" },
  PARTIAL: { bg: "#fef9c3", c: "#854d0e" },
  EMPTY: { bg: "#fee2e2", c: "#991b1b" },
};

const STATUS_COLOR = {
  ACTIVE: { bg: "#eff6ff", c: "#1d4ed8" },
  EXHAUSTED: { bg: "#f1f5f9", c: "#64748b" },
};

function fmtCfu(v) {
  if (!v) return "—";
  const n = Number(v);
  if (n >= 1e11) return `${(n / 1e11).toFixed(2)}×10¹¹`;
  if (n >= 1e10) return `${(n / 1e10).toFixed(2)}×10¹⁰`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}×10⁹`;
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}×10⁸`;
  return n.toExponential(2);
}

const S = {
  page: { padding: "24px", fontFamily: "'Inter',system-ui,sans-serif" },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  h1: { fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0 },
  sub: { fontSize: "13px", color: "#64748b", marginTop: "4px" },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    marginBottom: "4px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "7px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "7px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
  },
  btnP: {
    padding: "9px 20px",
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnO: {
    padding: "8px 16px",
    background: "#fff",
    color: "#1e3a5f",
    border: "1.5px solid #1e3a5f",
    borderRadius: "7px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: {
    textAlign: "left",
    padding: "9px 12px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.06em",
    borderBottom: "2px solid #e2e8f0",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    verticalAlign: "middle",
  },
  badge: (bg, c) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "99px",
    fontSize: "10px",
    fontWeight: 700,
    background: bg,
    color: c,
  }),
  hint: { fontSize: "11px", color: "#94a3b8", marginTop: "4px" },
};

const EMPTY_FORM = {
  microbe_id: "",
  microbe_code: "",
  microbe_name: "",
  microbe_type: "",
  type_code: "",
  inhouse_cfu_per_g: "",
  biomass_batch_code: "",
  date_of_harvest: "",
  total_qty_kg: "",
  location: "",
  moisture: "",
  shelf_life_days: "",
  fill_status: "PARTIAL",
  use_existing_container: false,
  container_id: "",
  new_container_code: "",
};

export default function MicrobialInward() {
  const [tab, setTab] = useState("list");
  const [records, setRecords] = useState([]);
  const [microbes, setMicrobes] = useState([]);
  const [containers, setContainers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState(null);
  const [filterMicrobe, setFilterMicrobe] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [importRows, setImportRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [recs, mics, summ] = await Promise.all([
        microbialSfgApi.listInward({ status: filterStatus || undefined }),
        microbialSfgApi.listMicrobes(),
        microbialSfgApi.inwardSummary(),
      ]);
      setRecords(recs?.data || []);
      setMicrobes(mics?.data || []);
      setSummary(summ?.data || []);
    } catch {
      /* silent */
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [filterStatus]);

  useEffect(() => {
    if (!form.microbe_code || !form.type_code) {
      setContainers([]);
      setNextCode(null);
      return;
    }
    Promise.all([
      microbialSfgApi.availableContainers({
        microbe_code: form.microbe_code,
        type_code: form.type_code,
      }),
      microbialSfgApi.nextContainerCode({
        microbe_code: form.microbe_code,
        type_code: form.type_code,
      }),
    ])
      .then(([c, n]) => {
        setContainers(c?.data || []);
        setNextCode(n?.data?.next_code || null);
        if (!form.new_container_code)
          setForm((p) => ({
            ...p,
            new_container_code: n?.data?.next_code || "",
          }));
      })
      .catch(() => {});
  }, [form.microbe_code, form.type_code]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleMicrobeChange = (e) => {
    const m = microbes.find((x) => x.microbe_id === e.target.value);
    if (m) {
      set("microbe_id", m.microbe_id);
      set("microbe_code", m.microbe_code);
      set("microbe_name", m.microbe_name);
    } else {
      set("microbe_id", "");
      set("microbe_code", "");
      set("microbe_name", "");
    }
    set("container_id", "");
    set("use_existing_container", false);
  };

  const handleTypeChange = (e) => {
    const t = MICROBE_TYPES.find((x) => x.code === e.target.value);
    set("type_code", e.target.value);
    set("microbe_type", t?.label || e.target.value);
    set("fill_status", t?.fill || "PARTIAL");
    set("container_id", "");
    set("use_existing_container", false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await microbialSfgApi.createInward({
        container_id: form.use_existing_container ? form.container_id : null,
        new_container_code: !form.use_existing_container
          ? form.new_container_code
          : null,
        microbe_id: form.microbe_id,
        microbe_code: form.microbe_code,
        microbe_name: form.microbe_name,
        microbe_type: form.microbe_type,
        type_code: form.type_code,
        inhouse_cfu_per_g: parseFloat(form.inhouse_cfu_per_g),
        biomass_batch_code: form.biomass_batch_code,
        date_of_harvest: form.date_of_harvest,
        total_qty_kg: parseFloat(form.total_qty_kg),
        location: form.location || null,
        moisture: form.moisture ? parseFloat(form.moisture) : null,
        shelf_life_days: form.shelf_life_days
          ? parseInt(form.shelf_life_days)
          : null,
        fill_status: form.fill_status,
      });
      setForm(EMPTY_FORM);
      setTab("list");
      await load();
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, {
        type: "binary",
        cellDates: true,
      });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, {
        raw: false,
        dateNF: "yyyy-mm-dd",
      });
      setImportRows(raw);
      setImportStatus(null);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!importRows.length) return;
    setImportLoading(true);
    try {
      const res = await microbialSfgApi.importInward(importRows);
      setImportStatus(res);
      await load();
    } catch (err) {
      alert(err.message);
    }
    setImportLoading(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Microbe Name": "Bacillus subtilis",
        "Container Code": "BS001-BM-001",
        "Microbe Type": "BM",
        "Inhouse CFU/g": "5e10",
        "Biomass Batch Code": "BB-2026-001",
        "Date of Harvest": "2026-04-01",
        "Total Qty (kg)": 10,
        Location: "CR-A-01",
        Moisture: 8.5,
        "Shelf Life (days)": 180,
        "Fill Status": "PARTIAL",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Microbial Inward");
    XLSX.writeFile(wb, "microbial_inward_template.xlsx");
  };

  const filtered = records.filter(
    (r) =>
      (!filterMicrobe || r.microbe_code === filterMicrobe) &&
      (!filterType || r.microbe_type === filterType),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const paginatedFiltered = filtered.slice((page - 1) * limit, page * limit);
  useEffect(() => {
    setPage(1);
  }, [filterMicrobe, filterType, filterStatus]);

  return (
    <div style={S.page}>
      <div style={{ marginBottom: "14px" }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 14px",
            borderRadius: "10px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            fontSize: "13px",
            fontWeight: 500,
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.color = "#0f172a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.color = "#475569";
          }}
        >
          ← Back
        </button>
      </div>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>🧊 Microbial Inward</h1>
          <p style={S.sub}>
            Record microbial SFG stock — Biomass, Spray Dried Powders, and more
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={S.btnO} onClick={() => setTab("import")}>
            ⇪ Import Excel
          </button>
          <button
            style={S.btnP}
            onClick={() => {
              setForm(EMPTY_FORM);
              setTab("add");
            }}
          >
            + New Inward Entry
          </button>
        </div>
      </div>

      {summary.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {summary.map((s) => (
            <div
              key={`${s.microbe_code}-${s.microbe_type}`}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px 16px",
                borderLeft: "4px solid #1e3a5f",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: 700,
                  marginBottom: "2px",
                }}
              >
                {s.microbe_code} · {s.microbe_type}
              </div>
              <div
                style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}
              >
                {Number(s.total_remaining_kg).toFixed(2)} kg
              </div>
              <div
                style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}
              >
                {fmtCfu(s.avg_cfu_per_g)} CFU/g · {s.active_batches} batch(es)
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
        {[
          ["list", "📋 Inward Records"],
          ["add", "+ New Entry"],
          ["import", "⇪ Import Excel"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 18px",
              borderRadius: "8px 8px 0 0",
              fontSize: "13px",
              fontWeight: 600,
              border: "1px solid #e2e8f0",
              borderBottom:
                tab === k ? "2px solid #1e3a5f" : "1px solid #e2e8f0",
              background: tab === k ? "#fff" : "#f8fafc",
              color: tab === k ? "#1e3a5f" : "#64748b",
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div style={S.card}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={{ ...S.select, width: "190px" }}
              value={filterMicrobe}
              onChange={(e) => setFilterMicrobe(e.target.value)}
            >
              <option value="">All Microbes</option>
              {[...new Set(records.map((r) => r.microbe_code))].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              style={{ ...S.select, width: "160px" }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              {MICROBE_TYPES.map((t) => (
                <option key={t.code} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              style={{ ...S.select, width: "130px" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXHAUSTED">Exhausted</option>
            </select>
            <button style={{ ...S.btnO, marginLeft: "auto" }} onClick={load}>
              ↻ Refresh
            </button>
          </div>
          {loading ? (
            <p
              style={{ color: "#94a3b8", textAlign: "center", padding: "30px" }}
            >
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}
            >
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📦</div>
              <p>No records found. Add an inward entry or import from Excel.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {[
                      "Microbe",
                      "Container",
                      "Type",
                      "Batch Code",
                      "Harvest Date",
                      "Total (kg)",
                      "Remaining (kg)",
                      "CFU/g",
                      "Location",
                      "Moisture %",
                      "Shelf Life",
                      "Fill",
                      "Status",
                    ].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedFiltered.map((r, i) => {
                    const fs = FILL_COLOR[r.fill_status] || FILL_COLOR.PARTIAL;
                    const ss = STATUS_COLOR[r.status] || STATUS_COLOR.ACTIVE;
                    return (
                      <tr
                        key={r.inward_id}
                        style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      >
                        <td style={{ ...S.td, fontWeight: 600 }}>
                          {r.microbe_name}
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                            {r.microbe_code}
                          </div>
                        </td>
                        <td
                          style={{
                            ...S.td,
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        >
                          {r.container_code}
                        </td>
                        <td style={S.td}>{r.microbe_type}</td>
                        <td
                          style={{
                            ...S.td,
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        >
                          {r.biomass_batch_code}
                        </td>
                        <td style={S.td}>
                          {r.date_of_harvest
                            ? new Date(r.date_of_harvest).toLocaleDateString(
                                "en-IN",
                              )
                            : "—"}
                        </td>
                        <td style={{ ...S.td, fontWeight: 600 }}>
                          {Number(r.total_qty_kg).toFixed(3)}
                        </td>
                        <td
                          style={{
                            ...S.td,
                            fontWeight: 700,
                            color:
                              Number(r.remaining_qty_kg) > 0
                                ? "#15803d"
                                : "#dc2626",
                          }}
                        >
                          {Number(r.remaining_qty_kg).toFixed(3)}
                        </td>
                        <td style={S.td}>{fmtCfu(r.inhouse_cfu_per_g)}</td>
                        <td style={S.td}>{r.location || "—"}</td>
                        <td style={S.td}>
                          {r.moisture != null ? `${r.moisture}%` : "—"}
                        </td>
                        <td style={S.td}>
                          {r.shelf_life_days != null
                            ? `${r.shelf_life_days}d`
                            : "—"}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(fs.bg, fs.c)}>
                            {r.fill_status}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(ss.bg, ss.c)}>{r.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: "8px 4px" }}>
            <Pagination
              page={page}
              total={filtered.length}
              limit={limit}
              onChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {tab === "add" && (
        <div style={S.card}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            + New Microbial Inward Entry
          </h3>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label style={S.label}>Microbe Name *</label>
                <select
                  style={S.select}
                  value={form.microbe_id}
                  onChange={handleMicrobeChange}
                  required
                >
                  <option value="">— Select microbe —</option>
                  {microbes.map((m) => (
                    <option key={m.microbe_id} value={m.microbe_id}>
                      {m.microbe_name} ({m.microbe_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Microbe Type *</label>
                <select
                  style={S.select}
                  value={form.type_code}
                  onChange={handleTypeChange}
                  required
                >
                  <option value="">— Select type —</option>
                  {MICROBE_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Container Fill Status *</label>
                <select
                  style={S.select}
                  value={form.fill_status}
                  onChange={(e) => set("fill_status", e.target.value)}
                >
                  {FILL_STATUS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <p style={S.hint}>
                  Spray dried powder → FULL; Biomass → PARTIAL
                </p>
              </div>
            </div>

            {form.microbe_code && form.type_code && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="radio"
                      checked={!form.use_existing_container}
                      onChange={() => set("use_existing_container", false)}
                    />
                    New Container
                  </label>
                  {containers.length > 0 && (
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="radio"
                        checked={form.use_existing_container}
                        onChange={() => set("use_existing_container", true)}
                      />
                      Use Existing ({containers.length} PARTIAL/EMPTY available)
                    </label>
                  )}
                </div>
                {!form.use_existing_container ? (
                  <div>
                    <label style={S.label}>New Container Code</label>
                    <input
                      style={S.input}
                      value={form.new_container_code}
                      onChange={(e) =>
                        set("new_container_code", e.target.value.toUpperCase())
                      }
                      placeholder={nextCode || "Auto-generated"}
                    />
                    <p style={S.hint}>
                      Pattern: {form.microbe_code}-{form.type_code}-001. Next
                      suggested: <strong>{nextCode || "…"}</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label style={S.label}>Select Container *</label>
                    <select
                      style={S.select}
                      value={form.container_id}
                      onChange={(e) => set("container_id", e.target.value)}
                      required
                    >
                      <option value="">— Choose container —</option>
                      {containers.map((c) => (
                        <option key={c.container_id} value={c.container_id}>
                          {c.container_code} — {c.fill_status} ·{" "}
                          {Number(c.current_qty_kg).toFixed(2)} kg in hand ·{" "}
                          {c.location || "no location"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label style={S.label}>Inhouse CFU/g *</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 5e10"
                  value={form.inhouse_cfu_per_g}
                  onChange={(e) => set("inhouse_cfu_per_g", e.target.value)}
                  required
                />
                <p style={S.hint}>
                  Enter scientific notation e.g. 5e10 = 5×10¹⁰
                </p>
              </div>
              <div>
                <label style={S.label}>Biomass Batch Code *</label>
                <input
                  style={S.input}
                  placeholder="e.g. BB-2026-001"
                  value={form.biomass_batch_code}
                  onChange={(e) => set("biomass_batch_code", e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={S.label}>Date of Harvest *</label>
                <input
                  style={S.input}
                  type="date"
                  value={form.date_of_harvest}
                  onChange={(e) => set("date_of_harvest", e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={S.label}>Total Qty (kg) *</label>
                <input
                  style={S.input}
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0.000"
                  value={form.total_qty_kg}
                  onChange={(e) => set("total_qty_kg", e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={S.label}>Location (Cold Room)</label>
                <input
                  style={S.input}
                  placeholder="e.g. CR-A-01"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div>
                <label style={S.label}>Moisture %</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 8.5"
                  value={form.moisture}
                  onChange={(e) => set("moisture", e.target.value)}
                />
              </div>
              <div>
                <label style={S.label}>Shelf Life (days)</label>
                <input
                  style={S.input}
                  type="number"
                  min="1"
                  placeholder="e.g. 180"
                  value={form.shelf_life_days}
                  onChange={(e) => set("shelf_life_days", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" style={S.btnP} disabled={saving}>
                {saving ? "Saving…" : "✅ Save Inward Entry"}
              </button>
              <button
                type="button"
                style={S.btnO}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setTab("list");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "import" && (
        <div style={S.card}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 0,
              marginBottom: "4px",
            }}
          >
            ⇪ Import Inward Records from Excel
          </h3>
          <p
            style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}
          >
            Columns: Microbe Name, Container Code, Microbe Type, Inhouse CFU/g,
            Biomass Batch Code, Date of Harvest, Total Qty (kg), Location,
            Moisture, Shelf Life (days), Fill Status
          </p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button style={S.btnO} onClick={downloadTemplate}>
              ⬇ Download Template
            </button>
            <button style={S.btnP} onClick={() => fileRef.current?.click()}>
              📂 Choose Excel File
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>
          {importRows.length > 0 && (
            <>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                  overflowX: "auto",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  {importRows.length} row(s) detected
                </p>
                <table style={{ ...S.table, fontSize: "11px" }}>
                  <thead>
                    <tr>
                      {Object.keys(importRows[0]).map((k) => (
                        <th key={k} style={{ ...S.th, padding: "5px 8px" }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} style={{ ...S.td, padding: "5px 8px" }}>
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 6 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "6px",
                    }}
                  >
                    …{importRows.length - 6} more rows
                  </p>
                )}
              </div>
              <button
                style={S.btnP}
                onClick={handleImport}
                disabled={importLoading}
              >
                {importLoading
                  ? "Importing…"
                  : `✅ Import ${importRows.length} Record(s)`}
              </button>
            </>
          )}
          {importStatus && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 18px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              <strong style={{ color: "#15803d" }}>✅ Done:</strong>{" "}
              {importStatus.imported} imported · {importStatus.skipped} skipped
              {importStatus.errors?.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    color: "#dc2626",
                    fontSize: "12px",
                  }}
                >
                  {importStatus.errors.slice(0, 5).map((e, i) => (
                    <div key={i}>
                      {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
