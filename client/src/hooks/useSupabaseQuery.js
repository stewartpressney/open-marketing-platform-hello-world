import { useEffect, useState } from 'react';

// Shared fetch hook for Supabase queries.
//
// queryFn — a function that returns a Supabase query (called on each run).
// deps    — values that trigger a re-fetch when they change, e.g. [id].
//           queryFn itself is intentionally excluded from the effect deps;
//           it reads the latest closure values already captured via deps.
//
// The cancelled flag prevents setting state after the component unmounts
// or before a previous fetch completes when deps change quickly.
export function useSupabaseQuery(queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    queryFn().then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      else setData(data);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}
