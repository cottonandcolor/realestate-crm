"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, Lead } from "@/lib/types/database";
import { ActivityFeed } from "./ActivityFeed";
import { MicButton } from "./MicButton";
import { parseContactFromSpeech } from "@/lib/voice/parseContact";

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
}: {
  contact: ContactWithLeads;
  onEdit: (c: ContactWithLeads) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const address = [contact.address_street, contact.address_city, contact.address_region, contact.address_postal_code]
    .filter(Boolean).join(", ");

  return (
    <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <strong>{fullName}</strong>
          {contact.company && (
            <span style={{ fontSize: "0.8rem", opacity: 0.7, marginLeft: "0.5rem" }}>
              {contact.company}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
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
}: {
  initial?: Partial<Contact>;
  onSave: (data: Partial<Contact>) => void;
  onCancel: () => void;
  availableGroups?: string[];
}) {
  const [form, setForm] = useState<Partial<Contact>>(initial ?? {});
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [newGroup, setNewGroup] = useState("");
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
          onClick={() => form.first_name && onSave(form)}
          disabled={!form.first_name}
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
    } else {
      setStatus("Failed to add contact.");
    }
  }

  async function handleEdit(data: Partial<Contact>) {
    if (!editing) return;
    const res = await fetch(`/api/contacts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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

      {/* Label filter chips */}
      {allLabels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setActiveLabel("")}
            style={{
              fontSize: "0.75rem", padding: "0.2rem 0.65rem", borderRadius: "999px", cursor: "pointer",
              border: "1px solid var(--color-border)",
              background: activeLabel === "" ? "var(--indigo-500)" : "transparent",
              color: activeLabel === "" ? "#fff" : "var(--color-text-muted)",
            }}
          >All ({initialContacts.length})</button>
          {allLabels.map((label) => {
            const count = initialContacts.filter((c) => (c.tags ?? []).includes(label)).length;
            const active = activeLabel === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveLabel(active ? "" : label)}
                style={{
                  fontSize: "0.75rem", padding: "0.2rem 0.65rem", borderRadius: "999px", cursor: "pointer",
                  border: "1px solid var(--color-border)",
                  background: active ? "var(--indigo-500)" : "transparent",
                  color: active ? "#fff" : "var(--color-text-muted)",
                  whiteSpace: "nowrap",
                }}
              >{label} ({count})</button>
            );
          })}
        </div>
      )}

      {adding && (
        <ContactForm
          initial={voicePrefill ?? undefined}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setVoicePrefill(null); }}
          availableGroups={allLabels}
        />
      )}
      {editing && (
        <ContactForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} availableGroups={allLabels} />
      )}

      {status && <p className="status-msg" style={{ marginBottom: "0.75rem" }}>{status}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {filtered.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onEdit={(ct) => { setEditing(ct); setAdding(false); }}
            onDelete={handleDelete}
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
