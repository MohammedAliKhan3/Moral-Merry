// Converts every photo in src/images into resized WebP files with a content
// hash in the name, so browsers can cache them forever. Results are cached in
// node_modules/.cache so rebuilds only process new or changed photos.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const WIDTHS = [480, 960, 1600];
const FULL_MAX = 4096; // only for very wide images such as the panorama
const CACHE = path.join(__dirname, '..', 'node_modules', '.cache', 'mms-images');
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

async function cached(key, make) {
  const file = path.join(CACHE, key);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const buf = await make();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

// Returns a map: "/images/foo.jpg" -> { width, height, variants: [{ w, url }], full }
async function processImages(srcDir, outDir) {
  const map = {};
  const files = walk(srcDir).filter((f) => IMAGE_EXT.test(f));
  await Promise.all(files.map(async (file) => {
    const rel = path.relative(srcDir, file).split(path.sep).join('/');
    const data = fs.readFileSync(file);
    const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 8);
    // .rotate() applies the phone's EXIF orientation so photos are never sideways
    const meta = await sharp(data).rotate().metadata();
    const swap = (meta.orientation || 1) >= 5;
    const width = swap ? meta.height : meta.width;
    const height = swap ? meta.width : meta.height;
    const base = rel.replace(IMAGE_EXT, '');

    const sizes = WIDTHS.filter((w) => w < width);
    if (width <= WIDTHS[WIDTHS.length - 1]) sizes.push(width);
    const variants = [];
    for (const w of sizes) {
      const name = `${base}.${hash}-${w}.webp`;
      const buf = await cached(`${hash}-${w}.webp`, () =>
        sharp(data).rotate().resize({ width: w }).webp({ quality: 74 }).toBuffer());
      write(outDir, name, buf);
      variants.push({ w, url: `/images/${name}` });
    }
    let full = variants[variants.length - 1].url;
    if (width > 2000) {
      const w = Math.min(width, FULL_MAX);
      const name = `${base}.${hash}-full.webp`;
      const buf = await cached(`${hash}-full.webp`, () =>
        sharp(data).rotate().resize({ width: w }).webp({ quality: 80 }).toBuffer());
      write(outDir, name, buf);
      full = `/images/${name}`;
    }
    map[`/images/${rel}`] = { width, height, variants, full, file };
  }));
  return map;
}

function write(outDir, name, buf) {
  const out = path.join(outDir, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
}

// Favicons, the round header logo and the 1200x630 social-share image.
async function makeBrandImages(logoFile, shareFile, outDir) {
  const circle = (size) => Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  const round = (size) => sharp(logoFile).resize(size, size, { fit: 'cover' })
    .composite([{ input: circle(size), blend: 'dest-in' }]);
  write(outDir, 'favicon-32.png', await round(32).png().toBuffer());
  write(outDir, 'apple-touch-icon.png', await sharp(logoFile).resize(180, 180).png().toBuffer());
  write(outDir, 'icon-192.png', await round(192).png().toBuffer());
  write(outDir, 'icon-512.png', await round(512).png().toBuffer());
  write(outDir, 'images/logo-96.webp', await round(96).webp({ quality: 90 }).toBuffer());
  if (shareFile) {
    write(outDir, 'images/share.jpg', await sharp(shareFile).rotate()
      .resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer());
  }
}

module.exports = { processImages, makeBrandImages };
