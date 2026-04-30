import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const SRC = 'C:/Users/petr.hois/Downloads/DrMaxLogo.png';
const DST_PNG = 'public/assets/logo.png';
const DST_WEBP = 'public/assets/logo.webp';

const input = sharp(SRC);
const meta = await input.metadata();
console.log(`Source: ${meta.width}x${meta.height} (${meta.format}, channels: ${meta.channels})`);

const { data, info } = await input
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;

// Sample background colour from corners
function sample(x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}
const corners = [sample(0, 0), sample(width - 1, 0), sample(0, height - 1), sample(width - 1, height - 1)];
const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);
console.log(`Background colour (avg of corners): rgb(${bgR}, ${bgG}, ${bgB})`);

const TOLERANCE = 70;
const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

function isBgLike(idx) {
  const dr = data[idx] - bgR;
  const dg = data[idx + 1] - bgG;
  const db = data[idx + 2] - bgB;
  return dr * dr + dg * dg + db * db < TOLERANCE_SQ;
}

// Flood-fill from every border pixel: any bg-like pixel reachable from the border
// becomes transparent. The brand "+" in the middle is enclosed by the white pill,
// so it is not reachable from the border and survives.
const visited = new Uint8Array(width * height);
const queue = [];

function enqueueIfBg(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const pi = y * width + x;
  if (visited[pi]) return;
  if (!isBgLike(pi * 4)) return;
  visited[pi] = 1;
  queue.push(pi);
}

for (let x = 0; x < width; x++) {
  enqueueIfBg(x, 0);
  enqueueIfBg(x, height - 1);
}
for (let y = 0; y < height; y++) {
  enqueueIfBg(0, y);
  enqueueIfBg(width - 1, y);
}

let cleared = 0;
while (queue.length > 0) {
  const pi = queue.pop();
  data[pi * 4 + 3] = 0;
  cleared++;
  const x = pi % width;
  const y = Math.floor(pi / width);
  enqueueIfBg(x + 1, y);
  enqueueIfBg(x - 1, y);
  enqueueIfBg(x, y + 1);
  enqueueIfBg(x, y - 1);
}
console.log(`Flood-filled ${cleared} background pixels to transparent`);

// Soft anti-alias: for non-cleared pixels still close to bg colour, slightly reduce alpha.
// This kills the green halo around the white pill edge.
const SOFT_RADIUS = 100;
const SOFT_RADIUS_SQ = SOFT_RADIUS * SOFT_RADIUS;
let softened = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  const dr = data[i] - bgR;
  const dg = data[i + 1] - bgG;
  const db = data[i + 2] - bgB;
  const distSq = dr * dr + dg * dg + db * db;
  if (distSq < SOFT_RADIUS_SQ && distSq >= TOLERANCE_SQ) {
    // Only soften pixels that are spatially adjacent to a transparent pixel
    // (skip — for simplicity we soften globally; the inner "+" pixels are far
    // enough from bg colour that they pass the SOFT_RADIUS filter)
    const t = (Math.sqrt(distSq) - TOLERANCE) / (SOFT_RADIUS - TOLERANCE);
    data[i + 3] = Math.round(t * 255);
    softened++;
  }
}
console.log(`Softened ${softened} edge pixels`);

// Find content bounding box
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = data[(y * width + x) * 4 + 3];
    if (a > 32) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log(`Content bbox: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);

const PAD = 4;
const cropX = Math.max(0, minX - PAD);
const cropY = Math.max(0, minY - PAD);
const cropW = Math.min(width, maxX + PAD) - cropX;
const cropH = Math.min(height, maxY + PAD) - cropY;
console.log(`Crop: ${cropW}x${cropH} at (${cropX}, ${cropY})`);

mkdirSync(dirname(DST_PNG), { recursive: true });

const cropped = sharp(data, { raw: { width, height, channels: 4 } })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH });

await cropped.clone().png({ compressionLevel: 9 }).toFile(DST_PNG);
console.log(`Wrote ${DST_PNG}`);

await cropped.clone().webp({ quality: 95, lossless: false }).toFile(DST_WEBP);
console.log(`Wrote ${DST_WEBP}`);

const finalMeta = await sharp(DST_PNG).metadata();
console.log(`Final: ${finalMeta.width}x${finalMeta.height}`);
