import { useEffect, useRef, useState } from 'react';

// Runs an async loader whenever `deps` change, exposing { loading, data, error, retry }.
export function useAsync(loader, deps = []) {
  const ref = useRef(loader);
  ref.current = loader;

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve(ref.current(ctrl.signal))
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch((err) => {
        if (alive && err?.name !== 'AbortError') setState({ loading: false, data: null, error: err?.message || 'Something went wrong' });
      });
    return () => { alive = false; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, retry: () => setNonce((n) => n + 1) };
}
