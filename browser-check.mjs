import { writeFile } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); } });
function send(method, params = {}) { return new Promise(resolve => { const key = ++id; pending.set(key, resolve); ws.send(JSON.stringify({ id: key, method, params })); }); }
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: 'http://127.0.0.1:5173' });
await new Promise(resolve => setTimeout(resolve, 1200));
for (const width of [390, 768, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
  await new Promise(resolve => setTimeout(resolve, 150));
  console.log('Layout', width, await evaluate('({ viewport: innerWidth, content: document.documentElement.scrollWidth, menu: getComputedStyle(document.querySelector(".menu-toggle")).display })'));
  if (width === 390 || width === 1440) { const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${width === 390 ? 'mobile' : 'desktop'}-check.png`, Buffer.from(shot.data, 'base64')); }
}
console.log('Interactions', await evaluate(`(() => {
  document.querySelector('#past-tab').click();
  const past = document.querySelectorAll('.event-card').length === 3;
  document.querySelector('[data-filter="Events"]').click();
  const empty = !!document.querySelector('.empty-gallery');
  document.querySelector('[data-filter="Music"]').click();
  const filter = document.querySelectorAll('.gallery-item').length === 1;
  document.querySelector('.gallery-item').click();
  const dialog = document.querySelector('#lightbox').open;
  document.querySelector('.dialog-close').click();
  return { past, empty, filter, dialog, closed: !document.querySelector('#lightbox').open };
})()`));
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
console.log('Mobile menu', await evaluate(`(() => { document.querySelector('.menu-toggle').click(); const open = document.querySelector('#navigation').classList.contains('open'); document.querySelector('#navigation a').click(); return { open, closed: !document.querySelector('#navigation').classList.contains('open') }; })()`));
ws.close();
