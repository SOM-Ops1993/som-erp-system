export default function GateHeader({ tab, showForm, canGate, onNewClick, backButton }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "24px",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.5px",
          }}
        >
          Gate Entry
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Manage inward and outward material movements
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {canGate && (
          <button
            onClick={onNewClick}
            style={{
              padding: "9px 20px",
              background: showForm ? "#64748b" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {showForm ? "✕ Cancel" : `+ New ${tab === "inward" ? "Inward" : "Outward"}`}
          </button>
        )}
        {backButton}
      </div>
    </div>
  );
}
