/**
 * Generate placeholder PWA icons for Klassikern.
 * Creates minimal valid PNG files with the app's orange brand color
 * and a "K" letter centered in each icon.
 *
 * Run with: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");

mkdirSync(iconsDir, { recursive: true });

/**
 * Creates a minimal valid PNG file with a solid color background
 * and a centered "K" letter drawn with pixels.
 */
function createPNG(size, filename, maskable = false) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk("IHDR", ihdrData);

  // IDAT chunk - create image data
  // Orange: #f97316 = RGB(249, 115, 22)
  // White: RGB(255, 255, 255)
  const bgR = 249,
    bgG = 115,
    bgB = 22;
  const fgR = 255,
    fgG = 255,
    fgB = 255;

  // For maskable icons, add padding (safe zone is inner 80%)
  const padding = maskable ? Math.floor(size * 0.1) : 0;

  // Create raw image data (filter byte + RGB for each pixel per row)
  const rawData = Buffer.alloc(size * (1 + size * 3));

  // Define a simple "K" letter pattern relative to icon size
  const letterSize = Math.floor((size - padding * 2) * 0.5);
  const letterX = Math.floor((size - letterSize * 0.6) / 2);
  const letterY = Math.floor((size - letterSize) / 2);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 3);
    rawData[rowOffset] = 0; // filter: none

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;

      // Check if this pixel is part of the "K" letter
      const relX = x - letterX;
      const relY = y - letterY;
      const lineWidth = Math.max(2, Math.floor(size / 24));

      let isLetter = false;

      if (relY >= 0 && relY < letterSize) {
        // Vertical bar of K
        if (relX >= 0 && relX < lineWidth) {
          isLetter = true;
        }

        // Upper diagonal of K (going from middle-right to top-right)
        const mid = letterSize / 2;
        const diagX = lineWidth + (mid - relY) * (letterSize * 0.5) / mid;
        if (relY < mid && relX >= diagX - lineWidth && relX < diagX + lineWidth) {
          isLetter = true;
        }

        // Lower diagonal of K (going from middle to bottom-right)
        const diagX2 = lineWidth + (relY - mid) * (letterSize * 0.5) / mid;
        if (relY >= mid && relX >= diagX2 - lineWidth && relX < diagX2 + lineWidth) {
          isLetter = true;
        }
      }

      if (isLetter) {
        rawData[pixelOffset] = fgR;
        rawData[pixelOffset + 1] = fgG;
        rawData[pixelOffset + 2] = fgB;
      } else {
        rawData[pixelOffset] = bgR;
        rawData[pixelOffset + 1] = bgG;
        rawData[pixelOffset + 2] = bgB;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  const filepath = join(iconsDir, filename);
  writeFileSync(filepath, png);
  console.log(`Created ${filepath} (${size}x${size}, ${png.length} bytes)`);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate all required icons
createPNG(192, "icon-192.png");
createPNG(512, "icon-512.png");
createPNG(512, "icon-maskable-512.png", true);
createPNG(180, "apple-touch-icon.png");

console.log("\nAll icons generated successfully!");
