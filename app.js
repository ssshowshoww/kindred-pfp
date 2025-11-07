// ==== Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try { initApp(); }
  catch (e) {
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

let canvas, baseImg=null, frameImg=null;
let stickers = [];
let baseLocked = false;          // 베이스만 토글
const RING_FIXED = true;         // 링은 항상 고정

function initApp(){
  // 링 해제/리셋 버튼 제거
  ['pfp','toggleStickers','closeDrawer','scrim','imgInput','deleteBtn','resetBaseBtn','resetStickersBtn','lockBaseBtn','downloadBtn','hatThumbs','glassesThumbs','othersThumbs']
  .forEach(id => { if(!qs(id)) console.warn('Missing DOM node id=', id); });

  canvas = new fabric.Canvas('pfp', {
    backgroundColor: 'transparent',
    selection: true,
    preserveObjectStacking: true,
    subTargetCheck: true
  });

  loadRing();
  wireUi();
  populateStickers();
}

// 공통 원형 클립패스 생성자
function makeCircleClip(){
  return new fabric.Circle({
    radius: RADIUS,
    originX:'center', originY:'center',
    left: CENTER, top: CENTER,
    absolutePositioned: true
  });
}

// ==== Ring (항상 고정 & 패스스루)
function loadRing(){
  fabric.Image.fromURL('ring.png?v=4', img => {
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable:false, hasControls:false, evented:false,   // 클릭 패스스루
      lockMovementX:true, lockMovementY:true,
      lockScalingX:true,  lockScalingY:true, lockRotation:true,
      name:'RING_FRAME', objectCaching:false
    });
    img.scaleToWidth(CANVAS_SIZE);

    // 내부 구멍(투명)
    const hole = new fabric.Circle({
      radius:RING_INNER_RADIUS, originX:'center', originY:'center',
      left:CENTER, top:CENTER, absolutePositioned:true
    });
    hole.inverted = true; img.clipPath = hole;

    if(frameImg) canvas.remove(frameImg);
    frameImg = img; canvas.add(img); canvas.bringToFront(img);
    canvas.renderAll();
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
    const act = canvas.getActiveObject(); if(!act) return;
    if(act === frameImg){ return; } // 링 삭제 불가
    if(act === baseImg){
      if(baseLocked) return;
      canvas.remove(baseImg); baseImg=null;
    } else {
      // 스티커 삭제
      const idx = stickers.indexOf(act);
      if(idx >= 0){ stickers.splice(idx,1); canvas.remove(act); }
    }
    canvas.discardActiveObject(); canvas.renderAll(); delBtn.disabled = true;
  });

  on(qs('resetBaseBtn'),'click', ()=>{
    if(baseImg){ canvas.remove(baseImg); baseImg=null; canvas.renderAll(); }
  });

  on(qs('resetStickersBtn'),'click', ()=>{
    stickers.forEach(s => canvas.remove(s));
    stickers = []; canvas.discardActiveObject(); canvas.renderAll();
  });

  on(qs('lockBaseBtn'),'click', ()=>{
    baseLocked = !baseLocked;
    if(baseImg){
      baseImg.set({ selectable: !baseLocked, hasControls: !baseLocked });
      canvas.discardActiveObject(); canvas.renderAll();
    }
  });

  on(qs('downloadBtn'),'click', downloadPng);
}

function openDrawer(open){
  const d=qs('stickerDrawer'), s=qs('scrim');
  if(open){ d?.classList.add('open'); s?.classList.add('show'); }
  else { d?.classList.remove('open'); s?.classList.remove('show'); }
}

// ==== Helpers
function coverFit(obj){
  if(!obj.width||!obj.height) return;
  const scale = Math.max(DIAM/obj.width, DIAM/obj.height) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

// 베이스는 개별 객체로 추가 + 개별 클립
function setBase(url){
  return new Promise(res=>{
    fabric.Image.fromURL(url, img => {
      img.set({
        originX:'center', originY:'center', left:CENTER, top:CENTER,
        cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false,
        hasControls: !baseLocked, selectable: !baseLocked,
        perPixelTargetFind: true,
        name: 'BASE_IMG'
      });
      coverFit(img);
      img.clipPath = makeCircleClip();

      if(baseImg) canvas.remove(baseImg);
      baseImg = img; canvas.add(img);
      // 베이스는 맨 아래, 링은 맨 위 유지
      canvas.sendToBack(baseImg);
      if(frameImg) canvas.bringToFront(frameImg);

      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

// 스티커도 개별 객체로 추가 + 개별 클립
function addSticker(url){
  return new Promise((res, rej)=>{
    fabric.Image.fromURL(url, img => {
      img.set({
        originX:'center', originY:'center', left:CENTER, top:CENTER,
        cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false,
        selectable:true, hasControls:true,
        perPixelTargetFind:true,
        rotatingPointOffset: 30,
        name: 'STICKER'
      });
      img.scaleToWidth(200);
      img.clipPath = makeCircleClip();

      stickers.push(img);
      canvas.add(img);
      if(frameImg) canvas.bringToFront(frameImg); // 링 항상 최상단
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

// ==== Download
async function downloadPng(){
  const el=document.createElement('canvas'); el.width=CANVAS_SIZE; el.height=CANVAS_SIZE;
  const temp=new fabric.Canvas(el,{backgroundColor:'transparent', selection:false});

  // 베이스
  if(baseImg){
    const b = baseImg.clone();
    b.clipPath = makeCircleClip();
    temp.add(b);
  }
  // 스티커들
  for(const s of stickers){
    const c = s.clone();
    c.clipPath = makeCircleClip();
    temp.add(c);
  }
  // 링
  if(frameImg){
    const rim = frameImg.clone();
    rim.set({ selectable:false, evented:false });
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
  try{
    STICKERS.hats.forEach(u=>addThumb('hatThumbs', u));
    STICKERS.glasses.forEach(u=>addThumb('glassesThumbs', u));
    STICKERS.others.forEach(u=>addThumb('othersThumbs', u));
    console.log('[populate] stickers added', STICKERS);
  }catch(e){ console.error('[populate error]', e); }
}
