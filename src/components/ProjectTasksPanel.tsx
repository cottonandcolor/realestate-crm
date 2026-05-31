"use client";

import { useMemo, useState } from "react";
import type { Project, Task, TaskStatus } from "@/lib/types/database";
import { KanbanBoard } from "./KanbanBoard";

type ViewMode = "projects" | "board";

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const done = task.status === "done";
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
        padding: "0.45rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: done ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task.id, !done)}
        style={{ marginTop: "0.2rem", accentColor: "var(--indigo-500)", cursor: "pointer" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
        {task.due_at && (
          <small style={{ display: "block", opacity: 0.65, marginTop: "0.15rem" }}>
            Due {new Date(task.due_at).toLocaleDateString()}
          </small>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#e53e3e", fontSize: "0.85rem", padding: 0 }}
        title="Delete task"
      >
        ✕
      </button>
    </li>
  );
}

function ProjectSection({
  project,
  tasks,
  collapsed,
  onToggleCollapse,
  onRename,
  onDeleteProject,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: {
  project: Project;
  tasks: Task[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (name: string) => void;
  onDeleteProject: () => void;
  onAddTask: (title: string, due: string) => void;
  onToggleTask: (id: string, done: boolean) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);

  const open = tasks.filter((t) => t.status !== "done").length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="glass" style={{ marginBottom: "1rem", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.85rem 1rem",
          borderBottom: collapsed ? "none" : "1px solid var(--color-border)",
          cursor: "pointer",
        }}
        onClick={onToggleCollapse}
      >
        <span style={{ fontSize: "0.9rem", opacity: 0.7 }}>{collapsed ? "▸" : "▾"}</span>
        {editingName ? (
          <input
            className="input"
            value={nameDraft}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              if (nameDraft.trim() && nameDraft.trim() !== project.name) onRename(nameDraft.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingName(false);
                if (nameDraft.trim()) onRename(nameDraft.trim());
              }
              if (e.key === "Escape") {
                setEditingName(false);
                setNameDraft(project.name);
              }
            }}
            style={{ flex: 1, margin: 0, fontSize: "1rem", fontWeight: 600 }}
            autoFocus
          />
        ) : (
          <strong
            style={{ flex: 1, fontSize: "1rem" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
              setNameDraft(project.name);
            }}
            title="Double-click to rename"
          >
            {project.name}
          </strong>
        )}
        <span style={{ fontSize: "0.78rem", opacity: 0.6, whiteSpace: "nowrap" }}>
          {open} open · {done} done
        </span>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete project "${project.name}"? Tasks will move to Other tasks.`)) onDeleteProject();
          }}
        >
          Delete
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "0.75rem 1rem 1rem" }}>
          {project.notes && (
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", opacity: 0.7, fontStyle: "italic" }}>
              {project.notes}
            </p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} />
            ))}
            {tasks.length === 0 && (
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.5 }}>No tasks yet — add one below.</p>
            )}
          </ul>
          <div
            style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="input"
              placeholder="Add a task…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  onAddTask(newTitle.trim(), newDue);
                  setNewTitle("");
                  setNewDue("");
                }
              }}
              style={{ flex: "1 1 200px", margin: 0, fontSize: "0.85rem" }}
            />
            <input
              type="date"
              className="input"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              style={{ width: "auto", margin: 0, fontSize: "0.82rem" }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.82rem" }}
              disabled={!newTitle.trim()}
              onClick={() => {
                onAddTask(newTitle.trim(), newDue);
                setNewTitle("");
                setNewDue("");
              }}
            >
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectTasksPanel({
  projects: initialProjects,
  tasks: initialTasks,
  demoMode = false,
}: {
  projects: Project[];
  tasks: Task[];
  demoMode?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("projects");
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [status, setStatus] = useState("");

  const unassigned = useMemo(
    () => tasks.filter((t) => !t.project_id),
    [tasks]
  );

  async function createProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => [...prev, p]);
      setNewProjectName("");
      setCollapsed((c) => ({ ...c, [p.id]: false }));
      setStatus(`Project "${name}" created.`);
    }
  }

  async function renameProject(id: string, name: string) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => prev.map((x) => (x.id === id ? p : x)));
    }
  }

  async function removeProject(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) =>
        prev.map((t) => (t.project_id === id ? { ...t, project_id: null } : t))
      );
    }
  }

  async function addTask(projectId: string | null, title: string, due: string) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status: "todo",
        due_at: due ? new Date(due).toISOString() : null,
        project_id: projectId,
      }),
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
    }
  }

  async function toggleTask(id: string, done: boolean) {
    const status: TaskStatus = done ? "done" : "todo";
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (demoMode) {
      await fetch("/api/dev/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, status }),
      });
      return;
    }
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  return (
    <section className="tasks" id="tasks">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <button
              type="button"
              className="btn"
              style={{
                borderRadius: 0,
                border: "none",
                background: view === "projects" ? "var(--indigo-500)" : "transparent",
                color: view === "projects" ? "#fff" : undefined,
              }}
              onClick={() => setView("projects")}
            >
              By project
            </button>
            <button
              type="button"
              className="btn"
              style={{
                borderRadius: 0,
                border: "none",
                background: view === "board" ? "var(--indigo-500)" : "transparent",
                color: view === "board" ? "#fff" : undefined,
              }}
              onClick={() => setView("board")}
            >
              Board
            </button>
          </div>
          <a href="/api/export?type=tasks&format=csv" className="btn">⬇ Export CSV</a>
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard tasks={tasks} demoMode={demoMode} />
      ) : (
        <>
          <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", opacity: 0.75 }}>
            Organize work by project — each listing, deal, or client can be its own project with tasks listed underneath.
          </p>

          <div className="glass" style={{ padding: "1rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="New project name (e.g. Johnson Rd Listing)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              style={{ flex: "1 1 240px", margin: 0 }}
            />
            <button type="button" className="btn btn-primary" onClick={createProject} disabled={!newProjectName.trim()}>
              + New project
            </button>
          </div>

          {status && <p className="status-msg" style={{ marginBottom: "0.75rem" }}>{status}</p>}

          {projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              tasks={tasks.filter((t) => t.project_id === project.id)}
              collapsed={!!collapsed[project.id]}
              onToggleCollapse={() =>
                setCollapsed((c) => ({ ...c, [project.id]: !c[project.id] }))
              }
              onRename={(name) => renameProject(project.id, name)}
              onDeleteProject={() => removeProject(project.id)}
              onAddTask={(title, due) => addTask(project.id, title, due)}
              onToggleTask={toggleTask}
              onDeleteTask={removeTask}
            />
          ))}

          {projects.length === 0 && (
            <p className="glass" style={{ padding: "1rem", marginBottom: "1rem", opacity: 0.8 }}>
              Create your first project above, then add tasks under it.
            </p>
          )}

          {(unassigned.length > 0 || projects.length > 0) && (
            <div className="glass" style={{ marginBottom: "1rem", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--color-border)" }}>
                <strong>Other tasks</strong>
                <span style={{ fontSize: "0.78rem", opacity: 0.6, marginLeft: "0.5rem" }}>
                  (not assigned to a project)
                </span>
              </div>
              <div style={{ padding: "0.75rem 1rem 1rem" }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {unassigned.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={removeTask} />
                  ))}
                  {unassigned.length === 0 && (
                    <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.5 }}>No unassigned tasks.</p>
                  )}
                </ul>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  <OtherTaskAdd onAdd={(title, due) => addTask(null, title, due)} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function OtherTaskAdd({ onAdd }: { onAdd: (title: string, due: string) => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <>
      <input
        className="input"
        placeholder="Add unassigned task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim(), due);
            setTitle("");
            setDue("");
          }
        }}
        style={{ flex: "1 1 200px", margin: 0, fontSize: "0.85rem" }}
      />
      <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: "auto", margin: 0, fontSize: "0.82rem" }} />
      <button
        type="button"
        className="btn btn-primary"
        style={{ fontSize: "0.82rem" }}
        disabled={!title.trim()}
        onClick={() => {
          onAdd(title.trim(), due);
          setTitle("");
          setDue("");
        }}
      >
        + Add
      </button>
    </>
  );
}
