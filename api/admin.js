// /api/admin?action=… — backend for the admin panel at /admin.
//
// Login is a simple username + password, checked against environment variables,
// followed by a signed, HttpOnly session cookie. Saving commits the edited JSON files
// (and any new photos) to GitHub in one commit; Vercel then rebuilds the site.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   ADMIN_USERNAME   login name
//   ADMIN_PASSWORD   login password
//   GITHUB_TOKEN     fine-grained token with "Contents: read and write" on the repository
//   GITHUB_REPO      optional, defaults to MohammedAliKhan3/Moral-Merry
//   GITHUB_BRANCH    optional, defaults to main
//
// When run locally (npm run dev) edits are written straight to src/ instead of GitHub.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readJson, send, getOrigin, parseCookies } = require('./_lib/http');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = 'src/content';
const UPLOAD_DIR = 'src/images/uploads';
const LOCAL = !process.env.VERCEL;
const REPO = process.env.GITHUB_REPO || 'MohammedAliKhan3/Moral-Merry';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const COOKIE = 'mms_admin';
const SESSION_HOURS = 12;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// ---------------------------------------------------------------- sessions

const sessionKey = () => crypto.createHash('sha256')
  .update(`mms-admin|${process.env.ADMIN_USERNAME}|${process.env.ADMIN_PASSWORD}|${process.env.GITHUB_TOKEN || ''}`)
  .digest();

const sign = (value) => crypto.createHmac('sha256', sessionKey()).update(value).digest('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isLoggedIn(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const [expires, signature] = token.split('.');
  return Number(expires) > Date.now() && safeEqual(signature, sign(expires));
}

function sessionCookie(req, value, maxAge) {
  const secure = getOrigin(req).startsWith('https') ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

// Slows down password guessing (per server instance).
const failures = new Map();
function tooManyFailures(ip) {
  const f = failures.get(ip);
  return f && f.count >= 10 && Date.now() - f.since < 15 * 60 * 1000;
}
function recordFailure(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.since > 15 * 60 * 1000) failures.set(ip, { count: 1, since: Date.now() });
  else f.count += 1;
}

// ---------------------------------------------------------------- storage: GitHub or local disk

async function github(method, url, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'moral-merry-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${method} ${url}: ${r.status} ${data.message || ''}`);
  return data;
}

const contentNames = () => fs.readdirSync(path.join(ROOT, CONTENT_DIR))
  .filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

async function readContent(name) {
  const file = `${CONTENT_DIR}/${name}.json`;
  if (LOCAL) return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const data = await github('GET', `/contents/${file}?ref=${encodeURIComponent(BRANCH)}`);
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

async function storeUpload(relPath, base64) {
  if (LOCAL) {
    const out = path.join(ROOT, relPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(base64, 'base64'));
    return null;
  }
  const blob = await github('POST', '/git/blobs', { content: base64, encoding: 'base64' });
  return blob.sha;
}

async function saveFiles(files, uploads) {
  const entries = Object.entries(files).map(([name, data]) => ({
    path: `${CONTENT_DIR}/${name}.json`,
    content: `${JSON.stringify(data, null, 2)}\n`,
  }));

  if (LOCAL) {
    for (const e of entries) fs.writeFileSync(path.join(ROOT, e.path), e.content);
    return { local: true };
  }

  const ref = await github('GET', `/git/ref/heads/${encodeURIComponent(BRANCH)}`);
  const parent = await github('GET', `/git/commits/${ref.object.sha}`);
  const tree = await github('POST', '/git/trees', {
    base_tree: parent.tree.sha,
    tree: [
      ...entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', content: e.content })),
      ...uploads.map((u) => ({ path: u.path, mode: '100644', type: 'blob', sha: u.sha })),
    ],
  });
  const pages = Object.keys(files).join(', ') || 'photos';
  const commit = await github('POST', '/git/commits', {
    message: `Update ${pages} via admin panel`,
    tree: tree.sha,
    parents: [ref.object.sha],
  });
  await github('PATCH', `/git/refs/heads/${encodeURIComponent(BRANCH)}`, { sha: commit.sha });
  return { commit: commit.sha.slice(0, 7) };
}

// ---------------------------------------------------------------- request handling

const slug = (s) => String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';

module.exports = async function handler(req, res) {
  const url = new URL(req.url, getOrigin(req));
  const action = url.searchParams.get('action');

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return send(res, 503, { error: 'Admin login is not set up (ADMIN_USERNAME / ADMIN_PASSWORD missing).' });
  }
  if (!LOCAL && !process.env.GITHUB_TOKEN) {
    return send(res, 503, { error: 'Saving is not set up (GITHUB_TOKEN missing).' });
  }

  // All state-changing requests must be JSON POSTs from the admin page (blocks cross-site forms).
  if (req.method === 'POST' && req.headers['x-admin-request'] !== '1') {
    return send(res, 403, { error: 'Forbidden' });
  }

  try {
    if (action === 'login' && req.method === 'POST') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];
      if (tooManyFailures(ip)) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const { username, password } = await readJson(req);
      const ok = safeEqual(String(username || '').trim(), process.env.ADMIN_USERNAME)
        & safeEqual(String(password || ''), process.env.ADMIN_PASSWORD);
      if (!ok) {
        recordFailure(ip);
        await new Promise((r) => setTimeout(r, 800));
        return send(res, 401, { error: 'Wrong username or password.' });
      }
      failures.delete(ip);
      const expires = String(Date.now() + SESSION_HOURS * 3600 * 1000);
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, `${expires}.${sign(expires)}`, SESSION_HOURS * 3600) });
    }

    if (action === 'logout' && req.method === 'POST') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }

    if (!isLoggedIn(req)) return send(res, 401, { error: 'Please log in.' });

    if (action === 'session') {
      return send(res, 200, { ok: true, local: LOCAL, repo: REPO, branch: BRANCH });
    }

    if (action === 'content' && req.method === 'GET') {
      const name = url.searchParams.get('name');
      if (!contentNames().includes(name)) return send(res, 404, { error: 'Unknown page' });
      return send(res, 200, { data: await readContent(name) });
    }

    if (action === 'upload' && req.method === 'POST') {
      const { name, type, data } = await readJson(req, 6 * 1024 * 1024);
      const ext = IMAGE_TYPES[type];
      const bytes = Buffer.byteLength(String(data || ''), 'base64');
      if (!ext || !data) return send(res, 400, { error: 'Please upload a JPG, PNG or WebP photo.' });
      if (bytes > MAX_UPLOAD_BYTES) return send(res, 413, { error: 'Photo is too large.' });
      const relPath = `${UPLOAD_DIR}/${slug(name)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
      const sha = await storeUpload(relPath, data);
      return send(res, 200, { path: relPath.replace(/^src/, ''), repoPath: relPath, sha });
    }

    if (action === 'save' && req.method === 'POST') {
      const body = await readJson(req, 1024 * 1024);
      const allowed = contentNames();
      const files = {};
      for (const [name, data] of Object.entries(body.files || {})) {
        if (!allowed.includes(name)) return send(res, 400, { error: `Unknown page: ${name}` });
        if (!data || typeof data !== 'object' || Array.isArray(data)) return send(res, 400, { error: `Invalid data for ${name}` });
        files[name] = data;
      }
      const uploads = (Array.isArray(body.uploads) ? body.uploads : [])
        .filter((u) => u && /^src\/images\/uploads\/[a-z0-9-]+\.(jpg|png|webp)$/.test(u.repoPath) && /^[0-9a-f]{40}$/.test(u.sha))
        .map((u) => ({ path: u.repoPath, sha: u.sha }));
      if (!Object.keys(files).length && !uploads.length) return send(res, 400, { error: 'Nothing to save.' });
      return send(res, 200, { ok: true, ...(await saveFiles(files, uploads)) });
    }

    return send(res, 404, { error: 'Unknown action' });
  } catch (err) {
    console.error('Admin error', err.message);
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
