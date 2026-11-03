// Local development server: builds the site, rebuilds when anything in src/ or
// api/ changes, serves dist/ with clean URLs (like Vercel) and runs api/*.js.
// Usage: npm run dev   (then open http://localhost:3000)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { build } = require('./build');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

// Minimal .env loader (KEY=value per line) so API keys work locally.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

let building = Promise.resolve();
let rebuildQueue = Promise.resolve();
const rebuild = () => {
  building = building.then(() => build()).catch((err) => console.error('Build failed:', err.message));
  return building;
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/\/+$/, '') || '/';
  const candidates = clean === '/' ? ['index.html'] : [clean.slice(1), `${clean.slice(1)}.html`, `${clean.slice(1)}/index.html`];
  for (const c of candidates) {
    const file = path.join(DIST, c);
    if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
    const file = path.join(ROOT, 'api', `${name}.js`);
    if (!name || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    delete require.cache[require.resolve(file)];
    try {
      return await require(file)(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      return res.end('Server error');
    }
  }

  await building;
  const file = resolveFile(url.pathname);
  if (!file) {
    res.statusCode = 404;
    res.setHeader('Content-Type', TYPES['.html']);
    return res.end(fs.readFileSync(path.join(DIST, '404.html')));
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
});

rebuild().then(() => {
  server.listen(PORT, () => console.log(`Dev server running at http://localhost:${PORT}`));
  // Page requests that arrive while a change is pending wait for the rebuild.
  // `pending` is created synchronously on the first change and resolved by the
  // rebuild that the debounce timer schedules, so a change during a build can't strand it.
  let timer;
  let pending = null;
  let resolvePending = null;
  const onChange = () => {
    if (!pending) {
      pending = new Promise((resolve) => { resolvePending = resolve; });
      const wait = pending;
      building = building.then(() => wait);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      const done = resolvePending;
      pending = null;
      resolvePending = null;
      rebuildQueue = rebuildQueue.then(() => build()).catch((err) => console.error('Build failed:', err.message));
      rebuildQueue.then(done);
    }, 150);
  };
  fs.watch(path.join(ROOT, 'src'), { recursive: true }, onChange);
});
