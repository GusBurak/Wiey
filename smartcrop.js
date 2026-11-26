// =====================================================
// Miniatures recadrées sur l'assiette
// On repère l'assiette (zone claire et peu colorée, plutôt au centre) ;
// à défaut, on cadre sur la zone la plus colorée et contrastée (la nourriture).
// =====================================================

const THUMB_SIZE = 160;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Renvoie le carré à découper { x, y, size } en pixels de l'image d'origine
function findPlateCrop(img) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const k = 96 / Math.max(W, H);
  const w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;
  const light = new Float32Array(n), sat = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    light[i] = (max + min) / 2;
    sat[i] = max === 0 ? 0 : (max - min) / max; // saturation « TSV » : ne gonfle pas les blancs cassés
  }
  const side = Math.min(w, h);
  const box = plateBox(w, h, light, sat) || foodBox(w, h, light, sat);
  // Carré autour de la zone trouvée, avec un peu de marge
  let s = Math.max(box.w, box.h) * 1.12;
  s = Math.max(side * 0.45, Math.min(side, s));
  let cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  let x = Math.min(Math.max(cx - s / 2, 0), w - s);
  let y = Math.min(Math.max(cy - s / 2, 0), h - s);
  return { x: x / k, y: y / k, size: s / k };
}

// Assiette : plus grande zone claire et peu saturée, favorisée si proche du centre
function plateBox(w, h, light, sat) {
  const n = w * h, mask = new Uint8Array(n), seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = light[i] > 0.62 && sat[i] < 0.16 ? 1 : 0;
  let best = null;
  const stack = [];
  for (let start = 0; start < n; start++) {
    if (!mask[start] || seen[start]) continue;
    let area = 0, minX = w, maxX = 0, minY = h, maxY = 0;
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= n || seen[j] || !mask[j]) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (area < n * 0.04) continue;                       // trop petit
    if (bw > w * 0.95 && bh > h * 0.95) continue;        // fond blanc, pas une assiette
    const ratio = bw / bh;
    if (ratio < 0.4 || ratio > 2.5) continue;            // une assiette est à peu près ronde
    const fill = area / (bw * bh);
    if (fill < 0.25) continue;                           // trop éparpillé
    const dx = (minX + bw / 2) / w - 0.5, dy = (minY + bh / 2) / h - 0.5;
    const score = area * (1 - Math.min(0.7, Math.hypot(dx, dy)));
    if (!best || score > best.score) best = { x: minX, y: minY, w: bw, h: bh, score };
  }
  return best;
}

// Nourriture : zone des pixels nettement colorés (centre et étendue)
function foodBox(w, h, light, sat) {
  let sx = 0, sy = 0, sw = 0;
  const pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const v = sat[i] > 0.28 && light[i] > 0.15 && light[i] < 0.92 ? sat[i] : 0;
    if (!v) continue;
    sx += x * v; sy += y * v; sw += v; pts.push([x, y, v]);
  }
  const min = Math.min(w, h);
  if (!sw) return { x: (w - min) / 2, y: (h - min) / 2, w: min, h: min };
  const cx = sx / sw, cy = sy / sw;
  let vx = 0, vy = 0;
  for (const [x, y, v] of pts) { vx += v * (x - cx) ** 2; vy += v * (y - cy) ** 2; }
  const spread = Math.sqrt(Math.max(vx, vy) / sw);
  const side = Math.max(min * 0.6, Math.min(min * 0.95, spread * 6));
  return { x: cx - side / 2, y: cy - side / 2, w: side, h: side };
}

// Miniature carrée (JPEG) prête à afficher dans le calendrier
async function makeSmartThumb(photoDataUrl) {
  const img = await loadImage(photoDataUrl);
  const crop = findPlateCrop(img);
  const c = document.createElement("canvas");
  c.width = c.height = THUMB_SIZE;
  c.getContext("2d").drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, THUMB_SIZE, THUMB_SIZE);
  return c.toDataURL("image/jpeg", 0.85);
}
