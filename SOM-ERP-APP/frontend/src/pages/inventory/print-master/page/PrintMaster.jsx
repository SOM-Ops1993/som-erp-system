import './PrintMaster.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button } from "../../../../components/ui";
import { CheckCircle, Printer, QrCode, ArrowLeftRight } from "lucide-react";
import GenerateForm from "../components/generate-form/GenerateForm.jsx";
import GateInwardPanel from "../components/gate-inward-panel/GateInwardPanel.jsx";
import QRCodePreview from "../components/qr-code-preview/QRCodePreview.jsx";
import { packsApi } from "../../../../api/inventory.js";

export default function PrintMaster() {
  const navigate = useNavigate();
  const [reloadTrigger, setReloadTrigger]       = useState(0);
  const [gatePanelTrigger, setGatePanelTrigger] = useState(0);
  const [selectedGate, setSelectedGate]         = useState(null);
  const [successInfo, setSuccessInfo]           = useState(null); // { results, totalPacks }
  const [showQR, setShowQR]                     = useState(false);

  const handleGenerated = ({ results, totalPacks }) => {
    setSuccessInfo({ results, totalPacks });
    setShowQR(false);
    setReloadTrigger(n => n + 1);
    setTimeout(() => setSuccessInfo(null), 12000);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Print Master — Generate Pack Labels</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline-gray"
            icon={ArrowLeftRight}
            onClick={() => navigate("/print-master/return-material")}>
            Return Material
          </Button>
          <Button variant="primary" onClick={() => navigate("/print-master/entries")}>
            Entries
          </Button>
          <BackButton />
        </div>
      </div>

      {/* Success banner */}
      {successInfo && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> Generated {successInfo.totalPacks} pack{successInfo.totalPacks !== 1 ? 's' : ''} across {successInfo.results.length} item{successInfo.results.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
            {successInfo.results.map((r, i) => r && (
              <span key={i} className="text-xs text-green-700 flex items-center gap-2">
                <span className="font-semibold">{r.packs?.[0]?.itemName || `Item ${i + 1}`}</span>
                <span>Lot: <strong>{r.lotNo}</strong></span>
                <span>{r.packs?.length} packs</span>
                {r.packs?.[0] && (
                  <a href={packsApi.batchLabelsUrl(r.packs[0].itemCode, r.lotNo)} target="_blank" rel="noreferrer"
                    className="text-blue-600 underline font-semibold flex items-center gap-1">
                    <Printer size={12} /> PDF Labels
                  </a>
                )}
              </span>
            ))}
          </div>
          <Button variant="primary" size="sm" icon={QrCode} onClick={() => setShowQR(true)}>
            Show QR Labels
          </Button>
        </div>
      )}

      {showQR && successInfo && (
        <QRCodePreview results={successInfo.results} onClose={() => setShowQR(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenerateForm
          onGenerated={handleGenerated}
          onGateUsed={() => { setGatePanelTrigger(n => n + 1); setSelectedGate(null); }}
          prefill={selectedGate}
        />
        <GateInwardPanel
          onSelect={setSelectedGate}
          selectedId={selectedGate?.inwardId}
          reloadTrigger={gatePanelTrigger}
        />
      </div>
    </div>
  );
}
