// Helpers for reading PostgREST responses.

/**
 * Normalise an embedded relation to a single row.
 *
 * `select('… offers ( user_id )')` follows a foreign key, so PostgREST returns
 * one object. supabase-js cannot know that without generated database types
 * and infers an array instead, so reading a property straight off the value
 * type-errors — and would silently yield `undefined` if the shape ever really
 * were an array. Normalising here keeps the call sites correct either way.
 */
export function embeddedOne<T>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  return (row ?? null) as T | null;
}
