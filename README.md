# Moral Merry High School – Website

Official website of Moral Merry High School, MG Nagar, Masab Tank, Hyderabad — **https://moralmerry.in**

A static site: pages are built ahead of time and served from Vercel's CDN, so there is no server to "wake up" (no Render-style cold start). Only the chatbot / AI Hub and the admin panel run as small serverless functions.

## Folder layout

```
src/
  content/    All text, photo lists, fees, staff, news, FAQ … (JSON). Edited through /admin.
  pages/      One HTML template per page (index, about, admissions, programs, syllabus, news, gallery, contact, ai-hub, article, 404)
  partials/   Shared pieces: header (with SEO tags), footer, chatbot, call-to-action band
  css/        base / header / footer / chatbot (bundled into site.css) + one file per page
  js/         main (menu, animations, newsletter), chatbot, programs (tabs), gallery (lightbox, 360°), contact (form)
  images/     Original photos (admin uploads go to images/uploads). The build makes resized WebP versions.
  admin/      Admin app (index.html, admin.js, admin.css) and schema.yml, the form definitions for each page
api/
  chat.js     Chatbot and AI Hub endpoint (POST /api/chat)
  admin.js    Admin login, reading content, photo uploads and publishing (/api/admin?action=…)
scripts/
  build.js    Builds everything into dist/ (pages, structured data, sitemap with images, robots.txt, llms.txt)
  images.js   Photo resizing / WebP conversion, favicons, social-share image
  dev.js      Local dev server with auto-rebuild
vercel.json   Hosting config (build command, caching, security headers, redirects)
```

## Local development

```bash
npm install
npm run dev        # http://localhost:3000 — rebuilds when you save a file in src/
npm run build      # production build into dist/
```

Copy `.env.example` to `.env` and fill in the values. Locally, the admin panel saves straight into `src/` (no GitHub token needed).

## Admin panel — moralmerry.in/admin

A simple username and password login. Not linked anywhere on the site and marked `noindex`, so search engines never list it.

- Every page of the website is a form with plain-language labels: text, photos, teachers, news, gallery, fees, FAQ, syllabus links, chatbot knowledge.
- **Change photo** picks an existing photo or uploads a new one (phone photos are shrunk automatically before upload).
- **Save & Publish** commits all changes to GitHub in one commit; Vercel rebuilds and the website updates in about a minute.
- Security: password checked on the server, signed HttpOnly session cookie (12 hours), repeated wrong passwords are slowed down and blocked for 15 minutes.

The username and password are **not** in the code (the repository is public). They live in Vercel's environment variables.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it is |
|---|---|
| `GROQ_API_KEY` | Chatbot / AI Hub key from console.groq.com |
| `ADMIN_USERNAME` | Admin login name |
| `ADMIN_PASSWORD` | Admin password |
| `GITHUB_TOKEN` | Lets the admin save. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate: Repository access *Only select repositories* → `Moral-Merry`; Permissions → **Contents: Read and write**; expiry as long as allowed (renew before it expires). |

After adding or changing a variable, redeploy (Deployments → ⋯ → Redeploy).

## Going live on moralmerry.in

1. Vercel project → **Settings → Domains**: `moralmerry.in` (Production) and `www.moralmerry.in` (redirect to moralmerry.in).
2. At **GoDaddy** (the domain's DNS host) → My Products → moralmerry.in → DNS, replace the Render records:
   - `A` record, name `@` → `76.76.21.21`
   - `CNAME` record, name `www` → `cname.vercel-dns.com`
   (Use the exact values Vercel shows if they differ.)
3. When Vercel shows both domains as **Valid**, remove the domain from the Render service "Moral-Merry" and suspend it. Turn off Render's Auto-Deploy until then.

## Getting to #1 on Google for the school's name

The site already does its part: "Official website" in titles and footer, School + FAQ structured data with address, phones, hours, founding year, principal and every name people use, links (`sameAs`) to the YouTube channel and Justdial listing, a sitemap that includes photos, and `llms.txt` for AI assistants. What remains has to be done in Google and on other sites:

1. **Google Search Console** (search.google.com/search-console): add a *Domain* property `moralmerry.in`, verify with the TXT record at GoDaddy, submit `https://moralmerry.in/sitemap.xml`, then *URL inspection → Request indexing* for the home page.
2. **Google Business Profile** (the "MORAL MERRY HIGH SCHOOL" panel in search): click **Own this business?** and verify. Then set Website `https://moralmerry.in`, category **High school**, hours Monday–Saturday 8:00 AM – 3:00 PM (it shows "Open 24 hours"), and add photos. This is the single biggest factor for local searches.
3. **Bing Webmaster Tools** (bing.com/webmasters): import from Search Console. Bing powers ChatGPT search and Copilot.
4. **YouTube channel** @moralmerryschool: add `https://moralmerry.in` to the channel's links and to video descriptions.
5. **Correct the listings with old or wrong data** (each should show the same name, address and phone as the website, and link to it):
   - Justdial — claim the listing, add the website.
   - Mappls / MapmyIndia — old address "9/4/86/60 and 61, Sanjay Gandhi Nagar"; suggest an edit.
   - schools.org.in, iCBSE, skul.in — copy government UDISE+ data (old address, "established 2000"). Fix it in the school's **UDISE+** profile; these sites update from it.
   - Ezyschooling — lists fees of ₹18,000–24,000; ask them to correct or remove.
6. Ask happy parents to leave **Google reviews** once the profile is claimed.

Brand searches ("moral merry school") usually show the official site first within days to a few weeks of steps 1–2.
