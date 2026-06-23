import { useState, useEffect, useCallback } from "react";
import { packsApi } from "../../../../api/inventory.js";

export function usePacks(filterCode, reloadTrigger) {
  const [packs, setPacks]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await packsApi.list({
        itemCode: filterCode || undefined,
        limit: 500,
      });
      setPacks(r.data || []);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [filterCode]);

  useEffect(() => {
    load();
  }, [load, reloadTrigger]);

  return { packs, loading, reload: load };
}
