/* Small, event-driven enhancements; no animation library or continuous render loop. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const running = new Set();
  const getPreference = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const setPreference = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* Private browsing fallback. */ } };
  let paused = getPreference('vpa-motion') === 'off';
  const canMove = () => !reduced.matches && !paused;
  const motionButton = document.createElement('button');
  motionButton.className = 'motion-toggle';
  document.querySelector('.footer').append(motionButton);
  function animate(element, frames, options) {
    if (!canMove() || !element?.animate) return null;
    const animation = element.animate(frames, { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)', ...options });
    running.add(animation);
    const clear = () => running.delete(animation);
    animation.addEventListener('finish', clear, { once: true });
    animation.addEventListener('cancel', clear, { once: true });
    return animation;
  }
  function syncMotion() {
    document.body.classList.toggle('motion-paused', !canMove());
    motionButton.textContent = reduced.matches ? 'Motion off · system preference' : paused ? 'Motion off · enable' : 'Motion on · pause';
    motionButton.setAttribute('aria-pressed', String(canMove()));
    motionButton.disabled = reduced.matches;
    if (!canMove()) {
      running.forEach(animation => animation.cancel());
      document.querySelectorAll('.art-piece,.hero h1,.button,.social').forEach(element => element.style.removeProperty('translate'));
      document.querySelectorAll('.philosophy>div p').forEach(element => element.style.removeProperty('--word-shift'));
      document.querySelectorAll('.stage-enter').forEach(element => element.classList.remove('stage-enter'));
    }
    scheduleScroll();
  }
  motionButton.addEventListener('click', () => { paused = !paused; setPreference('vpa-motion', paused ? 'off' : 'on'); syncMotion(); });
  reduced.addEventListener('change', syncMotion);

  // An interruptible first-visit entrance: no loader, overlay or delayed controls.
  const entrance = [];
  function openingPerformance() {
    if (!canMove() || getPreference('vpa-intro') || location.hash || scrollY > 30) return;
    setPreference('vpa-intro', 'seen');
    const play = (element, frames, options) => { const animation = animate(element, frames, options); if (animation) entrance.push(animation); };
    play(document.querySelector('.brand-logo'), [{ scale: '.9', opacity: .5 }, { scale: '1', opacity: 1 }], { duration: 450 });
    const words = document.querySelectorAll('.hero h1>span');
    play(words[0], [{ transform: 'scale(.94)', opacity: .3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 500 });
    play(words[1], [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }], { delay: 180, duration: 650, fill: 'backwards' });
    play(words[2], [{ transform: 'translateX(-15px)', opacity: .15 }, { transform: 'translateX(0)', opacity: 1 }], { delay: 420, duration: 650, fill: 'backwards' });
    document.querySelectorAll('.art-piece').forEach((piece, i) => play(piece, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }], { delay: 430 + i * 100, duration: 750, fill: 'backwards' }));
    const skip = () => { entrance.forEach(animation => animation.cancel()); ['pointerdown', 'wheel', 'keydown'].forEach(type => window.removeEventListener(type, skip)); };
    ['pointerdown', 'wheel', 'keydown'].forEach(type => window.addEventListener(type, skip, { passive: true }));
    setTimeout(skip, 1500);
  }

  const hero = document.querySelector('.hero');
  const layers = [...hero.querySelectorAll('.art-piece')];
  let pointerX = 0, pointerY = 0;
  let frame = 0;
  const visible = new Set();
  const philosophy = document.querySelector('.philosophy');
  function scheduleScroll() { if (!frame) frame = requestAnimationFrame(updateScroll); }
  function updateScroll() {
    frame = 0;
    if (!canMove() || document.hidden) return;
    if (visible.has(hero)) {
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
      layers.forEach((layer, i) => { const direction = i === 1 ? -1 : 1; layer.style.translate = `${pointerX * (3 + i * 2) + progress * direction * 9}px ${pointerY * (3 + i) - progress * (8 + i * 5)}px`; });
      hero.querySelector('h1').style.translate = `0 ${progress * -12}px`;
    }
    if (visible.has(philosophy)) {
      const words = philosophy.querySelectorAll(':scope>div p');
      words.forEach((word, index) => {
        const top = word.getBoundingClientRect().top;
        const progress = Math.max(0, Math.min(1, (innerHeight * .85 - top) / (innerHeight * .5)));
        word.style.setProperty('--word-shift', `${(1 - progress) * (index % 2 ? 14 : -14)}px`);
      });
    }
  }
  const scrollObserver = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)); scheduleScroll(); });
  scrollObserver.observe(hero); scrollObserver.observe(philosophy);
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  hero.addEventListener('pointermove', event => {
    if (!canMove() || !finePointer.matches || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
    scheduleScroll();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; scheduleScroll(); });

  // The original three links remain links. Separate buttons offer tap exploration.
  const disciplines = [...document.querySelectorAll('.discipline')];
  const artSection = document.querySelector('.art-forms');
  const controls = document.createElement('div');
  controls.className = 'discipline-controls';
  controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Explore each discipline');
  artSection.querySelector('h2').after(controls);
  const graphics = [
    '<svg viewBox="0 0 110 38" fill="none" stroke="currentColor" stroke-width="3"><line x1="8" y1="13" x2="8" y2="25"/><line x1="23" y1="6" x2="23" y2="32"/><line x1="38" y1="11" x2="38" y2="27"/><line x1="53" y1="2" x2="53" y2="36"/><line x1="68" y1="8" x2="68" y2="30"/><line x1="83" y1="12" x2="83" y2="26"/><line x1="98" y1="5" x2="98" y2="33"/></svg>',
    '<svg viewBox="0 0 110 38" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 28C25-30 47 65 70 15S98 12 108 4M3 36C25-22 47 73 70 23S98 20 108 12"/></svg>',
    '<svg viewBox="0 0 110 38" fill="none" stroke="currentColor" stroke-width="5"><path d="M4 30L98 6 19 31 105 18"/></svg>'
  ];
  function activate(index) {
    artSection.dataset.active = disciplines[index].dataset.galleryLink;
    disciplines.forEach((discipline, i) => discipline.classList.toggle('is-active', i === index));
    [...controls.children].forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
  }
  disciplines.forEach((discipline, index) => {
    const button = document.createElement('button');
    button.innerHTML = `<small>0${index + 1}</small>${discipline.dataset.galleryLink.toUpperCase()}`;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => activate(index));
    controls.append(button);
    const graphic = document.createElement('div'); graphic.className = 'discipline-art'; graphic.setAttribute('aria-hidden', 'true'); graphic.innerHTML = graphics[index];
    discipline.querySelector('.discipline-image').append(graphic);
    discipline.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') activate(index); });
    discipline.addEventListener('focus', () => activate(index));
  });
  activate(0);
  const disciplineObserver = new IntersectionObserver(entries => {
    if (finePointer.matches || artSection.contains(document.activeElement)) return;
    const candidate = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (candidate) activate(disciplines.indexOf(candidate.target));
  }, { threshold: .65 });
  disciplines.forEach(discipline => disciplineObserver.observe(discipline));

  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (canMove()) entry.target.classList.add('stage-enter');
    revealObserver.unobserve(entry.target);
  }), { threshold: .12 });
  document.querySelectorAll('.discipline-image,.team-member .portrait').forEach(image => revealObserver.observe(image));

  // Promote the existing featured event without replacing its content or poster.
  function spotlight() {
    const card = document.querySelector('#event-list .event-card');
    if (!card || card.classList.contains('spotlight') || document.querySelector('#upcoming-tab').getAttribute('aria-selected') !== 'true') return;
    card.classList.add('spotlight');
    const copy = document.createElement('div'); copy.className = 'spotlight-copy';
    const kicker = document.createElement('p'); kicker.className = 'eyebrow'; kicker.textContent = 'THE EVENT SPOTLIGHT / EUPHORIA’26'; copy.append(kicker);
    const title = card.querySelector('h3');
    const titleParts = title.textContent.split('’');
    if (titleParts.length === 2) { title.replaceChildren(document.createTextNode(titleParts[0]), document.createElement('br')); const year = document.createElement('em'); year.textContent = `’${titleParts[1]}`; title.append(year); }
    copy.append(title);
    const rule = document.createElement('div'); rule.className = 'spotlight-rule'; rule.setAttribute('aria-hidden', 'true'); copy.append(rule);
    copy.append(card.querySelector('.event-meta'), card.querySelector(':scope>p'));
    const link = document.createElement('a'); link.className = 'button'; link.href = card.querySelector('.event-image').href; link.target = '_blank'; link.rel = 'noopener'; link.setAttribute('aria-label', 'Explore Euphoria event poster (opens in a new tab)'); link.innerHTML = 'Explore event <span>↗</span>'; copy.append(link);
    const note = document.createElement('span'); note.className = 'spotlight-index'; note.textContent = 'PLAY. PERFORM. CONNECT.'; copy.append(note); card.append(copy);
    revealObserver.observe(card.querySelector('.event-image'));
  }
  document.addEventListener('vpa:events', spotlight); spotlight();

  const gallery = document.querySelector('#gallery-grid');
  document.addEventListener('vpa:gallery', () => animate(gallery, [{ opacity: .6, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250 }));
  const dialog = document.querySelector('#lightbox');
  const lightboxImage = document.querySelector('#lightbox-image');
  gallery.addEventListener('click', event => {
    const source = event.target.closest('.gallery-item');
    if (!source || !dialog.open || !canMove()) return;
    const from = source.getBoundingClientRect(), to = lightboxImage.getBoundingClientRect();
    const dx = Math.max(-180, Math.min(180, from.left + from.width / 2 - to.left - to.width / 2));
    const dy = Math.max(-140, Math.min(140, from.top + from.height / 2 - to.top - to.height / 2));
    animate(lightboxImage, [{ transform: `translate(${dx}px,${dy}px) scale(.8)`, opacity: .35 }, { transform: 'none', opacity: 1 }], { duration: 320 });
  });
  document.addEventListener('vpa:photo', () => { if (dialog.open) animate(lightboxImage, [{ opacity: .35, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200 }); });
  let swipeStart = null;
  lightboxImage.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId }; });
  lightboxImage.addEventListener('pointerup', event => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y; swipeStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) document.querySelector(dx < 0 ? '#next-image' : '#previous-image').click();
  });
  lightboxImage.addEventListener('pointercancel', () => { swipeStart = null; });
  dialog.addEventListener('close', () => { swipeStart = null; });

  const finaleObserver = new IntersectionObserver(entries => entries.forEach(entry => philosophy.classList.toggle('is-resolved', entry.isIntersecting)), { threshold: .7 });
  finaleObserver.observe(document.querySelector('.philosophy-slogan'));
  // Only two small magnetic targets; native pointer and target hit areas remain.
  document.querySelectorAll('.hero .button,.header .social').forEach(target => {
    target.addEventListener('pointermove', event => {
      if (!canMove() || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = target.getBoundingClientRect();
      target.style.translate = `${Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) * .05))}px ${Math.max(-3, Math.min(3, (event.clientY - rect.top - rect.height / 2) * .1))}px`;
    }, { passive: true });
    target.addEventListener('pointerleave', () => target.style.removeProperty('translate'));
    target.addEventListener('blur', () => target.style.removeProperty('translate'));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) running.forEach(animation => animation.cancel()); else scheduleScroll(); });
  syncMotion(); openingPerformance();
})();
