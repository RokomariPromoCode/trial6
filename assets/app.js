/* assets/app.js - card loader + search (safe base handling + preview support) */
(function(){
  'use strict';

  const BATCH_SIZE = 8;
  const CARDS_CONTAINER_ID = 'cardsArea';
  const SENTINEL_ID = 'sentinel';
  const SPINNER_ID = 'spinner';
  const ENDMSG_ID = 'endMessage';

  const SITE_BASE = (window.SITE_BASE && String(window.SITE_BASE).replace(/\/$/,'')) || '';

  // helpers
  const qs = (s,p=document)=>p.querySelector(s);
  const shuffle = arr => { const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };
  const safe = s => s==null? '': String(s);

  let allData = [], idx=0, observer=null;

  // compute page data url safely
  function getPageDataUrl(){
    const main = qs('main') || qs('body');
    if (main && main.dataset && main.dataset.src) return main.dataset.src;
    if (window.SITE_DATA && typeof window.SITE_DATA === 'string') return window.SITE_DATA;
    return (SITE_BASE ? SITE_BASE + '/data/default.json' : '/data/default.json');
  }

  async function fetchJson(url){
    try {
      // normalize url: if starts with http use as-is; if starts with '/' use as-is; else prefix SITE_BASE if available
      let u = url;
      if (/^https?:\/\//i.test(u)) {}
      else if (u.startsWith('/')) {}
      else if (SITE_BASE) u = (SITE_BASE + '/' + u).replace(/\/{2,}/g,'/');
      // final normalization: if u starts with SITE_BASE twice remove duplicates
      u = u.replace(/\/{2,}/g,'/');
      const r = await fetch(u, {cache:'no-store'});
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch(e){
      console.error('fetchJson failed for', url, e);
      return [];
    }
  }

  function createCard(item){
    const title = safe(item.title);
    const author = safe(item.author || '');
    const seller = safe(item.seller || '');
    const desc = safe(item.desc || '');
    const img = safe(item.img);
    const link = safe(item.link || '#');

    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
      <div class="card-content">
        <div class="media">${ img ? `<img src="${img}" alt="${title}" loading="lazy">` : '<div class="no-image">No image</div>' }</div>
        <div class="body">
          <h3 class="title">${title}</h3>
          <div class="meta">${author ? 'লেখক: '+author : ''} ${seller? ' • বিক্রেতা: '+seller : ''}</div>
          <div class="hr"></div>
          <p class="desc">${desc}</p>
          <div class="offer-row"><div class="offer-text">ডিসকাউন্ট পেতে এখানে কিনুন</div><a class="btn" href="${link}" target="_blank" rel="noopener">Buy Now</a></div>
        </div>
      </div>
    `;
    return article;
  }

  function appendBatch(){
    const container = qs(`#${CARDS_CONTAINER_ID}`);
    if(!container) return;
    const spinner = qs(`#${SPINNER_ID}`); spinner && (spinner.hidden = false);
    setTimeout(()=> {
      const slice = allData.slice(idx, idx + BATCH_SIZE);
      slice.forEach(item => container.appendChild(createCard(item)));
      idx += slice.length;
      spinner && (spinner.hidden = true);
      if (idx >= allData.length){
        qs(`#${ENDMSG_ID}`) && (qs(`#${ENDMSG_ID}`).hidden = false);
        if(observer && qs('#'+SENTINEL_ID)) { try{ observer.unobserve(qs('#'+SENTINEL_ID)); }catch(e){} }
      }
    }, 80);
  }

  async function loadAndStart(){
    const url = getPageDataUrl();
    const json = await fetchJson(url);
    allData = json.length ? shuffle(json) : [];
    idx = 0;
    const container = qs(`#${CARDS_CONTAINER_ID}`); if(container) container.innerHTML = '';
    appendBatch();
    initObserver();
  }

  function initObserver(){
    const sentinel = qs('#'+SENTINEL_ID); if(!sentinel) return;
    observer = new IntersectionObserver(entries=>{
      entries.forEach(e => { if(e.isIntersecting) appendBatch(); });
    }, { rootMargin:'400px' });
    observer.observe(sentinel);
  }

  // performSearch: if preview=true -> return array of matches (for header dropdown)
  // if preview falsy -> re-render the main cardsArea with matches
  window.performSearch = function(q, opts){
    const preview = opts && opts.preview;
    q = (q||'').trim().toLowerCase();
    const matches = allData.filter(item => {
      const hay = `${safe(item.title)} ${safe(item.author || '')} ${safe(item.seller || '')}`.toLowerCase();
      return hay.includes(q);
    });

    if (preview) {
      // return a lightweight preview array for header
      return matches.slice(0,12).map(m => ({ title:m.title, img:m.img, href:m.link, meta: (m.author||'') + ' ' + (m.seller||'') }));
    }

    // not preview: re-render main area
    const container = qs('#'+CARDS_CONTAINER_ID);
    if (!container) return;
    container.innerHTML = '';
    matches.forEach(item => container.appendChild(createCard(item)));
    qs(`#${ENDMSG_ID}`) && (qs(`#${ENDMSG_ID}`).hidden = matches.length > BATCH_SIZE);
    return matches;
  };

  document.addEventListener('DOMContentLoaded', loadAndStart);
})();
