import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ico from 'sharp-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.resolve(__dirname, '../src/images/icon.png');
const outPath = path.resolve(__dirname, '../public/favicon.ico');

const sizes = [16, 32];
const buffers = await Promise.all(
  sizes.map(async size => {
    return await sharp(srcPath).resize(size).toFormat('png').toBuffer();
  })
);

const icoBuffer = ico.encode(buffers);
await fs.writeFile(outPath, Buffer.from(icoBuffer));
console.log('Generated public/favicon.ico');
