import { mkdir, copyFile, cp, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { eventPage } from './scripts/event-template.mjs';
const output=path.resolve('dist');
if(path.dirname(output)!==process.cwd() || path.basename(output)!=='dist')throw new Error('Unsafe build directory.');
const previous=await lstat(output).catch(error=>{if(error.code!=='ENOENT')throw error;});
if(previous?.isSymbolicLink())throw new Error('Build directory must not be a symlink.');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const file of ['index.html','styles.css','app.js','content-data.js','experience.css','experience.js','event-page.js'])await copyFile(file,path.join(output,file));
await cp('assets',path.join(output,'assets'),{recursive:true});
const context={window:{}};vm.runInNewContext(await readFile('content-data.js','utf8'),context);
const content=context.window.VPA_CONTENT;
const template=await readFile('index.html','utf8');
for(const event of content.events){
  if(!/^[a-z0-9-]+$/.test(event.slug))throw new Error('Invalid event page address.');
  const folder=path.join(output,'events',event.slug);await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,'index.html'),eventPage(template,event,content.gallery,content.content));
}
console.log(`Static site built: ${content.events.length} events, ${content.gallery.length} gallery entries, ${content.team.length} office bearers.`);
