// Sends the contact form to Formspark (submit-form.com) without leaving the page.
(function () {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Request failed');
      form.reset();
      status.textContent = form.dataset.success;
      status.classList.add('success');
    } catch (err) {
      status.textContent = 'Sorry, your message could not be sent. Please call or email us instead.';
      status.classList.add('error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send Message';
    }
  });
})();
