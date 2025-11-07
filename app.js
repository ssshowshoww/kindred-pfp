// Kindred-style PFP — Ring locked by default; unlock only
const CANVAS_SIZE = 500;
const CENTER = 250;
const RADIUS = 240;
const RING_INNER_RADIUS = 220;
const DIAM = RADIUS*2;
const BLEED = 1.02;

const canvas = new fabric.Canvas('pfp', { backgroundColor:'transparent', selection:true, preserveObjectStacking:true });

let baseGroup, stickerGroup, frameImg, baseLocked=false, ringLocked=true; // start locked

function setup(){
  baseGroup   = new fabric.Group([], { selectable:false, evented:false, name:'BASE_GROUP',    originX:'center', originY:'center', left:CENTER, top:CENTER });
  stickerGroup= new fabric.Group([], { selectable:false, evented:false, name:'STICKER_GROUP', originX:'center', originY:'center', left:CENTER, top:CENTER });
  canvas.add(baseGroup); canvas.add(stickerGroup);

  const clip = new fabric.Circle({ radius:RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
  baseGroup.set({ clipPath: clip });
  stickerGroup.set({ clipPath: clip.clone() });

  loadRing();
  wireUi();
}
setup();

function loadRing(){
  fabric.Image.fromURL('ring.png?v=3', img => {
    img.set({
      originX:'center', originY:'center',
      left:CENTER, top:CENTER,
      selectable:!ringLocked, evented:true,
      hasControls:!ringLocked, lockMovementX:ringLocked, lockMovementY:ringLocked, lockScalingX:ringLocked, lockScalingY:ringLocked, lockRotation:ringLocked,
      name:'RING_FRAME', objectCaching:false,
      cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false
    });
    img.scaleToWidth(CANVAS_SIZE);

    const hole = new fabric.Circle({ radius:RING_INNER_RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
    hole.inverted = true; img.clipPath = hole;

    if(frameImg) canvas.remove(frameImg);
    frameImg = img; canvas.add(img); canvas.bringToFront(img); canvas.discardActiveObject(); canvas.renderAll();
  }, { crossOrigin:'anonymous' });
}

function wireUi(){
  const delBtn = document.getElementById('deleteBtn');
  canvas.on('selection:created', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:updated', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:cleared', () => delBtn.disabled = true);

  document.getElementById('toggleStickers').addEventListener('click', () => openDrawer(true));
  document.getElementById('closeDrawer').addEventListener('click', () => openDrawer(false));
  document.getElementById('scrim').addEventListener('click', () => openDrawer(false));

  document.getElementById('imgInput').addEventListener('change', async e => {
    const f=e.target.files?.[0]; if(!f) return; await setBase(URL.createObjectURL(f));
  });

  document.getElementById('deleteBtn').addEventListener('click', () => {
    const act = canvas.getActiveObject(); if(!act) return;
    if(act === frameImg){ /* prevent delete when locked */ if(ringLocked) return; canvas.remove(frameImg); frameImg=null; }
    else if(stickerGroup.contains(act)){ stickerGroup.remove(act); }
    else if(!baseLocked && baseGroup.contains(act)){ baseGroup.remove(act); }
    canvas.discardActiveObject(); canvas.renderAll(); delBtn.disabled = true;
  });

  document.getElementById('resetBaseBtn').addEventListener('click', () => { clearGroup(baseGroup); });
  document.getElementById('resetStickersBtn').addEventListener('click', () => { clearGroup(stickerGroup); });
  document.getElementById('resetRingBtn').addEventListener('click', () => { ringLocked=true; loadRing(); });

  document.getElementById('lockBaseBtn').addEventListener('click', () => {
    baseLocked = !baseLocked; const base = baseGroup._objects[0];
    if(base){ base.set({ selectable:!baseLocked, hasControls:!baseLocked }); canvas.discardActiveObject(); canvas.renderAll(); }
  });

  // unlock-only button
  document.getElementById('unlockRingBtn').addEventListener('click', () => {
    if(!frameImg) return;
    ringLocked = false;
    frameImg.set({
      selectable:true, hasControls:true,
      lockMovementX:false, lockMovementY:false, lockScalingX:false, lockScalingY:false, lockRotation:false
    });
    canvas.setActiveObject(frameImg); canvas.renderAll();
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadPng);

  populateStickers();
}

function openDrawer(open){
  const d=document.getElementById('stickerDrawer'), s=document.getElementById('scrim');
  if(open){ d.classList.add('open'); s.classList.add('show'); } else { d.classList.remove('open'); s.classList.remove('show'); }
}

function clearGroup(g){ const items=g._objects.slice(); items.forEach(o=>g.remove(o)); canvas.discardActiveObject(); canvas.renderAll(); }

function coverFit(obj){
  if(!obj.width||!obj.height) return;
  const scale = Math.max(DIAM/obj.width, DIAM/obj.height) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

function setBase(url){
  return new Promise(res => {
    fabric.Image.fromURL(url, img => {
      img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false, hasControls:!baseLocked, selectable:!baseLocked });
      coverFit(img);
      clearGroup(baseGroup);
      baseGroup.addWithUpdate(img);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

function addSticker(url){
  return new Promise(res => {
    fabric.Image.fromURL(url, img => {
      img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false });
      img.scaleToWidth(200);
      stickerGroup.addWithUpdate(img);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

async function downloadPng(){
  const el=document.createElement('canvas'); el.width=CANVAS_SIZE; el.height=CANVAS_SIZE;
  const temp=new fabric.Canvas(el,{backgroundColor:'transparent', selection:false});

  const merged=new fabric.Group([], {left:CENTER, top:CENTER, originX:'center', originY:'center'});
  const bg=baseGroup.clone(); const sg=stickerGroup.clone();
  if(bg._objects?.length) bg._objects.forEach(o=>merged.addWithUpdate(o));
  if(sg._objects?.length) sg._objects.forEach(o=>merged.addWithUpdate(o));
  const clip=new fabric.Circle({radius:RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true});
  merged.set({clipPath:clip}); temp.add(merged);

  if(frameImg){
    const rim = frameImg.clone();
    const hole = new fabric.Circle({ radius:RING_INNER_RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
    hole.inverted = true; rim.clipPath = hole;
    temp.add(rim); temp.bringToFront(rim);
  }

  temp.renderAll();
  const dataURL=el.toDataURL('image/png');
  const a=document.createElement('a'); a.href=dataURL; a.download='kindred-pfp-sticker.png'; a.click();
}

// Sticker list
const STICKERS = {
  hats:     [ "stickers/페도라.png" ],
  glasses:  [ "stickers/안경.png"   ],
  others:   [ "stickers/브로치.png", "stickers/마스크.png", "stickers/넥타이.png", "stickers/리본.png" ]
};

function addThumb(containerId, url){
  const cont=document.getElementById(containerId);
  const div=document.createElement('div'); div.className='thumb';
  const img=document.createElement('img'); img.src=url; img.alt=url;
  div.appendChild(img); div.addEventListener('click', ()=>addSticker(url)); cont.appendChild(div);
}

function populateStickers(){
  STICKERS.hats.forEach(u=>addThumb('hatThumbs',u));
  STICKERS.glasses.forEach(u=>addThumb('glassesThumbs',u));
  STICKERS.others.forEach(u=>addThumb('othersThumbs',u));
}
