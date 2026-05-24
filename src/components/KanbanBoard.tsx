"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types/database";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To‑Do" },
  { status: "inprogress", label: "In‑Progress" },
  { status: "done", label: "Done" },
];

export function KanbanBoard({
  tasks: initial,
  demoMode = false,
}: {
  tasks: Task[];
  demoMode?: boolean;
}) {
  const [tasks, setTasks] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function tasksFor(status: TaskStatus) {
    return tasks.filter((t) => t.status === status);
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    if (demoMode) {
      await fetch("/api/dev/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status }),
      });
      return;
    }
    const supabase = createClient();
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", taskId);
  }

  async function scheduleShowing(task: Task) {
    const start = prompt("Showing start (ISO datetime, e.g. 2026-06-01T14:00:00Z)");
    if (!start) return;
    const end = prompt("Showing end (ISO datetime)", new Date(new Date(start).getTime() + 3600000).toISOString());
    if (!end) return;

    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        summary: task.title,
        description: "Scheduled from CRM",
        start,
        end,
      }),
    });

    if (res.ok) {
      const email = prompt("Send reminder to email (optional)");
      if (email) {
        await fetch("/api/email/showing-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: email,
            agentName: "Agent",
            title: task.title,
            when: new Date(start).toLocaleString(),
          }),
        });
      }
      alert("Showing added to Google Calendar");
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to create calendar event");
    }
  }

  return (
    <section className="tasks" id="tasks">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <a href="/api/export?type=tasks&format=csv" className="btn">
          ⬇ Export CSV
        </a>
      </div>
      <div className="kanban">
        {COLUMNS.map(({ status, label }) => (
          <div
            key={status}
            className="column glass"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingId) moveTask(draggingId, status);
              setDraggingId(null);
            }}
          >
            <h3>{label}</h3>
            <ul className="task-list">
              {tasksFor(status).map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggingId(task.id)}
                  onDoubleClick={() => scheduleShowing(task)}
                  title="Double-click to schedule showing"
                >
                  {task.title}
                  {task.due_at && (
                    <small style={{ display: "block", opacity: 0.7 }}>
                      {new Date(task.due_at).toLocaleDateString()}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="status-msg">Drag tasks between columns. Double-click a task to add a calendar showing.</p>
    </section>
  );
}
