import { useState } from "react";
import BackButton from "../../../../components/erp/BackButton.jsx";
import GenerateForm from "../components/GenerateForm.jsx";
import GateInwardPanel from "../components/GateInwardPanel.jsx";
import PackTable from "../components/PackTable.jsx";

export default function PrintMaster() {
  const [reloadTrigger, setReloadTrigger]         = useState(0);
  const [gatePanelTrigger, setGatePanelTrigger]   = useState(0);
  const [selectedGate, setSelectedGate]           = useState(null);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Print Master — Generate Pack Labels</h1>
        <BackButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GenerateForm
          onGenerated={() => setReloadTrigger(n => n + 1)}
          onGateUsed={() => { setGatePanelTrigger(n => n + 1); setSelectedGate(null); }}
          prefill={selectedGate}
        />
        <GateInwardPanel
          onSelect={setSelectedGate}
          selectedId={selectedGate?.inward_id}
          reloadTrigger={gatePanelTrigger}
        />
      </div>

      <PackTable reloadTrigger={reloadTrigger} />
    </div>
  );
}
