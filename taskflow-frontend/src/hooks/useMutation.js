import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async action with pending/error state. `run` re-throws so callers can react.
 */
export function useMutation(action) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args) => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, reset };
}
