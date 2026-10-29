import { useEffect, useRef, useState } from "react";

import { useGetActiveFetchesQuery } from "./lead-review-api";

/**
 * Fetches in progress (D1/D2). The server moves fetches along when someone
 * asks GET /fetches/active, and ignores asks closer than 5 s apart, so this
 * polls every 5 s while it returns any rows and stops when it's empty.
 * Leaving the page is safe: the server finishes the work on its own.
 *
 * `onFinished` gets the fetches that just left the list (finished, no new
 * results or failed), so the page can reload the search and its leads.
 */
export function useActiveFetches(onFinished?: (left: { id: string; searchId: string }[]) => void) {
  const [poll, setPoll] = useState(0);
  const q = useGetActiveFetchesQuery(undefined, { pollingInterval: poll, skipPollingIfUnfocused: false });
  const rows = q.data?.data;
  const count = rows?.length ?? 0;
  useEffect(() => setPoll(count ? 5000 : 0), [count]);

  const seen = useRef(new Map<string, string>());
  const finished = useRef(onFinished);
  finished.current = onFinished;
  useEffect(() => {
    if (!rows) return;
    const now = new Map(rows.map((r) => [r.id, r.searchId]));
    const left = [...seen.current].filter(([id]) => !now.has(id)).map(([id, searchId]) => ({ id, searchId }));
    seen.current = now;
    if (left.length) finished.current?.(left);
  }, [rows]);

  return { rows: rows ?? [], queueLength: q.data?.queueLength ?? 0, receivedAt: q.fulfilledTimeStamp, isLoading: q.isLoading };
}
