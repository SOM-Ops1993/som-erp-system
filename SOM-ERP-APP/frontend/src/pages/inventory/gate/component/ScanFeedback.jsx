export default function ScanFeedback({ feedback, onClose }) {
  if (!feedback) return null;

  const isSuccess = feedback.success === true;
  const isLoading = feedback.loading === true;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        padding: "14px 20px",
        background: isSuccess ? "#f0fdf4" : isLoading ? "#fff" : "#fef2f2",
        borderRadius: "10px",
        border: `1px solid ${isSuccess ? "#16a34a" : isLoading ? "#e2e8f0" : "#dc2626"}`,
        color: isSuccess ? "#15803d" : isLoading ? "#64748b" : "#dc2626",
        fontWeight: 600,
        fontSize: "13px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: "260px",
      }}
    >
      <span style={{ fontSize: "16px" }}>
        {isLoading ? "⏳" : isSuccess ? "✅" : "❌"}
      </span>
      <span style={{ flex: 1 }}>{feedback.msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          opacity: 0.5,
          fontSize: "16px",
          padding: "0",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
