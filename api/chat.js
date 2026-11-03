// POST /api/chat — answers visitor questions using the school facts from src/content.
// Works with any OpenAI-compatible chat API. Configure with environment variables:
//   CHAT_API_KEY  (required)  API key for the provider
//   CHAT_API_URL  (optional)  defaults to Together AI's chat completions endpoint
//   CHAT_MODEL    (optional)  model name for that provider
const site = require('../src/content/site.json');
const bot = require('../src/content/chatbot.json');
const { readJson, send } = require('./_lib/http');

const API_URL = process.env.CHAT_API_URL || 'https://api.together.xyz/v1/chat/completions';
const MODEL = process.env.CHAT_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const API_KEY = process.env.CHAT_API_KEY || process.env.TOGETHER_API_KEY;
const MAX_MESSAGE = 500;
const MAX_HISTORY = 10;

function systemPrompt() {
  const a = site.address;
  const phones = site.phones.map((p) => `${p.number} (${p.label})`).join(', ');
  return [
    `You are ${bot.name}, the friendly assistant on the official website of ${site.name} (${site.alternateName}), ${a.city}.`,
    'Answer questions from parents and students warmly and briefly (2-4 sentences), using only the facts below.',
    `If you are not sure of something, say so and suggest calling ${site.phones[0].number} or using the Contact page.`,
    'Never invent fees, dates, results or names. Politely decline questions unrelated to the school.',
    '',
    'School facts:',
    `- Name: ${site.name} (also known as ${site.alternateName})`,
    `- Motto: ${site.tagline}`,
    `- Established: ${site.foundedYear}`,
    `- Classes: ${site.grades}`,
    `- ${site.recognition}`,
    `- Principal: ${site.principal}`,
    `- Address: ${a.street}, ${a.city}, ${a.region} ${a.postalCode}`,
    `- School hours: ${site.hours.days}, ${site.hours.label}`,
    `- Phone: ${phones}`,
    `- Email: ${site.emails.map((e) => e.address).join(', ')}`,
    '- Website pages: Home, About, Admissions, Programs, Syllabus (free official Telangana SCERT textbooks for Class 9 and 10), News, Gallery, Contact',
    '',
    bot.knowledge,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!bot.enabled) return send(res, 404, { error: 'Chat is disabled' });
  if (!API_KEY) return send(res, 503, { error: 'Chat is not configured' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'Invalid request' });
  }

  const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);
  if (!message) return send(res, 400, { error: 'Message is required' });

  // Only user/assistant turns are accepted from the browser; the system prompt is server-side.
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 300,
        messages: [{ role: 'system', content: systemPrompt() }, ...history, { role: 'user', content: message }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      console.error('Chat provider error', r.status, (await r.text()).slice(0, 300));
      return send(res, 502, { error: 'Chat service unavailable' });
    }
    const data = await r.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return send(res, 502, { error: 'Empty reply' });
    return send(res, 200, { reply: reply.trim() });
  } catch (err) {
    console.error('Chat error', err.message);
    return send(res, 502, { error: 'Chat service unavailable' });
  }
};
