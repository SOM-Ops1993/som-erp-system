import { useState, useEffect } from "react";
import { rmApi, packsApi } from "../../../../api/inventory.js";

export function useRmSearch() {
  const [rmList, setRmList] = useState([]);
  const [rmSearch, setRmSearch] = useState("");
  const [showRmDrop, setShowRmDrop] = useState(false);
  const [nextLot, setNextLot] = useState("");
  const [selectedRm, setSelectedRm] = useState(null); // { itemCode, itemName, uom }

  useEffect(() => {
    rmApi
      .list({})
      .then((r) => setRmList(r.data || []))
      .catch(console.error);
  }, []);

  const filteredRm = rmList.filter(
    (r) =>
      !rmSearch ||
      r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(rmSearch.toLowerCase()),
  );

  const selectRm = async (rm) => {
    setSelectedRm({
      itemCode: rm.itemCode,
      itemName: rm.itemName,
      uom: rm.uom,
    });
    setRmSearch(rm.itemName);
    setShowRmDrop(false);
    try {
      const r = await packsApi.nextLot(rm.itemCode);
      setNextLot(r.data?.lotNo || "");
    } catch {
      setNextLot("");
    }
  };

  const clearSelection = () => {
    setSelectedRm(null);
    setRmSearch("");
    setNextLot("");
  };

  const handleSearchChange = (value) => {
    setRmSearch(value);
    setShowRmDrop(true);
    // Clear selected rm if user types something different
    if (selectedRm && value !== selectedRm.itemName) {
      setSelectedRm(null);
      setNextLot("");
    }
  };

  return {
    rmList,
    rmSearch,
    showRmDrop,
    setShowRmDrop,
    filteredRm,
    nextLot,
    selectedRm,
    selectRm,
    clearSelection,
    handleSearchChange,
  };
}
