import fs from "fs";

const DEFAULT_CREDS_FILE = "/tmp/env";

/**
 * Agent Hub credentials from env vars or a two-line file:
 *   line 1 = email
 *   line 2 = password
 *
 * Override path: AGENTHUB_CREDS_FILE=/path/to/file
 */
export function loadAgentHubCredentials() {
  const email = process.env.AGENTHUB_EMAIL?.trim();
  const password = process.env.AGENTHUB_PASSWORD;
  if (email && password) {
    return { email, password, source: "environment" };
  }

  const file = process.env.AGENTHUB_CREDS_FILE || DEFAULT_CREDS_FILE;
  if (!fs.existsSync(file)) {
    return null;
  }

  const lines = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(`${file} must contain email on line 1 and password on line 2.`);
  }

  return { email: lines[0], password: lines[1], source: file };
}
