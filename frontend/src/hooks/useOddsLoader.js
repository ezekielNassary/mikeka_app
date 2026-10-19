import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOddsPage, mergeTournaments } from '../lib/api.js';

export function useOddsLoader() {
  const [tournaments, setTournaments] = useState([]);
  const [phase, setPhase] = useState('connecting');
  const [loadedPages, setLoadedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
    setLoadedPages(0);
    setTotalPages(0);
    setLoadedEvents(0);
    setTotalEvents(0);
    setError('');

    (async () => {
      try {
        const first = await fetchOddsPage(1, controller.signal);
        if (cancelled) return;

        const total = first.totalPages || 1;
        setTournaments(first.tournaments || []);
        setTotalPages(total);
        setLoadedPages(1);
        setLoadedEvents(first.loadedEvents || 0);
        setTotalEvents(first.totalNum || first.loadedEvents || 0);
        setPhase(total > 1 ? 'streaming' : 'ready');

        let acc = first.tournaments || [];
        for (let p = 2; p <= total; p++) {
          if (cancelled) return;
          try {
            const res = await fetchOddsPage(p, controller.signal);
            if (cancelled) return;
            acc = mergeTournaments(acc, res.tournaments || []);
            setTournaments(acc);
            setLoadedPages(p);
            setLoadedEvents((prev) => prev + (res.loadedEvents || 0));
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }
        if (!cancelled) setPhase('ready');
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

  const percent = totalPages > 0 ? Math.min(100, Math.round((loadedPages / totalPages) * 100)) : 0;

  return {
    tournaments,
    phase,
    loading: phase === 'connecting' || phase === 'streaming',
    loadedPages,
    totalPages,
    loadedEvents,
    totalEvents,
    percent,
    error,
    retry,
  };
}
