import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

// Generate a data-URL for one packId
async function toDataUrl(packId) {
  return QRCode.toDataURL(packId, {
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

function PackLabel({ pack }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    toDataUrl(pack.packId).then(setSrc).catch(console.error);
  }, [pack.packId]);

  const dateStr = pack.receivedDate
    ? new Date(pack.receivedDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div
      style={{
        width: "283pt",
        height: "142pt",
        border: "1px solid #ccc",
        borderRadius: "6px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Helvetica, Arial, sans-serif",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1a3a6b",
          color: "#fff",
          padding: "5px 10px",
          fontWeight: 700,
          fontSize: "13px",
          textAlign: "center",
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {pack.packId}
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, padding: "8px 10px", gap: "8px" }}>
        {/* Left info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
          <div>
            <div style={{ fontSize: "7px", color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Item</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{pack.itemName}</div>
          </div>
          <div>
            <div style={{ fontSize: "7px", color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Pack Qty</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#000" }}>
              {pack.packQty} {pack.uom}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "7px", color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Lot No</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#222" }}>{pack.lotNo}</div>
          </div>
        </div>

        {/* QR code */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          {src ? (
            <img src={src} alt={pack.packId} width={72} height={72} style={{ display: "block" }} />
          ) : (
            <div style={{ width: 72, height: 72, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#999" }}>
              …
            </div>
          )}
          {dateStr && (
            <div style={{ fontSize: "7px", color: "#555", marginTop: "2px", textAlign: "center" }}>
              Rcvd: {dateStr}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {/* <div
        style={{
          background: "#d6e4f0",
          color: "#1a3a6b",
          fontSize: "8px",
          fontWeight: 700,
          padding: "3px 10px",
          flexShrink: 0,
        }}
      >
        LOT: {pack.lotNo}
      </div> */}
      
    </div>
  );
}

export default function QRCodePreview({ results, onClose }) {
  const overlayRef = useRef(null);

  // Flatten all packs from all results
  const allPacks = results.flatMap((r) => r?.packs || []);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print-only style: hide everything except the overlay content */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-root { display: block !important; }
          #qr-print-controls { display: none !important; }
        }
      `}</style>

      {/* Overlay backdrop */}
      <div
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 1000,
          display: "flex", flexDirection: "column",
          alignItems: "center",
          overflowY: "auto",
          padding: "24px 16px",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Controls bar */}
        <div
          id="qr-print-controls"
          style={{
            width: "100%", maxWidth: "900px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "16px", flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "16px" }}>
            QR Labels — {allPacks.length} pack{allPacks.length !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handlePrint}
              style={{
                padding: "8px 20px", background: "#2563eb", color: "#fff",
                border: "none", borderRadius: "7px", fontWeight: 700,
                fontSize: "14px", cursor: "pointer",
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px", background: "#fff", color: "#374151",
                border: "none", borderRadius: "7px", fontWeight: 700,
                fontSize: "14px", cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Labels grid */}
        <div
          id="qr-print-root"
          ref={overlayRef}
          style={{
            width: "100%", maxWidth: "900px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 283pt)",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          {allPacks.map((pack) => (
            <PackLabel key={pack.packId} pack={pack} />
          ))}
        </div>
      </div>
    </>
  );
}
