// Gallery lightbox and the 360° panorama (its libraries load only when needed).
(function () {
  // ----- Lightbox -----
  const dialog = document.querySelector('.lightbox');
  const links = Array.from(document.querySelectorAll('.gallery-item'));
  if (dialog && links.length && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('img');
    const caption = dialog.querySelector('figcaption');
    let index = 0;

    const show = (i) => {
      index = (i + links.length) % links.length;
      const link = links[index];
      img.src = link.href;
      img.alt = link.dataset.caption || '';
      caption.textContent = link.dataset.caption || '';
    };

    links.forEach((link, i) => link.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
      dialog.showModal();
    }));
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
    dialog.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  // ----- Panorama -----
  const pano = document.getElementById('panorama');
  if (!pano) return;

  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const start = async () => {
    try {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = CDN + 'photo-sphere-viewer@4.8.1/dist/photo-sphere-viewer.min.css';
      document.head.appendChild(css);
      await loadScript(CDN + 'three@0.147.0/build/three.min.js');
      await loadScript(CDN + 'uevent@2.1.1/browser.min.js');
      await loadScript(CDN + 'photo-sphere-viewer@4.8.1/dist/photo-sphere-viewer.min.js');
      pano.innerHTML = '';
      new PhotoSphereViewer.Viewer({
        container: pano,
        panorama: pano.dataset.src,
        caption: pano.dataset.caption,
        navbar: ['zoom', 'move', 'caption', 'fullscreen'],
        defaultLong: '130deg',
        mousewheel: false,
        // The photo is a wide strip, not a full sphere: place it on the horizon.
        panoData: (image) => {
          const fullWidth = image.width;
          const fullHeight = Math.round(fullWidth / 2);
          return {
            fullWidth, fullHeight,
            croppedWidth: image.width, croppedHeight: image.height,
            croppedX: 0, croppedY: Math.round((fullHeight - image.height) / 2),
          };
        },
      });
    } catch (err) {
      pano.innerHTML = '<p class="panorama-loading">The panorama could not be loaded.</p>';
    }
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '300px' });
    io.observe(pano);
  } else {
    start();
  }
})();
