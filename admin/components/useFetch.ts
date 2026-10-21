"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

/** Minimal fetch hook with retry - keeps every page's loading/error/empty states honest. */
export function useFetch<T>(path: string, deps: unknown[] = []): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(path)
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as T | null;
        if (!alive) return;
        if (!res.ok || !json) {
          setState({ data: null, error: `Request failed (${res.status})`, loading: false });
          return;
        }
        setState({ data: json, error: null, loading: false });
      })
      .catch(() => {
        if (alive) setState({ data: null, error: "Network error", loading: false });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  return { ...state, reload };
}
