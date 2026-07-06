import './PackEntries.css';
import { BackButton } from "../../../../components/ui";
import PackTable from "../components/pack-table/PackTable.jsx";

export default function PackEntries() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pack Records — Entries</h1>
          <p className="hidden md:block text-sm text-gray-500 mt-0.5">All generated pack labels and their current status</p>
        </div>
        {/* Real router back — mobile has the native back gesture for this */}
        <div className="hidden md:block"><BackButton /></div>
      </div>

      <PackTable />
    </div>
  );
}
