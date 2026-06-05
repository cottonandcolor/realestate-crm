export type ReminderAckMode = "dismissed" | "acknowledged";

type StoredAck = {
  reminderAt: string;
  mode: ReminderAckMode;
};

const STORAGE_KEY = "crm_reminder_acks";

function readAll(): Record<string, StoredAck> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredAck>) : {};
  } catch {
    return {};
  }
}

function writeAll(acks: Record<string, StoredAck>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acks));
}

export function getReminderAck(
  contactId: string,
  reminderAt: string | null
): ReminderAckMode | null {
  if (!reminderAt) return null;
  const ack = readAll()[contactId];
  if (!ack || ack.reminderAt !== reminderAt) return null;
  return ack.mode;
}

export function setReminderAck(
  contactId: string,
  reminderAt: string,
  mode: ReminderAckMode
) {
  const acks = readAll();
  acks[contactId] = { reminderAt, mode };
  writeAll(acks);
}
