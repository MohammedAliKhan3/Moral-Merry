// Site-wide behaviour: mobile menu, scroll-reveal animations and newsletter forms.
(function () {
  // ----- Mobile menu -----
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  // ----- Reveal elements as they scroll into view -----
  const items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-visible'));
  }

  // ----- Newsletter (Mailchimp JSONP, so we can show the real result) -----
  document.querySelectorAll('.newsletter-form').forEach((form) => {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button');
    const input = form.querySelector('input[type="email"]');
    const show = (msg, ok) => {
      status.textContent = msg;
      status.className = 'form-status ' + (ok ? 'success' : 'error');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.checkValidity()) { show('Please enter a valid email address.', false); return; }
      button.disabled = true;
      const cb = 'mc_' + Date.now();
      const script = document.createElement('script');
      const done = (msg, ok) => {
        show(msg, ok);
        button.disabled = false;
        delete window[cb];
        script.remove();
      };
      const timer = setTimeout(() => done('Could not subscribe right now. Please try again later.', false), 10000);
      window[cb] = (res) => {
        clearTimeout(timer);
        if (res.result === 'success') {
          form.reset();
          done('Thank you! Please check your inbox to confirm.', true);
        } else {
          const already = /already subscribed/i.test(res.msg || '');
          done(already ? 'You are already subscribed.' : 'Please check your email address and try again.', already);
        }
      };
      script.src = form.action.replace('/post?', '/post-json?') +
        '&EMAIL=' + encodeURIComponent(input.value) + '&c=' + cb;
      script.onerror = () => { clearTimeout(timer); done('Could not subscribe right now. Please try again later.', false); };
      document.body.appendChild(script);
    });
  });
})();
