"use client";

import { useEffect, useRef, useState } from "react";
import { compressImageFile } from "@/lib/education/compressImage";
import {
  createEducationLinkId,
  createEducationScheduleId,
  defaultScheduleLabel,
  loadEducationLinks,
  normalizeEducationUrl,
  saveEducationLinks,
  type EducationLink,
  type EducationMonthSchedule,
} from "@/lib/educationLinks";
import { ImageLightbox } from "./ImageLightbox";

export function EducationLinksSection() {
  const [links, setLinks] = useState<EducationLink[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);
  const [pendingMonth, setPendingMonth] = useState<{ linkId: string; label: string } | null>(null);
  const [viewImage, setViewImage] = useState<{ src: string; alt: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setLinks(loadEducationLinks());
  }, []);

  function persist(next: EducationLink[]) {
    try {
      saveEducationLinks(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save.");
      return;
    }
    setLinks(next);
  }

  function handleAdd() {
    const normalized = normalizeEducationUrl(url);
    const name = label.trim();
    if (!name) {
      setError("Enter a name for this site (e.g. Independence Title).");
      return;
    }
    if (!normalized) {
      setError("Enter a valid website URL.");
      return;
    }
    persist([
      {
        id: createEducationLinkId(),
        label: name,
        url: normalized,
        schedules: [],
        created_at: new Date().toISOString(),
      },
      ...links,
    ]);
    setLabel("");
    setUrl("");
    setError(null);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    if (!confirm(`Remove "${link.label}" from your education sites?`)) return;
    persist(links.filter((l) => l.id !== id));
  }

  function startUpload(linkId: string) {
    const month = window.prompt("Month for this schedule (e.g. June 2026):", defaultScheduleLabel());
    if (!month?.trim()) return;
    setPendingMonth({ linkId, label: month.trim() });
    fileRefs.current[linkId]?.click();
  }

  async function handleScheduleFile(linkId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a PNG or JPG screenshot.");
      return;
    }
    const monthLabel = pendingMonth?.linkId === linkId ? pendingMonth.label : defaultScheduleLabel();
    setUploadingLinkId(linkId);
    try {
      const image = await compressImageFile(file, 1400);
      const schedule: EducationMonthSchedule = {
        id: createEducationScheduleId(),
        label: monthLabel,
        image,
        created_at: new Date().toISOString(),
      };
      persist(
        links.map((l) =>
          l.id === linkId ? { ...l, schedules: [schedule, ...l.schedules] } : l
        )
      );
    } catch {
      alert("Could not save that image. Try a smaller screenshot.");
    } finally {
      setUploadingLinkId(null);
      setPendingMonth(null);
    }
  }

  function removeSchedule(linkId: string, scheduleId: string) {
    persist(
      links.map((l) =>
        l.id === linkId
          ? { ...l, schedules: l.schedules.filter((s) => s.id !== scheduleId) }
          : l
      )
    );
  }

  function editLinkLabel(linkId: string) {
    const link = links.find((l) => l.id === linkId);
    if (!link) return;
    const next = window.prompt("Site name:", link.label);
    if (!next?.trim()) return;
    persist(links.map((l) => (l.id === linkId ? { ...l, label: next.trim() } : l)));
  }

  function renameSchedule(linkId: string, scheduleId: string) {
    const link = links.find((l) => l.id === linkId);
    const sched = link?.schedules.find((s) => s.id === scheduleId);
    if (!sched) return;
    const next = window.prompt("Month label:", sched.label);
    if (!next?.trim()) return;
    persist(
      links.map((l) =>
        l.id === linkId
          ? {
              ...l,
              schedules: l.schedules.map((s) =>
                s.id === scheduleId ? { ...s, label: next.trim() } : s
              ),
            }
          : l
      )
    );
  }

  return (
    <div
      className="glass"
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.15rem",
        borderLeft: "3px solid #22d3ee",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.65rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>🌐 Education class websites</h3>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.78rem" }}
          onClick={() => {
            setShowAdd((v) => !v);
            setError(null);
          }}
        >
          {showAdd ? "Cancel" : "+ Add website"}
        </button>
      </div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.65, lineHeight: 1.45 }}>
        Link to class listing sites, then upload a <strong>monthly schedule snapshot</strong> (screenshot of the calendar)
        so you can see all classes at a glance without adding each one individually.
        Use <strong>+ Add class</strong> below only for classes you plan to attend.
      </p>

      {showAdd && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            padding: "0.75rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Site name</label>
            <input
              className="input"
              style={{ margin: "0.2rem 0 0", width: "100%", fontSize: "0.82rem" }}
              placeholder="e.g. Independence Title"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Website URL</label>
            <input
              className="input"
              style={{ margin: "0.2rem 0 0", width: "100%", fontSize: "0.82rem" }}
              placeholder="https://www.example.com/classes"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          {error && (
            <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: "0.78rem", color: "#fc8181" }}>{error}</p>
          )}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.4rem" }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: "0.78rem" }} onClick={handleAdd}>
              Save link
            </button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {links.map((link) => (
          <li
            key={link.id}
            style={{
              padding: "0.65rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    color: "var(--color-primary)",
                    textDecoration: "none",
                  }}
                >
                  {link.label} ↗
                </a>
                <p
                  style={{
                    margin: "0.15rem 0 0",
                    fontSize: "0.75rem",
                    opacity: 0.55,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={link.url}
                >
                  {link.url}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "0.72rem" }}
                  onClick={() => editLinkLabel(link.id)}
                >
                  Edit title
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "0.72rem" }}
                  onClick={() => startUpload(link.id)}
                  disabled={uploadingLinkId === link.id}
                >
                  {uploadingLinkId === link.id ? "Uploading…" : "Upload month"}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "0.72rem", color: "#e53e3e" }}
                  onClick={() => handleDelete(link.id)}
                >
                  Remove
                </button>
                <input
                  ref={(el) => { fileRefs.current[link.id] = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleScheduleFile(link.id, file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {link.schedules.length > 0 && (
              <div style={{ marginTop: "0.55rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {link.schedules.map((sched) => (
                  <div
                    key={sched.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.45rem",
                      borderRadius: "999px",
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{sched.label}</span>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}
                      onClick={() => renameSchedule(link.id, sched.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}
                      onClick={() => setViewImage({ src: sched.image, alt: `${link.label} — ${sched.label}` })}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", color: "#e53e3e" }}
                      onClick={() => removeSchedule(link.id, sched.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {viewImage && (
        <ImageLightbox src={viewImage.src} alt={viewImage.alt} onClose={() => setViewImage(null)} />
      )}
    </div>
  );
}
