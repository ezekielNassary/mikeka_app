import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAllOdds } from '../lib/api.js';

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
        const data = await fetchAllOdds(controller.signal);
        if (cancelled) return;
        const events = data.loadedEvents || 0;
        setTournaments(data.tournaments || []);
        setLoadedEvents(events);
        setTotalEvents(data.totalNum || events);
        setPhase('ready');
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
