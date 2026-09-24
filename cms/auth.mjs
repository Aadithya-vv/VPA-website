import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fail, insert, id, now } from './database.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
export async function provisionAdmin(db, username, password) {
  if (!username || !password) throw fail(400, 'Supply an administrator username and password.');
  if (password.length < 14 || Buffer.byteLength(password) > 72) throw fail(400, 'Use a password of at least 14 characters and at most 72 bytes.');
  if (!/^[a-zA-Z0-9_.@-]{3,100}$/.test(username)) throw fail(400, 'Use 3–100 letters, numbers, dots, hyphens or @ in the username.');
  if (db.prepare('SELECT id FROM admins').get()) throw fail(409, 'An administrator already exists. Use the password reset command.');
  insert(db, 'admins', { id: id(), username: username.toLowerCase(), password_hash: await bcrypt.hash(password, 12), created_at: now() });
}
export function auth(db, config) {
  const cookieName = config.production ? '__Host-vpa_session' : 'vpa_session';
  const dummy = bcrypt.hashSync(randomBytes(24).toString('hex'), 12);
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/' };
  function session(req, res, next) {
    const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (cookie && /^[a-f0-9]{64}$/.test(cookie)) req.adminSession = db.prepare('SELECT s.*,a.username FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE token_hash=? AND expires_at>?').get(hash(cookie), Date.now());
    next();
  }
  function requireAdmin(req, res, next) { if (!req.adminSession) return next(fail(401, 'Your session has expired. Please sign in again.')); next(); }
  function origin(req, res, next) { if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin !== config.origin) return next(fail(403, 'This request did not come from your website. Refresh and try again.')); next(); }
  function csrf(req, res, next) { if (!['GET','HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== req.adminSession?.csrf) return next(fail(403, 'Your security token expired. Refresh and try again.')); next(); }
  async function login(req, res) {
    const username = typeof req.body.username === 'string' ? req.body.username.toLowerCase().slice(0, 100) : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const keys = [hash(`ip:${req.ip}`), hash(`user:${username}`)];
    db.prepare('DELETE FROM login_attempts WHERE reset_at<?').run(Date.now());
    for (const key of keys) { const row = db.prepare('SELECT * FROM login_attempts WHERE key=?').get(key); if (row && row.count >= 8) throw fail(429, 'Too many sign-in attempts. Wait 15 minutes before trying again.'); }
    // Count before awaiting bcrypt so simultaneous attempts cannot bypass the limit.
    keys.forEach(key => db.prepare('INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, Date.now() + 15 * 60 * 1000));
    const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(username);
    const correct = password.length <= 200 && await bcrypt.compare(password, admin?.password_hash || dummy);
    if (!admin || !correct) throw fail(401, 'Incorrect username or password.');
    keys.forEach(key => db.prepare('DELETE FROM login_attempts WHERE key=?').run(key));
    if (req.adminSession) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.adminSession.token_hash);
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    const duration = config.sessionHours * 3600000;
    insert(db, 'sessions', { token_hash: hash(token), admin_id: admin.id, csrf, expires_at: Date.now() + duration });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: duration }); res.json({ username: admin.username, csrf });
  }
  function logout(req, res) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.adminSession.token_hash); res.clearCookie(cookieName, cookieOptions); res.json({ message: 'Signed out.' }); }
  return { session, requireAdmin, origin, csrf, login, logout };
}
