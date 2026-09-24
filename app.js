const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() { nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); document.body.classList.remove('locked'); }
menuButton.addEventListener('click', () => { const open = !nav.classList.contains('open'); nav.classList.toggle('open', open); menuButton.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('locked', open); });
nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => {
  if (!nav.classList.contains('open')) return;
  if (event.key === 'Escape') { closeMenu(); menuButton.focus(); }
  if (event.key === 'Tab') {
    const items = [...nav.querySelectorAll('a'), document.querySelector('.social'), menuButton];
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
matchMedia('(min-width: 701px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });
const managed = window.VPA_CONTENT;
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
function renderEvents(category) {
  document.querySelector('#event-list').innerHTML = eventData[category].map(event => `<article class="event-card" data-featured="${event.featured ? 'true' : 'false'}" data-event-url="${escapeHTML(eventURL(event))}">${event.image ? `<a class="event-image" href="${escapeHTML(eventURL(event))}" aria-label="Explore ${escapeHTML(event.title)}"><img src="${escapeHTML(event.image)}" alt="${escapeHTML(event.imageAlt)}" width="${event.width}" height="${event.height}" ${event.srcset ? `srcset="${escapeHTML(event.srcset)}" sizes="(max-width:700px) 88vw, 45vw"` : ''} loading="lazy" decoding="async"><span>EXPLORE EVENT ↗</span></a>` : `<div class="event-poster ${event.style === 'workshop' ? 'workshop' : ''}"><span class="eyebrow">${escapeHTML(event.label || event.type)}</span><span class="poster-star" aria-hidden="true">✳</span><p class="poster-title">${escapeHTML(event.poster || event.title)}<em>${escapeHTML(event.sub || '')}</em></p><span class="eyebrow">${category === 'upcoming' ? 'COMING UP' : 'PAST EVENT'}</span></div>`}<div class="event-meta"><span>${escapeHTML(event.type)}</span><span>${category === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}</span></div><h3><a href="${escapeHTML(eventURL(event))}">${escapeHTML(event.title)}</a></h3><p>${escapeHTML(event.detail)}</p></article>`).join('') || '<p class="empty-gallery">No events to show yet. Check back for the next announcement.</p>';
  document.querySelector('#event-list').setAttribute('aria-labelledby', `${category}-tab`);
  if (category === 'past') {
    const cards = document.querySelectorAll('.event-card');
    eventData.past.forEach((event, index) => {
      if (!event.gallery) return;
      const link = document.createElement('a');
      link.className = 'event-gallery-link';
      link.href = '#gallery';
      link.textContent = `Explore ${event.title} photos ↗`;
      link.addEventListener('click', () => filterGallery('Events'));
      cards[index].append(link);
    });
  }
  document.querySelectorAll('[data-event-tab]').forEach(button => { const selected = button.dataset.eventTab === category; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  document.dispatchEvent(new CustomEvent('vpa:events', { detail: category }));
}
document.querySelectorAll('[data-event-tab]').forEach(button => {
  button.addEventListener('click', () => renderEvents(button.dataset.eventTab));
  button.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const category = event.key === 'Home' ? 'upcoming' : event.key === 'End' ? 'past' : button.dataset.eventTab === 'upcoming' ? 'past' : 'upcoming'; renderEvents(category); document.querySelector(`#${category}-tab`).focus(); } });
});
renderEvents('upcoming');
const artworks = [
  { title: 'Behind the beat', category: 'Music', src: 'assets/solodrummerjpeg.jpeg', alt: 'Solo drummer playing a drum kit under purple stage lighting', position: 'center 85%' },
  { title: 'A voice on stage', category: 'Music', src: 'assets/solosinger.jpeg', alt: 'Singer in coral performing with a handheld microphone' },
  { title: 'At the keys', category: 'Music', src: 'assets/solokeyboard.jpeg', alt: 'Keyboard player performing on stage' },
  { title: 'Euphony — together on stage', category: 'Events', src: 'assets/euhpony1.jpeg', alt: 'Euphony ensemble with singer, keyboard, drums, cajon and flute', wide: true },
  { title: 'Euphony — in rhythm', category: 'Events', src: 'assets/eudphony2.jpeg', alt: 'Euphony musicians performing under blue and purple stage lights', wide: true },
  { title: 'Euphony — the invitation', category: 'Events', src: 'assets/euhpony3.jpeg', alt: 'Official Euphony student induction programme poster for 15 September 2026', wide: true },
  { title: 'VPA inauguration — on stage together', category: 'Events', src: 'assets/euphonystaff.jpg', alt: 'Group photograph on stage during the VPA Club inauguration day', caption: 'VPA Club Inauguration · Inauguration day', wide: true },
  { title: 'In motion', category: 'Dance', src: 'assets/dance.svg', alt: 'Sweeping magenta ribbons and a gold circle on plum' },
  { title: 'Outside the lines', category: 'Fine arts', src: 'assets/art.svg', alt: 'Expressive coral, gold and ink colour blocks with curved cream lines' }
];
let visibleArtworks = artworks;
let currentArtwork = 0;
const lightbox = document.querySelector('#lightbox');
function showArtwork(index) {
  currentArtwork = (index + visibleArtworks.length) % visibleArtworks.length;
  const artwork = visibleArtworks[currentArtwork];
  document.querySelector('#lightbox-image').src = artwork.src;
  document.querySelector('#lightbox-image').alt = artwork.alt;
  document.querySelector('#lightbox-title').textContent = artwork.title;
  document.querySelector('.lightbox-info .eyebrow').textContent = artwork.src.endsWith('.svg') ? 'VPA / VISUAL STUDIES' : 'VPA / ON STAGE';
  document.querySelector('.lightbox-info p:last-child').textContent = artwork.caption || (artwork.src.endsWith('.svg') ? 'Original artwork placeholder · club photography coming soon.' : artwork.category === 'Events' ? 'Euphony’26 · Freshers SIP Culturals' : 'Music · Visual Performance and Arts Club');
  document.querySelector('#previous-image').hidden = visibleArtworks.length < 2;
  document.querySelector('#next-image').hidden = visibleArtworks.length < 2;
  document.dispatchEvent(new Event('vpa:photo'));
}
function filterGallery(category) {
  visibleArtworks = category === 'All' ? artworks : artworks.filter(artwork => artwork.category === category);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  const grid = document.querySelector('#gallery-grid');
  grid.innerHTML = visibleArtworks.length ? visibleArtworks.map((artwork, index) => `<button class="gallery-item${artwork.wide ? ' gallery-wide' : ''}" data-artwork="${index}" aria-label="View ${artwork.title}"><img src="${artwork.src}" alt="${artwork.alt}" style="object-position:${artwork.position || 'center'}" loading="lazy"><span>${artwork.category.toUpperCase()} / ${artwork.title}<b>↗</b></span></button>`).join('') : '<p class="empty-gallery">The moments are coming.<br>Official event photographs will appear here when supplied.</p>';
  document.dispatchEvent(new Event('vpa:gallery'));
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => filterGallery(button.dataset.filter)));
document.querySelectorAll('[data-gallery-link]').forEach(link => link.addEventListener('click', () => filterGallery(link.dataset.galleryLink)));
document.querySelector('#gallery-grid').addEventListener('click', event => { const button = event.target.closest('[data-artwork]'); if (!button) return; showArtwork(Number(button.dataset.artwork)); lightbox.showModal(); document.body.classList.add('locked'); });
document.querySelector('.dialog-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('close', () => document.body.classList.remove('locked'));
lightbox.addEventListener('click', event => { if (event.target === lightbox) { const bounds = lightbox.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close(); } });
document.querySelector('#previous-image').addEventListener('click', () => showArtwork(currentArtwork - 1));
document.querySelector('#next-image').addEventListener('click', () => showArtwork(currentArtwork + 1));
lightbox.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') showArtwork(currentArtwork - 1); if (event.key === 'ArrowRight') showArtwork(currentArtwork + 1); });
filterGallery('All');
const members = [
  { name: 'Madeshwaran G', role: 'President', photo: 'madhesh.png' },
  { name: 'Kavinnilavu B', role: 'Vice President', photo: 'kavinnilavu.png' },
  { name: 'Sudha Bharathi', role: 'Secretary', photo: 'Sudha Bharathi.jpeg', crop: 'portrait-screenshot' },
  { name: 'Tarun C', role: 'Joint Secretary', photo: 'tarun.jpeg' },
  { name: 'Nikitha', role: 'Treasurer', photo: 'nekitha.jpeg' },
  { name: 'Shrreya', role: 'Joint Treasurer', photo: 'Shreya.png' }
];
document.querySelector('#team-grid').innerHTML = members.map(({ name, role, photo, crop = '' }) => `<article class="team-member"><div class="portrait ${crop}"><img src="assets/${encodeURIComponent(photo)}" alt="${name}, ${role}" loading="lazy" decoding="async" width="400" height="500"></div><h3>${name}</h3><p>${role}</p></article>`).join('');
const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('active', entry.isIntersecting)), { rootMargin: '-25% 0px -25% 0px', threshold: .7 });
document.querySelectorAll('.philosophy>div p').forEach(word => observer.observe(word));
