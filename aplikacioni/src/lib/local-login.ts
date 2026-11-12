import "server-only";
import { getSql } from "./db";
import { verifyPassword } from "./password";
export async function localLogin(username: unknown, password: unknown) {
  if (typeof username !== "string" || typeof password !== "string" || password.length > 128 ||
    !/^[a-z0-9_]{3,32}$/.test(username.toLowerCase())) return null;
  try {
    // Reserve attempts atomically before expensive password verification. Five attempts / 15 minutes.
    const rows = await getSql()`UPDATE local_accounts SET
      attempts = CASE WHEN window_start < now() - interval '15 minutes' THEN 1 ELSE attempts + 1 END,
      window_start = CASE WHEN window_start < now() - interval '15 minutes' THEN now() ELSE window_start END
      WHERE username = ${username.toLowerCase()} AND NOT disabled
        AND (attempts < 5 OR window_start < now() - interval '15 minutes')
      RETURNING profile_id, password_hash`;
    const row = rows[0];
    const valid = await verifyPassword(password, row?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
    if (!row || !valid) return null;
    const profiles = await getSql()`SELECT p.github_id AS id, p.emri AS name FROM profilet p
      JOIN local_accounts a ON a.profile_id = p.github_id WHERE a.profile_id = ${row.profile_id} AND NOT a.disabled`;
    return profiles[0] as {id: string; name: string} | undefined ?? null;
  } catch { return null; }
}
