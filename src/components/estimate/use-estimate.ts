"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicEstimate } from "@/domain/estimator/public";

export interface EstimateState {
  estimate: PublicEstimate | null;
  errors: Record<string, string>;
  loading: boolean;
  failed: boolean;
}

/**
 * Debounced live estimate. Prices are always computed on the server (/api/estimate) so private
 * cost parameters never reach the browser.
 */
export function useEstimate(kind: "keychain" | "organizer" | "product", input: unknown, productSlug?: string, delay = 280): EstimateState {
  const [state, setState] = useState<EstimateState>({ estimate: null, errors: {}, loading: true, failed: false });
  const key = JSON.stringify(input);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, input: JSON.parse(key), productSlug }),
          signal: controller.signal,
        });
        if (res.status === 429) throw new Error("rate");
        const data = (await res.json()) as { ok: boolean; estimate?: PublicEstimate; errors?: Record<string, string> };
        if (id !== seq.current) return;
        if (data.ok && data.estimate) setState({ estimate: data.estimate, errors: {}, loading: false, failed: false });
        else setState((s) => ({ estimate: s.estimate, errors: data.errors ?? {}, loading: false, failed: false }));
      } catch (e) {
        if ((e as Error).name === "AbortError" || id !== seq.current) return;
        setState((s) => ({ ...s, loading: false, failed: true }));
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, key, productSlug, delay]);

  return state;
}
