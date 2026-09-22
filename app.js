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
const eventData = {
  upcoming: [
    { title: "EUPHORIA’26", image: 'assets/euphoria.jpeg', imageAlt: 'Euphoria 2026 official poster: 25 September 2026, with technical and cultural events at Meenakshi Sundararajan Engineering College', type: 'MUSIC + DANCE', detail: '25 September 2026 · Internal and external.', label: 'THE STAGE IS CALLING', style: '' },
    { title: "EUPHORIA’26 — Intra College", image: 'assets/eupdoria%20intra.jpeg', imageAlt: 'Euphoria 2026 intra-college cultural fest poster: 26 September 2026, featuring dance, vocal and instrumental events', type: 'MUSIC + DANCE / INTRA COLLEGE', detail: '26 September 2026 · Intra-college cultural fest · Dance, vocal and instrumental.', label: 'SAME CAMPUS / SAME SPIRIT', style: '' },
    { title: 'Creative workshops', poster: 'Learn. Make.', sub: 'Repeat.', type: 'ART / SOUND / DANCE', detail: 'Art workshops · Sound engineering workshops · Dance workshops', label: 'EXPLORE SOMETHING NEW', style: 'workshop' }
  ],
  past: [
    { title: 'VPA Club Inauguration', image: 'assets/VPA_inaugration.jpg', imageAlt: 'Group photograph on stage at the VPA Club Inauguration', type: 'GENERAL', detail: 'A moment from the VPA Club Inauguration · Date not supplied.', label: 'VPA / CLUB INAUGURATION', style: 'workshop' },
    { title: "EUPHONY’26", poster: 'Euphony', sub: '’26', type: 'CULTURALS', detail: 'Freshers SIP Culturals · Event photographs to be added.', label: 'FRESHERS SIP CULTURALS', style: '' },
    { title: 'SKETCHORA', poster: 'Sketch', sub: 'your world.', type: 'FINE ARTS', detail: "Part of Euphoria’26 · Event photographs to be added.", label: 'SKETCHORA / FINE ARTS', style: 'workshop' }
  ]
};
function renderEvents(category) {
  document.querySelector('#event-list').innerHTML = eventData[category].map(event => `<article class="event-card">${event.image ? `<a class="event-image" href="${event.image}" target="_blank" rel="noopener" aria-label="View ${event.title} image at full size (opens in a new tab)"><img src="${event.image}" alt="${event.imageAlt}" loading="lazy" decoding="async"><span>VIEW FULL IMAGE ↗</span></a>` : `<div class="event-poster ${event.style}"><span class="eyebrow">${event.label}</span><span class="poster-star" aria-hidden="true">✳</span><p class="poster-title">${event.poster}<em>${event.sub}</em></p><span class="eyebrow">${category === 'upcoming' ? 'COMING UP / DATE TO BE ANNOUNCED' : 'PAST EVENT / DATE NOT SUPPLIED'}</span></div>`}<div class="event-meta"><span>${event.type}</span><span>${category === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}</span></div><h3>${event.title}</h3><p>${event.detail}</p></article>`).join('');
  document.querySelector('#event-list').setAttribute('aria-labelledby', `${category}-tab`);
  document.querySelectorAll('[data-event-tab]').forEach(button => { const selected = button.dataset.eventTab === category; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
}
document.querySelectorAll('[data-event-tab]').forEach(button => {
  button.addEventListener('click', () => renderEvents(button.dataset.eventTab));
  button.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const category = event.key === 'Home' ? 'upcoming' : event.key === 'End' ? 'past' : button.dataset.eventTab === 'upcoming' ? 'past' : 'upcoming'; renderEvents(category); document.querySelector(`#${category}-tab`).focus(); } });
});
renderEvents('upcoming');
const artworks = [
  { title: 'Resonance', category: 'Music', src: 'assets/music.svg', alt: 'Golden vinyl record encircled by cyan sound waves on deep navy' },
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
  document.querySelector('#previous-image').hidden = visibleArtworks.length < 2;
  document.querySelector('#next-image').hidden = visibleArtworks.length < 2;
}
function filterGallery(category) {
  visibleArtworks = category === 'All' ? artworks : artworks.filter(artwork => artwork.category === category);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  const grid = document.querySelector('#gallery-grid');
  grid.innerHTML = visibleArtworks.length ? visibleArtworks.map((artwork, index) => `<button class="gallery-item" data-artwork="${index}" aria-label="View ${artwork.title}"><img src="${artwork.src}" alt="${artwork.alt}" loading="lazy"><span>${artwork.category.toUpperCase()} / ${artwork.title}<b>↗</b></span></button>`).join('') : '<p class="empty-gallery">The moments are coming.<br>Official event photographs will appear here when supplied.</p>';
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
