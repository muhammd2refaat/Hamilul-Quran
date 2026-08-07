import { apiClient } from '@/lib/api';

/**
 * Fire-and-forget: records that the current user clicked Join for this
 * session. Called from every Join link right as it's clicked — never
 * blocks or delays opening the actual Meet link, and a failure here is
 * silent (missing an attendance record is far less disruptive to the user
 * than a broken Join button would be). Idempotent server-side per
 * (allocation, user, date), so this is safe to fire on every click.
 */
export function recordAttendance(
  allocationId: string,
  sessionDate: string,
  day: string,
  time: string
): void {
  apiClient
    .post('/sessions/attendance', {
      allocation_id: allocationId,
      session_date: sessionDate,
      scheduled_day: day,
      scheduled_time: time,
    })
    .catch(() => {
      // Best-effort — see note above.
    });
}
