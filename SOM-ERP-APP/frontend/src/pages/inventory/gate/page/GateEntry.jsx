import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowDown, ArrowUp, CheckCircle } from "lucide-react";
import { gateApi } from "../../../../api/inventory.js";
import { useAuth } from "../../../../components/auth/AuthContext.jsx";
import { Button, BackButton, ErrorModal, ConfirmModal } from '../../../../components/ui'
import GateTabs from "../component/gate-tabs/GateTabs.jsx";
import GateFilterBar from "../component/gate-filter-bar/GateFilterBar.jsx";
import InwardForm from "../component/inward-form/InwardForm.jsx";
import OutwardForm from "../component/outward-form/OutwardForm.jsx";
import InwardDetailPanel from "../component/inward-detail-panel/InwardDetailPanel.jsx";
import InwardTable from "../component/inward-table/InwardTable.jsx";
import OutwardTable from "../component/outward-table/OutwardTable.jsx";

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
  const [errModal, setErrModal]           = useState({ open: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successMsg, setSuccessMsg]       = useState('');

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

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const submitInward = async (form) => {
    try {
      const res = await gateApi.createInward(form);
      const entry = res.data;
      showSuccess(`Inward entry created${entry?.supplier_name ? ` for ${entry.supplier_name}` : ''}${entry?.invoice_no ? ` · ${entry.invoice_no}` : ''}`);
      setFormKey(k => k + 1);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const submitOutward = async (form) => {
    try {
      const res = await gateApi.createOutward(form);
      const entry = res.data;
      showSuccess(`Outward entry recorded${entry?.receiver_name ? ` for ${entry.receiver_name}` : ''}${entry?.invoice_no ? ` · ${entry.invoice_no}` : ''}`);
      setFormKey(k => k + 1);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await gateApi.inwardDetail(id);
      setDetail(res.data);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleRequestDelete = (id, type) => setDeleteConfirm({ id, type });

  const confirmDeleteRequest = async () => {
    const { id, type } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (type === "inward") await gateApi.requestDeleteInward(id);
      else                   await gateApi.requestDeleteOutward(id);
      fetchList(listType, filters);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
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
                  <Button variant="primary" icon={ArrowDown} onClick={() => openList("inward")}>Inward Entries</Button>
                  <Button variant="purple"  icon={ArrowUp}   onClick={() => openList("outward")}>Outward Entries</Button>
                </>
              )}
              <BackButton />
            </div>
          </div>

          {/* Success banner */}
          {successMsg && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

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
              <h1 style={{ ...S.title, display: 'flex', alignItems: 'center', gap: '10px' }}><ArrowDown size={22} /> Inward Entries</h1>
              <p style={S.subtitle}>{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div style={S.btnRow}>
              <BackButton onClick={goHome} />
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
              <h1 style={{ ...S.title, display: 'flex', alignItems: 'center', gap: '10px' }}><ArrowUp size={22} /> Outward Entries</h1>
              <p style={S.subtitle}>{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div style={S.btnRow}>
              <BackButton onClick={goHome} />
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

      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
      <ConfirmModal
        open={!!deleteConfirm}
        title="Request Delete"
        message="This record will be flagged for review. Only an admin can permanently delete it."
        acceptText="Send Request"
        onAccept={confirmDeleteRequest}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
