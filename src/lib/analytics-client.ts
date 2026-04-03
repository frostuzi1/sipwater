import { getSupabaseClient } from "@/lib/supabase";

/** Fire-and-forget analytics; never throws to the caller. */
export function trackClientEvent(
  name: string,
  payload?: Record<string, unknown>
): void {
  void (async () => {
    try {
      const supabase = getSupabaseClient();
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      await fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          payload: payload ?? {},
        }),
      });
    } catch {
      // ignore
    }
  })();
}
