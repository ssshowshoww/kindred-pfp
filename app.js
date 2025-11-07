const RING_SRC = '/assets/ring.png';
const STICKERS_SRC = [
  '/assets/stickers/fedora.png',
  '/assets/stickers/glasses.png',
  '/assets/stickers/brooch.png',
  '/assets/stickers/mask.png',
  '/assets/stickers/tie.png',
  '/assets/stickers/bow.png',
];

const SIZE=500, CENTER=250, RADIUS=240, INNER=220;
let canvas, frameObj=null, baseGroup, baseLocked=false, stickers=[];

document.addEventListener('DOMContentLoaded', init);
function $(id){return document.getElementById(id);}

function init(){
  canvas = new fabric.Canvas('c', { backgroundColor:'transparent', preserveObjectStacking:true });

  const clip = new fabric.Circle({ radius:RADIUS, left:CENTER, top:CENTER, originX:'center', originY:'center', absolutePositioned:true });
  baseGroup = new fabric.Group([], { left:CENTER, top:CENTER, originX:'center', originY:'center', selectable:false, evented:false });
  baseGroup.clipPath = clip.clone();
  canvas.add(baseGroup);

  loadRingWithFallback();

  $('baseInput').addEventListener('change', e=>{
    const f=e.target.files?.[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    fabric.Image.fromURL(url, img=>{
      const scale=Math.max((RADIUS*2)/img.width,(RADIUS*2)/img.height)*1.02;
      img.set({originX:'center',originY:'center',left:CENTER,top:CENTER});
      img.scale(scale);
      baseGroup._objects.forEach(o=>baseGroup.remove(o));
      baseGroup.addWithUpdate(img);
      canvas.renderAll();
    },{crossOrigin:'anonymous'});
  });

  $('lockBase').addEventListener('click', ()=>{
    baseLocked=!baseLocked;
    const o=baseGroup._objects[0];
    if(o){o.set({selectable:!baseLocked,hasControls:!baseLocked});canvas.renderAll();}
  });

  $('clearBase').addEventListener('click', ()=>{
    baseGroup._objects.slice().forEach(o=>baseGroup.remove(o));canvas.renderAll();
  });

  $('restoreRing').addEventListener('click', ()=>{if(!frameObj)loadRingWithFallback();});
  $('removeRing').addEventListener('click', ()=>{if(frameObj){canvas.remove(frameObj);frameObj=null;canvas.renderAll();}});

  const thumbs=$('thumbs');
  STICKERS_SRC.forEach(src=>{
    const div=document.createElement('div');div.className='thumb';
    const img=document.createElement('img');img.src=src;img.alt=src;div.appendChild(img);
    div.onclick=()=>addSticker(src);thumbs.appendChild(div);
  });

  $('clearStickers').onclick=()=>{stickers.forEach(s=>canvas.remove(s));stickers=[];canvas.renderAll();};
  $('download').onclick=()=>{canvas.discardActiveObject();canvas.renderAll();const a=document.createElement('a');a.href=canvas.toDataURL({format:'png'});a.download='kindred-pfp.png';a.click();};
}

function loadRingWithFallback(){
  fabric.Image.fromURL(RING_SRC,(img)=>{setupRing(img);},{crossOrigin:'anonymous'})
  .catch(()=>{drawVectorRing();});
}

function setupRing(img){
  img.set({originX:'center',originY:'center',left:CENTER,top:CENTER,
    selectable:true,hasControls:false,
    lockMovementX:true,lockMovementY:true,lockScalingX:true,lockScalingY:true,lockRotation:true});
  img.scaleToWidth(SIZE);
  if(frameObj)canvas.remove(frameObj);
  frameObj=img;canvas.add(img);canvas.bringToFront(img);canvas.renderAll();
}

function drawVectorRing(){
  const ring=new fabric.Circle({left:CENTER,top:CENTER,radius:RADIUS,fill:'rgba(88,40,255,1)',
    originX:'center',originY:'center',selectable:false,hasControls:false,
    lockMovementX:true,lockMovementY:true,lockScalingX:true,lockScalingY:true,lockRotation:true});
  const hole=new fabric.Circle({radius:INNER,left:CENTER,top:CENTER,originX:'center',originY:'center',absolutePositioned:true});
  hole.inverted=true;ring.clipPath=hole;
  if(frameObj)canvas.remove(frameObj);
  frameObj=ring;canvas.add(ring);canvas.renderAll();
}

function addSticker(url){
  fabric.Image.fromURL(url,(img)=>{
    img.set({originX:'center',originY:'center',left:CENTER,top:CENTER,
      selectable:true,hasControls:true,cornerColor:'#7c3aed',borderColor:'#7c3aed',transparentCorners:false});
    const clip=new fabric.Circle({radius:RADIUS,left:CENTER,top:CENTER,originX:'center',originY:'center',absolutePositioned:true});
    img.clipPath=clip;img.scaleToWidth(220);
    stickers.push(img);canvas.add(img);
    if(frameObj)canvas.bringToFront(frameObj);canvas.renderAll();
  },{crossOrigin:'anonymous'});
}
