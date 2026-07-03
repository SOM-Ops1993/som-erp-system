/**

* MicrobialInward — Cold Room SFG Inward Recording
*    Container code pattern: {MICROBE_CODE}-{TYPE_CODE}-{SEQ}
*   TYPE: BM=Biomass | FSP=Spray Dried Powder-F | CSP=Spray Dried Powder-C
*   Fill: FULL (e.g. SDPs), PARTIAL (biomass)

*/

import { useState, useEffect, useRef } from "react";
import Pagination from "../../../../components/pagination/Pagination.jsx";
import * as XLSX from "xlsx";
import { microbialSfgApi } from "../../../../api/microbial.js";
import { BackButton, Button } from "../../../../components/ui";
import { RefreshCw } from "lucide-react";
import './MicrobialInward.css';

const MICROBE_TYPES = [
  { code: "BM", label: "Biomass", fill: "PARTIAL" },
  { code: "FSP", label: "Spray Dried Powder-F", fill: "FULL" },
  { code: "CSP", label: "Spray Dried Powder-C", fill: "FULL" },
];
const FILL_STATUS = ["FULL", "PARTIAL", "EMPTY"];

function fillBadgeCls(fill) {
  if (fill === 'FULL')    return 'mi-badge mi-badge--fill-full';
  if (fill === 'PARTIAL') return 'mi-badge mi-badge--fill-partial';
  return 'mi-badge mi-badge--fill-empty';
}

function statusBadgeCls(status) {
  if (status === 'ACTIVE')    return 'mi-badge mi-badge--status-active';
  if (status === 'EXHAUSTED') return 'mi-badge mi-badge--status-exhausted';
  return 'mi-badge mi-badge--status-active';
}

function fmtCfu(v) {
  if (!v) return "—";
  const n = Number(v);
  if (n >= 1e11) return `${(n / 1e11).toFixed(2)}×10¹¹`;
  if (n >= 1e10) return `${(n / 1e10).toFixed(2)}×10¹⁰`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}×10⁹`;
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}×10⁸`;
  return n.toExponential(2);
}

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
    <div className="mi-page">
      <div className="mi-back">
        <BackButton />
      </div>
      <div className="mi-head">
        <div>
          <h1 className="mi-h1">🧊 Microbial Inward</h1>
          <p className="mi-sub">
            Record microbial SFG stock — Biomass, Spray Dried Powders, and more
          </p>
        </div>
        <div className="mi-head-actions">
          <Button variant="outline" onClick={() => setTab("import")}>
            ⇪ Import Excel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setTab("add");
            }}
          >
            + New Inward Entry
          </Button>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="mi-summary-grid">
          {summary.map((s) => (
            <div
              key={`${s.microbe_code}-${s.microbe_type}`}
              className="mi-summary-card"
            >
              <div className="mi-summary-label">
                {s.microbe_code} · {s.microbe_type}
              </div>
              <div className="mi-summary-value">
                {Number(s.total_remaining_kg).toFixed(2)} kg
              </div>
              <div className="mi-summary-meta">
                {fmtCfu(s.avg_cfu_per_g)} CFU/g · {s.active_batches} batch(es)
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mi-tabs">
        {[
          ["list", "📋 Inward Records"],
          ["add", "+ New Entry"],
          ["import", "⇪ Import Excel"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`mi-tab${tab === k ? ' mi-tab--active' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="mi-card">
          <div className="mi-filters">
            <select
              className="mi-select mi-select--w190"
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
              className="mi-select mi-select--w160"
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
              className="mi-select mi-select--w130"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXHAUSTED">Exhausted</option>
            </select>
            <Button variant="outline-gray" icon={RefreshCw} onClick={load} className="ml-auto">
              Refresh
            </Button>
          </div>
          {loading ? (
            <p className="mi-loading">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="mi-empty">
              <div className="mi-empty-icon">📦</div>
              <p>No records found. Add an inward entry or import from Excel.</p>
            </div>
          ) : (
            <div className="mi-overflow-x">
              <table className="mi-table">
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
                      <th key={h} className="mi-th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedFiltered.map((r, i) => (
                    <tr
                      key={r.inward_id}
                      className={i % 2 === 0 ? 'mi-tr--even' : 'mi-tr--odd'}
                    >
                      <td className={`mi-td mi-td--bold`}>
                        {r.microbe_name}
                        <div className="mi-microbe-code-hint">
                          {r.microbe_code}
                        </div>
                      </td>
                      <td className="mi-td mi-td--mono">
                        {r.container_code}
                      </td>
                      <td className="mi-td">{r.microbe_type}</td>
                      <td className="mi-td mi-td--mono">
                        {r.biomass_batch_code}
                      </td>
                      <td className="mi-td">
                        {r.date_of_harvest
                          ? new Date(r.date_of_harvest).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="mi-td mi-td--bold">
                        {Number(r.total_qty_kg).toFixed(3)}
                      </td>
                      <td className={Number(r.remaining_qty_kg) > 0 ? 'mi-td mi-remaining--positive' : 'mi-td mi-remaining--zero'}>
                        {Number(r.remaining_qty_kg).toFixed(3)}
                      </td>
                      <td className="mi-td">{fmtCfu(r.inhouse_cfu_per_g)}</td>
                      <td className="mi-td">{r.location || "—"}</td>
                      <td className="mi-td">
                        {r.moisture != null ? `${r.moisture}%` : "—"}
                      </td>
                      <td className="mi-td">
                        {r.shelf_life_days != null
                          ? `${r.shelf_life_days}d`
                          : "—"}
                      </td>
                      <td className="mi-td">
                        <span className={fillBadgeCls(r.fill_status)}>
                          {r.fill_status}
                        </span>
                      </td>
                      <td className="mi-td">
                        <span className={statusBadgeCls(r.status)}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mi-pagination">
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
        <div className="mi-card">
          <h3 className="mi-section-title">+ New Microbial Inward Entry</h3>
          <form onSubmit={handleSubmit}>
            <div className="mi-form-grid-3">
              <div>
                <label className="mi-label">Microbe Name *</label>
                <select
                  className="mi-select"
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
                <label className="mi-label">Microbe Type *</label>
                <select
                  className="mi-select"
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
                <label className="mi-label">Container Fill Status *</label>
                <select
                  className="mi-select"
                  value={form.fill_status}
                  onChange={(e) => set("fill_status", e.target.value)}
                >
                  {FILL_STATUS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <p className="mi-hint">
                  Spray dried powder → FULL; Biomass → PARTIAL
                </p>
              </div>
            </div>

            {form.microbe_code && form.type_code && (
              <div className="mi-container-box">
                <div className="mi-container-radios">
                  <label className="mi-radio-label">
                    <input
                      type="radio"
                      checked={!form.use_existing_container}
                      onChange={() => set("use_existing_container", false)}
                    />
                    New Container
                  </label>
                  {containers.length > 0 && (
                    <label className="mi-radio-label">
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
                    <label className="mi-label">New Container Code</label>
                    <input
                      className="mi-input"
                      value={form.new_container_code}
                      onChange={(e) =>
                        set("new_container_code", e.target.value.toUpperCase())
                      }
                      placeholder={nextCode || "Auto-generated"}
                    />
                    <p className="mi-hint">
                      Pattern: {form.microbe_code}-{form.type_code}-001. Next
                      suggested: <strong>{nextCode || "…"}</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="mi-label">Select Container *</label>
                    <select
                      className="mi-select"
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

            <div className="mi-form-grid-3">
              <div>
                <label className="mi-label">Inhouse CFU/g *</label>
                <input
                  className="mi-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 5e10"
                  value={form.inhouse_cfu_per_g}
                  onChange={(e) => set("inhouse_cfu_per_g", e.target.value)}
                  required
                />
                <p className="mi-hint">
                  Enter scientific notation e.g. 5e10 = 5×10¹⁰
                </p>
              </div>
              <div>
                <label className="mi-label">Biomass Batch Code *</label>
                <input
                  className="mi-input"
                  placeholder="e.g. BB-2026-001"
                  value={form.biomass_batch_code}
                  onChange={(e) => set("biomass_batch_code", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mi-label">Date of Harvest *</label>
                <input
                  className="mi-input"
                  type="date"
                  value={form.date_of_harvest}
                  onChange={(e) => set("date_of_harvest", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mi-label">Total Qty (kg) *</label>
                <input
                  className="mi-input"
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
                <label className="mi-label">Location (Cold Room)</label>
                <input
                  className="mi-input"
                  placeholder="e.g. CR-A-01"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div>
                <label className="mi-label">Moisture %</label>
                <input
                  className="mi-input"
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
                <label className="mi-label">Shelf Life (days)</label>
                <input
                  className="mi-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 180"
                  value={form.shelf_life_days}
                  onChange={(e) => set("shelf_life_days", e.target.value)}
                />
              </div>
            </div>

            <div className="mi-form-actions">
              <Button type="submit" variant="primary" loading={saving}>
                {saving ? "Saving…" : "✅ Save Inward Entry"}
              </Button>
              <Button
                type="button"
                variant="outline-gray"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setTab("list");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === "import" && (
        <div className="mi-card">
          <h3 className="mi-section-title">⇪ Import Inward Records from Excel</h3>
          <p className="mi-import-desc">
            Columns: Microbe Name, Container Code, Microbe Type, Inhouse CFU/g,
            Biomass Batch Code, Date of Harvest, Total Qty (kg), Location,
            Moisture, Shelf Life (days), Fill Status
          </p>
          <div className="mi-import-actions">
            <Button variant="outline-gray" onClick={downloadTemplate}>
              ⬇ Download Template
            </Button>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              📂 Choose Excel File
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="mi-file-hidden"
              onChange={handleFile}
            />
          </div>
          {importRows.length > 0 && (
            <>
              <div className="mi-import-preview">
                <p className="mi-import-preview-title">
                  {importRows.length} row(s) detected
                </p>
                <table className={`mi-table mi-import-table`}>
                  <thead>
                    <tr>
                      {Object.keys(importRows[0]).map((k) => (
                        <th key={k} className={`mi-th mi-import-th`}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} className={`mi-td mi-import-td`}>
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 6 && (
                  <p className="mi-import-more">
                    …{importRows.length - 6} more rows
                  </p>
                )}
              </div>
              <Button
                variant="success"
                onClick={handleImport}
                loading={importLoading}
              >
                {importLoading
                  ? "Importing…"
                  : `✅ Import ${importRows.length} Record(s)`}
              </Button>
            </>
          )}
          {importStatus && (
            <div className="mi-import-result">
              <strong className="mi-import-result-done">✅ Done:</strong>{" "}
              {importStatus.imported} imported · {importStatus.skipped} skipped
              {importStatus.errors?.length > 0 && (
                <div className="mi-import-errors">
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
