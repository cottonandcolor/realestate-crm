"use client";

import { useState } from "react";
import type { Contact, Lead } from "@/lib/types/database";

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
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

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
      {contact.notes && <p style={{ fontSize: "0.8rem", opacity: 0.75, fontStyle: "italic" }}>{contact.notes}</p>}

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
    </div>
  );
}

function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Contact>;
  onSave: (data: Partial<Contact>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Contact>>(initial ?? {});
  function field(key: keyof Contact) {
    return {
      value: (form[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="glass" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>{initial?.id ? "Edit Contact" : "Add Contact"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div>
          <label style={{ fontSize: "0.82rem" }}>First name *</label>
          <input className="input" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("first_name")} required />
        </div>
        <div>
          <label style={{ fontSize: "0.82rem" }}>Last name</label>
          <input className="input" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("last_name")} />
        </div>
        <div>
          <label style={{ fontSize: "0.82rem" }}>Email</label>
          <input className="input" type="email" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("email")} />
        </div>
        <div>
          <label style={{ fontSize: "0.82rem" }}>Phone</label>
          <input className="input" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("phone")} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.82rem" }}>Company</label>
          <input className="input" style={{ maxWidth: "none", margin: "0.2rem 0 0" }} {...field("company")} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.82rem" }}>Notes</label>
          <textarea
            className="input"
            rows={2}
            style={{ maxWidth: "none", margin: "0.2rem 0 0", width: "100%", resize: "vertical" }}
            value={(form.notes as string) ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
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
  initialContacts,
}: {
  initialContacts: ContactWithLeads[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ContactWithLeads | null>(null);
  const [status, setStatus] = useState("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  async function handleAdd(data: Partial<Contact>) {
    setStatus("");
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setContacts((prev) => [{ ...created, leads: [] }, ...prev]);
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
      setContacts((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...c, ...updated } : c))
      );
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
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setStatus("Contact deleted.");
    }
  }

  return (
    <section id="contacts" style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Contacts</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href="/api/export?type=contacts&format=csv" className="btn">⬇ Export CSV</a>
          <button type="button" className="btn btn-primary" onClick={() => { setAdding(true); setEditing(null); }}>
            + Add Contact
          </button>
        </div>
      </div>

      <input
        type="text"
        className="search"
        placeholder="Search contacts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />

      {adding && (
        <ContactForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}
      {editing && (
        <ContactForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />
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
          <p className="glass" style={{ gridColumn: "1 / -1" }}>
            {search ? "No contacts match your search." : "No contacts yet — add one above."}
          </p>
        )}
      </div>
    </section>
  );
}
