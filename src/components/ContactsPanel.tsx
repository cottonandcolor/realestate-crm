"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, Lead } from "@/lib/types/database";
import { ActivityFeed } from "./ActivityFeed";
import { MicButton } from "./MicButton";
import { parseContactFromSpeech } from "@/lib/voice/parseContact";
import { findDuplicateByName } from "@/lib/contacts/nameMatch";

type ContactWithLeads = Contact & { leads?: Pick<Lead, "id" | "name" | "stage">[] };

const STAGE_COLOR: Record<string, string> = {
  new: "#20b2aa",
  contacted: "#1a6496",
  qualified: "#2d6a4f",
  closed: "#888",
  lost: "#c0392b",
};

function ContactCard({
  contact,
  onEdit,
  onDelete,
  onReminderSaved,
}: {
  contact: ContactWithLeads;
  onEdit: (c: ContactWithLeads) => void;
  onDelete: (id: string) => void;
  onReminderSaved: (id: string, at: string | null, note: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [remAt, setRemAt] = useState(contact.reminder_at?.slice(0, 16) ?? "");
  const [remNote, setRemNote] = useState(contact.reminder_note ?? "");
  const [saving, setSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    setRemAt(contact.reminder_at?.slice(0, 16) ?? "");
    setRemNote(contact.reminder_note ?? "");
  }, [contact.id, contact.reminder_at, contact.reminder_note]);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const address = [contact.address_street, contact.address_city, contact.address_region, contact.address_postal_code]
    .filter(Boolean).join(", ");

  const isOverdue = contact.reminder_at && new Date(contact.reminder_at) < new Date();
  const isDue = contact.reminder_at && !isOverdue && new Date(contact.reminder_at) <= new Date(Date.now() + 24 * 3600_000);

  function reminderPayload(at: string, note: string) {
    return {
      reminder_at: at ? new Date(at).toISOString() : null,
      reminder_note: note.trim() || null,
    };
  }

  const hasReminder = !!(contact.reminder_at || remAt);
  const canSaveReminder = !!remAt || !!contact.reminder_at;

  async function saveReminder() {
    setSaving(true);
    setReminderError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminderPayload(remAt, remNote)),
      });
      if (res.ok) {
        const updated = (await res.json()) as Contact;
        onReminderSaved(contact.id, updated.reminder_at, updated.reminder_note);
        setShowReminder(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setReminderError((err as { error?: string }).error ?? "Could not save reminder.");
      }
    } catch {
      setReminderError("Could not save reminder.");
    } finally {
      setSaving(false);
    }
  }

  async function clearReminder() {
    setSaving(true);
    setReminderError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_at: null, reminder_note: null }),
      });
      if (res.ok) {
        onReminderSaved(contact.id, null, null);
        setRemAt("");
        setRemNote("");
        setShowReminder(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setReminderError((err as { error?: string }).error ?? "Could not clear reminder.");
      }
    } catch {
      setReminderError("Could not clear reminder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <strong>{fullName}</strong>
          {contact.company && (
            <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{contact.company}</span>
          )}
          {contact.reminder_at && (
            <span
              title={contact.reminder_note ?? "Reminder set"}
              style={{
                fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap",
                background: isOverdue ? "rgba(229,62,62,0.25)" : isDue ? "rgba(255,193,7,0.25)" : "rgba(99,102,241,0.2)",
                color: isOverdue ? "#fc8181" : isDue ? "#f6c90e" : "var(--color-primary)",
                border: `1px solid ${isOverdue ? "#fc8181" : isDue ? "#f6c90e" : "var(--color-primary)"}`,
                cursor: "pointer",
              }}
              onClick={() => setShowReminder((v) => !v)}
            >
              🔔 {new Date(contact.reminder_at).toLocaleDateString()}
              {isOverdue && " (overdue)"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="btn"
            title="Set reminder"
            style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
            onClick={() => setShowReminder((v) => !v)}
          >🔔</button>
          <button type="button" className="btn" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }} onClick={() => onEdit(contact)}>Edit</button>
          <button type="button" className="btn" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem", color: "#e53e3e" }} onClick={() => onDelete(contact.id)}>✕</button>
        </div>
      </div>
      {contact.email && <p style={{ fontSize: "0.85rem" }}>✉ {contact.email}</p>}
      {contact.phone && <p style={{ fontSize: "0.85rem" }}>📞 {contact.phone}</p>}
      {address && <p style={{ fontSize: "0.82rem", opacity: 0.75 }}>📍 {address}</p>}
      {contact.website && <p style={{ fontSize: "0.82rem", opacity: 0.75 }}>🌐 <a href={contact.website} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>{contact.website.replace(/^https?:\/\//, "")}</a></p>}
      {contact.notes && <p style={{ fontSize: "0.8rem", opacity: 0.75, fontStyle: "italic" }}>{contact.notes}</p>}

      {/* Tags / Labels */}
      {(contact.tags?.length ?? 0) > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.1rem" }}>
          {contact.tags!.map((tag) => (
            <span key={tag} style={{
              fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
              background: "var(--color-border)", color: "var(--color-text-muted)", whiteSpace: "nowrap"
            }}>{tag}</span>
          ))}
        </div>
      )}

      {(contact.leads?.length ?? 0) > 0 && (
        <div>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: "0.82rem", padding: 0 }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▾" : "▸"} {contact.leads!.length} lead{contact.leads!.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul style={{ listStyle: "none", marginTop: "0.35rem", paddingLeft: "0.5rem" }}>
              {contact.leads!.map((l) => (
                <li key={l.id} style={{ fontSize: "0.82rem", display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: STAGE_COLOR[l.stage] ?? "#aaa",
                      flexShrink: 0,
                    }}
                  />
                  {l.name}
                  <span style={{ opacity: 0.6 }}>{l.stage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Inline reminder editor */}
      {showReminder && (
        <div style={{
          background: "rgba(99,102,241,0.1)", border: "1px solid var(--color-primary)",
          borderRadius: "0.5rem", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>🔔 Set Reminder</p>
          <input
            type="datetime-local"
            className="input"
            style={{ fontSize: "0.82rem" }}
            value={remAt}
            onChange={(e) => setRemAt(e.target.value)}
          />
          <input
            type="text"
            className="input"
            placeholder="Note (optional)"
            style={{ fontSize: "0.82rem" }}
            value={remNote}
            onChange={(e) => setRemNote(e.target.value)}
          />
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.8rem" }}
              onClick={saveReminder}
              disabled={saving || !canSaveReminder}
            >
              {saving ? "Saving…" : remAt ? "Save" : "Save (clear reminder)"}
            </button>
            {hasReminder && (
              <button
                type="button"
                className="btn"
                style={{ fontSize: "0.8rem", color: "#e53e3e" }}
                onClick={clearReminder}
                disabled={saving}
              >
                Clear
              </button>
            )}
            <button type="button" className="btn" style={{ fontSize: "0.8rem" }} onClick={() => setShowReminder(false)} disabled={saving}>
              Cancel
            </button>
          </div>
          {reminderError && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#fc8181" }}>{reminderError}</p>
          )}
        </div>
      )}

      {/* Activity feed toggle */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
        <button
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: "0.82rem", padding: 0 }}
          onClick={() => setShowActivity(!showActivity)}
        >
          {showActivity ? "▾" : "▸"} Activity & Notes
        </button>
        {showActivity && (
          <div style={{ marginTop: "0.75rem" }}>
            <ActivityFeed contactId={contact.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function ContactForm({
  initial,
  onSave,
  onCancel,
  availableGroups = [],
  existingContacts = [],
  onEditExisting,
}: {
  initial?: Partial<Contact>;
  onSave: (data: Partial<Contact>) => void;
  onCancel: () => void;
  availableGroups?: string[];
  existingContacts?: ContactWithLeads[];
  onEditExisting?: (c: ContactWithLeads) => void;
}) {
  const [form, setForm] = useState<Partial<Contact>>(initial ?? {});
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [serverDuplicate, setServerDuplicate] = useState<ContactWithLeads | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const isNewContact = !initial?.id;
  const localDuplicate = isNewContact && form.first_name
    ? findDuplicateByName(
        existingContacts,
        String(form.first_name),
        (form.last_name as string) ?? null
      )
    : undefined;
  const duplicate = localDuplicate ?? serverDuplicate ?? undefined;

  // Check full database when name fields change (catches contacts not loaded in the list)
  useEffect(() => {
    if (!isNewContact || !form.first_name?.trim()) {
      setServerDuplicate(null);
      return;
    }
    const first = String(form.first_name).trim();
    const last = String(form.last_name ?? "").trim();
    const t = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const params = new URLSearchParams({
          duplicate: "1",
          first_name: first,
          last_name: last,
        });
        const res = await fetch(`/api/contacts?${params}`);
        if (res.ok) {
          const match = await res.json();
          setServerDuplicate(match?.id ? (match as ContactWithLeads) : null);
        }
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isNewContact, form.first_name, form.last_name]);
  function field(key: keyof Contact) {
    return {
      value: (form[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }
  const section = (label: string) => (
    <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.5, margin: "0.75rem 0 0.35rem", gridColumn: "1 / -1" }}>{label}</p>
  );
  const inp = (label: string, key: keyof Contact, type = "text", placeholder = "") => (
    <div>
      <label style={{ fontSize: "0.82rem" }}>{label}</label>
      <input className="input" type={type} placeholder={placeholder} style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field(key)} />
    </div>
  );

  return (
    <div className="glass" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>{initial?.id ? "Edit Contact" : "Add Contact"}</h3>

      {/* Duplicate warning */}
      {isNewContact && form.first_name?.trim() && checkingDuplicate && !duplicate && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", opacity: 0.5 }}>Checking for duplicates…</p>
      )}
      {duplicate && (
        <div style={{
          marginBottom: "0.75rem", padding: "0.75rem 1rem",
          background: "rgba(251,191,36,0.15)", border: "1px solid #f6c90e",
          borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#f6c90e" }}>
            ⚠ A contact named{" "}
            <strong>
              {[duplicate.first_name, duplicate.last_name].filter(Boolean).join(" ")}
            </strong>{" "}
            already exists.
            {duplicate.email && <> Email: {duplicate.email}.</>}
            {duplicate.phone && <> Phone: {duplicate.phone}.</>}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {onEditExisting && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: "0.8rem" }}
                onClick={() => {
                  const full =
                    existingContacts.find((c) => c.id === duplicate.id) ?? duplicate;
                  onCancel();
                  onEditExisting(full as ContactWithLeads);
                }}
              >
                Edit existing contact
              </button>
            )}
            <span style={{ fontSize: "0.78rem", opacity: 0.7, alignSelf: "center" }}>
              Save is disabled until you change the name or edit the existing contact.
            </span>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>

        {section("Name")}
        {inp("First name *", "first_name")}
        {inp("Last name", "last_name")}

        {section("Work Info")}
        {inp("Company", "company")}
        {inp("Job title", "job_title")}

        {section("Contact")}
        {inp("Email", "email", "email")}
        {inp("Phone", "phone", "tel")}
        {inp("Website", "website", "url", "https://")}

        {section("Address")}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.82rem" }}>Street</label>
          <input className="input" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("address_street")} />
        </div>
        {inp("City", "address_city")}
        {inp("State / Region", "address_region")}
        {inp("Postal code", "address_postal_code")}
        {inp("Country", "address_country")}

        {section("More")}
        {inp("Birthday", "birthday", "text", "e.g. 1990-05-20")}
        {inp("Relationship", "relationship", "text", "e.g. Friend, Client")}

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.82rem" }}>Groups / Labels</label>
          {/* Selected chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", margin: "0.35rem 0 0.35rem" }}>
            {(form.tags ?? []).map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "999px",
                  background: "var(--indigo-500)", color: "#fff",
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((t) => t !== tag) }))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 0, lineHeight: 1, fontSize: "0.85rem" }}
                >×</button>
              </span>
            ))}
          </div>
          {/* Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setGroupsOpen((o) => !o)}
              className="input"
              style={{
                maxWidth: "none", width: "100%", textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ opacity: 0.6 }}>
                {(form.tags ?? []).length === 0 ? "Select or add groups…" : `${(form.tags ?? []).length} selected`}
              </span>
              <span style={{ opacity: 0.5 }}>{groupsOpen ? "▲" : "▼"}</span>
            </button>
            {groupsOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: "0.5rem", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                maxHeight: "220px", overflowY: "auto",
              }}>
                {/* Add new group inline */}
                <div style={{ display: "flex", gap: "0.35rem", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                  <input
                    className="input"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "0.25rem 0.5rem" }}
                    placeholder="New group name…"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newGroup.trim()) {
                        e.preventDefault();
                        const g = newGroup.trim();
                        setForm((f) => ({ ...f, tags: [...new Set([...(f.tags ?? []), g])] }));
                        setNewGroup("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: "0.8rem", padding: "0.25rem 0.65rem" }}
                    onClick={() => {
                      if (newGroup.trim()) {
                        const g = newGroup.trim();
                        setForm((f) => ({ ...f, tags: [...new Set([...(f.tags ?? []), g])] }));
                        setNewGroup("");
                      }
                    }}
                  >Add</button>
                </div>
                {/* Existing group options */}
                {availableGroups.length === 0 && (
                  <p style={{ padding: "0.6rem 0.75rem", fontSize: "0.82rem", opacity: 0.5 }}>No groups yet — type above to create one.</p>
                )}
                {availableGroups.map((g) => {
                  const checked = (form.tags ?? []).includes(g);
                  return (
                    <label
                      key={g}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.45rem 0.75rem", cursor: "pointer", fontSize: "0.85rem",
                        background: checked ? "rgba(99,102,241,0.15)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            tags: checked
                              ? (f.tags ?? []).filter((t) => t !== g)
                              : [...new Set([...(f.tags ?? []), g])],
                          }))
                        }
                        style={{ accentColor: "var(--indigo-500)" }}
                      />
                      {g}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {section("Reminder")}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.82rem" }}>Remind me on</label>
            <input
              type="datetime-local"
              className="input"
              style={{ maxWidth: "none", margin: "0.2rem 0 0" }}
              value={(form.reminder_at as string)?.slice(0, 16) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reminder_at: e.target.value || null }))}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.82rem" }}>Reminder note</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Follow up on offer"
              style={{ maxWidth: "none", margin: "0.2rem 0 0" }}
              value={(form.reminder_note as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reminder_note: e.target.value }))}
            />
          </div>
          {(form.reminder_at || initial?.reminder_at) && (
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className="btn"
                style={{ fontSize: "0.8rem", color: "#e53e3e" }}
                onClick={() => setForm((f) => ({ ...f, reminder_at: null, reminder_note: null }))}
              >
                Clear reminder
              </button>
            </div>
          )}
        </div>

        {section("Notes")}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ position: "relative" }}>
            <textarea
              className="input"
              rows={3}
              style={{ maxWidth: "none", margin: "0.2rem 0 0", width: "100%", resize: "vertical", paddingRight: "2.75rem" }}
              value={(form.notes as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div style={{ position: "absolute", right: "0.5rem", bottom: "0.5rem" }}>
              <MicButton size="sm" onTranscript={(t) => setForm((f) => ({ ...f, notes: ((f.notes ?? "") + " " + t).trim() }))} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => form.first_name && !duplicate && onSave(form)}
          disabled={!form.first_name || !!duplicate}
          title={duplicate ? "A contact with this name already exists" : undefined}
        >
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function ContactsPanel({
  contacts: initialContacts,
  onContactsChange,
}: {
  contacts: ContactWithLeads[];
  onContactsChange: (contacts: ContactWithLeads[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [searchResults, setSearchResults] = useState<ContactWithLeads[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ContactWithLeads | null>(null);
  const [status, setStatus] = useState("");
  const [voicePrefill, setVoicePrefill] = useState<Partial<Contact> | null>(null);

  // Server-side search with 400ms debounce
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setSearchResults(await res.json());
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 400);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  // Base list: server search results OR all loaded contacts
  const baseList = searchResults ?? initialContacts;

  // All unique labels from all loaded contacts (for chips)
  const allLabels = Array.from(
    new Set(initialContacts.flatMap((c) => c.tags ?? []))
  ).sort();

  const filtered = activeLabel
    ? baseList.filter((c) => (c.tags ?? []).includes(activeLabel))
    : baseList;

  async function handleAdd(data: Partial<Contact>) {
    setStatus("");
    const localDup = data.first_name
      ? findDuplicateByName(
          initialContacts,
          String(data.first_name),
          (data.last_name as string) ?? null
        )
      : undefined;
    if (localDup) {
      setStatus("A contact with this name already exists. Use Edit existing contact.");
      setAdding(false);
      setEditing(localDup);
      return;
    }
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      onContactsChange([{ ...created, leads: [] }, ...initialContacts]);
      setAdding(false);
      setStatus("Contact added.");
    } else if (res.status === 409) {
      const body = await res.json();
      const existing = body.existing as Contact | undefined;
      setStatus("A contact with this name already exists.");
      if (existing) {
        const full = initialContacts.find((c) => c.id === existing.id) ?? {
          ...existing,
          leads: [],
        };
        setAdding(false);
        setEditing(full as ContactWithLeads);
      }
    } else {
      setStatus("Failed to add contact.");
    }
  }

  async function handleEdit(data: Partial<Contact>) {
    if (!editing) return;
    const payload = { ...data };
    if ("reminder_at" in payload) {
      const at = payload.reminder_at as string | null;
      payload.reminder_at = at ? new Date(at).toISOString() : null;
      if (!at) payload.reminder_note = null;
    }
    const res = await fetch(`/api/contacts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      onContactsChange(initialContacts.map((c) => (c.id === editing.id ? { ...c, ...updated } : c)));
      setEditing(null);
      setStatus("Contact updated.");
    } else {
      setStatus("Update failed.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact? Associated leads will be unlinked.")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      onContactsChange(initialContacts.filter((c) => c.id !== id));
      setStatus("Contact deleted.");
    }
  }

  return (
    <section id="contacts" style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Contacts
          <span style={{ fontSize: "0.85rem", fontWeight: 400, opacity: 0.6, marginLeft: "0.5rem" }}>
            {filtered.length !== initialContacts.length ? `${filtered.length} of ${initialContacts.length}` : initialContacts.length}
          </span>
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="/api/export?type=contacts&format=csv" className="btn">⬇ Export CSV</a>
          <MicButton
            onTranscript={(text) => {
              const parsed = parseContactFromSpeech(text);
              setEditing(null);
              setAdding(true);
              setVoicePrefill(parsed);
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => { setAdding(true); setEditing(null); setVoicePrefill(null); }}>
            + Add Contact
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "0.5rem" }}>
        <input
          type="text"
          className="search"
          placeholder="Search anything — name, notes, label, city, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (!e.target.value.trim()) setSearchResults(null); }}
          style={{ width: "100%" }}
        />
        {searching && (
          <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: "0.8rem" }}>
            searching…
          </span>
        )}
        {search && !searching && searchResults !== null && (
          <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: "0.8rem" }}>
            {filtered.length} found
          </span>
        )}
      </div>

      {/* Group filter — single picklist */}
      {allLabels.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <select
            className="input"
            style={{ maxWidth: "none", width: "100%", cursor: "pointer" }}
            value={activeLabel}
            onChange={(e) => setActiveLabel(e.target.value)}
          >
            <option value="">All ({initialContacts.length})</option>
            {allLabels.map((label) => {
              const count = initialContacts.filter((c) => (c.tags ?? []).includes(label)).length;
              return (
                <option key={label} value={label}>{label} ({count})</option>
              );
            })}
          </select>
        </div>
      )}

      {adding && (
        <ContactForm
          initial={voicePrefill ?? undefined}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setVoicePrefill(null); }}
          availableGroups={allLabels}
          existingContacts={initialContacts}
          onEditExisting={(c) => { setAdding(false); setEditing(c); }}
        />
      )}
      {editing && (
        <ContactForm
          initial={editing}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
          availableGroups={allLabels}
        />
      )}

      {status && <p className="status-msg" style={{ marginBottom: "0.75rem" }}>{status}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {filtered.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onEdit={(ct) => { setEditing(ct); setAdding(false); }}
            onDelete={handleDelete}
            onReminderSaved={(id, at, note) =>
              onContactsChange(initialContacts.map((x) =>
                x.id === id ? { ...x, reminder_at: at, reminder_note: note } : x
              ))
            }
          />
        ))}
        {filtered.length === 0 && (
          <p className="glass" style={{ gridColumn: "1 / -1", padding: "1rem" }}>
            {search || activeLabel
              ? `No contacts match${activeLabel ? ` label "${activeLabel}"` : ""}${search ? ` and "${search}"` : ""}.`
              : "No contacts yet — add one above."}
          </p>
        )}
      </div>
    </section>
  );
}
