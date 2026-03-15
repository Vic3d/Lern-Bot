import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client if env vars are configured, otherwise null.
 * Graceful degradation: callers must handle null case (localStorage fallback).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null; // SSR guard

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your-project-url') return null;

  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
}

/** True if Supabase is configured and available */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url !== 'your-project-url');
}
