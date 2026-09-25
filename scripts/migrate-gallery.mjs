import { readFile, writeFile } from 'node:fs/promises';
let source=await readFile('app.js','utf8');
const start=source.indexOf('const artworks ='),end=source.indexOf('let visibleArtworks',start);
source=source.slice(0,start)+`const labels = {MUSIC:'Music',DANCE:'Dance','FINE ARTS':'Fine arts',EVENTS:'Events',GENERAL:'Events',TEAM:'Events'};
const artworks = (managed?.gallery || []).map(item => ({ title:item.title, category:labels[item.category] || item.category, src:item.media.url, srcset:item.media.srcset, alt:item.media.alt_text, caption:item.caption, wide:!!item.wide, featured:!!item.featured, position:item.focal_position, mediaId:item.media_id }));
if (managed) managed.artForms.forEach(form => form.gallery.forEach(photo => { if (!artworks.some(item=>item.mediaId===photo.id)) artworks.push({ title:photo.alt_text, category:labels[form.category], src:photo.url, srcset:photo.srcset, alt:photo.alt_text, caption:'VPA · '+labels[form.category], mediaId:photo.id }); }));
artworks.sort((a,b)=>Number(b.featured||false)-Number(a.featured||false));
`+source.slice(end);
source=source.replace("  currentArtwork = (index + visibleArtworks.length)","  if (!visibleArtworks.length) return;\n  currentArtwork = (index + visibleArtworks.length)");
source=source.replaceAll('${artwork.title}','${escapeHTML(artwork.title)}').replaceAll('${artwork.src}','${escapeHTML(artwork.src)}').replaceAll('${artwork.alt}','${escapeHTML(artwork.alt)}').replaceAll("${artwork.position || 'center'}","${escapeHTML(artwork.position || 'center')}");
source=source.replace('loading="lazy"><span>${artwork.category', 'loading="lazy" ${artwork.srcset ? `srcset="${escapeHTML(artwork.srcset)}" sizes="(max-width:700px) 88vw, 80vw"` : \'\'}><span>${artwork.category');
const teamStart=source.indexOf('const members ='),teamEnd=source.indexOf('const observer =',teamStart);
source=source.slice(0,teamStart)+`const members = managed?.team || [];
document.querySelector('#team-grid').innerHTML = members.map(({name,role,media,crop=''}) => \`<article class="team-member"><div class="portrait \${crop==='portrait-screenshot'?'portrait-screenshot':''}"><img src="\${escapeHTML(media.url)}" alt="\${escapeHTML(name)}, \${escapeHTML(role)}" loading="lazy" decoding="async" width="400" height="500" \${media.srcset ? \`srcset="\${escapeHTML(media.srcset)}" sizes="(max-width:700px) 42vw, 28vw"\` : ''}></div><h3>\${escapeHTML(name)}</h3><p>\${escapeHTML(role)}</p></article>\`).join('');
function applyPhoto(selector, photo) { const image=document.querySelector(selector); if(!image||!photo)return;image.src=photo.url;image.alt=photo.alt_text;if(photo.srcset){image.srcset=photo.srcset;image.sizes='(max-width:700px) 85vw, 40vw';} }
if (managed) {
  applyPhoto('.art-piece-music img',managed.homepage.hero);
  applyPhoto('.art-piece-art img',managed.homepage.heroArt);
  document.querySelector('.art-piece-art').classList.toggle('student-landscape',managed.homepage.heroArt?.filename==='art4.jpeg');
  document.querySelector('.hero-description').textContent=managed.homepage.hero_description;
  managed.artForms.forEach((form,index)=>{const discipline=document.querySelectorAll('.discipline')[index];applyPhoto('.'+['music','dance','fine-art'][index]+' .discipline-image img',form.media);discipline.querySelector(':scope>p').textContent=form.description;if(form.featured_event){const link=document.createElement('a');link.className='event-gallery-link';link.href=eventURL(form.featured_event);link.textContent='Featured event: '+form.featured_event.title;discipline.after(link);}});
  document.querySelector('.about-intro>div>p:not(.large-copy)').textContent=managed.content.about;
  document.querySelector('.vision-mission article:first-child p').textContent=managed.content.vision;
  const mission=document.querySelector('.vision-mission article:last-child');mission.querySelectorAll('p').forEach(p=>p.remove());managed.content.mission.split(/\\n\\n/).forEach(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;mission.append(p);});
  document.querySelectorAll('.social,.instagram-placeholder a').forEach(link=>link.href=managed.content.instagram);
  document.querySelector('.instagram-placeholder small').textContent='@'+new URL(managed.content.instagram).pathname.split('/').filter(Boolean)[0];
} else { document.querySelector('#event-list').textContent='Content is temporarily unavailable. Please reload to try again.'; }
`+source.slice(teamEnd);
await writeFile('app.js',source);
