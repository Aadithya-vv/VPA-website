import { openDatabase } from '../cms/database.mjs';
import { configuration } from '../cms/config.mjs';
import { provisionAdmin } from '../cms/auth.mjs';
import bcrypt from 'bcryptjs';
const config = configuration(); const db = openDatabase(config.dbPath);
try {
  const username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD;
  if (process.argv.includes('--reset')) {
    if (!username || !password || password.length < 14 || Buffer.byteLength(password) > 72) throw new Error('Supply ADMIN_USERNAME and ADMIN_PASSWORD (14+ characters, at most 72 bytes).');
    const admin = db.prepare('SELECT id FROM admins WHERE username=?').get(username.toLowerCase());
    if (!admin) throw new Error('Administrator not found.');
    db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(await bcrypt.hash(password, 12), admin.id);
    db.prepare('DELETE FROM sessions WHERE admin_id=?').run(admin.id);
    console.log('Password reset; existing sessions revoked.');
  } else { await provisionAdmin(db, username, password); console.log('Administrator created. Remove ADMIN_PASSWORD from the environment after setup.'); }
} finally { db.close(); }
