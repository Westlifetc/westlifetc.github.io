const FILES = {
  settings: 'data/settings.json',
  lectures: 'data/lectures.json',
  posts: 'data/posts.json',
  reviews: 'data/reviews.json'
};

async function getJSON(path, fallback) {
  try {
    const r = await fetch(`${path}?v=${Date.now()}`);
    if (!r.ok) throw new Error(path);
    return await r.json();
  } catch (e) {
    console.warn('load failed:', path);
    return fallback;
  }
}
function escapeText(v='') {
  return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
function setFont(font) {
  const map = {
    pretendard: '"Noto Sans KR", system-ui, sans-serif',
    noto: '"Noto Sans KR", sans-serif',
    serif: '"Noto Serif KR", serif',
    myeongjo: '"Nanum Myeongjo", serif'
  };
  document.documentElement.style.setProperty('--font', map[font] || map.pretendard);
}
function applySettings(s) {
  document.documentElement.style.setProperty('--accent', s.accent || '#19324a');
  document.documentElement.style.setProperty('--bg', s.background || '#f4f1ea');
  setFont(s.font);
  document.querySelectorAll('[data-site-name]').forEach(el => el.textContent = s.siteName || '웨라쌤');
  document.querySelectorAll('[data-eyebrow]').forEach(el => el.textContent = s.eyebrow || '');
  document.querySelectorAll('[data-hero-title]').forEach(el => el.innerHTML = escapeText(s.heroTitle || '').replace(/\n/g,'<br>'));
  document.querySelectorAll('[data-hero-description]').forEach(el => el.textContent = s.heroDescription || '');
  document.querySelectorAll('[data-about-title]').forEach(el => el.textContent = s.aboutTitle || '');
  document.querySelectorAll('[data-about-text]').forEach(el => el.textContent = s.aboutText || '');
  const email = document.getElementById('emailLink');
  if (email) { email.href = `mailto:${s.email || ''}`; email.textContent = `${s.email || ''} ↗`; }
  const hero = document.getElementById('heroMedia');
  if (hero && s.heroImage) hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.08)),url("${s.heroImage}")`;
  const rs = document.getElementById('reviewsSection');
  if (rs && s.showReviews === false) rs.hidden = true;
  document.title = document.body.dataset.page === 'archive' ? `수업 기록 | ${s.siteName}` : document.title.replace('웨라쌤', s.siteName || '웨라쌤');
}
function lectureHTML(x, i) {
  return `<article class="lecture-item">
    <div class="lecture-no">${String(i+1).padStart(2,'0')}</div>
    <h3>${escapeText(x.title)}</h3>
    <p>${escapeText(x.description)}</p>
    <div class="tags">${(x.tags||[]).map(t=>`<span class="tag">${escapeText(t)}</span>`).join('')}</div>
  </article>`;
}
function postCardHTML(p) {
  const cover = p.cover ? `<img class="post-cover" src="${escapeText(p.cover)}" alt="">` : `<div class="post-cover"></div>`;
  return `<a class="post-card" href="post.html?id=${encodeURIComponent(p.id)}">
    ${cover}
    <div class="post-meta"><span>${escapeText(p.category || '수업')}</span><span>${escapeText(p.date || '')}</span></div>
    <h3>${escapeText(p.title)}</h3>
    <p>${escapeText(p.excerpt || '')}</p>
  </a>`;
}
function sortPosts(posts) {
  return [...posts].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
async function initHome(settings) {
  const [lectures, posts, reviews] = await Promise.all([
    getJSON(FILES.lectures, []), getJSON(FILES.posts, []), getJSON(FILES.reviews, [])
  ]);
  const lectureList = document.getElementById('lectureList');
  if (lectureList) lectureList.innerHTML = lectures.map(lectureHTML).join('');

  const recent = sortPosts(posts).slice(0,3);
  const recentEl = document.getElementById('recentPosts');
  const emptyPosts = document.getElementById('emptyPosts');
  if (recentEl) recentEl.innerHTML = recent.map(postCardHTML).join('');
  if (emptyPosts) emptyPosts.hidden = recent.length > 0;

  const reviewsEl = document.getElementById('reviewsList');
  const emptyReviews = document.getElementById('emptyReviews');
  if (reviewsEl) reviewsEl.innerHTML = reviews.map(r => `<article class="review"><blockquote>“${escapeText(r.text)}”</blockquote><cite>${escapeText(r.by || '')}</cite></article>`).join('');
  if (emptyReviews) emptyReviews.hidden = reviews.length > 0;
}
async function initArchive() {
  const posts = sortPosts(await getJSON(FILES.posts, []));
  const wrap = document.getElementById('archivePosts');
  const empty = document.getElementById('archiveEmpty');
  const count = document.getElementById('postCount');
  const filterWrap = document.getElementById('categoryFilters');
  const cats = ['전체', ...new Set(posts.map(p=>p.category).filter(Boolean))];

  function render(cat='전체') {
    const list = cat === '전체' ? posts : posts.filter(p=>p.category===cat);
    wrap.innerHTML = list.map(postCardHTML).join('');
    empty.hidden = list.length > 0;
    count.textContent = `${list.length}개의 기록`;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active', b.dataset.cat===cat));
  }
  filterWrap.innerHTML = cats.map(c=>`<button class="filter-btn" data-cat="${escapeText(c)}">${escapeText(c)}</button>`).join('');
  filterWrap.addEventListener('click', e => {
    const b = e.target.closest('.filter-btn'); if (b) render(b.dataset.cat);
  });
  render();
}
async function initPost() {
  const posts = await getJSON(FILES.posts, []);
  const id = new URLSearchParams(location.search).get('id');
  const p = posts.find(x=>x.id===id);
  const article = document.getElementById('postArticle');
  const nf = document.getElementById('postNotFound');
  if (!p) { nf.hidden = false; return; }
  document.title = `${p.title} | 웨라쌤`;
  article.innerHTML = `
    <a class="back" href="archive.html">← 수업 기록으로 돌아가기</a>
    <header class="post-head">
      <div class="post-meta"><span>${escapeText(p.category || '수업')}</span><span>${escapeText(p.date || '')}</span></div>
      <h1>${escapeText(p.title)}</h1>
      <p class="lead">${escapeText(p.excerpt || '')}</p>
    </header>
    ${p.cover ? `<img class="post-hero-image" src="${escapeText(p.cover)}" alt="">` : ''}
    <div class="post-body">${p.body || ''}</div>
  `;
}
(async function() {
  const settings = await getJSON(FILES.settings, {});
  applySettings(settings);
  const page = document.body.dataset.page || 'home';
  if (page === 'archive') await initArchive();
  else if (page === 'post') await initPost();
  else await initHome(settings);
  const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
})();
