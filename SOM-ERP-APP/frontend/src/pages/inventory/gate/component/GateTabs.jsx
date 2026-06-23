const TABS = [
  { key: "inward", label: "⬇ Inward" },
  { key: "outward", label: "⬆ Outward" },
];

export default function GateTabs({ tab, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        marginBottom: "20px",
        background: "#e2e8f0",
        padding: "4px",
        borderRadius: "10px",
        width: "fit-content",
      }}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "8px 24px",
            border: "none",
            borderRadius: "7px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s",
            background: tab === key ? "#fff" : "transparent",
            color: tab === key ? "#0f172a" : "#64748b",
            boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
