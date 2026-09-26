import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
test('Static Render build includes public content without private server files', async()=>{
  execFileSync(process.execPath,['build.mjs']);
  const context={window:{}};vm.runInNewContext(await readFile('dist/content-data.js','utf8'),context);
  const data=context.window.VPA_CONTENT;
  assert.equal(data.events.length,6);assert.equal(data.gallery.length,11);assert.equal(data.team.length,6);
  assert.equal(data.homepage.heroArt.filename,'art4.jpeg');assert.ok(data.team.some(member=>member.name==='Nekitha'));
  const images=[];
  function walk(value){if(!value||typeof value!=='object')return;if(value.url)images.push(value.url);Object.values(value).forEach(walk);}
  walk(data);
  for(const url of images){assert.ok(url.startsWith('/assets/'));await access(path.join('dist',decodeURIComponent(url)));}
  for(const event of data.events){const html=await readFile(`dist/events/${event.slug}/index.html`,'utf8');assert.ok(html.includes('<main'));assert.ok(!html.includes('/media/'));}
  for(const file of ['admin/index.html','cms/seed-content.json','server.mjs','.env','data/vpa.sqlite'])await assert.rejects(access(path.join('dist',file)));
});
