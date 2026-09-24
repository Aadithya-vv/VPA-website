// One-time import of the existing authored content. Never run against managed app.js.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile('app.js', 'utf8');
function extract(start, end, name) { const block = source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); return vm.runInNewContext(`${block}\n${name}`, {}, { timeout: 1000 }); }
const events = extract('const eventData =', 'function renderEvents', 'eventData');
const gallery = extract('const artworks =', 'let visibleArtworks', 'artworks');
const team = extract('const members =', "document.querySelector('#team-grid')", 'members');
await mkdir('cms', { recursive: true });
await writeFile('cms/seed-content.json', JSON.stringify({ events, gallery, team }, null, 2), { flag: 'wx' });
console.log('Captured original website content.');
