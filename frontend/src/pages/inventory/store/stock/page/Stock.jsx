import { useState, useEffect, useCallback } from "react";
import { stockApi } from "../../../../../api/inventory.js";
import BackButton from "../../../../../components/erp/BackButton.jsx";
import { PERIODS } from "../components/utils.js";
import RawMaterialsSection from "../components/RawMaterialsSection.jsx";
import GateSection from "../components/GateSection.jsx";
import StoreSection from "../components/StoreSection.jsx";
import ProductionSection from "../components/ProductionSection.jsx";
import SalesSection from "../components/SalesSection.jsx";

export default function Stock() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ts, setTs] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await stockApi.dashboard(period);
      setData(r.data);
      setTs(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const d = data || {};
  const rm = d.rawMaterials || {};
  const gate = d.gate || {};
  const st = d.store || {};
  const prod = d.production || {};
  const so = d.salesOrders || {};
  const dis = d.dispatch || {};

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">
        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ERP Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              SOM Phytopharma · operational overview
              {ts && (
                <>
                  {" "}
                  · refreshed{" "}
                  {ts.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition text-lg"
              title="Refresh"
            >
              ↻
            </button>
            <BackButton />
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <RawMaterialsSection rm={rm} loading={loading} />
          <GateSection gate={gate} loading={loading} label={periodLabel} />
          <StoreSection st={st} loading={loading} label={periodLabel} />
          <ProductionSection
            prod={prod}
            loading={loading}
            label={periodLabel}
          />
          <SalesSection
            so={so}
            dis={dis}
            loading={loading}
            label={periodLabel}
          />
        </div>

        <p className="text-[11px] text-gray-400 mt-8 pl-0.5">
          ※ Raw Materials count shows current stock state. All other metrics are
          filtered by <strong>{periodLabel}</strong>.
        </p>
      </div>
    </div>
  );
}
