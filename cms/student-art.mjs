import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { insert, update, now, id, transaction } from './database.mjs';
import { referenceDocument } from './content.mjs';
// One-time authored content update: student artworks and corrected Treasurer name.
export async function addStudentArt(db, root) {
  if (db.prepare('SELECT version FROM migrations WHERE version=2').get()) return;
  const entries = [
    ['art1.jpeg','Student artwork 1','Blue portrait with a crown of sunflowers and green leaves'],
    ['art2.jpeg','Student artwork 2','Orange goldfish leaping out of a glass bowl against a dark background'],
    ['art3.jpeg','Student artwork 3','Tree silhouette surrounded by colourful patterned shapes'],
    ['art4.jpeg','Student artwork 4','Painted autumn landscape with a church, trees and blue river']
  ];
  const photos = [];
  for (const [filename,title,alt] of entries) { const file = path.join(root,'assets',filename), meta = await sharp(file).metadata(); photos.push({ id:id(), title, record:{ storage_key:filename,source:'asset',filename,mime_type:'image/jpeg',file_size:(await stat(file)).size,width:meta.width,height:meta.height,alt_text:alt,category:'FINE ARTS',variants:'{}',created_at:now(),updated_at:now(),deleted_at:null } }); }
  transaction(db,()=>{
    photos.forEach(photo=>insert(db,'media',{id:photo.id,...photo.record}));
    db.prepare("DELETE FROM gallery_items WHERE media_id IN (SELECT id FROM media WHERE storage_key='art.svg')").run();
    let position=db.prepare('SELECT coalesce(max(position),0)+1 AS n FROM gallery_items').get().n;
    for(const photo of photos.slice(0,3))insert(db,'gallery_items',{id:id(),media_id:photo.id,event_id:null,title:photo.title,caption:'Student artwork · VPA Fine Arts',category:'FINE ARTS',position:position++,wide:0,featured:0,published:1,focal_position:'center',created_at:now(),updated_at:now()});
    for(const name of ['homepage','art-forms','team']) {
      const row=db.prepare('SELECT * FROM documents WHERE name=?').get(name);
      const changes={};
      for(const revision of ['draft','published']) { const data=JSON.parse(row[revision]); if(name==='homepage')data.hero_art_media_id=photos[3].id; if(name==='art-forms'){const art=data.find(item=>item.category==='FINE ARTS');art.media_id=photos[0].id;} if(name==='team')data.forEach(member=>{if(member.name==='Nikitha')member.name='Nekitha';});changes[revision]=JSON.stringify(data);referenceDocument(db,name,revision,data); }
      update(db,'documents',{...changes,updated_at:now()},'name',name);
    }
    db.prepare("UPDATE media SET alt_text=replace(alt_text,'Nikitha','Nekitha') WHERE filename='nekitha.jpeg'").run();
    insert(db,'migrations',{version:2,applied_at:now()});
  });
}
