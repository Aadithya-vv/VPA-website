const menu = document.querySelector('.menu-toggle'), nav = document.querySelector('#navigation');
function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); document.body.classList.remove('locked'); }
menu.addEventListener('click', () => { const open = !nav.classList.contains('open'); nav.classList.toggle('open',open); menu.setAttribute('aria-expanded',String(open)); document.body.classList.toggle('locked',open); });
nav.addEventListener('click', closeMenu);
const modal = document.querySelector('#event-lightbox');
const photos = [...document.querySelectorAll('.event-photo')]; let selected = 0;
function display(index) { selected = (index + photos.length) % photos.length; const photo = photos[selected]; modal.querySelector('img').src = photo.dataset.src; modal.querySelector('img').alt = photo.dataset.alt; }
photos.forEach((photo,index) => photo.addEventListener('click', () => { display(index); modal.showModal(); document.body.classList.add('locked'); }));
modal.querySelector('.dialog-close').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => document.body.classList.remove('locked'));
document.querySelector('#photo-prev').addEventListener('click', () => display(selected-1)); document.querySelector('#photo-next').addEventListener('click', () => display(selected+1));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } if (modal.open && event.key === 'ArrowLeft') display(selected-1); if (modal.open && event.key === 'ArrowRight') display(selected+1); });
