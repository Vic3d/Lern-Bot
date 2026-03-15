'use client';

import { getSupabaseClient } from './supabase';

const ANON_ID_KEY = 'learnflow_anon_id';

export interface UserInfo {
  id: string;
  email?: string;
  isAnonymous: boolean;
  displayName?: string;
}

/**
 * Returns an anonymous UUID from localStorage, creating one if needed.
 * This persists across sessions and can be migrated to a real account.
 */
function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return 'server-side';
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

/**
 * Returns the current user.
 * - If logged in via Supabase: returns the authenticated user
 * - Otherwise: returns anonymous user with a stable UUID
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email,
          isAnonymous: false,
          displayName: user.email?.split('@')[0],
        };
      }
    } catch {
      // Supabase unavailable — fall through to anonymous
    }
  }

  return {
    id: getOrCreateAnonId(),
    isAnonymous: true,
  };
}

/**
 * Returns the current user ID synchronously (from localStorage).
 * Safe to call without await in event handlers.
 */
export function getCurrentUserId(): string {
  const supabase = getSupabaseClient();
  if (!supabase) return getOrCreateAnonId();
  // For sync use, return anon ID — real ID available via getCurrentUser()
  return getOrCreateAnonId();
}

/**
 * Sends a magic link to the given email.
 * Returns { error } — null error = success.
 */
export async function signInWithMagicLink(
  email: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: 'Supabase ist nicht konfiguriert.' };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    return { error: error ? error.message : null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unbekannter Fehler' };
  }
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: UserInfo | null) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email,
        isAnonymous: false,
        displayName: session.user.email?.split('@')[0],
      });
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}
