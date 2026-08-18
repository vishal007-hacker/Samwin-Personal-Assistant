// Regenerates build/icon.ico from client/public/logo.png.
// Run with: node make-icon.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';

const sizes = [16, 32, 48, 64, 128, 256];

const buffers = await Promise.all(
  sizes.map((size) =>
    sharp('../client/public/logo.png')
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

const icoBuffer = await pngToIco(buffers);
fs.writeFileSync('build/icon.ico', icoBuffer);
console.log('Icon written:', fs.statSync('build/icon.ico').size, 'bytes');
