// Builds the static website into dist/:
//   src/pages/*.html  + src/content/*.json  ->  dist/*.html
//   src/css, src/js                         ->  dist/css, dist/js (cache-busted)
//   src/images                              ->  dist/images (resized WebP)
//   src/admin                               ->  dist/admin (content editor)
// plus sitemap.xml, robots.txt, favicons and the social-share image.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ejs = require('ejs');
const { processImages, makeBrandImages } = require('./images');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// Shared CSS bundled into one file that every page loads.
const SITE_CSS = ['base.css', 'header.css', 'footer.css', 'chatbot.css'];

const PAGES = [
  { tpl: 'index.html', path: '/' },
  { tpl: 'about.html', path: '/about' },
  { tpl: 'admissions.html', path: '/admissions' },
  { tpl: 'programs.html', path: '/programs' },
  { tpl: 'syllabus.html', path: '/syllabus' },
  { tpl: 'news.html', path: '/news' },
  { tpl: 'gallery.html', path: '/gallery' },
  { tpl: 'contact.html', path: '/contact' },
  { tpl: '404.html', path: '/404', noSitemap: true },
];

function loadContent() {
  const dir = path.join(SRC, 'content');
  const content = {};
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    content[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  content.site.url = (process.env.SITE_URL || 'https://moralmerry.in').replace(/\/$/, '');
  return content;
}

const hashOf = (data) => crypto.createHash('sha1').update(data).digest('hex').slice(0, 8);

function writeFile(rel, data) {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  return out;
}

function minifyCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

// Copies CSS/JS and returns a map of "/css/x.css" -> "/css/x.css?v=<hash>".
function buildAssets() {
  const assets = {};
  const add = (url, data) => { writeFile(url.slice(1), data); assets[url] = `${url}?v=${hashOf(data)}`; };

  const cssDir = path.join(SRC, 'css');
  add('/css/site.css', minifyCss(SITE_CSS.map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')));
  for (const f of fs.readdirSync(cssDir)) {
    if (!SITE_CSS.includes(f) && f.endsWith('.css')) add(`/css/${f}`, minifyCss(fs.readFileSync(path.join(cssDir, f), 'utf8')));
  }
  for (const f of fs.readdirSync(path.join(SRC, 'js'))) {
    add(`/js/${f}`, fs.readFileSync(path.join(SRC, 'js', f)));
  }
  return assets;
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true });
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function makeHelpers(images, assets, site) {
  const info = (src) => images[src];

  // URL of the variant closest to the requested width (or the original if unknown).
  const imgUrl = (src, width = 960) => {
    const i = info(src);
    if (!i) return src;
    if (width === 'full') return i.full;
    return (i.variants.find((v) => v.w >= width) || i.variants[i.variants.length - 1]).url;
  };

  // Responsive <img> with width/height (prevents layout shift) and lazy loading.
  const img = (src, opts = {}) => {
    const { alt = '', cls = '', sizes = '100vw', eager = false } = opts;
    const i = info(src);
    const attrs = [`alt="${escapeHtml(alt)}"`];
    if (cls) attrs.push(`class="${cls}"`);
    if (i) {
      const main = i.variants.find((v) => v.w >= 960) || i.variants[i.variants.length - 1];
      attrs.unshift(`src="${main.url}"`);
      attrs.push(`srcset="${i.variants.map((v) => `${v.url} ${v.w}w`).join(', ')}"`, `sizes="${sizes}"`);
      attrs.push(`width="${main.w}"`, `height="${Math.round(main.w * i.height / i.width)}"`);
    } else {
      if (src) console.warn(`  ! image not found in src/images: ${src}`);
      attrs.unshift(`src="${escapeHtml(src)}"`);
    }
    attrs.push(eager ? 'fetchpriority="high"' : 'loading="lazy"', 'decoding="async"');
    return `<img ${attrs.join(' ')}>`;
  };

  const asset = (url) => assets[url] || url;
  const absUrl = (p) => site.url + (p === '/' ? '/' : p);

  // Turns plain text with blank lines into escaped <p> paragraphs.
  const paragraphs = (text) => String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('\n');

  const tel = (n) => `tel:${String(n).replace(/[^\d+]/g, '')}`;
  const json = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

  return { img, imgUrl, asset, absUrl, paragraphs, tel, json, escapeHtml };
}

function schoolJsonLd(site) {
  const a = site.address;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'School',
        '@id': `${site.url}/#school`,
        name: site.name,
        alternateName: site.alternateName,
        slogan: site.tagline,
        description: site.description,
        url: `${site.url}/`,
        logo: `${site.url}/icon-512.png`,
        image: `${site.url}/images/share.jpg`,
        foundingDate: String(site.foundedYear),
        telephone: site.phones.map((p) => p.number),
        email: site.emails.map((e) => e.address),
        address: {
          '@type': 'PostalAddress',
          streetAddress: a.street,
          addressLocality: a.city,
          addressRegion: a.region,
          postalCode: a.postalCode,
          addressCountry: a.country,
        },
        geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
        hasMap: site.mapLink,
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: site.hours.opens,
          closes: site.hours.closes,
        },
        sameAs: site.social.map((s) => s.url).filter(Boolean),
      },
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        name: site.name,
        alternateName: site.alternateName,
        url: `${site.url}/`,
        publisher: { '@id': `${site.url}/#school` },
        inLanguage: 'en-IN',
      },
    ],
  };
}

async function build() {
  const started = Date.now();
  const content = loadContent();
  const { site } = content;

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const images = await processImages(path.join(SRC, 'images'), path.join(DIST, 'images'));
  const shareFile = images[site.shareImage] && images[site.shareImage].file;
  await makeBrandImages(path.join(SRC, site.logo.replace(/^\//, '')), shareFile, DIST);
  const assets = buildAssets();
  copyDir(path.join(SRC, 'static'), DIST);
  copyDir(path.join(SRC, 'admin'), path.join(DIST, 'admin'));

  const helpers = makeHelpers(images, assets, site);
  const base = { c: content, site, schoolJsonLd: schoolJsonLd(site), year: new Date().getFullYear(), ...helpers };
  const render = (tpl, page) => ejs.renderFile(path.join(SRC, 'pages', tpl),
    { ...base, page }, { views: [path.join(SRC, 'partials')], async: false });

  const pages = [...PAGES];
  for (const article of content.news.articles) {
    if (article.body && article.slug) pages.push({ tpl: 'article.html', path: `/news/${article.slug}`, article });
  }

  for (const page of pages) {
    const html = await render(page.tpl, page);
    writeFile(page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`, html);
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.filter((p) => !p.noSitemap).map((p) =>
    `  <url><loc>${helpers.absUrl(p.path)}</loc><lastmod>${today}</lastmod></url>`);
  writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`Built ${pages.length} pages and ${Object.keys(images).length} images in ${Date.now() - started} ms`);
}

module.exports = { build };

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}
