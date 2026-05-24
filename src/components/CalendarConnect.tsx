"use client";

import { useSearchParams } from "next/navigation";

export function CalendarConnect({ connected }: { connected: boolean }) {
  const params = useSearchParams();
  const calendarStatus = params.get("calendar");

  return (
    <div className="glass integrations">
      <div>
        <strong>Google Calendar</strong>
        <p className="status-msg">
          {connected
            ? "Connected — double-click a task to create a showing event."
            : "Connect to sync showings with your calendar."}
        </p>
        {calendarStatus === "connected" && (
          <p className="status-msg" style={{ color: "#38a169" }}>
            Calendar connected successfully.
          </p>
        )}
        {calendarStatus === "error" && (
          <p className="status-msg" style={{ color: "#e53e3e" }}>
            Calendar connection failed. Check Google OAuth settings.
          </p>
        )}
      </div>
      {!connected && (
        <a href="/api/calendar/connect" className="btn btn-primary">
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
