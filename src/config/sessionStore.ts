import session from "express-session";
import pool from "../db";
import { RowDataPacket } from "mysql2";

// Used when a session's cookie has no expiry of its own.
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
// How often expired sessions are deleted.
const CLEANUP_MS = 60 * 60 * 1000;

/**
 * express-session store backed by the `sessions` table, so logins survive a
 * server restart (the default MemoryStore loses them all).
 */
export default class MySQLSessionStore extends session.Store {
  constructor() {
    super();
    const timer = setInterval(() => {
      pool.query("DELETE FROM sessions WHERE expires < ?", [Date.now()])
        .catch(error => console.error("Could not clear expired sessions:", error));
    }, CLEANUP_MS);
    timer.unref();
  }

  private expiresAt(sess: session.SessionData): number {
    const expires = sess.cookie?.expires;
    return expires ? new Date(expires).getTime() : Date.now() + DEFAULT_TTL_MS;
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    pool.query<RowDataPacket[]>("SELECT data FROM sessions WHERE sid = ? AND expires >= ?", [sid, Date.now()])
      .then(([rows]) => callback(null, rows.length ? JSON.parse(rows[0].data) : null))
      .catch(error => callback(error));
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    pool.query(
      "INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)",
      [sid, JSON.stringify(sess), this.expiresAt(sess)]
    )
      .then(() => callback?.())
      .catch(error => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    pool.query("DELETE FROM sessions WHERE sid = ?", [sid])
      .then(() => callback?.())
      .catch(error => callback?.(error));
  }

  // Keeps an active session alive without rewriting its data.
  touch(sid: string, sess: session.SessionData, callback?: () => void): void {
    pool.query("UPDATE sessions SET expires = ? WHERE sid = ?", [this.expiresAt(sess), sid])
      .then(() => callback?.())
      .catch(() => callback?.());
  }
}
