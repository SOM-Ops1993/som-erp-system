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
import "./GateEntry.css";

const EMPTY_FILTERS = { search: "", invoice_no: "", status: "", from_date: "", to_date: "" };

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
    <div className="ge-page">

      {/* ════════════════════════════════════════════════════
          HOME — form (inward or outward)
          ════════════════════════════════════════════════════ */}
      {view === "home" && (
        <>
          <div className="ge-header">
            <div>
              <h1 className="ge-title">Gate Entry</h1>
              <p className="ge-subtitle">Record inward and outward material movements</p>
            </div>
            <div className="ge-btn-row">
              {canGate && (
                <>
                  <Button variant="primary" icon={ArrowDown} onClick={() => openList("inward")}>Inward Entries</Button>
                  <Button variant="purple"  icon={ArrowUp}   onClick={() => openList("outward")}>Outward Entries</Button>
                </>
              )}
              {/* Real router back — mobile's native back gesture already
                  covers this, so it's hidden there (see .ge-back-routable) */}
              <span className="ge-back-routable"><BackButton /></span>
            </div>
          </div>

          {/* Success banner */}
          {successMsg && (
            <div className="ge-success">
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
          <div className="ge-header">
            <div>
              <h1 className="ge-title"><ArrowDown size={22} /> Inward Entries</h1>
              <p className="ge-subtitle">{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div className="ge-btn-row">
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

          {error && <div className="ge-error">{error}</div>}

          {loading
            ? <div className="ge-loading">Loading…</div>
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
          <div className="ge-header">
            <div>
              <h1 className="ge-title"><ArrowUp size={22} /> Outward Entries</h1>
              <p className="ge-subtitle">{total} record{total !== 1 ? "s" : ""} found</p>
            </div>
            <div className="ge-btn-row">
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

          {error && <div className="ge-error">{error}</div>}

          {loading
            ? <div className="ge-loading">Loading…</div>
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
