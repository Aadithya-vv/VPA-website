// Uses an isolated database and generated account; never changes real club content.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createApplication } from '../cms/application.mjs';
import { provisionAdmin } from '../cms/auth.mjs';
await mkdir('.test-data', { recursive:true });
const directory=await mkdtemp(path.resolve('.test-data/browser-'));
const origin='http://127.0.0.1:5198';
const {app,db}=await createApplication({dbPath:path.join(directory,'test.sqlite'),mediaDir:path.join(directory,'media'),origin,production:false});
const password=randomBytes(20).toString('hex');
await provisionAdmin(db,'browser-test',password);
const server=await new Promise(resolve=>{const listener=app.listen(5198,'127.0.0.1',()=>resolve(listener));});
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);if(message.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:true});if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(message.error):resolve(message.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+expression+'; '+await evaluate('document.body.innerText'));}
async function visit(route,selector){await send('Page.navigate',{url:origin+route});await until(`!!document.querySelector(${JSON.stringify(selector)})`);}
async function fill(name,value){await evaluate(`(()=>{const el=document.querySelector('[name=${name}]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);}
async function saved(){await until(`!busy && !!document.querySelector('#feedback').textContent`);assert.equal(await evaluate(`document.querySelector('#feedback').classList.contains('error')`),false,await evaluate(`document.querySelector('#feedback').textContent`));}
async function files(selector,names){const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId,files:names.map(name=>path.resolve('assets',name))});}
async function screenshot(name){const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${name}-check.png`,Buffer.from(result.data,'base64'));}
try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await visit('/admin','[name=username]');await fill('username','browser-test');await fill('password',password);await click('#login-form button');await until(`!!document.querySelector('.stats')`);await screenshot('admin-desktop');
  await visit('/admin/events?edit=new','#event-editor');await fill('title','Browser verification event');await fill('description','A private test event.');await click('[value=draft]');await saved();
  const event=db.prepare('SELECT * FROM events WHERE title=?').get('Browser verification event');assert.ok(event);assert.equal((await fetch(origin+'/events/'+event.slug)).status,404);
  await visit('/admin/media','#upload-open');await click('#upload-open');await files('#upload-files',['art2.jpeg']);await fill('alt_0','Browser test poster');await click('#upload-form button');await saved();
  const poster=db.prepare("SELECT * FROM media WHERE source='upload' ORDER BY created_at DESC").get();assert.ok(poster);
  await visit('/admin/events?edit='+event.id,'#event-editor');await fill('poster_id',poster.id);await click('[value=draft]');await saved();
  await visit('/admin/gallery?event='+event.id+'&upload=1','#upload-files');await files('#upload-files',['art1.jpeg','art3.jpeg']);await fill('alt_0','Browser gallery one');await fill('alt_1','Browser gallery two');await click('[name=upload_published]');await click('#upload-form button');await saved();assert.equal(db.prepare('SELECT count(*) n FROM gallery_items WHERE event_id=?').get(event.id).n,2);
  await visit('/admin/preview/events/'+event.id,'.event-detail');assert.match(await evaluate('document.body.innerText'),/PRIVATE EVENT PREVIEW/);assert.equal((await fetch(origin+'/api/events/'+event.slug)).status,404);
  await visit('/admin/events?edit='+event.id,'#event-editor');await click('[value=publish]');await saved();
  await visit('/','#event-list');await until(`document.querySelector('#event-list').innerText.includes('Browser verification event')`);
  await visit('/events/'+event.slug,'.event-detail');await until(`document.querySelector('.event-detail-poster').complete`);assert.ok(await evaluate(`document.querySelector('.event-detail-poster').naturalWidth>0`));
  await visit('/admin/events','#event-rows');await click(`[data-event-action=complete][data-id="${event.id}"]`);await saved();await visit('/','#past-tab');await click('#past-tab');assert.match(await evaluate(`document.querySelector('#event-list').innerText`),/Browser verification event/);
  await visit('/admin/media?edit='+poster.id,'#replace-photo');await files('#replace-photo [name=file]',['art3.jpeg']);await click('#replace-photo button');await saved();const replaced=db.prepare('SELECT * FROM media WHERE id=?').get(poster.id);assert.notEqual(replaced.storage_key,poster.storage_key);
  await visit('/events/'+event.slug,'.event-detail-poster');assert.match(await evaluate(`document.querySelector('.event-detail-poster').src`),new RegExp(poster.id));
  await visit('/admin/homepage','#document-editor');await fill('hero_media_id',poster.id);await click('[value=publish]');await saved();await visit('/','.art-piece-music img');await until(`document.querySelector('.art-piece-music img').src.includes(${JSON.stringify(poster.id)})`);
  await visit('/admin/gallery','#gallery-rows');const first=db.prepare('SELECT id FROM gallery_items ORDER BY position,created_at,id').get().id;await click('[data-move="1"][data-index="0"]');await saved();assert.notEqual(db.prepare('SELECT id FROM gallery_items ORDER BY position,created_at,id').get().id,first);
  await visit('/admin/media?edit='+poster.id,'#delete-photo');await click('#delete-photo');await until(`!busy && document.querySelector('#feedback').classList.contains('error')`);assert.match(await evaluate(`document.querySelector('#feedback').textContent`),/still in use/);
  await visit('/admin/media','#upload-open');await click('#upload-open');await files('#upload-files',['art4.jpeg']);await fill('alt_0','Unused browser test image');await click('#upload-form button');await saved();
  const unused=db.prepare("SELECT id FROM media WHERE alt_text='Unused browser test image'").get();await visit('/admin/media?edit='+unused.id,'#delete-photo');await click('#delete-photo');await saved();assert.ok(db.prepare('SELECT deleted_at FROM media WHERE id=?').get(unused.id).deleted_at);
  await visit('/admin/events','#event-rows');await click(`[data-event-action=archive][data-id="${event.id}"]`);await saved();assert.equal((await fetch(origin+'/events/'+event.slug)).status,404);assert.equal(db.prepare('SELECT status FROM events WHERE id=?').get(event.id).status,'ARCHIVED');
  for(const width of [1440,768,390,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});for(const route of ['/admin','/admin/events?edit='+event.id,'/admin/gallery','/admin/media','/admin/homepage','/admin/art-forms','/admin/team','/admin/content']){await visit(route,'#page h1');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),`${width}px overflow at ${route}`);}if(width===390)await screenshot('admin-mobile');}
  await visit('/admin/content','#document-editor');await fill('about','Unsaved text survives session expiry.');db.prepare('DELETE FROM sessions').run();await click('[value=draft]');await until(`!busy && !!document.querySelector('#sign-in-again')`);assert.equal(await evaluate(`document.querySelector('[name=about]').value`),'Unsaved text survives session expiry.');
  await visit('/admin/login','#login-form');await fill('username','browser-test');await fill('password',password);await click('#login-form button');await until(`!!document.querySelector('.stats')`);await click('#logout');await until(`!!document.querySelector('#login-form')`);
  assert.deepEqual(errors,[]);console.log('PASS admin login, draft, upload, bulk gallery, preview, publish, public event, completed, replacement, homepage, reorder, deletion protection, session expiry, logout and 320–1440px layouts');
}finally{await send('Page.navigate',{url:'http://127.0.0.1:5173'}).catch(()=>{});ws.close();await new Promise(resolve=>server.close(resolve));db.close();}
