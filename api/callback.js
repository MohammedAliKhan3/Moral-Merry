// GET /api/callback — step 2 of "Sign in with GitHub": swaps GitHub's code for a token
// and hands it to the admin panel window that opened this popup (same site only).
const { send, getOrigin, parseCookies } = require('./_lib/http');

function reply(res, origin, status, content) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html><head><meta name="robots" content="noindex"></head><body>
<p>${status === 'success' ? 'Signed in. You can close this window.' : 'Sign-in failed. Please close this window and try again.'}</p>
<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  var message = ${JSON.stringify(message)};
  function receive(e) {
    if (e.origin !== origin) return;
    window.removeEventListener('message', receive);
    window.opener.postMessage(message, origin);
  }
  if (!window.opener) return;
  window.addEventListener('message', receive);
  window.opener.postMessage('authorizing:github', origin);
})();
</script></body></html>`;
  send(res, 200, html, { 'Set-Cookie': 'oauth_state=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0' });
}

module.exports = async function handler(req, res) {
  const origin = getOrigin(req);
  const url = new URL(req.url, origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state || state !== parseCookies(req).oauth_state) {
    return reply(res, origin, 'error', { message: 'Invalid sign-in request' });
  }

  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${origin}/api/callback`,
      }),
    });
    const data = await r.json();
    if (!data.access_token) return reply(res, origin, 'error', { message: data.error_description || 'Sign-in failed' });
    return reply(res, origin, 'success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    return reply(res, origin, 'error', { message: 'Could not reach GitHub' });
  }
};
