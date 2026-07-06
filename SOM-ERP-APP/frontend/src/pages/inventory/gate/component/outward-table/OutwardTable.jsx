import { useState } from "react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import { Button } from "../../../../../components/ui";
import "./OutwardTable.css";

function StatusBadge({ status }) {
  return (
    <span className={`ot-status ot-status--${status || "pending"}`}>
      {status}
    </span>
  );
}

const HEADERS = ["Receiver Name", "Invoice No.", "Vehicle No.", "Date & Time", "Status", "Actions"];

function DeleteRequestBadge() {
  return <span className="ot-del-badge">Delete Requested</span>;
}

export default function OutwardTable({ list, total, onRequestDelete }) {
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const paginated = list.slice((page - 1) * limit, page * limit);

  if (!list.length) {
    return (
      <div className="ot-empty">
        <div className="ot-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <div className="ot-empty-title">No outward entries found</div>
        <div className="ot-empty-sub">Record a new outward movement to get started</div>
      </div>
    );
  }

  return (
    <div className="ot-wrap">
      <div className="ot-toolbar">
        <span className="ot-toolbar-title">Outward Entries</span>
        <span className="ot-badge">{total ?? list.length} records</span>
      </div>

      <div className="ot-scroll">
        <table className="ot-table">
          <thead>
            <tr className="ot-thead-row">
              {HEADERS.map((h) => (
                <th key={h} className="ot-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr
                key={item.outward_id || item.outwardId}
                className={`ot-row ${idx % 2 === 0 ? "ot-row--even" : "ot-row--odd"}`}
              >
                <td className="ot-td ot-td-receiver">
                  {item.receiver_name || item.receiverName || "—"}
                </td>
                <td className="ot-td ot-td-text">
                  {item.invoice_no || item.invoiceNo || "—"}
                </td>
                <td className="ot-td ot-td-text">
                  {item.vehicle_no || item.vehicleNo || "—"}
                </td>
                <td className="ot-td ot-td-date">
                  {new Date(item.created_at || item.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="ot-td">
                  <StatusBadge status={item.status} />
                </td>
                <td className="ot-td">
                  {item.request_delete ? (
                    <DeleteRequestBadge />
                  ) : (
                    <Button
                      variant="warning"
                      size="xs"
                      onClick={() => onRequestDelete(item.outward_id || item.outwardId)}
                    >
                      Request Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ot-pagination">
        <Pagination page={page} total={list.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  );
}
