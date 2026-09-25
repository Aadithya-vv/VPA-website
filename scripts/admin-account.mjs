import { openDatabase } from '../cms/database.mjs';
import { configuration } from '../cms/config.mjs';
import { provisionAdmin } from '../cms/auth.mjs';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
function hiddenPassword(label) {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal, or supply ADMIN_USERNAME and ADMIN_PASSWORD in the environment.');
  process.stdout.write(label);
  emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve,reject) => {
    let value='';
    const finish=(error)=>{process.stdin.removeListener('keypress',onKey);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value);};
    function onKey(text,key={}) {
      if(key.ctrl&&key.name==='c')return finish(new Error('Account setup cancelled.'));
      if(key.name==='return'||key.name==='enter')return finish();
      if(key.name==='backspace'){value=Array.from(value).slice(0,-1).join('');return;}
      if(text&&!key.ctrl&&!key.meta&&!text.includes('\u001b'))value+=text;
    }
    process.stdin.on('keypress',onKey);
  });
}
const config = configuration(); const db = openDatabase(config.dbPath);
try {
  let username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD;
  if (!username && process.stdin.isTTY) {
    const terminal=createInterface({input:process.stdin,output:process.stdout});
    try { username=(await terminal.question('Administrator username: ')).trim(); } finally { terminal.close(); }
  }
  if (!password && process.stdin.isTTY) {
    password=await hiddenPassword('Password (14+ characters; input hidden): ');
    if(password!==await hiddenPassword('Confirm password (input hidden): '))throw new Error('Passwords did not match. No changes saved.');
  }
  if (process.argv.includes('--reset')) {
    if (!username || !password || password.length < 14 || Buffer.byteLength(password) > 72) throw new Error('Supply ADMIN_USERNAME and ADMIN_PASSWORD (14+ characters, at most 72 bytes).');
    const admin = db.prepare('SELECT id FROM admins WHERE username=?').get(username.toLowerCase());
    if (!admin) throw new Error('Administrator not found.');
    db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(await bcrypt.hash(password, 12), admin.id);
    db.prepare('DELETE FROM sessions WHERE admin_id=?').run(admin.id);
    console.log('Password reset; existing sessions revoked.');
  } else { await provisionAdmin(db, username, password); console.log('Administrator created. Remove ADMIN_PASSWORD from the environment after setup.'); }
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { db.close(); }
