import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { createApplication } from '../cms/application.mjs';
import { provisionAdmin } from '../cms/auth.mjs';
const root=process.cwd();await mkdir('.test-data',{recursive:true});
const directory=await mkdtemp(path.join(root,'.test-data','cms-'));
const origin='http://127.0.0.1:5197';
const {app,db}=await createApplication({dbPath:path.join(directory,'test.sqlite'),mediaDir:path.join(directory,'media'),origin,production:false});
const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
const base=`http://127.0.0.1:${server.address().port}`;
const password=randomBytes(20).toString('hex');await provisionAdmin(db,'test-president',password);
let cookie='',csrf='';
async function request(url,{method='GET',data,body,authenticated=true,headers={}}={}){const response=await fetch(base+url,{method,redirect:'manual',headers:{Origin:origin,...(authenticated?{Cookie:cookie,'X-CSRF-Token':csrf}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},body:body|| (data?JSON.stringify(data):undefined)});const type=response.headers.get('content-type')||'';return{response,status:response.status,data:type.includes('json')?await response.json():await response.text()};}
async function login(){const result=await request('/api/admin/login',{method:'POST',authenticated:false,data:{username:'test-president',password}});assert.equal(result.status,200);cookie=result.response.headers.get('set-cookie').split(';')[0];csrf=result.data.csrf;assert.match(result.response.headers.get('set-cookie'),/HttpOnly/);assert.match(result.response.headers.get('set-cookie'),/SameSite=Strict/i);}
const photo=await sharp({create:{width:1500,height:1000,channels:3,background:'#c58a08'}}).jpeg().toBuffer();
async function upload(buffer=photo,filename='poster.jpg',mime='image/jpeg',replace){const form=new FormData();form.set('file',new Blob([buffer],{type:mime}),filename);form.set('alt_text','Test image description');form.set('category','EVENTS');return request(replace?`/api/admin/media/${replace}/replace`:'/api/admin/media',{method:'POST',body:form});}
await test('Complete CMS workflow, publication boundary and security',async t=>{
  try{
    await t.test('Seed fidelity, names and artwork placements',async()=>{const {data}=await request('/api/content',{authenticated:false});assert.equal(data.events.length,6);assert.equal(data.gallery.length,11);assert.equal(data.team.length,6);assert.equal(data.team[4].name,'Nekitha');assert.equal(data.homepage.heroArt.filename,'art4.jpeg');assert.equal(data.gallery.filter(item=>item.category==='FINE ARTS').length,3);assert.equal(data.gallery.some(item=>item.media.filename==='art4.jpeg'),false);assert.equal(data.artForms[2].media.filename,'art1.jpeg');});
    await t.test('Every protected route rejects anonymous requests',async()=>{for(const route of ['/admin','/admin/events','/admin/gallery','/admin/media','/admin/homepage','/admin/art-forms','/admin/team','/admin/content','/admin/preview']){const result=await request(route,{authenticated:false});assert.equal(result.status,302);assert.equal(result.response.headers.get('location'),'/admin/login');}for(const route of ['/api/admin/events','/api/admin/media','/api/admin/gallery','/api/admin/documents/homepage'])assert.equal((await request(route,{authenticated:false})).status,401);assert.equal((await request('/content-data.js?preview=1',{authenticated:false})).status,401);assert.equal((await request('/api/admin/events',{method:'POST',data:{},authenticated:false})).status,401);});
    await t.test('Login, CSRF and cross-origin protection',async()=>{assert.equal((await request('/api/admin/login',{method:'POST',data:{username:'test-president',password:'wrong'},authenticated:false})).status,401);await login();assert.equal((await request('/api/admin/events',{method:'POST',data:{},headers:{'X-CSRF-Token':'wrong'}})).status,403);assert.equal((await request('/api/admin/events',{method:'POST',data:{},headers:{Origin:'https://evil.example'}})).status,403);assert.equal((await request('/api/admin/login',{method:'POST',data:{username:'test-president',password},headers:{Origin:'https://evil.example'}})).status,403);});
    let event,poster,galleryMedia,galleryItem;
    await t.test('Create draft, upload poster and gallery, private preview',async()=>{
      const created=await request('/api/admin/events',{method:'POST',data:{title:'CMS test performance',short_description:'Test only',description:'Full event text',categories:['MUSIC','DANCE'],status:'DRAFT',published:false}});assert.equal(created.status,201);event=(await request('/api/admin/events')).data.find(item=>item.id===created.data.id);
      const uploaded=await upload();assert.equal(uploaded.status,201);poster=uploaded.data;assert.equal(poster.mime_type,'image/webp');assert.match(poster.srcset,/640w/);
      galleryMedia=(await upload()).data;
      const added=await request('/api/admin/gallery',{method:'POST',data:{media_id:galleryMedia.id,event_id:event.id,title:'Test gallery',category:'MUSIC',published:true,wide:true}});assert.equal(added.status,201);galleryItem=added.data.id;
      event={...event,poster_id:poster.id};assert.equal((await request(`/api/admin/events/${event.id}`,{method:'PUT',data:event})).status,200);
      assert.equal((await request(`/api/events/${event.slug}`,{authenticated:false})).status,404);assert.equal((await request(`/events/${event.slug}`,{authenticated:false})).status,404);assert.equal((await request(poster.url,{authenticated:false})).status,404);
      const snapshot=(await request('/api/content',{authenticated:false})).data;assert.equal(snapshot.events.some(e=>e.id===event.id),false);assert.equal(snapshot.gallery.some(g=>g.id===galleryItem),false);
      const preview=await request(`/admin/preview/events/${event.id}`);assert.equal(preview.status,200);assert.match(preview.data,/CMS test performance/);assert.match(preview.data,/PRIVATE EVENT PREVIEW/);
    });
    await t.test('Publish → public event page → completed → stable image replacement',async()=>{
      event={...event,status:'UPCOMING',published:true};assert.equal((await request(`/api/admin/events/${event.id}`,{method:'PUT',data:event})).status,200);
      let publicData=(await request('/api/content',{authenticated:false})).data;assert.equal(publicData.events.find(e=>e.id===event.id).status,'UPCOMING');assert.ok(publicData.gallery.find(g=>g.id===galleryItem));assert.equal((await request(`/events/${event.slug}`,{authenticated:false})).status,200);assert.equal((await request(poster.url,{authenticated:false})).status,200);
      event={...event,status:'COMPLETED'};await request(`/api/admin/events/${event.id}`,{method:'PUT',data:event});assert.equal((await request('/api/content',{authenticated:false})).data.events.find(e=>e.id===event.id).status,'COMPLETED');
      const replaced=await upload(await sharp({create:{width:600,height:900,channels:3,background:'#ff694a'}}).png().toBuffer(),'replacement.png','image/png',poster.id);assert.equal(replaced.status,200);assert.equal(replaced.data.id,poster.id);assert.notEqual(replaced.data.url,poster.url);publicData=(await request('/api/content',{authenticated:false})).data;assert.equal(publicData.events.find(e=>e.id===event.id).poster.width,600);
    });
    await t.test('Homepage draft preview and publish, document reference integrity',async()=>{
      const document=(await request('/api/admin/documents/homepage')).data;const changed={...document.draft,hero_media_id:poster.id};await request('/api/admin/documents/homepage',{method:'PUT',data:{data:changed,publish:false}});assert.equal((await request('/api/homepage',{authenticated:false})).data.hero_media_id,document.published.hero_media_id);const preview=await request('/content-data.js?preview=1');assert.match(preview.data,new RegExp(poster.id));await request('/api/admin/documents/homepage',{method:'PUT',data:{data:changed,publish:true}});assert.equal((await request('/api/homepage',{authenticated:false})).data.hero_media_id,poster.id);
      assert.equal((await request(`/api/admin/media/${poster.id}`,{method:'DELETE'})).status,409);
      assert.equal((await request('/api/admin/documents/homepage',{method:'PUT',data:{data:{...changed,hero_media_id:'missing'},publish:true}})).status,400);
      await request('/api/admin/documents/homepage',{method:'PUT',data:{data:document.published,publish:true}});
    });
    await t.test('Upload validation, XSS escaping and unique slugs',async()=>{
      assert.equal((await upload(Buffer.from('<svg onload="alert(1)"></svg>'),'fake.jpg')).status,400);assert.equal((await upload(Buffer.from('<svg/>'),'script.svg','image/svg+xml')).status,400);assert.equal((await upload(Buffer.alloc(10*1024*1024+1),'huge.jpg')).status,400);
      const malicious={...event,title:'<img src=x onerror=alert(1)>',description:'<script>alert(1)</script>'};assert.equal((await request(`/api/admin/events/${event.id}`,{method:'PUT',data:malicious})).status,200);const rendered=(await request(`/events/${event.slug}`,{authenticated:false})).data;assert.ok(rendered.includes('&lt;script&gt;'));assert.ok(!rendered.includes('<img src=x'));const dataScript=(await request('/content-data.js',{authenticated:false})).data;assert.ok(!dataScript.includes('<img src=x'));
      const duplicate=await request('/api/admin/events',{method:'POST',data:{...event,id:undefined,slug:event.slug}});assert.equal(duplicate.status,409);
      const generated=await request('/api/admin/events',{method:'POST',data:{title:'CMS test performance',categories:['GENERAL'],status:'DRAFT'}});assert.equal(generated.status,201);assert.notEqual((await request('/api/admin/events')).data.find(e=>e.id===generated.data.id).slug,event.slug);
    });
    await t.test('Gallery reorder, media referential protection, archive and soft delete',async()=>{
      const rows=(await request('/api/admin/gallery')).data;const ids=rows.map(row=>row.id).reverse();assert.equal((await request('/api/admin/gallery/reorder',{method:'PUT',data:{ids}})).status,200);assert.equal((await request('/api/admin/gallery')).data[0].id,ids[0]);assert.equal((await request('/api/admin/gallery/reorder',{method:'PUT',data:{ids:[ids[0],ids[0]]}})).status,409);
      assert.equal((await request(`/api/admin/media/${galleryMedia.id}`,{method:'DELETE'})).status,409);await request(`/api/admin/events/${event.id}`,{method:'DELETE'});assert.equal((await request(`/events/${event.slug}`,{authenticated:false})).status,404);assert.ok(!(await request('/api/gallery',{authenticated:false})).data.some(row=>row.id===galleryItem));await request(`/api/admin/gallery/${galleryItem}`,{method:'DELETE'});assert.ok((await request('/api/admin/media')).data.some(row=>row.id===galleryMedia.id));assert.equal((await request(`/api/admin/media/${galleryMedia.id}`,{method:'DELETE'})).status,200);assert.equal((await request(galleryMedia.url)).status,404);
    });
    await t.test('Logout and session expiry revoke API and draft access',async()=>{
      assert.equal((await request('/api/admin/logout',{method:'POST'})).status,200);assert.equal((await request('/api/admin/events')).status,401);await login();db.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await request('/api/admin/events')).status,401);assert.equal((await request(`/admin/preview/events/${event.id}`)).status,302);
    });
    await t.test('Login rate limiting and private filesystem routes',async()=>{
      for(let i=0;i<8;i++)await request('/api/admin/login',{method:'POST',data:{username:'nobody',password:'wrong'},authenticated:false});assert.equal((await request('/api/admin/login',{method:'POST',data:{username:'nobody',password:'wrong'},authenticated:false})).status,429);
      for(const route of ['/data/vpa.sqlite','/.env','/cms/seed-content.json','/assets/..%2F.env'])assert.equal((await request(route,{authenticated:false})).status,404);
    });
  }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
