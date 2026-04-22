import { useCallback, useEffect, useState } from "react";
import { hasNewerThanViewed } from "@/lib/notificationViewed";
import { supabase } from "@/lib/supabase";

const TABLE = "app_notifications";

export function useNotificationBellBadge() {
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.created_at) {
      setHasUnread(false);
      return;
    }
    setHasUnread(hasNewerThanViewed(data.created_at));
  }, []);

  useEffect(() => {
    refresh();

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    const channel = supabase
      .channel("app-notifications-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE },
        () => refresh()
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { hasUnread, refresh };
}
