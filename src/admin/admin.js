// Admin panel: log in, edit the website's text and photos, and publish.
// Forms are generated from /admin/schema.json (made from src/admin/schema.yml).
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);

  // Small DOM helper: h('div', { class: 'x', onclick: fn }, child, 'text')
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value' || (k in el && typeof v !== 'string')) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }

  // Where each content file appears on the website (for the "View page" link).
  const PAGE_PATHS = {
    site: '/', home: '/', about: '/about', admissions: '/admissions', programs: '/programs',
    syllabus: '/syllabus', news: '/news', gallery: '/gallery', contact: '/contact',
    'ai-hub': '/ai-hub', chatbot: '/ai-hub',
  };

  const state = {
    schema: [], media: {}, data: {}, dirty: new Set(), uploads: [], previews: {},
    current: null, session: null,
  };

  // ------------------------------------------------------------------ API

  async function api(action, { query = '', body } = {}) {
    const res = await fetch(`/api/admin?action=${action}${query}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-Admin-Request': '1' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && action !== 'login' && state.session) {
      showLogin('Your session ended. Please log in again — your edits are kept.');
    }
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  let toastTimer;
  function toast(message, isError) {
    const el = $('#toast');
    el.textContent = message;
    el.className = 'toast' + (isError ? ' error' : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 7000 : 5000);
  }

  // ------------------------------------------------------------------ login

  function showLogin(message) {
    $('#login').hidden = false;
    $('#login-error').textContent = message || '';
    $('#username').focus();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    $('#login-error').textContent = '';
    try {
      await api('login', { body: { username: $('#username').value, password: $('#password').value } });
      $('#password').value = '';
      $('#login').hidden = true;
      if (!state.session) await startApp();
    } catch (err) {
      $('#login-error').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#logout-btn').addEventListener('click', async () => {
    if (state.dirty.size && !confirm('You have unsaved changes. Log out anyway?')) return;
    await api('logout', { body: {} }).catch(() => {});
    state.dirty.clear();
    location.reload();
  });

  // ------------------------------------------------------------------ app

  async function startApp() {
    state.session = await api('session');
    const [schema, media] = await Promise.all([
      fetch('/admin/schema.json', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/admin/media.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]);
    state.schema = schema;
    state.media = media;

    const list = $('#page-list');
    const select = $('#page-select');
    for (const page of schema) {
      list.append(h('button', { type: 'button', 'data-name': page.name, onclick: () => openPage(page.name) },
        h('span', { text: page.label }), h('span', { class: 'dirty-dot', hidden: true })));
      select.append(h('option', { value: page.name, text: page.label }));
    }
    select.addEventListener('change', () => openPage(select.value));
    window.addEventListener('hashchange', () => {
      const name = location.hash.slice(1);
      if (name !== state.current && schema.some((p) => p.name === name)) openPage(name);
    });
    $('#app').hidden = false;
    const start = location.hash.slice(1);
    openPage(schema.some((p) => p.name === start) ? start : 'home');
  }

  async function openPage(name) {
    const page = state.schema.find((p) => p.name === name);
    state.current = name;
    history.replaceState(null, '', `#${name}`);
    $('#page-select').value = name;
    document.querySelectorAll('#page-list button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.name === name)));
    $('#view-link').href = PAGE_PATHS[name] || '/';

    const editor = $('#editor');
    editor.replaceChildren(h('p', { class: 'muted', text: 'Loading…' }));
    try {
      if (!state.data[name]) state.data[name] = (await api('content', { query: `&name=${encodeURIComponent(name)}` })).data;
    } catch (err) {
      editor.replaceChildren(h('p', { class: 'error', text: err.message }));
      return;
    }
    if (state.current !== name) return;
    editor.replaceChildren(
      h('div', { class: 'editor-head' },
        h('h1', { text: page.label }),
        h('a', { class: 'btn btn-ghost btn-small', href: PAGE_PATHS[name] || '/', target: '_blank', rel: 'noopener', text: 'View page ↗' })),
      renderFields(page.fields, state.data[name], () => markDirty(name)),
    );
  }

  function markDirty(name = state.current) {
    state.dirty.add(name);
    const dot = $(`#page-list button[data-name="${name}"] .dirty-dot`);
    if (dot) dot.hidden = false;
    $('#savebar').hidden = false;
    $('#save-status').textContent = `Unsaved changes on ${state.dirty.size} page${state.dirty.size > 1 ? 's' : ''}`;
  }

  $('#save-btn').addEventListener('click', async () => {
    const btn = $('#save-btn');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      const files = {};
      for (const name of state.dirty) files[name] = state.data[name];
      const result = await api('save', { body: { files, uploads: state.uploads } });
      state.dirty.clear();
      state.uploads = [];
      document.querySelectorAll('.dirty-dot').forEach((d) => { d.hidden = true; });
      $('#savebar').hidden = true;
      toast(result.local
        ? 'Saved to the project files. The local site rebuilds automatically.'
        : 'Saved! The website will show your changes in about a minute.');
    } catch (err) {
      toast(`Could not save: ${err.message}`, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Publish';
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty.size) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------------ form rendering

  const defaultFor = (field) => {
    switch (field.widget) {
      case 'number': return field.default ?? 0;
      case 'boolean': return field.default ?? false;
      case 'list': return [];
      case 'object': return Object.fromEntries((field.fields || []).map((f) => [f.name, defaultFor(f)]));
      default: return field.default ?? '';
    }
  };

  function renderFields(fields, obj, onChange) {
    const frag = document.createDocumentFragment();
    for (const field of fields) frag.append(renderField(field, obj, onChange));
    return frag;
  }

  function fieldWrap(field, control, id) {
    return h('div', { class: 'field' },
      h('label', { for: id, text: field.label }),
      field.hint ? h('small', { class: 'hint', text: field.hint }) : null,
      control);
  }

  let idCounter = 0;
  function renderField(field, obj, onChange) {
    const id = `f${++idCounter}`;
    const value = obj[field.name];
    const set = (v) => { obj[field.name] = v; onChange(); };

    switch (field.widget) {
      case 'text': {
        const rows = Math.min(12, Math.max(3, String(value || '').split('\n').length + Math.ceil(String(value || '').length / 90)));
        return fieldWrap(field, h('textarea', { id, rows, value: value ?? '', oninput: (e) => set(e.target.value) }), id);
      }
      case 'number':
        return fieldWrap(field, h('input', {
          id, type: 'number', step: field.value_type === 'float' ? 'any' : '1', value: value ?? '',
          oninput: (e) => set(e.target.value === '' ? null : Number(e.target.value)),
        }), id);
      case 'boolean':
        return h('div', { class: 'field' }, h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: !!value, onchange: (e) => set(e.target.checked) }), field.label));
      case 'select':
        return fieldWrap(field, h('select', { id, onchange: (e) => set(e.target.value) },
          (field.options || []).map((o) => h('option', { value: o, text: o, selected: o === value }))), id);
      case 'image':
        return imageField(field, obj, onChange);
      case 'object': {
        if (!obj[field.name] || typeof obj[field.name] !== 'object') obj[field.name] = defaultFor(field);
        const group = h('fieldset', { class: 'group' }, h('legend', { text: field.label }));
        group.append(renderFields(field.fields, obj[field.name], onChange));
        return group;
      }
      case 'list':
        if (!Array.isArray(obj[field.name])) obj[field.name] = [];
        return field.field ? primitiveList(field, obj[field.name], onChange) : objectList(field, obj[field.name], onChange);
      default:
        return fieldWrap(field, h('input', { id, type: 'text', value: value ?? '', oninput: (e) => set(e.target.value) }), id);
    }
  }

  // ---- images

  function previewUrl(src) {
    if (!src) return '';
    if (state.previews[src]) return state.previews[src];
    if (state.media[src]) return state.media[src];
    if (state.session && !state.session.local) {
      return `https://raw.githubusercontent.com/${state.session.repo}/${state.session.branch}/src${src}`;
    }
    return '';
  }

  function imageField(field, obj, onChange) {
    const img = h('img', { class: 'image-preview', alt: '', src: previewUrl(obj[field.name]) || undefined });
    const pathText = h('span', { class: 'image-path', text: obj[field.name] || 'No photo' });
    const update = (src) => {
      obj[field.name] = src;
      img.src = previewUrl(src) || '';
      pathText.textContent = src || 'No photo';
      onChange();
    };
    return h('div', { class: 'field' },
      h('span', { class: 'field-label', text: field.label }),
      field.hint ? h('small', { class: 'hint', text: field.hint }) : null,
      h('div', { class: 'image-field' }, img,
        h('div', { class: 'image-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Change photo', onclick: () => openPicker(update) }),
          field.required === false && obj[field.name]
            ? h('button', { type: 'button', class: 'btn btn-ghost btn-small btn-danger', text: 'Remove photo', onclick: (e) => { update(''); e.target.remove(); } })
            : null,
          pathText)));
  }

  // ---- lists

  function primitiveList(field, arr, onChange) {
    const wrap = h('div', { class: 'field' }, h('span', { class: 'field-label', text: field.label }));
    const rows = h('div');
    const render = () => {
      rows.replaceChildren(...arr.map((v, i) => h('div', { class: 'prim-row' },
        h('input', { type: 'text', value: v ?? '', 'aria-label': `${field.field.label} ${i + 1}`, oninput: (e) => { arr[i] = e.target.value; onChange(); } }),
        h('button', { type: 'button', class: 'icon-btn danger', title: 'Remove', 'aria-label': 'Remove', text: '✕', onclick: () => { arr.splice(i, 1); onChange(); render(); } }))));
    };
    render();
    wrap.append(rows, h('button', {
      type: 'button', class: 'btn btn-ghost btn-small', text: `+ Add ${field.field.label.toLowerCase()}`,
      onclick: () => { arr.push(''); onChange(); render(); rows.lastChild.querySelector('input').focus(); },
    }));
    return wrap;
  }

  function itemSummary(field, item, index) {
    if (field.summary) {
      const s = field.summary.replace(/\{\{fields\.(\w+)\}\}/g, (_, k) => item[k] || '').replace(/\s*[–(-]\s*\)?\s*$/, '').trim();
      if (s && s !== '()') return s;
    }
    const firstText = field.fields.find((f) => (!f.widget || f.widget === 'string' || f.widget === 'text') && item[f.name]);
    return firstText ? String(item[firstText.name]).slice(0, 80) : `Item ${index + 1}`;
  }

  function objectList(field, arr, onChange) {
    const imageKey = (field.fields.find((f) => f.widget === 'image') || {}).name;
    const container = h('div', { class: 'list-items' });
    const wrap = h('fieldset', { class: 'group' }, h('legend', { text: `${field.label} (${arr.length})` }), container);

    const render = (openIndex) => {
      wrap.querySelector('legend').textContent = `${field.label} (${arr.length})`;
      container.replaceChildren(...arr.map((item, i) => {
        const title = h('span', { class: 'item-title', text: itemSummary(field, item, i) });
        const thumb = imageKey ? h('img', { class: 'item-thumb', alt: '', src: previewUrl(item[imageKey]) || undefined }) : null;
        const changed = () => {
          title.textContent = itemSummary(field, item, i);
          if (thumb) thumb.src = previewUrl(item[imageKey]) || '';
          onChange();
        };
        const tool = (label, text, fn, cls = 'icon-btn') => h('button', {
          type: 'button', class: cls, title: label, 'aria-label': label, text,
          onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); },
        });
        const details = h('details', { class: 'item', open: i === openIndex },
          h('summary', {}, thumb, title, h('span', { class: 'item-tools' },
            i > 0 ? tool('Move up', '↑', () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); onChange(); render(); }) : null,
            i < arr.length - 1 ? tool('Move down', '↓', () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); onChange(); render(); }) : null,
            tool('Delete', '✕', () => {
              if (!confirm(`Delete "${itemSummary(field, item, i)}"?`)) return;
              arr.splice(i, 1); onChange(); render();
            }, 'icon-btn danger'))),
        );
        // Build the form only when the item is opened (gallery lists can be long).
        let built = false;
        const build = () => {
          if (built) return;
          built = true;
          details.append(h('div', { class: 'item-body' }, renderFields(field.fields, item, changed)));
        };
        if (i === openIndex) build();
        details.addEventListener('toggle', () => { if (details.open) build(); });
        return details;
      }));
    };
    render();
    wrap.append(h('button', {
      type: 'button', class: 'btn btn-ghost btn-small',
      text: `+ Add to ${field.label.replace(/\s*\(.*\)$/, '').toLowerCase()}`,
      onclick: () => {
        arr.push(Object.fromEntries(field.fields.map((f) => [f.name, defaultFor(f)])));
        onChange();
        render(arr.length - 1);
        container.lastChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    }));
    return wrap;
  }

  // ------------------------------------------------------------------ photo picker & upload

  const picker = $('#picker');
  let pickCallback = null;

  function openPicker(callback) {
    pickCallback = callback;
    $('.picker-status', picker).textContent = '';
    const paths = [...new Set([...Object.keys(state.previews), ...Object.keys(state.media)])];
    $('.picker-grid', picker).replaceChildren(...paths.map((p) => h('button', {
      type: 'button', title: p, onclick: () => choose(p),
    }, h('img', { src: previewUrl(p), alt: p, loading: 'lazy' }))));
    picker.showModal();
  }

  function choose(path) {
    picker.close();
    if (pickCallback) pickCallback(path);
  }

  $('.picker-close', picker).addEventListener('click', () => picker.close());
  picker.addEventListener('click', (e) => { if (e.target === picker) picker.close(); });

  // Shrinks phone photos in the browser before uploading (fast uploads, small files).
  async function prepareImage(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
    if (!bitmap) throw new Error('This file could not be read as a photo.');
    const panorama = bitmap.width / bitmap.height > 2.5;
    const max = panorama ? 4096 : 2000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' && file.size < 1.5e6 ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(type, 0.85);
    return { type, dataUrl, base64: dataUrl.split(',')[1] };
  }

  $('input[type="file"]', picker).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const status = $('.picker-status', picker);
    status.textContent = 'Uploading…';
    try {
      const img = await prepareImage(file);
      const result = await api('upload', { body: { name: file.name, type: img.type, data: img.base64 } });
      state.previews[result.path] = img.dataUrl;
      if (result.sha) state.uploads.push({ repoPath: result.repoPath, sha: result.sha });
      status.textContent = '';
      choose(result.path);
      toast('Photo added. Click "Save & Publish" to put it on the website.');
    } catch (err) {
      status.textContent = `Upload failed: ${err.message}`;
    }
  });

  // ------------------------------------------------------------------ start

  api('session')
    .then(() => startApp())
    .catch((err) => showLogin(/log in/i.test(err.message) ? '' : err.message));
})();
