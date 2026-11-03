// Chat for the floating widget (every page) and the AI Hub page. Sends the
// conversation to /api/chat; the school facts and instructions live on the
// server, so visitors cannot change them.
(function () {
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');

  // Turns the model's light Markdown (bold, italics, lists) into safe HTML.
  // Text is escaped first, so only the tags added here can appear.
  function format(text) {
    let html = '';
    let list = null;
    for (const raw of escapeHtml(text).split('\n')) {
      const line = raw.trim();
      const bullet = line.match(/^[-*•]\s+(.*)/);
      const numbered = line.match(/^\d+[.)]\s+(.*)/);
      if (bullet || numbered) {
        const type = bullet ? 'ul' : 'ol';
        if (list !== type) {
          if (list) html += `</${list}>`;
          html += `<${type}>`;
          list = type;
        }
        html += `<li>${inline((bullet || numbered)[1])}</li>`;
        continue;
      }
      if (list) { html += `</${list}>`; list = null; }
      if (line) html += `<p>${inline(line)}</p>`;
    }
    if (list) html += `</${list}>`;
    return html;
  }

  // Wires up one chat box: a message log and a form with a text input.
  function setupChat(box, options) {
    const log = box.querySelector('[data-chat-log]');
    const form = box.querySelector('[data-chat-form]');
    const input = form.querySelector('input');
    const sendBtn = form.querySelector('button[type="submit"]');
    const history = [];
    let busy = false;

    const add = (role, text, extraClass) => {
      const el = document.createElement('div');
      el.className = 'chat-msg ' + role + (extraClass ? ' ' + extraClass : '');
      if (role === 'bot' && !extraClass) el.innerHTML = format(text);
      else el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    };

    const send = async (text) => {
      text = text.trim();
      if (!text || busy) return;
      busy = true;
      sendBtn.disabled = true;
      input.value = '';
      add('user', text);
      const typing = add('bot', 'Typing…', 'typing');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: history.slice(-10) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.reply) throw new Error(data.error || 'Request failed');
        typing.remove();
        add('bot', data.reply);
        history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
      } catch (err) {
        typing.remove();
        add('bot', "Sorry, I can't answer right now." +
          (options.phone ? ' Please call the school office on ' + options.phone + '.' : ''), 'error');
      } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      }
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

    return {
      send,
      greet() { if (!log.children.length && options.greeting) add('bot', options.greeting); },
    };
  }

  // ----- Floating widget -----
  const widget = document.getElementById('chatbot');
  if (widget) {
    const toggle = widget.querySelector('.chatbot-toggle');
    const win = widget.querySelector('.chatbot-window');
    const closeBtn = widget.querySelector('.chatbot-close');
    const chat = setupChat(win, widget.dataset);

    const setOpen = (open) => {
      win.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        chat.greet();
        win.querySelector('input').focus();
      }
    };
    toggle.addEventListener('click', () => setOpen(win.hidden));
    closeBtn.addEventListener('click', () => { setOpen(false); toggle.focus(); });
    win.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } });
  }

  // ----- AI Hub page -----
  document.querySelectorAll('[data-chat-panel]').forEach((panel) => {
    const chat = setupChat(panel, panel.dataset);
    chat.greet();
    panel.querySelectorAll('[data-suggestion]').forEach((btn) => {
      btn.addEventListener('click', () => chat.send(btn.dataset.suggestion));
    });
  });
})();
