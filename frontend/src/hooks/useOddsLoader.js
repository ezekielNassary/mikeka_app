import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOddsPage, mergeTournaments } from '../lib/api.js';

// Load the first page immediately so the UI can render, then stream the
// remaining pages in small batches (same pattern as the old Soka Hub app).
const PAGE_BATCH = 3;
const MAX_PAGES = 40;

export function useOddsLoader() {
  const [tournaments, setTournaments] = useState([]);
  const [phase, setPhase] = useState('connecting');
  const [loadedEvents, setLoadedEvents] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [error, setError] = useState('');
  const [runId, setRunId] = useState(0);
  const controllerRef = useRef(null);

  const retry = useCallback(() => setRunId((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    let cancelled = false;

    setTournaments([]);
    setPhase('connecting');
    setLoadedEvents(0);
    setTotalEvents(0);
    setError('');

    (async () => {
      try {
        const first = await fetchOddsPage(1, controller.signal);
        if (cancelled) return;

        let merged = first.tournaments || [];
        setTournaments(merged);
        setLoadedEvents(first.loadedEvents || 0);
        setTotalEvents(first.totalNum || first.loadedEvents || 0);
        setPhase('ready');

        const totalPages = Math.min(first.totalPages || 1, MAX_PAGES);
        for (let start = 2; start <= totalPages; start += PAGE_BATCH) {
          const nums = [];
          for (let p = start; p < Math.min(start + PAGE_BATCH, totalPages + 1); p++) nums.push(p);

          const results = await Promise.all(
            nums.map((p) =>
              fetchOddsPage(p, controller.signal).catch((e) => {
                if (e.name === 'AbortError') throw e;
                return null;
              })
            )
          );
          if (cancelled) return;

          let added = 0;
          for (const data of results) {
            if (!data) continue;
            merged = mergeTournaments(merged, data.tournaments || []);
            added += data.loadedEvents || 0;
          }
          setTournaments(merged);
          if (added) setLoadedEvents((n) => n + added);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        if (!cancelled) {
          setError(e.message || 'Failed to load odds');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [runId]);

  return {
    tournaments,
    phase,
    loading: phase === 'connecting',
    loadedEvents,
    totalEvents,
    error,
    retry,
  };
}
