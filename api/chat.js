// POST /api/chat — answers school questions and helps students with their studies,
// using the school facts from src/content. Works with any OpenAI-compatible chat API:
//   GROQ_API_KEY  (required)  API key (CHAT_API_KEY also works, for other providers)
//   CHAT_API_URL  (optional)  defaults to Groq's chat completions endpoint
//   CHAT_MODEL    (optional)  defaults to Llama 4 Scout on Groq
const site = require('../src/content/site.json');
const bot = require('../src/content/chatbot.json');
const { readJson, send } = require('./_lib/http');

const API_URL = process.env.CHAT_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.CHAT_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const API_KEY = process.env.GROQ_API_KEY || process.env.CHAT_API_KEY;
const MAX_MESSAGE = 500;
const MAX_HISTORY = 10;

function systemPrompt() {
  const a = site.address;
  const phones = site.phones.map((p) => `${p.number} (${p.label})`).join(', ');
  return [
    `You are ${bot.name}, the friendly AI assistant and learning buddy on the official website of ${site.name} (${site.alternateName}), ${a.city}.`,
    'You help in two ways:',
    '1. School questions from parents and students: answer warmly and briefly using only the school facts below.',
    `   If you are not sure, say so and suggest calling ${site.phones[0].number} or using the Contact page.`,
    '   Never invent fees, dates, results or names; send fee questions to the school office.',
    '2. Study and homework help for students (Nursery to Class 10): explain concepts simply, step by step,',
    '   with child-friendly examples and real-life uses. Encourage curiosity and guide students to the answer',
    '   rather than only giving it. Praise effort.',
    'Keep every reply school-appropriate, kind and short (under about 150 words). Politely decline anything',
    'unsafe or unrelated to school and learning.',
    'Formatting: plain sentences; use "- " for bullet points, "1. " for numbered steps, and **bold** for key terms.',
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
    '- Website pages: Home, About, Admissions (includes fees), Programs, Syllabus (free official Telangana SCERT textbooks for Class 9 and 10), News, Gallery, AI Hub, Contact',
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
        temperature: 0.5,
        max_tokens: 500,
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
