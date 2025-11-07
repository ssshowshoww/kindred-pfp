// Kindred — PFP & Sticker Studio
// Requirements implemented:
// - PFP & Sticker modes
// - Ring can be added/removed only; locked from move/scale/rotate
// - Accessories (bow, brooch, fedora, glasses, mask, tie) are free-transformable
// - Export as PNG/JPG

const canvas = new fabric.Canvas('stage', {
  preserveObjectStacking: true
});

// Globals
let baseImageObj = null; // user-uploaded base
let ringObj = null;      // fixed ring
let currentMode = 'pfp'; // 'pfp' | 'sticker'

// Helpers
function fitToCanvas(obj) {
  const maxW = canvas.getWidth();
  const maxH = canvas.getHeight();
  const scale = Math.min(maxW / obj.width, maxH / obj.height);
  obj.scale(scale);
  obj.set({
    left: (maxW - obj.getScaledWidth())/2,
    top: (maxH - obj.getScaledHeight())/2
  });
  obj.setCoords();
}

function lockObject(obj) {
  obj.set({
    selectable: false,
    evented: false,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true
  });
}

function makeTransformable(obj) {
  obj.set({
    selectable: true,
    evented: true,
    hasControls: true
  });
}

function addImageFromURL(url, opts = {}) {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(url, (img) => {
      if (!img) return reject(new Error('이미지를 불러오지 못했습니다.'));
      if (opts.fit) fitToCanvas(img);
      if (opts.center) {
        img.set({
          left: (canvas.getWidth() - img.width * img.scaleX) / 2,
          top: (canvas.getHeight() - img.height * img.scaleY) / 2
        });
      }
      canvas.add(img);
      resolve(img);
    }, { crossOrigin: 'anonymous' });
  });
}

// Mode
document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', (e) => {
    currentMode = e.target.value;
    applyMode();
  });
});

function applyMode() {
  // Sticker mode: no background fill; PFP: same but behavior is mainly user choice
  if (currentMode === 'sticker') {
    canvas.setBackgroundColor('rgba(0,0,0,0)', canvas.renderAll.bind(canvas));
  } else {
    canvas.setBackgroundColor('rgba(0,0,0,0)', canvas.renderAll.bind(canvas));
  }
}

// Base upload
const baseUpload = document.getElementById('baseUpload');
baseUpload.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    // Remove previous base if any
    if (baseImageObj) {
      canvas.remove(baseImageObj);
      baseImageObj = null;
    }
    fabric.Image.fromURL(evt.target.result, (img) => {
      fitToCanvas(img);
      img.set({ selectable: false, evented: false });
      baseImageObj = img;
      canvas.add(img);
      // Ensure base at bottom
      canvas.sendToBack(img);
      if (ringObj) canvas.bringToFront(ringObj);
      canvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById('removeBase').addEventListener('click', () => {
  if (baseImageObj) {
    canvas.remove(baseImageObj);
    baseImageObj = null;
    canvas.renderAll();
  }
});

// Ring add/remove
document.getElementById('addRing').addEventListener('click', async () => {
  if (ringObj) return; // already exists
  // Try to load assets/base/ring.png; if absent, draw vector ring
  const ringUrl = './assets/base/ring.png';
  function drawVectorRing() {
    const size = Math.min(canvas.getWidth(), canvas.getHeight()) - 10;
    const cx = canvas.getWidth()/2;
    const cy = canvas.getHeight()/2;
    const outer = new fabric.Circle({ left: cx - size/2, top: cy - size/2, radius: size/2, fill: 'rgba(0,0,0,0)', stroke: '#5828ff', strokeWidth: 18, selectable: false, evented: false });
    const inner = new fabric.Circle({ left: cx - (size-40)/2, top: cy - (size-40)/2, radius: (size-40)/2, fill: 'rgba(0,0,0,0)', stroke: '#5828ff', strokeWidth: 6, selectable: false, evented: false });
    ringObj = new fabric.Group([outer, inner], { selectable:false, evented:false });
    lockObject(ringObj);
    canvas.add(ringObj);
    canvas.bringToFront(ringObj);
    canvas.renderAll();
  }
  fabric.util.loadImage(ringUrl, (imgEl) => {
    if (imgEl) {
      const img = new fabric.Image(imgEl);
      // Fit ring to square (full canvas)
      const target = Math.min(canvas.getWidth(), canvas.getHeight());
      img.scaleToWidth(target);
      img.scaleToHeight(target);
      img.set({ left: (canvas.getWidth()-img.getScaledWidth())/2, top: (canvas.getHeight()-img.getScaledHeight())/2 });
      lockObject(img);
      ringObj = img;
      canvas.add(img);
      canvas.bringToFront(img);
      canvas.renderAll();
    } else {
      drawVectorRing();
    }
  }, null, 'anonymous');
});

document.getElementById('removeRing').addEventListener('click', () => {
  if (ringObj) {
    canvas.remove(ringObj);
    ringObj = null;
    canvas.renderAll();
  }
});

// Accessories
function addAccessory(name) {
  const url = `./assets/accessories/${name}.png`;
  fabric.util.loadImage(url, (el) => {
    if (!el) {
      alert(`${name}.png 파일을 assets/accessories 폴더에 넣어주세요.`);
      return;
    }
    const img = new fabric.Image(el);
    const baseScale = 0.4 * (canvas.getWidth() / Math.max(img.width, img.height));
    img.scale(baseScale);
    img.set({
      left: canvas.getWidth()/2 - (img.getScaledWidth()/2),
      top: canvas.getHeight()/2 - (img.getScaledHeight()/2),
      transparentCorners: false,
      cornerStyle: 'circle',
      borderColor: '#6ea8fe',
      cornerColor: '#cfe2ff',
      rotatingPointOffset: 24
    });
    makeTransformable(img);
    canvas.add(img);
    if (ringObj) canvas.bringToFront(ringObj); // Ring stays on top
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, null, 'anonymous');
}

document.querySelectorAll('.add-acc').forEach(btn => {
  btn.addEventListener('click', () => addAccessory(btn.dataset.name));
});

document.getElementById('deleteSelected').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) {
    if (obj === ringObj) return; // ring protected
    canvas.remove(obj);
    canvas.discardActiveObject().renderAll();
  }
});

document.getElementById('bringForward').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj !== ringObj) {
    canvas.bringForward(obj);
    if (ringObj) canvas.bringToFront(ringObj);
    canvas.renderAll();
  }
});

document.getElementById('sendBackwards').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj !== ringObj) {
    canvas.sendBackwards(obj);
    // Keep base at bottom
    if (baseImageObj) canvas.sendToBack(baseImageObj);
    if (ringObj) canvas.bringToFront(ringObj);
    canvas.renderAll();
  }
});

document.getElementById('flipX').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj !== ringObj) {
    obj.set('flipX', !obj.flipX);
    obj.setCoords();
    canvas.renderAll();
  }
});

// Export
document.getElementById('exportPng').addEventListener('click', () => {
  // Transparent background regardless of mode
  const dataURL = canvas.toDataURL({
    format: 'png',
    enableRetinaScaling: false,
    multiplier: 1
  });
  downloadDataURL(dataURL, `kindred-${currentMode}.png`);
});

document.getElementById('exportJpg').addEventListener('click', () => {
  // White background
  const prevBg = canvas.backgroundColor;
  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
  const dataURL = canvas.toDataURL({
    format: 'jpeg',
    quality: 1.0,
    enableRetinaScaling: false,
    multiplier: 1
  });
  canvas.setBackgroundColor(prevBg, canvas.renderAll.bind(canvas));
  downloadDataURL(dataURL, `kindred-${currentMode}.jpg`);
});

function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Clear all (except: just full clear)
document.getElementById('clearAll').addEventListener('click', () => {
  canvas.clear();
  baseImageObj = null;
  ringObj = null;
  applyMode();
  canvas.renderAll();
});

// Initialize
applyMode();
