'use client';

/**
 * Generic data-fetching hook with loading/error state.
 * Usage: const { data, loading, error, refetch } = useApi(() => api.get('/courses'))
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiError } from '@/types/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<{ data: T }>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      setData(res.data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { execute(); }, [execute, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute };
}
