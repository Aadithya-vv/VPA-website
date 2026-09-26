import { mkdir, copyFile, cp, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { openDatabase } from './cms/database.mjs';
import { seed } from './cms/seed.mjs';
import { addStudentArt } from './cms/student-art.mjs';
import { contentSnapshot } from './cms/content.mjs';
import { eventPage } from './cms/event-page.mjs';
const serverBuild = process.argv.includes('--server');
const output = path.resolve(serverBuild ? 'server-dist' : 'dist');
if (path.dirname(output) !== process.cwd() || !['dist','server-dist'].includes(path.basename(output))) throw new Error('Unsafe build directory.');
const previous = await lstat(output).catch(error => { if(error.code !== 'ENOENT') throw error; });
if (previous?.isSymbolicLink()) throw new Error('Build directory must not be a symlink.');
await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
for (const file of ['index.html','styles.css','app.js','experience.css','experience.js','event-page.js']) await copyFile(file,path.join(output,file));
await cp('assets',path.join(output,'assets'),{recursive:true});
if (serverBuild) {
  for(const file of ['server.mjs','build.mjs','package.json','package-lock.json','.env.example','README.md']) await copyFile(file,path.join(output,file));
  for(const folder of ['cms','admin','scripts','tests']) await cp(folder,path.join(output,folder),{recursive:true});
  console.log('Node server bundle built in server-dist/. Live data and secrets are excluded.');
} else {
  // Export repository content only; never read local accounts or drafts.
  const db = openDatabase(':memory:');
  try {
    await seed(db,process.cwd()); await addStudentArt(db,process.cwd());
    const snapshot = contentSnapshot(db);
    const assets = new Map(db.prepare('SELECT id,storage_key FROM media WHERE source=?').all('asset').map(row=>[row.id,'/assets/'+row.storage_key.split('/').map(encodeURIComponent).join('/')]));
    function publicAssets(value) {
      if(!value || typeof value !== 'object') return;
      if(value.url && value.id) { if(!assets.has(value.id)) throw new Error('Static export requires a bundled asset.'); value.url=assets.get(value.id);value.srcset=''; }
      Object.values(value).forEach(publicAssets);
    }
    publicAssets(snapshot);
    await writeFile(path.join(output,'content-data.js'),'window.VPA_CONTENT='+JSON.stringify(snapshot).replace(/</g,'\\u003c')+';\n');
    const template = await readFile('index.html','utf8');
    for(const event of snapshot.events) {
      const folder=path.join(output,'events',event.slug);await mkdir(folder,{recursive:true});
      await writeFile(path.join(folder,'index.html'),eventPage(template,event,snapshot.gallery,false,snapshot.content));
    }
    console.log(`Static site built in dist/: ${snapshot.events.length} events, ${snapshot.gallery.length} gallery photos, ${snapshot.team.length} office bearers. No backend required.`);
  } finally { db.close(); }
}
