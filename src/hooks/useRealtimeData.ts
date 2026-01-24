import { useState, useEffect, useCallback } from "react";
import { dataSyncService } from "../services/sync/syncSelector";
import type { ResourceType } from "../services/sync/dataSync.types";

export function useRealtimeData<T>(
  fetcher: () => Promise<T>,
  resource: ResourceType,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      console.error("Błąd pobierania danych:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    loadData();

    const unsubscribe = dataSyncService.subscribe(resource, () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [resource, loadData, ...dependencies]);

  return { data, loading, error, refresh: loadData };
}