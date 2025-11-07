// ==== Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    initApp();
  } catch (e) {
    console.error('[INIT ERROR]', e);
    alert('초기화 중 오류가 발생했습니다. Console을 확인하세요.');
  }
});

function qs(id){ return document.getElementById(id); }
function on(el, evt, fn){ el && el.addEventListener(evt, fn); }

// ==== Fabric / Canvas Setup
const CANVAS_SIZE = 500;
const CENTER = 250;
const RADIUS = 240;
const RING_INNER_RADIUS = 220;
const DIAM = RADIUS * 2;
const BLEED = 1.02;

let canvas, baseGroup, stickerGroup, frameImg;
let baseLocked = false;
let ringLocked = true; // default locked

function initApp(){
  // Sanity check: required DOM nodes
  ['pfp','toggleStickers','closeDrawer','scrim','imgInput','deleteBtn','resetBaseBtn','resetStickersBtn','resetRingBtn','lockBaseBtn','unlockRingBtn','downloadBtn','hatThumbs','glassesThumbs','othersThumbs']
  .forEach(id => { if(!qs(id)) console.warn('Missing DOM node id=', id); });

  canvas = new fabric.Canvas('pfp', { backgroundColor: 'transparent', selection: true, preserveObjectStacking: true });

  baseGroup = new fabric.Group([], { selectable:false, evented:false, name:'BASE_GROUP', originX:'center', originY:'center', left:CENTER, top:CENTER });
  stickerGroup = new fabric.Group([], { selectable:false, evented:false, name:'STICKER_GROUP', originX:'center', originY:'center', left:CENTER, top:CENTER });
  canvas.add(baseGroup); canvas.add(stickerGroup);

  const clip = new fabric.Circle({ radius:RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
  baseGroup.set({ clipPath: clip });
  stickerGroup.set({ clipPath: clip.clone() });

  loadRing();
  wireUi();
  populateStickers(); // make sure it runs
}

// ==== Ring
function loadRing(){
  fabric.Image.fromURL('ring.png?v=4', img => {
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable:!ringLocked, hasControls:!ringLocked,
      lockMovementX:ringLocked, lockMovementY:ringLocked, lockScalingX:ringLocked, lockScalingY:ringLocked, lockRotation:ringLocked,
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

// ==== UI
function wireUi(){
  const delBtn = qs('deleteBtn');
  canvas.on('selection:created', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:updated', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:cleared', () => delBtn.disabled = true);

  on(qs('toggleStickers'),'click', ()=> openDrawer(true));
  on(qs('closeDrawer'),'click', ()=> openDrawer(false));
  on(qs('scrim'),'click', ()=> openDrawer(false));

  on(qs('imgInput'),'change', async e => {
    const f=e.target.files?.[0]; if(!f) return;
    await setBase(URL.createObjectURL(f));
  });

  on(qs('deleteBtn'),'click', ()=>{
    const act=canvas.getActiveObject(); if(!act) return;
    if(act===frameImg){ if(ringLocked) return; canvas.remove(frameImg); frameImg=null; }
    else if(stickerGroup.contains(act)){ stickerGroup.remove(act); }
    else if(!baseLocked && baseGroup.contains(act)){ baseGroup.remove(act); }
    canvas.discardActiveObject(); canvas.renderAll(); delBtn.disabled = true;
  });

  on(qs('resetBaseBtn'),'click', ()=> clearGroup(baseGroup));
  on(qs('resetStickersBtn'),'click', ()=> clearGroup(stickerGroup));
  on(qs('resetRingBtn'),'click', ()=> { ringLocked=true; loadRing(); });

  on(qs('lockBaseBtn'),'click', ()=>{
    baseLocked = !baseLocked; const base = baseGroup._objects[0];
    if(base){ base.set({ selectable:!baseLocked, hasControls:!baseLocked }); canvas.discardActiveObject(); canvas.renderAll(); }
  });

  on(qs('unlockRingBtn'),'click', ()=>{
    if(!frameImg) return;
    ringLocked=false;
    frameImg.set({ selectable:true, hasControls:true, lockMovementX:false, lockMovementY:false, lockScalingX:false, lockScalingY:false, lockRotation:false });
    canvas.setActiveObject(frameImg); canvas.renderAll();
  });

  on(qs('downloadBtn'),'click', downloadPng);
}

function openDrawer(open){
  const d=qs('stickerDrawer'), s=qs('scrim');
  if(open){ d.classList.add('open'); s.classList.add('show'); } else { d.classList.remove('open'); s.classList.remove('show'); }
}

// ==== Helpers
function clearGroup(g){ const items = g._objects.slice(); items.forEach(o=>g.remove(o)); canvas.discardActiveObject(); canvas.renderAll(); }
function coverFit(obj){
  if(!obj.width||!obj.height) return;
  const scale = Math.max(DIAM/obj.width, DIAM/obj.height) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

function setBase(url){
  return new Promise(res=>{
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
  return new Promise((res, rej)=>{
    fabric.Image.fromURL(url, img => {
      img.set({ originX:'center', originY:'center', left:CENTER, top:CENTER, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false });
      img.scaleToWidth(200);
      stickerGroup.addWithUpdate(img);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

// ==== Download
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

// ==== Stickers (English filenames)
const STICKERS = {
  hats:     [ "stickers/fedora.png" ],
  glasses:  [ "stickers/glasses.png" ],
  others:   [ "stickers/brooch.png", "stickers/mask.png", "stickers/tie.png", "stickers/bow.png" ]
};

function addThumb(containerId, url){
  const cont = qs(containerId);
  if(!cont){ console.warn('No container for', containerId); return; }
  const div = document.createElement('div'); div.className='thumb'; div.title=url;
  const img = document.createElement('img'); img.alt=url; img.src=url;
  img.addEventListener('error', () => { div.classList.add('err'); div.title = 'Load error: ' + url; });
  div.appendChild(img);
  div.addEventListener('click', () => addSticker(url));
  cont.appendChild(div);
}

function populateStickers(){
  try {
    STICKERS.hats.forEach(u=>addThumb('hatThumbs', u));
    STICKERS.glasses.forEach(u=>addThumb('glassesThumbs', u));
    STICKERS.others.forEach(u=>addThumb('othersThumbs', u));
    console.log('[populate] stickers added', STICKERS);
  } catch (e) {
    console.error('[populate error]', e);
  }
}
