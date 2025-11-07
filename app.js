// filename: app.js
document.addEventListener('DOMContentLoaded', () => initApp());

const CANVAS_SIZE = 500;
const CENTER = 250;
const RADIUS = 240;
const RING_INNER_RADIUS = 220;
const DIAM = RADIUS * 2;
const BLEED = 1.02;

let canvas;
let baseGroup;
let stickers = [];
let frameImg = null;
let baseLocked = false;
let clipCircle;

function qs(id){ return document.getElementById(id); }
function on(el, ev, fn){ el && el.addEventListener(ev, fn); }

function initApp(){
  // 캔버스 실제 픽셀 크기 지정 + 미리보기용 DOM 배경(다운로드 PNG는 투명 유지)
  const el = document.getElementById('pfp');
  el.width = CANVAS_SIZE;
  el.height = CANVAS_SIZE;
  el.style.background = '#ffffff';

  canvas = new fabric.Canvas('pfp', {
    backgroundColor: 'transparent',
    selection: true,
    preserveObjectStacking: true,
  });

  clipCircle = new fabric.Circle({
    radius: RADIUS, left: CENTER, top: CENTER,
    originX: 'center', originY: 'center',
    absolutePositioned: true
  });

  baseGroup = new fabric.Group([], {
    name: 'BASE_GROUP', left: CENTER, top: CENTER,
    originX: 'center', originY: 'center',
    selectable: false, evented: false
  });
  // clone 후 absolutePositioned 다시 지정(안 하면 클립 좌표가 0,0로 밀려 하얗게만 보임)
  const cp = clipCircle.clone(); cp.absolutePositioned = true;
  baseGroup.set({ clipPath: cp });
  canvas.add(baseGroup);

  // 링을 기본 표시
  loadRing();

  const delBtn = qs('deleteBtn');
  canvas.on('selection:created', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:updated', e => delBtn.disabled = !(e.selected?.[0]));
  canvas.on('selection:cleared', () => delBtn.disabled = true);

  on(qs('toggleStickers'), 'click', ()=> openDrawer(true));
  on(qs('closeDrawer'), 'click', ()=> openDrawer(false));
  on(qs('scrim'), 'click', ()=> openDrawer(false));

  on(qs('imgInput'), 'change', async e => {
    const f = e.target.files?.[0]; if(!f) return;
    await setBase(URL.createObjectURL(f));
  });

  on(qs('deleteBtn'), 'click', ()=> {
    const act = canvas.getActiveObject(); if(!act) return;

    if (act === frameImg) {
      canvas.remove(frameImg); frameImg = null;
    } else if (baseGroup && baseGroup.contains(act)) {
      if (baseLocked) return;
      baseGroup.remove(act);
    } else {
      const idx = stickers.indexOf(act);
      if (idx >= 0) stickers.splice(idx,1);
      canvas.remove(act);
    }
    canvas.discardActiveObject(); canvas.renderAll();
    delBtn.disabled = true;
  });

  on(qs('resetBaseBtn'), 'click', ()=> clearBase());
  on(qs('resetStickersBtn'), 'click', ()=> clearStickers());

  on(qs('lockBaseBtn'), 'click', ()=> {
    baseLocked = !baseLocked;
    const o = baseGroup._objects[0];
    if (o) {
      o.set({ selectable: !baseLocked, hasControls: !baseLocked });
      canvas.discardActiveObject(); canvas.renderAll();
    }
  });

  on(qs('showRingBtn'), 'click', ()=> { if(!frameImg) loadRing(); });

  on(qs('downloadBtn'), 'click', downloadPng);

  populateStickers();
}

function loadRing(){
  fabric.Image.fromURL('ring.png?v=6', img => {
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable: true, hasControls: false,
      lockMovementX: true, lockMovementY: true,
      lockScalingX: true, lockScalingY: true,
      lockRotation: true,
      name: 'RING_FRAME',
      transparentCorners: false, cornerColor: '#7c3aed', borderColor: '#7c3aed'
    });
    img.scaleToWidth(CANVAS_SIZE);

    const hole = new fabric.Circle({
      radius: RING_INNER_RADIUS, left: CENTER, top: CENTER,
      originX:'center', originY:'center', absolutePositioned:true
    });
    hole.inverted = true;
    img.clipPath = hole;

    if (frameImg) canvas.remove(frameImg);
    frameImg = img;
    canvas.add(img);
    canvas.bringToFront(img);
    canvas.discardActiveObject();
    canvas.renderAll();
  }, { crossOrigin: 'anonymous' });
}

function openDrawer(open){
  const d=qs('stickerDrawer'), s=qs('scrim');
  if(open){ d.classList.add('open'); s.classList.add('show'); } 
  else { d.classList.remove('open'); s.classList.remove('show'); }
}

function clearBase(){
  const items = baseGroup._objects.slice();
  items.forEach(o => baseGroup.remove(o));
  canvas.discardActiveObject(); canvas.renderAll();
}

function clearStickers(){
  stickers.forEach(o => canvas.remove(o));
  stickers = [];
  canvas.discardActiveObject(); canvas.renderAll();
}

function coverFit(obj){
  if(!obj.width || !obj.height) return;
  const scale = Math.max(DIAM/obj.width, DIAM/obj.height) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

function setBase(url){
  return new Promise(res=>{
    fabric.Image.fromURL(url, img => {
      console.log('base loaded', img?.width, img?.height);
      img.set({
        originX:'center', originY:'center', left:CENTER, top:CENTER,
        hasControls: !baseLocked, selectable: !baseLocked,
        cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false
      });
      coverFit(img);
      clearBase();
      baseGroup.addWithUpdate(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      res();
    }, { crossOrigin: 'anonymous' });
  });
}

// 스티커: 원형 클립 적용(absolutePositioned 복원 필수)
function addSticker(url){
  return new Promise(res=>{
    fabric.Image.fromURL(url, img => {
      img.set({
        originX:'center', originY:'center', left:CENTER, top:CENTER,
        selectable: true, hasControls: true,
        cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false
      });
      const sp = clipCircle.clone(); sp.absolutePositioned = true;
      img.clipPath = sp;
      img.scaleToWidth(200);
      stickers.push(img);
      canvas.add(img);
      if (frameImg) canvas.bringToFront(frameImg);
      canvas.setActiveObject(img);
      canvas.renderAll();
      res();
    }, { crossOrigin: 'anonymous' });
  });
}

function downloadPng(){
  const sel = canvas.getActiveObject();
  canvas.discardActiveObject(); canvas.renderAll();
  const dataURL = canvas.toDataURL({ format:'png' });
  const a = document.createElement('a');
  a.href = dataURL; a.download = 'kindred-pfp.png'; a.click();
  if(sel) canvas.setActiveObject(sel);
}

const STICKERS = {
  hats:     [ "stickers/fedora.png" ],
  glasses:  [ "stickers/glasses.png" ],
  others:   [ "stickers/brooch.png", "stickers/mask.png", "stickers/tie.png", "stickers/bow.png" ]
};

function addThumb(containerId, url){
  const cont = qs(containerId);
  const div = document.createElement('div'); div.className='thumb'; div.title=url;
  const img = document.createElement('img'); img.alt=url; img.src=url;
  img.addEventListener('error', () => { div.classList.add('err'); div.title = 'Load error: ' + url; });
  div.appendChild(img);
  div.addEventListener('click', () => addSticker(url));
  cont.appendChild(div);
}

function populateStickers(){
  STICKERS.hats.forEach(u=>addThumb('hatThumbs', u));
  STICKERS.glasses.forEach(u=>addThumb('glassesThumbs', u));
  STICKERS.others.forEach(u=>addThumb('othersThumbs', u));
}
