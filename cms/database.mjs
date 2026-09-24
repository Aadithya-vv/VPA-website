import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export const now = () => new Date().toISOString();
export const id = () => randomUUID();
export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  if (!db.prepare('SELECT version FROM migrations WHERE version=1').get()) {
    transaction(db, () => { db.exec(readFileSync(new URL('./migrations/001.sql', import.meta.url), 'utf8')); db.prepare('INSERT INTO migrations VALUES (?,?)').run(1, now()); });
  }
  return db;
}
export function transaction(db, action) { db.exec('BEGIN IMMEDIATE'); try { const result = action(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }
export function insert(db, table, record) {
  const keys = Object.keys(record);
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(record));
}
export function update(db, table, record, key, value) {
  const keys = Object.keys(record);
  db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k}=?`).join(',')} WHERE ${key}=?`).run(...Object.values(record), value);
}
export const fail = (status, message) => Object.assign(new Error(message), { status });
export const recordActivity = (db, admin, action) => db.prepare('INSERT INTO activity(admin_id,action,created_at) VALUES (?,?,?)').run(admin || null, action, now());
