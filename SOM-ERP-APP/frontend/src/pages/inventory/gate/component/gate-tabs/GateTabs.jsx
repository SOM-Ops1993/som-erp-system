import { ArrowDown, ArrowUp } from "lucide-react";
import "./GateTabs.css";

const TABS = [
  { key: "inward",  label: "Inward",  Icon: ArrowDown },
  { key: "outward", label: "Outward", Icon: ArrowUp   },
];

export default function GateTabs({ tab, onChange }) {
  return (
    <div className="gt-wrap">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`gt-btn ${tab === key ? "gt-btn--active" : ""}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
