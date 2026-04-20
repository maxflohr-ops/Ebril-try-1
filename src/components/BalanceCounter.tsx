"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  userKey?: string;
}

interface Ember {
  id: number;
}

export function BalanceCounter({ value, duration = 800, userKey = "anon" }: Props) {
  const [display, setDisplay] = useState(value);
  const [embers, setEmbers] = useState<Ember[]>([]);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);
  const storageKey = `ebril:balance:${userKey}`;

  // Compare against last-seen balance on mount — spawn an ember if it went up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prevRaw = window.localStorage.getItem(storageKey);
    const prev = prevRaw ? Number(prevRaw) : null;
    if (prev !== null && value > prev) {
      spawnEmber();
      fromRef.current = prev;
      setDisplay(prev);
    }
    window.localStorage.setItem(storageKey, String(value));
    // Only run on first mount — subsequent value changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tween to the new value whenever `value` changes after the first render.
  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    let raf: number;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = ease(t);
      const next = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  function spawnEmber() {
    const id = Date.now() + Math.random();
    setEmbers((e) => [...e, { id }]);
    setTimeout(() => setEmbers((e) => e.filter((x) => x.id !== id)), 1300);
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {display.toLocaleString()}
      {embers.map((e) => (
        <span key={e.id} className="ember" aria-hidden />
      ))}
    </span>
  );
}
