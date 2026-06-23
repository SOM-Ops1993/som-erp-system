import { useState, useEffect, useRef, useCallback } from "react";
import { gateApi } from "../../../../api/inventory.js";
import { useAuth } from "../../../../components/erp/AuthContext.jsx";
import BackButton from "../../../../components/erp/BackButton.jsx";
import GateTabs from "../component/GateTabs.jsx";
import GateFilterBar from "../component/GateFilterBar.jsx";
import InwardForm from "../component/InwardForm.jsx";
import OutwardForm from "../component/OutwardForm.jsx";
import InwardDetailPanel from "../component/InwardDetailPanel.jsx";
import InwardTable from "../component/InwardTable.jsx";
import OutwardTable from "../component/OutwardTable.jsx";

const EMPTY_FILTERS = { search: "", invoice_no: "", status: "", from_date: "", to_date: "" };

// ── Shared inline styles ──────────────────────────────────────────────────────
const S = {
  page:     { padding: "24px 28px", background: "#f1f5f9", minHeight: "100vh" },
  header:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  title:    { margin: 0, fontSize: "24px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  btnRow:   { display: "flex", alignItems: "center", gap: "10px" },
  loading:  { background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" },
  errBox:   { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", color: "#dc2626", fontSize: "13px", marginBottom: "16px" },
};

function Btn({ onClick, color = "#3b82f6", children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "9px 18px", background: color, color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "8px 16px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
    >
      ← Back
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GateEntry() {
  const { hasRole } = useAuth();
  const canGate = hasRole("gate_person", "gate_manager", "gate_staff", "store_person", "store_manager", "admin");

  // Navigation: 'home' | 'inward-list' | 'outward-list'
  const [view, setView]       = useState("home");
  const [formTab, setFormTab] = useState("inward"); // which form is active on home
  const [formKey, setFormKey] = useState(0);        // increment to reset form

  // List state
  const [list, setList]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [detail, setDetail]   = useState(null);

  const debounceRef = useRef(null);

  const listType = view === "inward-list" ? "inward" : "outward";

  const fetchList = useCallback(async (type, activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100, ...activeFilters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] });
      const res = type === "inward"
        ? await gateApi.inwardList(params)
        : await gateApi.outwardList(params);
      setList(res.data || []);
      setTotal(res.total ?? (res.data?.length ?? 0));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  // Fetch fresh data each time we enter a list view
  useEffect(() => {
    if (view === "inward-list" || view === "outward-list") {
      setFilters(EMPTY_FILTERS);
      fetchList(listType, EMPTY_FILTERS);
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  function openList(type) {
    setDetail(null);
    setList([]);
    setView(type === "inward" ? "inward-list" : "outward-list");
  }

  function goHome() {
    setView("home");
    setList([]);
    setDetail(null);
    setFilters(EMPTY_FILTERS);
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "search" || key === "invoice_no") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchList(listType, next), 400);
    } else {
      fetchList(listType, next);
    }
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchList(listType, EMPTY_FILTERS);
  };

  const submitInward = async (form) => {
    try {
      await gateApi.createInward(form);
      openList("inward"); // show the list so user can see the new entry
    } catch (e) {
      alert(e.message);
    }
  };

  const submitOutward = async (form) => {
    try {
      await gateApi.createOutward(form);
      openList("outward");
    } catch (e) {
      alert(e.message);
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await gateApi.inwardDetail(id);
      setDetail(res.data);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRequestDelete = async (id, type) => {
    if (!confirm("Send a delete request to admin?\n\nThis record will be flagged for review. Only an admin can permanently delete it.")) return;
    try {
      if (type === "inward") await gateApi.requestDeleteInward(id);
      else                   await gateApi.requestDeleteOutward(id);
      fetchList(listType, filters);
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>

      {/* ════════════════════════════════════════════════════
          HOME — form (inward or outward)
          ════════════════════════════════════════════════════ */}
      {view === "home" && (
        <>
          <div style={S.header}>
            <div>
              <h1 style={S.title}>Gate Entry</h1>
              <p style={S.subtitle}>Record inward and outward material movements</p>
            </div>
            <div style={S.btnRow}>
              {canGate && (
                <>
                  <Btn onClick={() => openList("inward")} color="#3b82f6">⬇ Inward Entries</Btn>
                  <Btn onClick={() => openList("outward")} color="#7c3aed">⬆ Outward Entries</Btn>
                </>
              )}
              <BackButton />
            </div>
          </div>

          {/* Inward / Outward tab selector */}
          <GateTabs tab={formTab} onChange={(t) => { setFormTab(t); setFormKey(k => k + 1) }} />

          {/* Form — key forces remount (clears fields) when Cancel is clicked */}
          {formTab === "inward" && (
            <InwardForm
              key={`inward-${formKey}`}
              onSubmit={submitInward}
              onCancel={() => setFormKey(k => k + 1)}
            />
          )}
          {formTab === "outward" && (
            <OutwardForm
              key={`outward-${formKey}`}
              onSubmit={submitOutward}
              onCancel={() => setFormKey(k => k + 1)}
            />
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          INWARD LIST
          ════════════════════════════════════════════════════ */}
      {view === "inward-list" && (
        <>
          <div style={S.header}>
            <div>
              <h1 style={S.title}>⬇ Inward Entries</h1>
              <p style={S.subtitle}>{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div style={S.btnRow}>
              <BackBtn onClick={goHome} />
            </div>
          </div>

          {detail && <InwardDetailPanel detail={detail} onClose={() => setDetail(null)} />}

          <GateFilterBar
            tab="inward"
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            total={total}
          />

          {error && <div style={S.errBox}>{error}</div>}

          {loading
            ? <div style={S.loading}>Loading…</div>
            : <InwardTable
                list={list}
                total={total}
                onOpenDetail={openDetail}
                onRequestDelete={(id) => handleRequestDelete(id, "inward")}
              />
          }
        </>
      )}

      {/* ════════════════════════════════════════════════════
          OUTWARD LIST
          ════════════════════════════════════════════════════ */}
      {view === "outward-list" && (
        <>
          <div style={S.header}>
            <div>
              <h1 style={S.title}>⬆ Outward Entries</h1>
              <p style={S.subtitle}>{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div style={S.btnRow}>
              <BackBtn onClick={goHome} />
            </div>
          </div>

          <GateFilterBar
            tab="outward"
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            total={total}
          />

          {error && <div style={S.errBox}>{error}</div>}

          {loading
            ? <div style={S.loading}>Loading…</div>
            : <OutwardTable
                list={list}
                total={total}
                onRequestDelete={(id) => handleRequestDelete(id, "outward")}
              />
          }
        </>
      )}
    </div>
  );
}
