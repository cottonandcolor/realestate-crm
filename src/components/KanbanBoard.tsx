"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types/database";
import { MicButton } from "./MicButton";
import { parseTaskFromSpeech } from "@/lib/voice/parseTask";

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
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [addingStatus, setAddingStatus] = useState<TaskStatus | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function addTask(status: TaskStatus) {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status, due_at: newDue || null }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setNewDue("");
      setAddingStatus(null);
    }
    setSaving(false);
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

            {/* Quick-add row */}
            {addingStatus === status ? (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ position: "relative" }}>
                  <input
                    autoFocus
                    className="input"
                    placeholder="Task title…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTask(status);
                      if (e.key === "Escape") { setAddingStatus(null); setNewTitle(""); setNewDue(""); }
                    }}
                    style={{ maxWidth: "none", width: "100%", margin: 0, fontSize: "0.85rem", paddingRight: "2.5rem" }}
                  />
                  <div style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)" }}>
                    <MicButton size="sm" onTranscript={(t) => {
                      const parsed = parseTaskFromSpeech(t);
                      setNewTitle(parsed.title);
                      if (parsed.due_at) setNewDue(parsed.due_at.slice(0, 10));
                    }} />
                  </div>
                </div>
                <input
                  type="date"
                  className="input"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  style={{ maxWidth: "none", margin: 0, fontSize: "0.82rem" }}
                />
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 1, fontSize: "0.82rem" }} onClick={() => addTask(status)} disabled={saving || !newTitle.trim()}>
                    {saving ? "…" : "Add"}
                  </button>
                  <button type="button" className="btn" style={{ fontSize: "0.82rem" }} onClick={() => { setAddingStatus(null); setNewTitle(""); setNewDue(""); }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingStatus(status)}
                style={{ marginTop: "0.5rem", width: "100%", background: "none", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-sm)", padding: "0.45rem", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.82rem", transition: "border-color 0.15s, color 0.15s" }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--indigo-400)"; e.currentTarget.style.color = "var(--indigo-400)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
              >
                + Add task
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="status-msg">Drag tasks between columns. Double-click a task to add a calendar showing.</p>
    </section>
  );
}
