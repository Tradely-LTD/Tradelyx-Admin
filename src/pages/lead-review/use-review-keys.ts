import { useEffect, useReducer, useRef } from "react";

import { type KeyContext, type ReviewAction, resolveReviewKey } from "./labels";

/**
 * The review queue's keyboard (G4). One listener on the window; what each key
 * means is decided by resolveReviewKey (labels.ts), which ignores text fields
 * (G6), Ctrl/Meta/Alt, and decisions while one is in flight. Held-down
 * repeats are ignored too. `enabled: false` while the reason picker, a
 * drawer or a dialog has the keys.
 */
export function useReviewKeys(onAction: (action: ReviewAction) => void, ctx: KeyContext & { enabled: boolean }) {
  const handler = useRef(onAction);
  handler.current = onAction;
  const { enabled, tab, busy } = ctx;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.defaultPrevented) return;
      const action = resolveReviewKey(e, { tab, busy });
      if (!action) return;
      e.preventDefault();
      handler.current(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, tab, busy]);
}

/** Re-render every `ms` while `on` (ticking timers); returns the browser's now. */
export function useTick(on: boolean, ms = 1000) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(tick, ms);
    return () => window.clearInterval(t);
  }, [on, ms]);
  return Date.now();
}
