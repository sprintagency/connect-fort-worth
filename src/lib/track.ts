import posthog from "posthog-js";
import { createClient } from "@/utils/supabase/client";
import type { ActionType } from "./types";

/** Whether posthog.init() has run (no-op safe when no key is configured). */
export function posthogLoaded(): boolean {
  return Boolean((posthog as { __loaded?: boolean }).__loaded);
}

export interface TrackContext {
  eventId: string | null;
  /** The current user's attendee id, if they've joined. May be null. */
  actorAttendeeId: string | null;
}

export interface TrackProps {
  targetAttendeeId?: string | null;
  [key: string]: unknown;
}

/**
 * Single source of truth for analytics: writes the interaction to Supabase
 * `attendee_actions` (the DB record powering the admin dashboard) AND mirrors
 * it to PostHog. Both calls are best-effort and never throw into the UI.
 */
export async function track(
  ctx: TrackContext,
  actionType: ActionType,
  props: TrackProps = {},
): Promise<void> {
  const { targetAttendeeId = null, ...metadata } = props;

  // PostHog (product analytics) - no-op if not initialized (no key set).
  try {
    if (posthogLoaded()) {
      posthog.capture(actionType, {
        event_id: ctx.eventId,
        target_attendee_id: targetAttendeeId,
        ...metadata,
      });
    }
  } catch {
    /* ignore analytics errors */
  }

  // Supabase (source of truth for the dashboard).
  try {
    const supabase = createClient();
    await supabase.from("attendee_actions").insert({
      event_id: ctx.eventId,
      actor_attendee_id: ctx.actorAttendeeId,
      target_attendee_id: targetAttendeeId,
      action_type: actionType,
      metadata,
    });
  } catch {
    /* ignore - a dropped action shouldn't interrupt the user */
  }
}

/** Identify the PostHog person once we know the attendee id. */
export function identifyAttendee(
  attendeeId: string,
  traits?: Record<string, unknown>,
) {
  try {
    if (posthogLoaded()) posthog.identify(attendeeId, traits);
  } catch {
    /* ignore */
  }
}
