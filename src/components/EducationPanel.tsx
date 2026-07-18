"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { compressImageFile } from "@/lib/education/compressImage";
import { ImageLightbox } from "./ImageLightbox";
import { extractTextFromImage } from "@/lib/education/extractImageText";
import { parseEducationPaste } from "@/lib/education/parsePaste";
import { EducationLinksSection } from "./EducationLinksSection";
import {
  createEducationClassId,
  createEmptyEducationClass,
  effectiveStatus,
  formatClassDate,
  formatClassTime,
  loadEducationClasses,
  saveEducationClasses,
  type EducationClass,
} from "@/lib/educationClasses";

type Filter = "all" | "upcoming" | "completed";

const inputStyle = { margin: 0, fontSize: "0.82rem", width: "100%", minWidth: 0 } as const;

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: "0.78rem", opacity: 0.7 }}>{label}</label>
      <input
        type={type}
        className="input"
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AddClassForm({
  onSave,
  onCancel,
}: {
  onSave: (cls: EducationClass) => void;
  onCancel: () => void;
}) {
  const [paste, setPaste] = useState("");
  const [form, setForm] = useState<EducationClass>(createEmptyEducationClass());
  const [extracting, setExtracting] = useState(false);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  function applyParsedFields(text: string, flyerImage: string | null) {
    if (!text.trim() && !flyerImage) return;
    const parsed = text.trim() ? parseEducationPaste(text) : {};
    setForm((f) => ({
      ...f,
      ...parsed,
      flyer_image: flyerImage ?? f.flyer_image,
      raw_notes: flyerImage ? null : text.trim() || f.raw_notes,
      id: f.id,
      status: "upcoming",
      created_at: f.created_at,
    }));
  }

  function parseIntoForm(text: string) {
    setPaste(text);
    if (!text.trim()) return;
    applyParsedFields(text, form.flyer_image);
    setPasteStatus("Class details extracted — review the fields below.");
  }

  async function ingestImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setPasteStatus("Please use a PNG or JPG flyer image.");
      return;
    }
    setExtracting(true);
    setPasteStatus("Saving flyer and reading class details…");
    try {
      const [dataUrl, text] = await Promise.all([
        compressImageFile(file),
        extractTextFromImage(file).catch(() => ""),
      ]);
      setPaste("");
      setForm((f) => ({ ...f, flyer_image: dataUrl }));
      if (text.trim()) {
        applyParsedFields(text, dataUrl);
        setPasteStatus("Flyer saved — class details extracted. Review the fields below.");
      } else {
        setPasteStatus("Flyer saved. Fill in any missing details below, then save.");
      }
    } catch {
      setPasteStatus("Could not process that image. Try another file or paste text manually.");
    } finally {
      setExtracting(false);
    }
  }

  async function pasteFromClipboard() {
    setPasteStatus(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            await ingestImageFile(new File([blob], "flyer.png", { type }));
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        parseIntoForm(text);
        return;
      }
      setPasteStatus("Clipboard is empty. Copy flyer text or screenshot first.");
    } catch {
      pasteRef.current?.focus();
      setPasteStatus("Click the box below, then press ⌘V / Ctrl+V to paste.");
    }
  }

  function handleTextPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) void ingestImageFile(file);
          return;
        }
      }
    }
    const text = e.clipboardData?.getData("text/plain");
    if (text?.trim()) {
      e.preventDefault();
      parseIntoForm(text);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingestImageFile(file);
  }

  function set(key: keyof EducationClass, value: string) {
    setForm((f) => ({ ...f, [key]: value || null }));
  }

  function handleSave() {
    const title = form.title.trim() || "Untitled class";
    const raw_notes = form.flyer_image ? null : paste.trim() || form.raw_notes;
    onSave({ ...form, title, raw_notes });
  }

  const canSave = !!(form.title.trim() || paste.trim() || form.flyer_image);

  return (
    <div className="glass" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
      <h3 style={{ margin: "0 0 0.75rem" }}>Add CE class</h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", opacity: 0.7 }}>
        Paste or drop a <strong>flyer image</strong> (screenshot/photo), paste <strong>copied text</strong> from an email or website, or type details manually.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          marginBottom: "0.75rem",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: `2px dashed ${dragOver ? "var(--indigo-400)" : "var(--color-border)"}`,
          background: dragOver ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
          <button type="button" className="btn btn-primary" style={{ fontSize: "0.8rem" }} onClick={() => void pasteFromClipboard()} disabled={extracting}>
            {extracting ? "Reading flyer…" : "Paste from clipboard"}
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.8rem" }}
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
          >
            Upload flyer image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void ingestImageFile(file);
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          ref={pasteRef}
          className="input"
          rows={8}
          placeholder="Click here and paste (⌘V / Ctrl+V), or drop a flyer image on this box…"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onPaste={handleTextPaste}
          onBlur={() => {
            if (paste.trim()) parseIntoForm(paste);
          }}
          disabled={extracting}
          style={{
            width: "100%",
            margin: 0,
            fontSize: "0.82rem",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: "140px",
          }}
        />
        {pasteStatus && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", opacity: 0.75 }}>{pasteStatus}</p>
        )}
        {form.flyer_image && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#34d399", fontWeight: 600 }}>
            ✓ Flyer attached — use View flyer on the saved class to open it.
          </p>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.65rem",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Class title *" value={form.title} onChange={(v) => set("title", v)} placeholder="e.g. Marketing by Referral" />
        </div>
        <Field label="CE course #" value={form.ce_number ?? ""} onChange={(v) => set("ce_number", v)} placeholder="06028-RECE" />
        <Field label="Instructor" value={form.instructor ?? ""} onChange={(v) => set("instructor", v)} />
        <Field label="Provider" value={form.provider ?? ""} onChange={(v) => set("provider", v)} placeholder="Texas REALTORS®" />
        <Field label="Sponsor / host" value={form.sponsor ?? ""} onChange={(v) => set("sponsor", v)} />
        <Field label="Class date" value={form.class_date ?? ""} onChange={(v) => set("class_date", v)} type="date" />
        <Field label="Start time" value={form.time_start ?? ""} onChange={(v) => set("time_start", v)} placeholder="1:00 PM" />
        <Field label="End time" value={form.time_end ?? ""} onChange={(v) => set("time_end", v)} placeholder="3:00 PM" />
        <Field label="Location name" value={form.location_name ?? ""} onChange={(v) => set("location_name", v)} />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Address" value={form.address ?? ""} onChange={(v) => set("address", v)} />
        </div>
        <Field label="Cost" value={form.cost ?? ""} onChange={(v) => set("cost", v)} placeholder="Free" />
        <Field label="RSVP deadline" value={form.rsvp_deadline ?? ""} onChange={(v) => set("rsvp_deadline", v)} type="date" />
        <Field label="RSVP email" value={form.rsvp_email ?? ""} onChange={(v) => set("rsvp_email", v)} />
        <Field label="RSVP phone" value={form.rsvp_phone ?? ""} onChange={(v) => set("rsvp_phone", v)} />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Registration URL" value={form.register_url ?? ""} onChange={(v) => set("register_url", v)} placeholder="https://…" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.78rem", opacity: 0.7 }}>Description / notes</label>
          <textarea
            className="input"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn"
          style={{ fontSize: "0.82rem" }}
          onClick={() => parseIntoForm(paste)}
          disabled={!paste.trim() || extracting}
        >
          Extract fields from text
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={extracting || !canSave}>
          Save class
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, width: "1.1rem" }}>{icon}</span>
      <p style={{ margin: 0, flex: 1 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.1rem" }}>
          {label}
        </span>
        {children}
      </p>
    </div>
  );
}

function ClassCard({
  cls,
  onDelete,
  onUpdate,
}: {
  cls: EducationClass;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EducationClass>) => void;
}) {
  const [showFlyer, setShowFlyer] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(cls.title);
  const status = effectiveStatus(cls);
  const isPast = status === "completed";
  const time = formatClassTime(cls.time_start, cls.time_end);

  useEffect(() => {
    setTitleDraft(cls.title);
  }, [cls.title]);

  function saveTitle() {
    const title = titleDraft.trim();
    if (!title) return;
    onUpdate(cls.id, { title });
    setEditingTitle(false);
  }

  return (
    <article
      className="glass"
      style={{
        padding: "1.1rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.55rem",
        borderTop: `3px solid ${isPast ? "var(--color-border)" : "#818cf8"}`,
        opacity: isPast ? 0.92 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {cls.ce_number && (
            <span style={{ fontSize: "0.72rem", opacity: 0.65, fontWeight: 600 }}>{cls.ce_number}</span>
          )}
          {editingTitle ? (
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <input
                className="input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(cls.title);
                    setEditingTitle(false);
                  }
                }}
                style={{ margin: 0, fontSize: "0.88rem", flex: "1 1 160px" }}
                autoFocus
              />
              <button type="button" className="btn btn-primary" style={{ fontSize: "0.72rem" }} onClick={saveTitle}>
                Save
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: "0.72rem" }}
                onClick={() => {
                  setTitleDraft(cls.title);
                  setEditingTitle(false);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3 style={{ margin: "0.15rem 0 0", fontSize: "1.05rem", lineHeight: 1.3 }}>{cls.title}</h3>
          )}
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.2rem 0.55rem",
            borderRadius: "999px",
            whiteSpace: "nowrap",
            background: isPast ? "rgba(128,128,128,0.2)" : "rgba(129,140,248,0.2)",
            color: isPast ? "var(--color-text-muted)" : "#818cf8",
          }}
        >
          {isPast ? "Past" : "Upcoming"}
        </span>
      </div>

      <div style={{ fontSize: "0.88rem", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        <DetailRow icon="📅" label="When">
          <strong>{formatClassDate(cls.class_date)}</strong>
          {time && <> · {time}</>}
        </DetailRow>
        {(cls.location_name || cls.address) && (
          <DetailRow icon="📍" label="Where">
            {cls.location_name && <span>{cls.location_name}</span>}
            {cls.location_name && cls.address && <br />}
            {cls.address && <span style={{ opacity: 0.9 }}>{cls.address}</span>}
          </DetailRow>
        )}
        {cls.instructor && (
          <DetailRow icon="👤" label="Instructor">{cls.instructor}</DetailRow>
        )}
        {cls.provider && (
          <DetailRow icon="📋" label="Provider">{cls.provider}</DetailRow>
        )}
        {cls.sponsor && (
          <DetailRow icon="🏢" label="Host">{cls.sponsor}</DetailRow>
        )}
        {cls.cost && (
          <DetailRow icon="💵" label="Cost">{cls.cost}</DetailRow>
        )}
      </div>

      {(cls.rsvp_deadline || cls.rsvp_email || cls.rsvp_phone) && !isPast && (
        <div
          style={{
            fontSize: "0.8rem",
            padding: "0.5rem 0.65rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.35)",
          }}
        >
          {cls.rsvp_deadline && (
            <p style={{ margin: 0 }}>RSVP by {formatClassDate(cls.rsvp_deadline)}</p>
          )}
          {cls.rsvp_email && (
            <p style={{ margin: "0.2rem 0 0" }}>
              ✉{" "}
              <a href={`mailto:${cls.rsvp_email}`} style={{ color: "var(--color-primary)" }}>
                {cls.rsvp_email}
              </a>
            </p>
          )}
          {cls.rsvp_phone && (
            <p style={{ margin: "0.2rem 0 0" }}>
              📞{" "}
              <a href={`tel:${cls.rsvp_phone.replace(/\D/g, "")}`} style={{ color: "var(--color-primary)" }}>
                {cls.rsvp_phone}
              </a>
            </p>
          )}
        </div>
      )}

      {cls.description && (
        <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.8, lineHeight: 1.45 }}>{cls.description}</p>
      )}

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
        {!editingTitle && (
          <button type="button" className="btn" style={{ fontSize: "0.78rem" }} onClick={() => setEditingTitle(true)}>
            Edit title
          </button>
        )}
        {cls.register_url && (
          <a
            href={cls.register_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ fontSize: "0.78rem" }}
          >
            Register
          </a>
        )}
        {cls.flyer_image && (
          <button type="button" className="btn" style={{ fontSize: "0.78rem" }} onClick={() => setShowFlyer(true)}>
            View flyer
          </button>
        )}
        {cls.raw_notes && !cls.flyer_image && (
          <button type="button" className="btn" style={{ fontSize: "0.78rem" }} onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? "Hide notes" : "View original text"}
          </button>
        )}
        {isPast && (
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.78rem", color: "#e53e3e" }}
            onClick={() => onDelete(cls.id)}
          >
            Delete
          </button>
        )}
        {!isPast && (
          <button
            type="button"
            className="btn"
            style={{ fontSize: "0.78rem", color: "#e53e3e" }}
            onClick={() => onDelete(cls.id)}
          >
            Remove
          </button>
        )}
      </div>

      {showNotes && cls.raw_notes && !cls.flyer_image && (
        <div
          style={{
            margin: "0.35rem 0 0",
            padding: "0.65rem",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            maxHeight: "200px",
            overflow: "auto",
          }}
        >
          {cls.raw_notes}
        </div>
      )}

      {showFlyer && cls.flyer_image && (
        <ImageLightbox src={cls.flyer_image} alt={`${cls.title} flyer`} onClose={() => setShowFlyer(false)} />
      )}
    </article>
  );
}

export function EducationPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [classes, setClasses] = useState<EducationClass[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const loaded = loadEducationClasses();
    setClasses(loaded);
    onCountChange?.(loaded.filter((c) => effectiveStatus(c) === "upcoming").length);
  }, [onCountChange]);

  function persist(next: EducationClass[]) {
    try {
      saveEducationClasses(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save class.");
      return;
    }
    setClasses(next);
    onCountChange?.(next.filter((c) => effectiveStatus(c) === "upcoming").length);
  }

  function handleAdd(cls: EducationClass) {
    persist([{ ...cls, id: createEducationClassId(), created_at: new Date().toISOString() }, ...classes]);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    const cls = classes.find((c) => c.id === id);
    const label = cls?.title ?? "this class";
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    persist(classes.filter((c) => c.id !== id));
  }

  function handleUpdate(id: string, patch: Partial<EducationClass>) {
    persist(classes.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = classes;
    if (filter === "upcoming") rows = rows.filter((c) => effectiveStatus(c) === "upcoming");
    if (filter === "completed") rows = rows.filter((c) => effectiveStatus(c) === "completed");
    if (q) {
      rows = rows.filter((c) =>
        [c.title, c.instructor, c.sponsor, c.provider, c.ce_number, c.address, c.location_name, c.description, c.raw_notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => {
      const ad = a.class_date ?? "9999-12-31";
      const bd = b.class_date ?? "9999-12-31";
      const aPast = effectiveStatus(a) === "completed";
      const bPast = effectiveStatus(b) === "completed";
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast ? bd.localeCompare(ad) : ad.localeCompare(bd);
    });
  }, [classes, filter, search]);

  const upcomingCount = classes.filter((c) => effectiveStatus(c) === "upcoming").length;
  const pastCount = classes.filter((c) => effectiveStatus(c) === "completed").length;

  return (
    <section className="education" id="education">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Education</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
            {upcomingCount} upcoming · {pastCount} past
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: "0.82rem" }}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Cancel" : "+ Add class"}
          </button>
        </div>
      </div>

      <EducationLinksSection />

      <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", opacity: 0.65, maxWidth: "52rem" }}>
        Save individual classes from any source — paste a flyer or email and the CRM pulls out the key details.
        After a class date passes, keep it for your records or delete it.
      </p>

      {showAdd && <AddClassForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {(["all", "upcoming", "completed"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className="btn"
            style={{
              fontSize: "0.8rem",
              background: filter === f ? "var(--indigo-500)" : undefined,
              color: filter === f ? "#fff" : undefined,
            }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      <input
        type="text"
        className="search"
        style={{ marginBottom: "1rem" }}
        placeholder="Search classes, instructor, sponsor…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="glass" style={{ padding: "1.25rem", opacity: 0.8 }}>
          {classes.length === 0
            ? "No classes saved yet — click + Add class and paste a flyer to get started."
            : "No classes match your filter."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((cls) => (
            <ClassCard key={cls.id} cls={cls} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </section>
  );
}
