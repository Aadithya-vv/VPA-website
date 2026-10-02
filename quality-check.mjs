import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
const pending = new Map(); let sequence = 0;
const errors = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  if (pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(message.error) : resolve(message.result); }
});
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const shot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${name}-check.png`, Buffer.from(result.data, 'base64')); };
async function key(key, code = key) { const windowsVirtualKeyCode = { Escape: 27, ArrowLeft: 37, ArrowRight: 39, Tab: 9 }[key]; await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode }); }
try {
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Page.bringToFront');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.qualityMetrics={shifts:0,longTasks:[]};new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)qualityMetrics.shifts+=e.value})).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>list.getEntries().forEach(e=>qualityMetrics.longTasks.push(Math.round(e.duration)))).observe({type:'longtask',buffered:true});` });
  await send('Page.navigate', { url: process.env.CHECK_ORIGIN || 'http://127.0.0.1:5173' }); await wait(600);
  await evaluate(`sessionStorage.clear()`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.reload'); await wait(1700);
  assert.equal(await evaluate(`sessionStorage.getItem('vpa-intro')`), 'seen');
  await shot('polish-desktop');
  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    await send('Emulation.setTouchEmulationEnabled', { enabled: width < 700 });
    for (const id of ['home', 'art-forms', 'events', 'gallery', 'team', 'contact']) {
      await evaluate(`document.getElementById('${id}').scrollIntoView({behavior:'instant'})`); await wait(150);
      assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), `${width}px overflow at ${id}`);
      if ((width === 1440 || width === 390) && ['art-forms', 'events', 'gallery'].includes(id)) { await wait(850); await shot(`polish-${width}-${id}`); }
    }
    console.log(`PASS ${width}px: all six sections fit`);
  }
  await evaluate(`document.querySelectorAll('.discipline-controls button')[1].click()`);
  assert.equal(await evaluate(`document.querySelector('.art-forms').dataset.active`), 'Dance');
  await evaluate(`document.querySelector('.fine-art').focus()`);
  assert.equal(await evaluate(`document.querySelector('.art-forms').dataset.active`), 'Fine arts');
  for (const clue of ['sound','movement','canvas']) {
    await evaluate(`document.querySelector('[data-clue="${clue}"]').click()`);
    assert.equal(await evaluate(`document.querySelector('.next-act').dataset.reveal`),clue);
    assert.equal(await evaluate(`document.querySelectorAll('[data-clue][aria-pressed=true]').length`),1);
    assert.ok(await evaluate(`document.querySelector('.next-act-message h4').textContent.length>0`));
  }
  await evaluate(`document.querySelector('#past-tab').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.event-card').length`), 5);
  await evaluate(`document.querySelector('#past-tab').focus()`); await key('ArrowLeft');
  assert.equal(await evaluate(`document.activeElement.id`), 'upcoming-tab');
  assert.equal(await evaluate(`document.querySelectorAll('.spotlight').length`), 0);
  await evaluate(`document.querySelector('[data-filter="Music"]').click(); document.querySelector('.gallery-item').focus(); document.querySelector('.gallery-item').click()`);
  assert.equal(await evaluate(`document.querySelector('#lightbox').open`), true);
  const first = await evaluate(`document.querySelector('#lightbox-image').src`);
  await key('ArrowRight'); assert.notEqual(await evaluate(`document.querySelector('#lightbox-image').src`), first);
  const beforeSwipe = await evaluate(`document.querySelector('#lightbox-image').src`);
  const rect = await evaluate(`(()=>{const r=document.querySelector('#lightbox-image').getBoundingClientRect();return{x:r.left+r.width*.7,y:r.top+r.height*.5}})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x - 90, y: rect.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.notEqual(await evaluate(`document.querySelector('#lightbox-image').src`), beforeSwipe, 'Real touch swipe advances');
  await key('Escape'); assert.equal(await evaluate(`document.querySelector('#lightbox').open`), false);
  assert.equal(await evaluate(`document.activeElement.classList.contains('gallery-item')`), true);
  await evaluate(`document.querySelector('.menu-toggle').click()`); await key('Escape');
  assert.equal(await evaluate(`document.activeElement.className`), 'menu-toggle');
  await evaluate(`document.querySelector('.motion-toggle').click()`);
  assert.equal(await evaluate(`document.body.classList.contains('motion-paused')`), true);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`document.querySelector('#home').scrollIntoView({behavior:'instant'})`); await wait(150);
  assert.equal(await evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`), 0);
  assert.equal(await evaluate(`document.querySelector('.motion-toggle').disabled`), true);
  await evaluate(`document.querySelector('[data-filter="All"]').click()`);
  const images = await evaluate(`Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(async i=>{i.loading='eager';try{await i.decode();return null}catch{return i.src}}))`);
  assert.equal(images.filter(Boolean).length, 0, 'No broken images');
  console.log('PASS tabs, spotlight rerender, discipline tap/focus, gallery, arrows, touch swipe, Escape, focus return, mobile menu, motion toggle, reduced motion, images');
  console.log('Browser metrics (includes viewport resizing and scripted interaction):', await evaluate(`qualityMetrics`));
  assert.equal(errors.length, 0, `Console errors: ${errors.join('; ')}`);
  console.log('PASS no console errors');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await evaluate(`sessionStorage.setItem('vpa-motion','on');scrollTo({top:0,behavior:'instant'})`);
  await send('Page.reload'); await wait(1600);
  assert.equal(await evaluate(`document.querySelector('.hero h1 span').getAnimations().length`), 0, 'Intro does not replay');
  console.log('Settled reload metrics:', await evaluate(`qualityMetrics`));
  assert.ok(await evaluate(`qualityMetrics.shifts < .1`), 'No significant initial layout shift');
  assert.equal(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).length`), 0, 'All anchor destinations exist');
  await evaluate(`document.querySelector('.philosophy').scrollIntoView({behavior:'instant'})`); await wait(800); await shot('polish-philosophy');
  await evaluate(`sessionStorage.removeItem('vpa-intro');scrollTo({top:0,behavior:'instant'})`);
  await send('Page.reload'); await wait(150); await key('Tab');
  assert.equal(await evaluate(`document.querySelector('.hero h1 span').getAnimations().filter(a=>a.playState==='running').length`), 0, 'Keyboard skips entrance');
  console.log('PASS anchor routes, intro persistence, intro skip and layout stability');
} finally { ws.close(); }
