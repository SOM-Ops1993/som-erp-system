import './PackEntries.css';
import { BackButton } from "../../../../components/ui";
import PackTable from "../components/pack-table/PackTable.jsx";

export default function PackEntries() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pack Records — Entries</h1>
          <p className="text-sm text-gray-500 mt-0.5">All generated pack labels and their current status</p>
        </div>
        <BackButton />
      </div>

      <PackTable />
    </div>
  );
}
