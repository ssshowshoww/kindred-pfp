<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kindred PFP Builder — fixed ring + movable stickers</title>
<style>
  :root { --violet:#7c3aed; }
  body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,sans-serif; background:#0b0b0c; color:#e9e9ee; }
  .wrap { max-width:980px; margin:24px auto; padding:16px; display:grid; grid-template-columns:520px 1fr; gap:20px; }
  .stage { background:#111217; border:1px solid #20222b; border-radius:16px; padding:10px; position:relative; }
  .toolbar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
  .toolbar button, .toolbar label { background:#181a22; color:#e9e9ee; border:1px solid #2a2d39; padding:8px 10px; border-radius:10px; cursor:pointer; font-size:14px; }
  .toolbar button:disabled { opacity:.5; cursor:default; }
  .toolbar input[type="file"] { display:none; }
  canvas { display:block; margin:0 auto; background:transparent; }
  .panel { background:#111217; border:1px solid #20222b; border-radius:16px; padding:14px; }
  .panel h3 { margin:0 0 8px; font-size:16px; color:#bdbde6; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(72px,1fr)); gap:8px; }
  .thumb { background:#171923; border:1px solid #2a2d39; border-radius:10px; padding:8px; display:flex; align-items:center; justify-content:center; height:72px; cursor:pointer; }
  .thumb.err { outline:2px dashed #e53e3e; }
  .thumb img { max-width:100%; max-height:100%; object-fit:contain; }
  #stickerDrawer { position:fixed; inset:auto 0 0 auto; right:-360px; width:340px; top:0; height:100vh; background:#0f1016; border-left:1px solid #20222b; transition:right .25s ease; z-index:30; overflow:auto; }
  #stickerDrawer.open { right:0; }
  #scrim { position:fixed; inset:0; background:rgba(0,0,0,.4); opacity:0; pointer-events:none; transition:opacity .2s; z-index:20; }
  #scrim.show { opacity:1; pointer-events:auto; }
  .drawer-head { position:sticky; top:0; background:#0f1016; padding:10px 12px; border-bottom:1px solid #20222b; display:flex; justify-content:space-between; align-items:center; }
  .drawer-head button { background:#181a22; border:1px solid #2a2d39; color:#e9e9ee; padding:6px 10px; border-radius:8px; }
  .muted { color:#a3a3b2; font-size:13px; }
</style>
<script src="https://unpkg.com/fabric@5.3.0/dist/fabric.min.js"></script>
</head>
<body>
  <div class="wrap">
    <!-- Left: Stage -->
    <section class="stage">
      <div class="toolbar">
        <label>
          이미지 불러오기
          <input id="imgInput" type="file" accept="image/*">
        </label>
        <button id="toggleStickers">스티커 열기</button>
        <button id="deleteBtn" disabled>선택 삭제</button>
        <button id="resetBaseBtn">베이스 초기화</button>
        <button id="resetStickersBtn">스티커 초기화</button>
        <button id="lockBaseBtn">베이스 잠금/해제</button>
        <button id="downloadBtn" style="margin-left:auto;border-color:var(--violet);color:#fff;background:#5b30ff;">PNG 다운로드</button>
      </div>
      <canvas id="pfp" width="500" height="500" aria-label="PFP Canvas"></canvas>
      <p class="muted" style="text-align:center;margin-top:8px;">링은 항상 고정(편집 불가). 스티커는 이동·회전·크기 조절 가능. 다운로드 시 화면 그대로 저장돼요.</p>
    </section>

    <!-- Right: Sticker Panel -->
    <aside class="panel">
      <h3>스티커</h3>
      <p class="muted" style="margin-bottom:8px">파일 경로: <code>stickers/*</code></p>
      <h4 style="margin:10px 0 6px">Hats</h4>
      <div id="hatThumbs" class="grid"></div>
      <h4 style="margin:14px 0 6px">Glasses</h4>
      <div id="glassesThumbs" class="grid"></div>
      <h4 style="margin:14px 0 6px">Others</h4>
      <div id="othersThumbs" class="grid"></div>
    </aside>
  </div>

  <!-- Drawer (optional) -->
  <div id="stickerDrawer" aria-hidden="true">
    <div class="drawer-head">
      <strong>스티커</strong>
      <button id="closeDrawer">닫기</button>
    </div>
    <div style="padding:12px">
      <h4 style="margin:10px 0 6px">Hats</h4>
      <div id="hatThumbs_d" class="grid"></div>
      <h4 style="margin:14px 0 6px">Glasses</h4>
      <div id="glassesThumbs_d" class="grid"></div>
      <h4 style="margin:14px 0 6px">Others</h4>
      <div id="othersThumbs_d" class="grid"></div>
    </div>
  </div>
  <div id="scrim"></div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  try { initApp(); }
  catch (e) { console.error('[INIT ERROR]', e); alert('초기화 중 오류가 발생했습니다. Console을 확인하세요.'); }
});

function qs(id){ return document.getElementById(id); }
function on(el, evt, fn){ el && el.addEventListener(evt, fn); }

const CANVAS_SIZE = 500;
const CENTER = 250;
const RADIUS = 240;
const RING_INNER_RADIUS = 220;
const DIAM = RADIUS * 2;
const BLEED = 1.02;

let canvas, baseImg=null, frameImg=null;
let stickers = [];
let baseLocked = false; // 베이스만 토글

function initApp(){
  ['pfp','toggleStickers','closeDrawer','scrim','imgInput','deleteBtn','resetBaseBtn','resetStickersBtn','lockBaseBtn','downloadBtn','hatThumbs','glassesThumbs','othersThumbs','hatThumbs_d','glassesThumbs_d','othersThumbs_d']
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

function makeCircleClip(){
  return new fabric.Circle({
    radius: RADIUS,
    originX:'center', originY:'center',
    left: CENTER, top: CENTER,
    absolutePositioned: true
  });
}

function loadRing(){
  fabric.Image.fromURL('ring.png?v=4', img => {
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable:false, hasControls:false, evented:false, // 클릭 패스스루
      lockMovementX:true, lockMovementY:true,
      lockScalingX:true, lockScalingY:true, lockRotation:true,
      name:'RING_FRAME', objectCaching:false
    });
    img.scaleToWidth(CANVAS_SIZE);

    const hole = new fabric.Circle({ radius:RING_INNER_RADIUS, originX:'center', originY:'center', left:CENTER, top:CENTER, absolutePositioned:true });
    hole.inverted = true; img.clipPath = hole;

    if(frameImg) canvas.remove(frameImg);
    frameImg = img; canvas.add(img); canvas.bringToFront(img);
    canvas.renderAll();
  }, { crossOrigin:'anonymous' });
}

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

function coverFit(obj){
  if(!obj.width||!obj.height) return;
  const scale = Math.max(DIAM/obj.width, DIAM/obj.height) * BLEED;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

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
      canvas.sendToBack(baseImg);
      if(frameImg) canvas.bringToFront(frameImg);

      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' }); // 업로드 blob은 괜찮지만 URL일 수도 있으니 유지
  });
}

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
      if(frameImg) canvas.bringToFront(frameImg);
      canvas.setActiveObject(img); canvas.renderAll(); res();
    }, { crossOrigin:'anonymous' });
  });
}

// === 핵심: 화면 그대로 저장(메인 캔버스 → PNG)
function downloadPng(){
  try {
    canvas.discardActiveObject();
    if (frameImg) canvas.bringToFront(frameImg);
    canvas.renderAll();

    const dataURL = canvas.toDataURL({ format:'png', multiplier:1, enableRetinaScaling:false });

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'kindred-pfp-sticker.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error('[DOWNLOAD ERROR]', err);
    alert('다운로드 중 오류가 발생했어요. Console 로그를 확인해 주세요.');
  }
}

// ==== Stickers (샘플)
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
    // panel
    STICKERS.hats.forEach(u=>addThumb('hatThumbs', u));
    STICKERS.glasses.forEach(u=>addThumb('glassesThumbs', u));
    STICKERS.others.forEach(u=>addThumb('othersThumbs', u));
    // drawer
    STICKERS.hats.forEach(u=>addThumb('hatThumbs_d', u));
    STICKERS.glasses.forEach(u=>addThumb('glassesThumbs_d', u));
    STICKERS.others.forEach(u=>addThumb('othersThumbs_d', u));
    console.log('[populate] stickers added', STICKERS);
  }catch(e){ console.error('[populate error]', e); }
}
</script>
</body>
</html>

