const SIZE=500, CENTER=250, RADIUS=240, INNER=220;
let canvas, frameImg=null, baseGroup, baseLocked=false, stickers=[];

const $ = id=>document.getElementById(id);

document.addEventListener('DOMContentLoaded', init);

function init(){
  canvas = new fabric.Canvas('c', { backgroundColor:'transparent', preserveObjectStacking:true });

  // circular clip for base & stickers
  const clip = new fabric.Circle({ radius:RADIUS, left:CENTER, top:CENTER, originX:'center', originY:'center', absolutePositioned:true });

  baseGroup = new fabric.Group([], { left:CENTER, top:CENTER, originX:'center', originY:'center', selectable:false, evented:false, name:'BASE' });
  baseGroup.clipPath = clip.clone();
  canvas.add(baseGroup);

  // default ring
  addRing();

  // base handlers
  $('baseInput').addEventListener('change', e=>{
    const f = e.target.files?.[0]; if(!f) return;
    const url = URL.createObjectURL(f);
    fabric.Image.fromURL(url, img=>{
      coverFit(img);
      img.set({ selectable:!baseLocked, hasControls:!baseLocked, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false });
      clearBase();
      baseGroup.addWithUpdate(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    }, {crossOrigin:'anonymous'});
  });
  $('lockBase').addEventListener('click', ()=>{
    baseLocked=!baseLocked;
    const o = baseGroup._objects[0];
    if(o){ o.set({ selectable:!baseLocked, hasControls:!baseLocked }); canvas.discardActiveObject(); canvas.renderAll(); }
  });
  $('clearBase').addEventListener('click', ()=> clearBase());

  // ring handlers
  $('restoreRing').addEventListener('click', ()=>{ if(!frameImg) addRing(); });
  $('removeRing').addEventListener('click', ()=>{ if(frameImg){ canvas.remove(frameImg); frameImg=null; canvas.renderAll(); }});

  // stickers
  const list=[
    './assets/stickers/fedora.png',
    './assets/stickers/glasses.png',
    './assets/stickers/brooch.png',
    './assets/stickers/mask.png',
    './assets/stickers/tie.png',
    './assets/stickers/bow.png',
  ];
  const thumbs=$('thumbs');
  list.forEach(src=>{
    const t=document.createElement('div'); t.className='thumb';
    const img=document.createElement('img'); img.src=src; img.alt=src;
    t.appendChild(img);
    t.addEventListener('click', ()=> addSticker(src));
    thumbs.appendChild(t);
  });
  $('clearStickers').addEventListener('click', ()=>{ stickers.forEach(s=>canvas.remove(s)); stickers=[]; canvas.renderAll(); });

  // download
  $('download').addEventListener('click', ()=>{
    canvas.discardActiveObject(); canvas.renderAll();
    const a=document.createElement('a');
    a.href=canvas.toDataURL({format:'png'});
    a.download='kindred-pfp.png'; a.click();
  });
}

function coverFit(obj){
  const scale = Math.max((RADIUS*2)/obj.width, (RADIUS*2)/obj.height) * 1.02;
  obj.set({ originX:'center', originY:'center', left:CENTER, top:CENTER });
  obj.scale(scale);
}

function clearBase(){
  baseGroup._objects.slice().forEach(o=> baseGroup.remove(o));
  canvas.discardActiveObject(); canvas.renderAll();
}

function addRing(){
  fabric.Image.fromURL('./assets/ring.png', img=>{
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable:true, hasControls:false,
      lockMovementX:true, lockMovementY:true, lockScalingX:true, lockScalingY:true, lockRotation:true,
      name:'RING'
    });
    // inner hole
    const hole = new fabric.Circle({ radius:INNER, left:CENTER, top:CENTER, originX:'center', originY:'center', absolutePositioned:true });
    hole.inverted = true; img.clipPath = hole;
    img.scaleToWidth(SIZE);
    frameImg && canvas.remove(frameImg);
    frameImg = img; canvas.add(img); canvas.bringToFront(img); canvas.renderAll();
  }, {crossOrigin:'anonymous'});
}

function addSticker(url){
  fabric.Image.fromURL(url, img=>{
    img.set({
      originX:'center', originY:'center', left:CENTER, top:CENTER,
      selectable:true, hasControls:true, cornerColor:'#7c3aed', borderColor:'#7c3aed', transparentCorners:false
    });
    // clip sticker to circle
    const clip = new fabric.Circle({ radius:RADIUS, left:CENTER, top:CENTER, originX:'center', originY:'center', absolutePositioned:true });
    img.clipPath = clip;
    img.scaleToWidth(220);
    stickers.push(img);
    canvas.add(img);
    if(frameImg) canvas.bringToFront(frameImg);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, {crossOrigin:'anonymous'});
}
