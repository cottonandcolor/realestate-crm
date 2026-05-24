import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google/calendar";
import { getUserOrgId } from "@/lib/org";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { taskId, summary, description, start, end } = body as {
    taskId?: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
  };

  if (!summary || !start || !end) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const eventId = await createCalendarEvent(supabase, user.id, {
    summary,
    description,
    start,
    end,
  });

  if (!eventId) {
    return NextResponse.json(
      { error: "Calendar not connected" },
      { status: 400 }
    );
  }

  if (taskId) {
    const orgId = await getUserOrgId(supabase);
    if (orgId) {
      await supabase
        .from("tasks")
        .update({ google_event_id: eventId, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("org_id", orgId);

      await supabase.from("activities").insert({
        org_id: orgId,
        type: "showing",
        description: `Calendar event created: ${summary}`,
        task_id: taskId,
        created_by: user.id,
      });
    }
  }

  return NextResponse.json({ eventId });
}
