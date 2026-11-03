// Chat widget. Sends the conversation to /api/chat; the school facts and
// instructions live on the server, so visitors cannot change them.
(function () {
  const root = document.getElementById('chatbot');
  if (!root) return;

  const toggle = root.querySelector('.chatbot-toggle');
  const win = root.querySelector('.chatbot-window');
  const closeBtn = root.querySelector('.chatbot-close');
  const list = root.querySelector('.chatbot-messages');
  const form = root.querySelector('.chatbot-form');
  const input = form.querySelector('input');
  const sendBtn = form.querySelector('button');
  const phone = root.dataset.phone;
  const history = [];
  let busy = false;

  const add = (role, text, extraClass) => {
    const el = document.createElement('p');
    el.className = 'chat-msg ' + role + (extraClass ? ' ' + extraClass : '');
    el.textContent = text;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  };

  const setOpen = (open) => {
    win.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!list.children.length) add('bot', root.dataset.greeting);
      input.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(win.hidden));
  closeBtn.addEventListener('click', () => { setOpen(false); toggle.focus(); });
  win.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
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
      add('bot', "Sorry, I can't answer right now." + (phone ? ' Please call the school office on ' + phone + '.' : ''));
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
