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
const yaml = require('js-yaml');
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
  { tpl: 'ai-hub.html', path: '/ai-hub' },
  { tpl: '404.html', path: '/404', noSitemap: true },
];

function loadContent() {
  const dir = path.join(SRC, 'content');
  const content = {};
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    content[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  content.site.url = (process.env.SITE_URL || 'https://www.moralmerry.in').replace(/\/$/, '');
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

// Admin app: static files, the form definitions as JSON, and a map of every photo
// to a small thumbnail so the photo picker loads quickly.
function buildAdmin(images) {
  const dir = path.join(SRC, 'admin');
  for (const f of fs.readdirSync(dir)) {
    if (f !== 'schema.yml') writeFile(`admin/${f}`, fs.readFileSync(path.join(dir, f)));
  }
  const schema = yaml.load(fs.readFileSync(path.join(dir, 'schema.yml'), 'utf8'));
  writeFile('admin/schema.json', JSON.stringify(schema.collections[0].files));
  const media = {};
  for (const [src, i] of Object.entries(images)) media[src] = i.variants[0].url;
  writeFile('admin/media.json', JSON.stringify(media));
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

// Structured data for one page: the school, the website, this page, breadcrumbs
// (inner pages) and the FAQ (home page). Tells Google that moralmerry.in is the
// school's official site and links it to the school's other profiles.
function pageJsonLd(site, content, page, title, description) {
  const a = site.address;
  const names = [site.alternateName, ...(site.otherNames || [])].filter(Boolean);
  const pageUrl = site.url + (page.path === '/' ? '/' : page.path);
  const graph = [
    {
      '@type': 'School',
      '@id': `${site.url}/#school`,
      name: site.name,
      alternateName: names,
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
      areaServed: { '@type': 'City', name: a.city },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: site.hours.opens,
        closes: site.hours.closes,
      },
      employee: site.principal ? { '@type': 'Person', name: site.principal.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/, ''), jobTitle: 'Principal' } : undefined,
      sameAs: [...site.social.map((s) => s.url), ...(site.profiles || [])].filter(Boolean),
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      name: site.name,
      alternateName: names,
      url: `${site.url}/`,
      publisher: { '@id': `${site.url}/#school` },
      inLanguage: 'en-IN',
    },
    {
      '@type': page.path === '/about' ? 'AboutPage' : page.path === '/contact' ? 'ContactPage' : 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      isPartOf: { '@id': `${site.url}/#website` },
      about: { '@id': `${site.url}/#school` },
      inLanguage: 'en-IN',
    },
  ];
  if (page.path !== '/') {
    const crumbs = [{ name: 'Home', path: '/' }];
    if (page.article) crumbs.push({ name: 'News', path: '/news' });
    crumbs.push({ name: (title || '').split('|')[0].trim(), path: page.path });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: site.url + (c.path === '/' ? '/' : c.path) })),
    });
  }
  const faq = page.path === '/' && content.home.faq;
  if (faq && faq.items.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${site.url}/#faq`,
      mainEntity: faq.items.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

// Plain-text fact sheet for AI assistants and answer engines (llmstxt.org).
function llmsTxt(content, pages, absUrl) {
  const { site } = content;
  const a = site.address;
  const pageName = (p) => (p.path === '/' ? 'Home' : p.path === '/ai-hub' ? 'AI Hub'
    : p.path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  return [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `This is the official website of ${site.name} (also known as ${[site.alternateName, ...(site.otherNames || [])].join(', ')}).`,
    '',
    '## Key facts',
    `- Address: ${a.street}, ${a.city}, ${a.region} ${a.postalCode}, India`,
    `- Phone: ${site.phones.map((p) => p.number).join(', ')}`,
    `- Email: ${site.emails.map((e) => e.address).join(', ')}`,
    `- School hours: ${site.hours.days}, ${site.hours.label}`,
    `- Classes: ${site.grades} (Telangana State Board / SSC)`,
    `- Established: ${site.foundedYear}`,
    `- Principal: ${site.principal}`,
    `- Motto: ${site.tagline}`,
    `- ${site.recognition}`,
    '',
    '## Pages',
    ...pages.map((p) => `- [${pageName(p)}](${absUrl(p.path)})`),
    '',
  ].join('\n');
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
  buildAdmin(images);

  const helpers = makeHelpers(images, assets, site);
  const jsonLdFor = (page, title, description) => pageJsonLd(site, content, page, title, description);
  const base = { c: content, site, jsonLdFor, year: new Date().getFullYear(), ...helpers };
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

  // Sitemap, including the school's photos so they can appear in Google Images.
  const today = new Date().toISOString().slice(0, 10);
  const pageImages = {
    '/': [content.home.hero.image, ...content.home.campus.items.map((i) => i.image)],
    '/about': [content.about.mission.image, content.about.principal.photo],
    '/gallery': content.gallery.images.map((i) => i.src),
  };
  const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urls = pages.filter((p) => !p.noSitemap).map((p) => {
    const imgs = (pageImages[p.path] || []).filter((src) => images[src])
      .map((src) => `\n    <image:image><image:loc>${xmlEscape(site.url + helpers.imgUrl(src, 1600))}</image:loc></image:image>`).join('');
    return `  <url><loc>${helpers.absUrl(p.path)}</loc><lastmod>${today}</lastmod>${imgs}</url>`;
  });
  writeFile('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + `${urls.join('\n')}\n</urlset>\n`);
  writeFile('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.url}/sitemap.xml\n`);
  writeFile('llms.txt', llmsTxt(content, pages.filter((p) => !p.noSitemap), helpers.absUrl));

  console.log(`Built ${pages.length} pages and ${Object.keys(images).length} images in ${Date.now() - started} ms`);
}

module.exports = { build };

if (require.main === module) {
  build().catch((err) => { console.error(err); process.exit(1); });
}
