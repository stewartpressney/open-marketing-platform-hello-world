import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

// The account's site row, created on demand the first time it's needed.
//
// Every account gets exactly one site (the table has a unique constraint on
// user_id), so there is nothing to set up before tracking can start. The
// site_key is minted by a database trigger, never chosen by the client.
//
// Extracted from TrackingPixel so both Account Settings and My Requests can
// show install instructions without racing to create two site rows.
export function useSite(userId) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrCreate() {
      const { data: existing, error: readError } = await supabase
        .from('sites')
        .select('id, site_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (readError) {
        setError(readError.message);
        setLoading(false);
        return;
      }

      if (existing) {
        setSite(existing);
        setLoading(false);
        return;
      }

      // site_key is omitted deliberately — the trigger fills it in.
      const { data: created, error: insertError } = await supabase
        .from('sites')
        .insert({ user_id: userId })
        .select('id, site_key')
        .single();

      if (cancelled) return;

      if (insertError) setError(insertError.message);
      else setSite(created);
      setLoading(false);
    }

    loadOrCreate();
    return () => { cancelled = true; };
  }, [userId]);

  return { site, loading, error };
}
