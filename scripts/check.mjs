import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files=['app.js','experience.js','event-page.js','server.mjs','build.mjs',...(await readdir('cms')).filter(f=>f.endsWith('.mjs')).map(f=>'cms/'+f),...(await readdir('admin')).filter(f=>f.endsWith('.js')).map(f=>'admin/'+f)];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
console.log(`Syntax checked ${files.length} source files.`);
