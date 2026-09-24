import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { insert, id, now, transaction } from './database.mjs';
import { referenceDocument, slugify } from './content.mjs';
export async function seed(db, root) {
  if (db.prepare("SELECT name FROM documents WHERE name='homepage'").get()) return;
  const original = JSON.parse(await readFile(new URL('./seed-content.json', import.meta.url), 'utf8'));
  const records = new Map();
  async function media(file, alt, category) {
    file = decodeURIComponent(file.replace(/^assets\//, ''));
    if (records.has(file)) return records.get(file).id;
    const source = path.join(root, 'assets', file), meta = await sharp(source).metadata();
    const record = { id: id(), source: 'asset', storage_key: file, filename: file, mime_type: meta.format === 'svg' ? 'image/svg+xml' : `image/${meta.format}`, file_size: (await stat(source)).size, width: meta.width, height: meta.height, alt_text: alt, category, variants: '{}', created_at: now(), updated_at: now(), deleted_at: null };
    records.set(file, record); return record.id;
  }
  const events = []; const eventMap = {};
  for (const [group, values] of Object.entries(original.events)) for (const [position, event] of values.entries()) {
    const eventId = id(); eventMap[event.title] = eventId;
    const categories = event.type.includes('MUSIC') ? ['MUSIC','DANCE'] : event.type.includes('FINE') ? ['FINE ARTS'] : ['GENERAL'];
    const date = event.title === 'EUPHORIA’26' ? '2026-09-25' : event.title.includes('Intra College') ? '2026-09-26' : event.title === 'EUPHONY’26' ? '2026-09-15' : null;
    events.push({ id: eventId, slug: slugify(event.title), title: event.title, short_description: event.detail, description: '', date, end_date: null, time: '', venue: event.title === 'EUPHONY’26' ? 'M S Auditorium' : '', categories: JSON.stringify(categories), event_type: event.type, poster_id: event.image ? await media(event.image, event.imageAlt, 'EVENTS') : null, cover_id: null, status: group === 'upcoming' ? 'UPCOMING' : 'COMPLETED', published: 1, featured: event.title === 'EUPHORIA’26' ? 1 : 0, design: JSON.stringify({ poster: event.poster || '', sub: event.sub || '', label: event.label, style: event.style }), created_at: `2026-09-22T00:00:0${position + (group === 'past' ? 3 : 0)}.000Z`, updated_at: now(), published_at: now() });
  }
  const gallery = [];
  for (const [position, photo] of original.gallery.entries()) {
    const category = photo.category.toUpperCase();
    gallery.push({ id: id(), media_id: await media(photo.src, photo.alt, category), event_id: photo.title.startsWith('Euphony') ? eventMap['EUPHONY’26'] : photo.title.startsWith('VPA inauguration') ? eventMap['VPA Club Inauguration'] : null, title: photo.title, caption: photo.caption || (photo.src.endsWith('.svg') ? 'Original artwork placeholder · club photography coming soon.' : photo.category === 'Events' ? 'Euphony’26 · Freshers SIP Culturals' : 'Music · Visual Performance and Arts Club'), category, position, wide: photo.wide ? 1 : 0, featured: 0, published: 1, focal_position: photo.position || 'center', created_at: now(), updated_at: now() });
  }
  const team = [];
  for (const [position, person] of original.team.entries()) team.push({ id: id(), name: person.name, role: person.role, media_id: await media(person.photo, `${person.name}, ${person.role}`, 'TEAM'), position, crop: person.crop || '' });
  const artForms = [];
  for (const [category, file, alt, description] of [['MUSIC','solodrummerjpeg.jpeg','Drummer performing under purple stage lights','Find your sound. Make it heard.'],['DANCE','dance.svg','Expressive pink ribbons tracing a dancing movement','Every movement tells a story.'],['FINE ARTS','art.svg','Layered coral, yellow and ink shapes with freehand lines','See differently. Create fearlessly.']]) artForms.push({ category, media_id: await media(file, alt, category), description, gallery_media_ids: [], featured_event_id: null });
  const homepage = { hero_media_id: await media('solosinger.jpeg','Singer performing on stage with a handheld microphone','MUSIC'), featured_event_id: eventMap['EUPHORIA’26'], hero_description: 'Different talents. Shared energy. One stage.\nWelcome to the Visual Performance & Arts Club.' };
  const content = { about: 'Founded in August 2026, VPA brings music, dance and fine arts together at Meenakshi Sundararajan Engineering College. A space to explore your expression, find your people, and create something together.', vision: 'To establish VPA as a distinguished platform for artistic excellence, creative innovation, and cultural expression, empowering students to transform their ideas and talents into impactful performances.', mission: 'To cultivate a dynamic and inclusive artistic ecosystem that enables students to discover, develop, and showcase their talents through visual and performing arts.\n\nVPA is committed to fostering creativity, confidence, discipline, collaboration, and innovation through structured learning, artistic exploration, and performance opportunities.', instagram: 'https://www.instagram.com/msec_vpa_club/' };
  transaction(db, () => {
    for (const record of records.values()) insert(db, 'media', record);
    events.forEach(record => insert(db, 'events', record)); gallery.forEach(record => insert(db, 'gallery_items', record));
    for (const [name, data] of Object.entries({ homepage, content, 'art-forms': artForms, team })) {
      insert(db, 'documents', { name, draft: JSON.stringify(data), published: JSON.stringify(data), updated_at: now(), published_at: now() });
      referenceDocument(db, name, 'draft', data); referenceDocument(db, name, 'published', data);
    }
  });
}
