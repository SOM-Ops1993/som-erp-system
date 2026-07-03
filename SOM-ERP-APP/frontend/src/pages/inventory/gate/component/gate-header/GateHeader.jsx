import { Button } from "../../../../../components/ui";
import { Plus, X } from "lucide-react";

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
          <Button
            variant={showForm ? "secondary" : "primary"}
            icon={showForm ? X : Plus}
            onClick={onNewClick}
          >
            {showForm ? "Cancel" : `New ${tab === "inward" ? "Inward" : "Outward"}`}
          </Button>
        )}
        {backButton}
      </div>
    </div>
  );
}
