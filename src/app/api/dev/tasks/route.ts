import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_COOKIE, isDemoModeEnabled } from "@/lib/demo/constants";
import { isValidDemoToken } from "@/lib/demo/session";
import { updateDemoTaskStatus } from "@/lib/demo/store";
import type { TaskStatus } from "@/lib/types/database";

export async function PATCH(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!isValidDemoToken(cookieStore.get(DEMO_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status } = (await request.json()) as {
    taskId: string;
    status: TaskStatus;
  };

  if (!taskId || !status) {
    return NextResponse.json({ error: "Missing taskId or status" }, { status: 400 });
  }

  const ok = updateDemoTaskStatus(taskId, status);
  if (!ok) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
