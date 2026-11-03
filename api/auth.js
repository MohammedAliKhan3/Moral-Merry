// GET /api/auth — step 1 of "Sign in with GitHub" for the admin panel.
// Redirects to GitHub; only accounts with write access to the repository can save changes.
// Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (from a GitHub OAuth App).
const crypto = require('crypto');
const { send, getOrigin } = require('./_lib/http');

module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return send(res, 500, '<p>Admin login is not configured (GITHUB_CLIENT_ID is missing).</p>');

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${getOrigin(req)}/api/callback`,
    scope: 'repo,user',
    state,
  });
  const secure = getOrigin(req).startsWith('https') ? '; Secure' : '';
  res.statusCode = 302;
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};
