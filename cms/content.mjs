import { fail, now, id, insert, update, transaction } from './database.mjs';
export const categories = ['MUSIC', 'DANCE', 'FINE ARTS', 'GENERAL'];
export const mediaCategories = [...categories, 'EVENTS', 'TEAM'];
export const categoryLabel = value => ({ MUSIC: 'Music', DANCE: 'Dance', 'FINE ARTS': 'Fine arts', GENERAL: 'Events', EVENTS: 'Events', TEAM: 'Events' })[value] || value;
export const text = (value, max = 500, required = false) => { if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw fail(400, `Enter valid text${required ? ' in all required fields' : ''} (up to ${max} characters).`); return value.trim(); };
export function mediaExists(db, value, required = false) { if (!value && !required) return null; if (!db.prepare('SELECT id FROM media WHERE id=? AND deleted_at IS NULL').get(String(value))) throw fail(400, 'Choose an available photo from the media library.'); return value; }
function eventExists(db, value) { if (!value) return null; if (!db.prepare('SELECT id FROM events WHERE id=?').get(String(value))) throw fail(400, 'Choose an existing event.'); return value; }
export const slugify = title => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'event';
function date(value) { if (!value) return null; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value) throw fail(400, 'Enter a valid event date.'); return value; }
export function saveEvent(db, body, eventId) {
  const previous = eventId && db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
  if (eventId && !previous) throw fail(404, 'Event not found.');
  const title = text(body.title, 180, true);
  let slug = body.slug ? slugify(text(body.slug, 120)) : previous?.slug || slugify(title);
  if (body.slug && slug !== body.slug) throw fail(400, 'Use lowercase letters, numbers and hyphens for the page address.');
  if (!body.slug && !previous) { const base = slug; let suffix = 2; while (db.prepare('SELECT id FROM events WHERE slug=?').get(slug)) slug = `${base}-${suffix++}`; }
  const duplicate = db.prepare('SELECT id FROM events WHERE slug=?').get(slug);
  if (duplicate && duplicate.id !== eventId) throw fail(409, 'That page address is already used. Choose another.');
  if (!Array.isArray(body.categories) || !body.categories.length || body.categories.some(c => !categories.includes(c))) throw fail(400, 'Choose at least one valid category.');
  if (!['DRAFT', 'UPCOMING', 'COMPLETED', 'ARCHIVED'].includes(body.status)) throw fail(400, 'Choose a valid event status.');
  const start = date(body.date), end = date(body.end_date);
  if (start && end && end < start) throw fail(400, 'End date must follow the start date.');
  const time = text(body.time || '', 5); if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw fail(400, 'Use a valid time.');
  const published = body.published === true && !['DRAFT', 'ARCHIVED'].includes(body.status) ? 1 : 0;
  const record = { slug, title, short_description: text(body.short_description || '', 500), description: text(body.description || '', 15000), date: start, end_date: end, time, venue: text(body.venue || '', 300), categories: JSON.stringify([...new Set(body.categories)]), event_type: text(body.event_type || '', 150), poster_id: mediaExists(db, body.poster_id), cover_id: mediaExists(db, body.cover_id), status: body.status, published, featured: body.featured === true ? 1 : 0, updated_at: now(), published_at: published ? previous?.published_at || now() : previous?.published_at || null };
  if (previous) update(db, 'events', record, 'id', eventId);
  else { eventId = id(); insert(db, 'events', { id: eventId, ...record, design: '{}', created_at: now() }); }
  return eventId;
}
export function validateDocument(db, name, data) {
  if (!data || typeof data !== 'object') throw fail(400, 'Invalid content.');
  if (name === 'homepage') return { hero_media_id: mediaExists(db, data.hero_media_id, true), featured_event_id: eventExists(db, data.featured_event_id), hero_description: text(data.hero_description, 500, true) };
  if (name === 'art-forms') {
    if (!Array.isArray(data) || data.length !== 3) throw fail(400, 'Keep all three art forms.');
    return ['MUSIC', 'DANCE', 'FINE ARTS'].map(category => { const item = data.find(i => i.category === category); if (!item) throw fail(400, 'Keep all three art forms.'); return { category, media_id: mediaExists(db, item.media_id, true), description: text(item.description, 500, true), featured_event_id: eventExists(db, item.featured_event_id), gallery_media_ids: validateIds(item.gallery_media_ids || [], value => mediaExists(db, value, true)) }; });
  }
  if (name === 'team') {
    if (!Array.isArray(data) || !data.length || data.length > 30) throw fail(400, 'Enter between 1 and 30 team members.');
    return data.map((member, position) => ({ id: text(member.id || id(), 60, true), name: text(member.name, 120, true), role: text(member.role, 120, true), media_id: mediaExists(db, member.media_id, true), position, crop: member.crop === 'portrait-screenshot' ? member.crop : '' }));
  }
  if (name === 'content') {
    const instagram = text(data.instagram, 250, true);
    if (!/^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(instagram)) throw fail(400, 'Enter a valid Instagram profile link.');
    return { about: text(data.about, 2000, true), vision: text(data.vision, 3000, true), mission: text(data.mission, 4000, true), instagram };
  }
  throw fail(404, 'Content section not found.');
}
function validateIds(values, validate) { if (!Array.isArray(values) || values.length > 100) throw fail(400, 'Choose up to 100 photos.'); return [...new Set(values)].map(validate); }
export function referenceDocument(db, name, revision, data) {
  db.prepare('DELETE FROM document_media WHERE document_name=? AND revision=?').run(name, revision);
  db.prepare('DELETE FROM document_events WHERE document_name=? AND revision=?').run(name, revision);
  function walk(value, prefix = '') { if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value)) { const slot = `${prefix}.${key}`; if ((key === 'media_id' || key.endsWith('_media_id')) && child) insert(db, 'document_media', { document_name: name, revision, slot, media_id: child }); else if (key === 'gallery_media_ids') child.forEach((media_id, i) => insert(db, 'document_media', { document_name: name, revision, slot: `${slot}.${i}`, media_id })); else if (key.endsWith('_event_id') && child) insert(db, 'document_events', { document_name: name, revision, slot, event_id: child }); else walk(child, slot); } }
  walk(data);
}
export function saveDocument(db, name, data, publish) {
  const validated = validateDocument(db, name, data);
  transaction(db, () => {
    const old = db.prepare('SELECT * FROM documents WHERE name=?').get(name);
    if (!old) throw fail(404, 'Content section not found.');
    update(db, 'documents', { draft: JSON.stringify(validated), updated_at: now(), ...(publish ? { published: JSON.stringify(validated), published_at: now() } : {}) }, 'name', name);
    referenceDocument(db, name, 'draft', validated);
    if (publish) referenceDocument(db, name, 'published', validated);
  });
  return validated;
}
export function usages(db, mediaId) {
  return [
    ...db.prepare('SELECT title FROM events WHERE poster_id=? OR cover_id=?').all(mediaId, mediaId).map(row => `Event: ${row.title}`),
    ...db.prepare('SELECT title FROM gallery_items WHERE media_id=?').all(mediaId).map(row => `Gallery: ${row.title}`),
    ...db.prepare('SELECT document_name,revision,slot FROM document_media WHERE media_id=?').all(mediaId).map(row => `${row.document_name} (${row.revision}${row.slot})`)
  ];
}
export function mediaPublic(db, mediaId) {
  return !!(db.prepare("SELECT 1 FROM events WHERE published=1 AND status IN ('UPCOMING','COMPLETED') AND (poster_id=? OR cover_id=?)").get(mediaId, mediaId)
    || db.prepare("SELECT 1 FROM gallery_items g LEFT JOIN events e ON e.id=g.event_id WHERE g.media_id=? AND g.published=1 AND (g.event_id IS NULL OR (e.published=1 AND e.status IN ('UPCOMING','COMPLETED')))").get(mediaId)
    || db.prepare("SELECT 1 FROM document_media WHERE media_id=? AND revision='published'").get(mediaId));
}
export function mediaDTO(row) {
  if (!row) return null;
  const variants = JSON.parse(row.variants);
  const url = `/media/${row.id}?v=${encodeURIComponent(row.updated_at)}`;
  return { id: row.id, url, filename: row.filename, mime_type: row.mime_type, file_size: row.file_size, width: row.width, height: row.height, alt_text: row.alt_text, category: row.category, created_at: row.created_at, updated_at: row.updated_at, srcset: variants.small ? `${url}&size=small ${variants.smallWidth}w, ${url} ${row.width}w` : '' };
}
export function contentSnapshot(db, preview = false) {
  const media = new Map(db.prepare('SELECT * FROM media WHERE deleted_at IS NULL').all().map(row => [row.id, mediaDTO(row)]));
  const getMedia = value => media.get(value) || null;
  const documents = Object.fromEntries(db.prepare('SELECT * FROM documents').all().map(row => [row.name, JSON.parse(preview ? row.draft : row.published)]));
  const events = db.prepare(preview ? "SELECT * FROM events WHERE status!='ARCHIVED' ORDER BY created_at,id" : "SELECT * FROM events WHERE published=1 AND status IN ('UPCOMING','COMPLETED') ORDER BY created_at,id").all().map(row => ({ ...row, categories: JSON.parse(row.categories), design: JSON.parse(row.design), poster: getMedia(row.poster_id), cover: getMedia(row.cover_id) }));
  const eventIds = new Set(events.map(e => e.id));
  const gallery = db.prepare('SELECT * FROM gallery_items ORDER BY position,created_at,id').all().filter(row => (preview || row.published) && (!row.event_id || eventIds.has(row.event_id))).map(row => ({ ...row, media: getMedia(row.media_id) })).filter(row => row.media);
  const homepage = { ...documents.homepage, hero: getMedia(documents.homepage.hero_media_id) };
  const artForms = documents['art-forms'].map(row => ({ ...row, media: getMedia(row.media_id), gallery: row.gallery_media_ids.map(getMedia).filter(Boolean), featured_event: events.find(e => e.id === row.featured_event_id) || null }));
  const team = documents.team.map(row => ({ ...row, media: getMedia(row.media_id) }));
  return { events, gallery, homepage, artForms, team, content: documents.content };
}
