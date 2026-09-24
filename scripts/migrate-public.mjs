import { readFile, writeFile } from 'node:fs/promises';
let source = await readFile('app.js', 'utf8');
const start = source.indexOf('const eventData ='), end = source.indexOf('function renderEvents', start);
const replacement = `const managed = window.VPA_CONTENT;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const previewMode = location.pathname.startsWith('/admin/preview');
function eventURL(event) { return previewMode ? '/admin/preview/events/' + event.id : '/events/' + event.slug; }
const eventData = { upcoming: [], past: [] };
if (managed) managed.events.forEach(event => {
  const image = event.poster || event.cover;
  const mapped = { ...event.design, id: event.id, slug: event.slug, title: event.title, image: image?.url, imageAlt: image?.alt_text, width: image?.width, height: image?.height, srcset: image?.srcset, type: event.event_type || event.categories.join(' + '), detail: event.short_description, featured: event.id === managed.homepage.featured_event_id || !!event.featured, gallery: managed.gallery.some(photo => photo.event_id === event.id) };
  eventData[event.status === 'COMPLETED' ? 'past' : 'upcoming'].push(mapped);
});
eventData.upcoming.sort((a,b) => Number(b.featured) - Number(a.featured));
`;
source = source.slice(0,start) + replacement + source.slice(end);
const renderStart = source.indexOf("  document.querySelector('#event-list').innerHTML =");
const renderEnd = source.indexOf("  document.querySelector('#event-list').setAttribute", renderStart);
source = source.slice(0,renderStart) + `  document.querySelector('#event-list').innerHTML = eventData[category].map(event => \`<article class="event-card" data-featured="\${event.featured ? 'true' : 'false'}" data-event-url="\${escapeHTML(eventURL(event))}">\${event.image ? \`<a class="event-image" href="\${escapeHTML(eventURL(event))}" aria-label="Explore \${escapeHTML(event.title)}"><img src="\${escapeHTML(event.image)}" alt="\${escapeHTML(event.imageAlt)}" width="\${event.width}" height="\${event.height}" \${event.srcset ? \`srcset="\${escapeHTML(event.srcset)}" sizes="(max-width:700px) 88vw, 45vw"\` : ''} loading="lazy" decoding="async"><span>EXPLORE EVENT ↗</span></a>\` : \`<div class="event-poster \${event.style === 'workshop' ? 'workshop' : ''}"><span class="eyebrow">\${escapeHTML(event.label || event.type)}</span><span class="poster-star" aria-hidden="true">✳</span><p class="poster-title">\${escapeHTML(event.poster || event.title)}<em>\${escapeHTML(event.sub || '')}</em></p><span class="eyebrow">\${category === 'upcoming' ? 'COMING UP' : 'PAST EVENT'}</span></div>\`}<div class="event-meta"><span>\${escapeHTML(event.type)}</span><span>\${category === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}</span></div><h3><a href="\${escapeHTML(eventURL(event))}">\${escapeHTML(event.title)}</a></h3><p>\${escapeHTML(event.detail)}</p></article>\`).join('') || '<p class="empty-gallery">No events to show yet. Check back for the next announcement.</p>';
` + source.slice(renderEnd);
const sizesStart = source.indexOf('  // Reserve each supplied poster'), sizesEnd = source.indexOf("  if (category === 'past')", sizesStart);
source = source.slice(0,sizesStart) + source.slice(sizesEnd);
await writeFile('app.js',source);
let html = await readFile('index.html','utf8');
html = html.replace('<script src="app.js" defer>', '<script src="/content-data.js" defer></script><script src="/app.js" defer>').replace('href="styles.css"','href="/styles.css"').replace('href="experience.css"','href="/experience.css"').replace('src="experience.js"','src="/experience.js"').replaceAll('src="assets/','src="/assets/');
await writeFile('index.html',html);
console.log('Event data source migrated.');
