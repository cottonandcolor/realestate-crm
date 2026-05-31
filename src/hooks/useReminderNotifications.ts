"use client";

import { useEffect, useRef } from "react";
import type { Contact } from "@/lib/types/database";

type ContactWithLeads = Contact & { leads?: unknown[] };

/**
 * Polls every minute and fires a browser Notification for any contact whose
 * reminder_at falls within the past interval (i.e. just became due).
 * Also requests Notification permission on first call.
 */
export function useReminderNotifications(contacts: ContactWithLeads[]) {
  // Track which reminder IDs we've already notified so we don't repeat
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    // Request permission silently (browsers require a user gesture the first time,
    // so we call it here and it will show the permission prompt if needed)
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    function check() {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      for (const c of contacts) {
        if (!c.reminder_at) continue;
        const due = new Date(c.reminder_at).getTime();
        // Fire if the reminder is due within the last 2 minutes (covers the polling gap)
        const secondsAgo = (now - due) / 1000;
        if (secondsAgo >= 0 && secondsAgo < 120 && !notified.current.has(c.id)) {
          notified.current.add(c.id);
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
          new Notification(`🔔 Reminder: ${name}`, {
            body: c.reminder_note ?? "You have a reminder for this contact.",
            icon: "/favicon.ico",
            tag: `reminder-${c.id}`,
          });
        }
      }
    }

    check(); // run immediately on mount / contacts change
    const timer = setInterval(check, 60_000); // then every 60 s
    return () => clearInterval(timer);
  }, [contacts]);
}
