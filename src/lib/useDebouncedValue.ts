import { useEffect, useState } from "react";

/**
 * Menunda pembaruan nilai sampai user berhenti mengetik selama delayMs.
 * Memakai useEffect+setTimeout, TAPI setState terjadi di dalam callback
 * setTimeout (asinkron) — bukan sinkron di badan efek — jadi tidak kena
 * ESLint react-hooks/set-state-in-effect.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}