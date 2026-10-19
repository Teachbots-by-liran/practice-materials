import { useEffect, useMemo, useRef, useState } from "react";

/** Shuffles answer options once per question; content lists the right answer first. */
export function useShuffled<T>(items: T[], key: string): { item: T; original: number }[] {
  return useMemo(() => {
    const a = items.map((item, original) => ({ item, original }));
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Keeps answers locked for `ms` (after guessing), and times how long the student took. */
export function useLockAndTimer(ms: number) {
  const [locked, setLocked] = useState(ms > 0);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      setLocked(false);
      start.current = performance.now();
    }, ms);
    return () => clearTimeout(t);
  }, [ms]);
  return { locked, elapsed: () => performance.now() - start.current };
}
