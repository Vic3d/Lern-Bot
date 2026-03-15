'use client';

import { getSupabaseClient } from './supabase';

const EVENTS_QUEUE_KEY = 'learnflow_events_queue';

export type EventType =
  | 'chapter_start'
  | 'chapter_complete'
  | 'quiz_answer'
  | 'explain_request'
  | 'session_start'
  | 'session_end';

export interface LearningEvent {
  user_id: string;
  document_id: string;
  chapter_id?: string;
  event_type: EventType;
  data: Record<string, unknown>;
  created_at: string;
}

type QueuedEvent = LearningEvent & { _queued_at: number };

function readQueue(): QueuedEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedEvent[]) {
  if (typeof window === 'undefined') return;
  // Keep at most 500 events to avoid bloat
  const trimmed = events.slice(-500);
  localStorage.setItem(EVENTS_QUEUE_KEY, JSON.stringify(trimmed));
}

function enqueueEvent(event: LearningEvent) {
  const queue = readQueue();
  queue.push({ ...event, _queued_at: Date.now() });
  writeQueue(queue);
}

/**
 * Flushes queued events to Supabase.
 * Called opportunistically — silently fails if offline or unconfigured.
 */
export async function flushEventQueue(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return; // No Supabase — localStorage-only mode

  const queue = readQueue();
  if (queue.length === 0) return;

  // Strip internal _queued_at before sending
  const eventsToSend: LearningEvent[] = queue.map(({ _queued_at: _discarded, ...e }) => e);

  try {
    const { error } = await supabase.from('events').insert(eventsToSend);
    if (!error) {
      writeQueue([]); // Clear queue on success
    }
  } catch {
    // Offline — keep in queue, will retry later
  }
}

/**
 * Log a learning event.
 * - Always saves to localStorage queue (offline-first)
 * - Attempts to flush to Supabase if configured
 */
export async function logEvent(
  event: Omit<LearningEvent, 'created_at'>
): Promise<void> {
  const fullEvent: LearningEvent = {
    ...event,
    created_at: new Date().toISOString(),
  };

  // Always queue locally first
  enqueueEvent(fullEvent);

  // Try to flush to Supabase (fire and forget)
  flushEventQueue().catch(() => {});
}
