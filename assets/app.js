/* assets/app.js - updated: category-aware + randomized loader + lazy-batch + search */
(function () {
  'use strict';

  // CONFIG
  const BATCH_SIZE = 8;
  const SENTINEL_ID = 'sentinel';
  const CARDS_CONTAINER_ID = 'cardsArea';
  const SPINNER_ID = 'spinner';
  const ENDMSG_ID = 'endMessage';

  // Try to derive default JSON path from site base (if set)
  const SITE_BASE = (window.SITE_BASE && String(window.SITE_BASE).replace(/\/$/, '')) || '';
  const DEFAULT_JSON = SITE_BASE + '/data/default.json';

  // HELPERS
  const qs = (s, p = document) => p.querySelector(s);
  const qsa = (s, p = document) => Array.from((p || document).querySelectorAll(s));
  const safe = s => (s == null ? '' : String(s));
  const shuffle = arr => {
    // Fisher–Yates shuffle (non-destructive copy)
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // App state
  let allData = [];
  let idx = 0;
  let observer = null;

  // Determine JSON url for THIS page
  function getPageDataUrl() {
    const main = qs('main') || qs('body');
    if (main && main.dataset && main.dataset.src) {
      return main.dataset.src;
    }
    // support global SITE_DATA if used
    if (window.SITE_DATA && typeof window.SITE_DATA === 'string') return window.SITE_DATA;
    return DEFAULT_JSON;
  }

  async function fetchJson(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j)) {
        console.warn('JSON is not an array:', url);
        return [];
      }
      return j;
    } catch (e) {
      console.error('fetchJson failed for', url, e);
      return [];
    }
  }

  function placeholderSVG(w = 136, h = 192) {
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><rect width="100%" height="100%" fill="#f4f6f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b0b7bd" font-size="13">No image</text></svg>`;
  }

  function createCard(item) {
    const title = safe(item.title);
    const desc = safe(item.desc || item.summary || '');
    const img = safe(item.img);
    const link = safe(item.link || '#');

    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
      <div class="card-content">
        <div class="media">
          ${img ? `<img src="${img}" alt="${title}" loading="lazy">` : placeholderSVG()}
        </div>
        <div class="body">
          <h3 class="title">${title}</h3>
          <div class="hr"></div>
          <p class="desc">${desc}</p>
          <div class="offer-row">
            <div class="offer-text">ডিসকাউন্ট পেতে এখানে কিনুন</div>
            <a class="btn" href="${link}" target="_blank" rel="noopener noreferrer">Buy Now</a>
          </div>
        </div>
      </div>
    `.trim();
    return article;
  }

  function appendBatch() {
    const container = qs(`#${CARDS_CONTAINER_ID}`);
    if (!container) return;
    const spinner = qs(`#${SPINNER_ID}`);
    spinner && (spinner.hidden = false);

    setTimeout(() => {
      const slice = allData.slice(idx, idx + BATCH_SIZE);
      slice.forEach(item => {
        container.appendChild(createCard(item));
      });
      idx += slice.length;
      spinner && (spinner.hidden = true);

      if (idx >= allData.length) {
        const endmsg = qs(`#${ENDMSG_ID}`);
        endmsg && (endmsg.hidden = false);
        if (observer && qs(`#${SENTINEL_ID}`)) {
          try { observer.unobserve(qs(`#${SENTINEL_ID}`)); } catch (e) { /* ignore */ }
        }
      }
    }, 80);
  }

  async function loadAndStart() {
    const dataUrl = getPageDataUrl();
    if (!dataUrl) {
      console.warn('No data URL found for page; set data-src on <main> or window.SITE_DATA');
      return;
    }

    // attempt to expand relative (if user provided relative without base)
    let urlToFetch = dataUrl;
    if (dataUrl.startsWith('/') && SITE_BASE) {
      // if dataUrl already absolute path starts with / then OK
      urlToFetch = (SITE_BASE + dataUrl).replace(/\/{2,}/g, '/');
    } else if (!dataUrl.startsWith('http') && SITE_BASE && !dataUrl.startsWith('/')) {
      // relative path — prefix base + '/'
      urlToFetch = (SITE_BASE + '/' + dataUrl).replace(/\/{2,}/g, '/');
    }

    console.info('Loading JSON for cards from:', urlToFetch);
    const json = await fetchJson(urlToFetch);
    if (!json.length) {
      // try fallback (site base + default)
      if (urlToFetch !== DEFAULT_JSON) {
        console.info('Falling back to default JSON:', DEFAULT_JSON);
        const fallback = await fetchJson(DEFAULT_JSON);
        allData = shuffle(fallback);
      } else {
        allData = [];
      }
    } else {
      allData = shuffle(json); // RANDOMIZE here
    }

    idx = 0;
    const container = qs(`#${CARDS_CONTAINER_ID}`);
    if (container) container.innerHTML = '';
    appendBatch();
    initObserver();
  }

  function initObserver() {
    const sentinel = qs(`#${SENTINEL_ID}`);
    if (!sentinel) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) appendBatch();
      });
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
  }

  // simple client search (filters current allData)
  function performSearch(q) {
    q = (q || '').trim().toLowerCase();
    const container = qs(`#${CARDS_CONTAINER_ID}`);
    if (!container) return;
    container.innerHTML = '';
    idx = 0;
    qs(`#${ENDMSG_ID}`) && (qs(`#${ENDMSG_ID}`).hidden = true);

    if (!q) { appendBatch(); return; }
    const results = allData.filter(item => {
      const hay = `${safe(item.title)} ${safe(item.desc || '')} ${safe(item.summary || '')}`.toLowerCase();
      return hay.includes(q);
    });
    results.forEach(item => container.appendChild(createCard(item)));
  }

  // init
  document.addEventListener('DOMContentLoaded', () => {
    loadAndStart();
    window.performSearch = performSearch;
  });

})();
