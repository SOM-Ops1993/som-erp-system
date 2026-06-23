import { Route } from "react-router-dom";

function ComingSoon({ title, icon }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "60vh",
        gap: "16px",
        color: "#94a3b8",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <div style={{ fontSize: "52px", opacity: 0.4 }}>{icon || "🔧"}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#64748b" }}>
        {title}
      </div>
      <div
        style={{
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 20px",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#94a3b8",
        }}
      >
        COMING SOON
      </div>
    </div>
  );
}

export const qualityRoutes = [
  <Route key="qc-samples" path="/qc-samples" element={<ComingSoon title="QC Samples"   icon="🧫" />} />,
  <Route key="qc-results" path="/qc-results" element={<ComingSoon title="Test Results" icon="🔬" />} />,
  <Route key="qc-reports" path="/qc-reports" element={<ComingSoon title="QC Reports"   icon="📊" />} />,
];
