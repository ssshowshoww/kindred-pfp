
// Slide-over sticker panel + base auto-cover + fixed frame + circular export
const CANVAS_SIZE = 500;
const CENTER = 250;
const RADIUS = 240;
const DIAM = RADIUS * 2;
const BLEED = 1.02;

const canvas = new fabric.Canvas('pfp', {
  backgroundColor: 'transparent',
  selection: true,
  preserveObjectStacking: true,
});

let baseGroup, stickerGroup, frameImg, baseLocked=false;

function setup() {
  baseGroup = new fabric.Group([], { selectable:false, evented:false, name:'BASE_GROUP', originX:'center', originY:'center', left:CENTER, top:CENTER });
  canvas.add(baseGroup);
  stickerGroup = new fabric.Group([], { selectable:false, evented:false, name:'STICKER_GROUP', originX:'center', originY:'center', left:CENTER, top:CENTER });
  canvas.add(stickerGroup);

  // Fixed frame on top
  fabric.Image.fromURL('ring.png?v=1', img => {
    img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, selectable:false, evented:false, name:'RING_FRAME', objectCaching:false });
    img.scaleToWidth(CANVAS_SIZE);
    frameImg = img; canvas.add(img); canvas.bringToFront(img); canvas.renderAll();
  }, { crossOrigin:'anonymous' });

  // Delete button state
  const delBtn = document.getElementById('deleteBtn');
  canvas.on('selection:created', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:updated', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:cleared', () => delBtn.disabled = true);

  // Keep frame on top
  const bringUp = () => { if(frameImg){ canvas.bringToFront(frameImg); canvas.renderAll(); } };
  canvas.on('object:added', bringUp);
  canvas.on('object:modified', bringUp);

  // Drawer toggle
  const drawer = document.getElementById('stickerDrawer');
  const scrim = document.getElementById('scrim');
  document.getElementById('toggleStickers').addEventListener('click', () => { drawer.classList.add('open'); scrim.classList.add('show'); });
  document.getElementById('closeDrawer').addEventListener('click', () => { drawer.classList.remove('open'); scrim.classList.remove('show'); });
  scrim.addEventListener('click', () => { drawer.classList.remove('open'); scrim.classList.remove('show'); });

  // Populate sticker thumbs from bundled images
  populateStickers();
}
setup();

function coverFit(obj){
  if(!obj.width || !obj.height) return;
  const sx = DIAM/obj.width, sy = DIAM/obj.height;
  const scale = Math.max(sx, sy) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

function setBase(url){
  return new Promise(res => {
    fabric.Image.fromURL(url, img => {
      img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false, hasControls:!baseLocked, selectable:!baseLocked });
      coverFit(img);
      const items = baseGroup._objects.slice(); items.forEach(o => baseGroup.remove(o));
      baseGroup.addWithUpdate(img);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

function addSticker(url){
  return new Promise(res => {
    fabric.Image.fromURL(url, img => {
      img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false });
      img.scaleToWidth(180);
      stickerGroup.addWithUpdate(img);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

document.getElementById('imgInput').addEventListener('change', async e => {
  const f = e.target.files?.[0]; if(!f) return; await setBase(URL.createObjectURL(f));
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  const act = canvas.getActiveObject(); if(!act) return;
  if(stickerGroup.contains(act)){ stickerGroup.remove(act); }
  else if(!baseLocked && baseGroup.contains(act)){ baseGroup.remove(act); }
  canvas.discardActiveObject(); canvas.renderAll(); document.getElementById('deleteBtn').disabled = true;
});

document.getElementById('resetBaseBtn').addEventListener('click', () => {
  const items = baseGroup._objects.slice(); items.forEach(o => baseGroup.remove(o));
  canvas.discardActiveObject(); canvas.renderAll(); document.getElementById('deleteBtn').disabled = true;
});

document.getElementById('resetStickersBtn').addEventListener('click', () => {
  const items = stickerGroup._objects.slice(); items.forEach(o => stickerGroup.remove(o));
  canvas.discardActiveObject(); canvas.renderAll(); document.getElementById('deleteBtn').disabled = true;
});

document.getElementById('lockBaseBtn').addEventListener('click', () => {
  baseLocked = !baseLocked; const base = baseGroup._objects[0];
  if(base){ base.set({ selectable:!baseLocked, hasControls:!baseLocked }); }
  canvas.discardActiveObject(); canvas.renderAll();
});

function cloneAsync(obj){ return new Promise(r => obj.clone(clone => r(clone))); }

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const el = document.createElement('canvas'); el.width = CANVAS_SIZE; el.height = CANVAS_SIZE;
  const temp = new fabric.Canvas(el, { backgroundColor:'transparent', selection:false });

  const bg = await cloneAsync(baseGroup);
  const sg = await cloneAsync(stickerGroup);
  const merged = new fabric.Group([], { left:CENTER, top:CENTER, originX:'center', originY:'center' });
  if(bg._objects?.length) bg._objects.forEach(o => merged.addWithUpdate(o));
  if(sg._objects?.length) sg._objects.forEach(o => merged.addWithUpdate(o));

  const clip = new fabric.Circle({ radius:RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
  merged.set({ clipPath: clip }); temp.add(merged);

  if(frameImg){ const fi = await cloneAsync(frameImg); fi.set({ left:CENTER, top:CENTER, originX:'center', originY:'center' }); temp.add(fi); temp.bringToFront(fi); }
  temp.renderAll();

  const dataURL = el.toDataURL('image/png');
  const a = document.createElement('a'); a.href = dataURL; a.download = 'kindred-pfp-sticker.png'; a.click();
});

// Sticker list using bundled images
const STICKERS = {
  hats: [ "stickers/페도라.png" ],
  glasses: [ "stickers/안경.png" ],
  others: [ "stickers/브로치.png", "stickers/마스크.png", "stickers/넥타이.png", "stickers/리본.png" ]
};

function addThumb(containerId, url){
  const cont = document.getElementById(containerId);
  const div = document.createElement('div'); div.className = 'thumb';
  const img = document.createElement('img'); img.src = url; div.appendChild(img);
  div.addEventListener('click', () => addSticker(url));
  cont.appendChild(div);
}

function populateStickers(){
  STICKERS.hats.forEach(u => addThumb('hatThumbs', u));
  STICKERS.glasses.forEach(u => addThumb('glassesThumbs', u));
  STICKERS.others.forEach(u => addThumb('othersThumbs', u));
}
