# Moral Merry High School – Website

Official website of Moral Merry High School, MG Nagar, Masab Tank, Hyderabad — **https://moralmerry.in**

A static site: pages are built ahead of time and served from Vercel's CDN, so there is no server to "wake up" (no Render-style cold start). Only the chatbot and the admin login run as small serverless functions.

## Folder layout

```
src/
  content/    All text, photos lists, fees, staff, news … (JSON). Edited through /admin.
  pages/      One HTML template per page (index, about, admissions, programs, news, gallery, contact, article, 404)
  partials/   Shared pieces: header (with SEO tags), footer, chatbot, call-to-action band
  css/        base / header / footer / chatbot (bundled into site.css) + one file per page
  js/         main (menu, animations, newsletter), chatbot, programs (tabs), gallery (lightbox, 360°), contact (form)
  images/     Original photos. The build makes resized WebP versions automatically.
  admin/      Admin panel (Sveltia CMS) and its config.yml
api/
  chat.js     Chatbot endpoint (POST /api/chat)
  auth.js, callback.js   "Sign in with GitHub" for the admin panel
scripts/
  build.js    Builds everything into dist/
  images.js   Photo resizing / WebP conversion, favicons, social-share image
  dev.js      Local dev server with auto-rebuild
vercel.json   Hosting config (build command, caching, security headers)
```

## Local development

```bash
npm install
npm run dev        # http://localhost:3000 — rebuilds when you save a file in src/
npm run build      # production build into dist/
```

Copy `.env.example` to `.env` and fill in keys to test the chatbot locally.

## Admin panel — moralmerry.in/admin

Not linked anywhere on the site and marked `noindex`, so search engines never list it. Anyone who finds the URL still has to sign in with a GitHub account that has **write access to this repository** — add the school staff as collaborators on GitHub to give them access.

Every save creates a commit on `main`; Vercel rebuilds and the change is live in about a minute. Photos uploaded in the admin go to `src/images` and are optimised automatically on build.

## Launch checklist

### 1. Deploy on Vercel
1. Sign in at vercel.com with the GitHub account → **Add New → Project** → import `MohammedAliKhan3/Moral-Merry-School`. Settings are read from `vercel.json`; nothing to change.
2. **Settings → Environment Variables**:
   - `CHAT_API_KEY` — key for the chatbot's AI provider (Together AI by default; set `CHAT_API_URL` and `CHAT_MODEL` to use another OpenAI-compatible provider).
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — from step 3.
3. Redeploy after adding variables.

### 2. Point moralmerry.in to Vercel
1. Vercel project → **Settings → Domains** → add `moralmerry.in` and `www.moralmerry.in` (set www to redirect to moralmerry.in).
2. At the domain registrar, replace the old Render records with the ones Vercel shows. Typically:
   - `A` record, host `@` → `76.76.21.21`
   - `CNAME` record, host `www` → `cname.vercel-dns.com`
3. Wait for Vercel to show the domain as valid (SSL is automatic), then remove the domain from Render and delete/suspend the Render service.

### 3. Admin login (GitHub OAuth App)
GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
- Homepage URL: `https://moralmerry.in`
- Authorization callback URL: `https://moralmerry.in/api/callback`

Copy the Client ID and a new Client Secret into Vercel (step 1.2).
(Until then, "Sign in Using Access Token" on the admin page works with a GitHub personal access token.)

### 4. Fix what Google shows
1. **Google Business Profile** — on the "MORAL MERRY HIGH SCHOOL" panel in Google Search, click **Own this business?** and verify (postcard, phone or video). Then set:
   - Website: `https://moralmerry.in`
   - Category: **High school** (add "School" / "Primary school" as secondary)
   - Hours: Monday–Saturday 8:00 AM – 3:00 PM (it currently shows "Open 24 hours")
   - Phone numbers, description, and photos.
2. **Google Search Console** — add a *Domain* property for `moralmerry.in` (verify with the DNS TXT record), then submit `https://moralmerry.in/sitemap.xml` and use *URL inspection → Request indexing* on the home page.
3. **Directory listings with old/wrong data** — claim or request corrections so every listing shows the same name, address and phone as the website, and links to moralmerry.in:
   - Justdial — "Edit this listing / Claim this business"
   - skul.in and schools.org.in — use their contact / update forms. schools.org.in copies government UDISE+ records, so the address there ("Sanjay Gandhi Nagar") must be corrected in the school's **UDISE+** profile by the head of school.
   - Ezyschooling — lists fees of ₹18,000–24,000; ask them to update it.
