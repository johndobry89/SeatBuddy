import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

// This original SVG is also the compact runtime logo. No fonts or external resources.
const folder = resolve(import.meta.dirname, '../public/icons');
const source = await readFile(resolve(folder, 'seatbuddies.svg'), 'utf8');
for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  const file = resolve(folder, `icon-${size}.png`);
  if (process.argv.includes('--check')) {
    if (!png.equals(await readFile(file)))
      throw new Error(`Icon ${size} differs from source. Run npm run icons.`);
  } else await writeFile(file, png);
}
console.log('SeatBuddies icons: 16, 32, 48 and 128 px match the original SVG.');
