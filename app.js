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
const labels = {MUSIC:'Music',DANCE:'Dance','FINE ARTS':'Fine arts',EVENTS:'Events',GENERAL:'Events',TEAM:'Events'};
const artworks = (managed?.gallery || []).map(item => ({ title:item.title, category:labels[item.category] || item.category, src:item.media.url, srcset:item.media.srcset, alt:item.media.alt_text, caption:item.caption, wide:!!item.wide, featured:!!item.featured, position:item.focal_position, mediaId:item.media_id }));
if (managed) managed.artForms.forEach(form => form.gallery.forEach(photo => { if (!artworks.some(item=>item.mediaId===photo.id)) artworks.push({ title:photo.alt_text, category:labels[form.category], src:photo.url, srcset:photo.srcset, alt:photo.alt_text, caption:'VPA · '+labels[form.category], mediaId:photo.id }); }));
artworks.sort((a,b)=>Number(b.featured||false)-Number(a.featured||false));
let visibleArtworks = artworks;
let currentArtwork = 0;
const lightbox = document.querySelector('#lightbox');
function showArtwork(index) {
  if (!visibleArtworks.length) return;
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
  grid.innerHTML = visibleArtworks.length ? visibleArtworks.map((artwork, index) => `<button class="gallery-item${artwork.wide ? ' gallery-wide' : ''}" data-artwork="${index}" aria-label="View ${escapeHTML(artwork.title)}"><img src="${escapeHTML(artwork.src)}" alt="${escapeHTML(artwork.alt)}" style="object-position:${escapeHTML(artwork.position || 'center')}" loading="lazy" ${artwork.srcset ? `srcset="${escapeHTML(artwork.srcset)}" sizes="(max-width:700px) 88vw, 80vw"` : ''}><span>${artwork.category.toUpperCase()} / ${escapeHTML(artwork.title)}<b>↗</b></span></button>`).join('') : '<p class="empty-gallery">The moments are coming.<br>Official event photographs will appear here when supplied.</p>';
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
const members = managed?.team || [];
document.querySelector('#team-grid').innerHTML = members.map(({name,role,media,crop=''}) => `<article class="team-member"><div class="portrait ${crop==='portrait-screenshot'?'portrait-screenshot':''}"><img src="${escapeHTML(media.url)}" alt="${escapeHTML(name)}, ${escapeHTML(role)}" loading="lazy" decoding="async" width="400" height="500" ${media.srcset ? `srcset="${escapeHTML(media.srcset)}" sizes="(max-width:700px) 42vw, 28vw"` : ''}></div><h3>${escapeHTML(name)}</h3><p>${escapeHTML(role)}</p></article>`).join('');
function applyPhoto(selector, photo) { const image=document.querySelector(selector); if(!image||!photo)return;image.src=photo.url;image.alt=photo.alt_text;if(photo.srcset){image.srcset=photo.srcset;image.sizes='(max-width:700px) 85vw, 40vw';} }
if (managed) {
  applyPhoto('.art-piece-music img',managed.homepage.hero);
  applyPhoto('.art-piece-art img',managed.homepage.heroArt);
  document.querySelector('.art-piece-art').classList.toggle('student-landscape',managed.homepage.heroArt?.filename==='art4.jpeg');
  document.querySelector('.hero-description').textContent=managed.homepage.hero_description;
  managed.artForms.forEach((form,index)=>{const discipline=document.querySelectorAll('.discipline')[index];applyPhoto('.'+['music','dance','fine-art'][index]+' .discipline-image img',form.media);discipline.querySelector(':scope>p').textContent=form.description;if(form.featured_event){const link=document.createElement('a');link.className='event-gallery-link';link.href=eventURL(form.featured_event);link.textContent='Featured event: '+form.featured_event.title;document.querySelector('.art-forms').append(link);}});
  document.querySelector('.about-intro>div>p:not(.large-copy)').textContent=managed.content.about;
  document.querySelector('.vision-mission article:first-child p').textContent=managed.content.vision;
  const mission=document.querySelector('.vision-mission article:last-child');mission.querySelectorAll('p').forEach(p=>p.remove());managed.content.mission.split(/\n\n/).forEach(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;mission.append(p);});
  document.querySelectorAll('.social,.instagram-placeholder a').forEach(link=>link.href=managed.content.instagram);
  document.querySelector('.instagram-placeholder small').textContent='@'+new URL(managed.content.instagram).pathname.split('/').filter(Boolean)[0];
} else { document.querySelector('#event-list').textContent='Content is temporarily unavailable. Please reload to try again.'; }
const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('active', entry.isIntersecting)), { rootMargin: '-25% 0px -25% 0px', threshold: .7 });
document.querySelectorAll('.philosophy>div p').forEach(word => observer.observe(word));
