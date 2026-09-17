const OWNER = 'westlifetc';
const REPO = 'westlifetc.github.io';
const BRANCH = 'main';
const DATA = {
  settings:'data/settings.json',
  lectures:'data/lectures.json',
  posts:'data/posts.json',
  reviews:'data/reviews.json'
};
let token = '';
let state = {settings:{}, lectures:[], posts:[], reviews:[]};
let currentPostId = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj,null,2))));
const dec = str => decodeURIComponent(escape(atob(str.replace(/\n/g,''))));
function status(msg, bad=false){ $('#saveStatus').textContent=msg; $('#saveStatus').style.color=bad?'#b34343':''; }

async function gh(path, options={}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers:{
      'Accept':'application/vnd.github+json',
      'Authorization':`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28',
      ...(options.headers||{})
    }
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status} ${t}`);
  }
  return r.status===204 ? null : r.json();
}
async function getFile(path) {
  const d = await gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
  return {sha:d.sha, data:JSON.parse(dec(d.content))};
}
async function saveFile(path, data, message) {
  const current = await gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
  return gh(`/repos/${OWNER}/${REPO}/contents/${path}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message,content:enc(data),sha:current.sha,branch:BRANCH})
  });
}
function arrayBufferToBase64(buffer){
  let binary=''; const bytes=new Uint8Array(buffer); const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i+chunk, bytes.length)));
  return btoa(binary);
}
async function uploadImage(file, prefix='image') {
  if (!file) return '';
  if (file.size > 8*1024*1024) throw new Error('이미지는 8MB 이하로 올려주세요.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const filename=`assets/uploads/${prefix}-${Date.now()}.${ext}`;
  const content=arrayBufferToBase64(await file.arrayBuffer());
  await gh(`/repos/${OWNER}/${REPO}/contents/${filename}`,{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:`Upload ${prefix} image`,content,branch:BRANCH})
  });
  return `/${filename}`;
}
async function loadAll(){
  status('불러오는 중...');
  const keys=Object.keys(DATA);
  const vals=await Promise.all(keys.map(k=>getFile(DATA[k])));
  keys.forEach((k,i)=>state[k]=vals[i].data);
  renderSettings(); renderLectures(); renderPostList(); renderReviews();
  status('연결됨');
}
async function connect(){
  token=$('#tokenInput').value.trim();
  if(!token){$('#loginMsg').textContent='토큰을 입력해 주세요.';return;}
  $('#connectBtn').disabled=true; $('#loginMsg').textContent='GitHub에 연결하는 중...';
  try{
    await gh(`/repos/${OWNER}/${REPO}`);
    if($('#rememberToken').checked) localStorage.setItem('weraGhToken',token);
    else sessionStorage.setItem('weraGhToken',token);
    await loadAll();
    $('#loginView').hidden=true; $('#adminView').hidden=false;
  }catch(e){console.error(e);$('#loginMsg').textContent='연결하지 못했습니다. 토큰 권한을 확인해 주세요.'}
  finally{$('#connectBtn').disabled=false}
}
function logout(){localStorage.removeItem('weraGhToken');sessionStorage.removeItem('weraGhToken');location.reload()}
function switchView(name){
  $$('.view').forEach(v=>v.hidden=true); $(`#${name}View`).hidden=false;
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={settings:'사이트 설정',lectures:'강의 관리',posts:'수업 기록',reviews:'후기 관리'};
  $('#viewTitle').textContent=titles[name];
}
function renderSettings(){
  const s=state.settings;
  ['siteName','eyebrow','heroTitle','heroDescription','aboutTitle','aboutText','email','font','accent','background'].forEach(id=>{if($('#'+id)) $('#'+id).value=s[id]??''});
  $('#showReviews').checked=s.showReviews!==false;
  $('#heroImageName').textContent=s.heroImage ? `현재: ${s.heroImage}`:'현재 이미지 없음';
}
async function saveSettings(){
  try{
    status('설정 저장 중...');
    const s={...state.settings};
    ['siteName','eyebrow','heroTitle','heroDescription','aboutTitle','aboutText','email','font','accent','background'].forEach(id=>s[id]=$('#'+id).value);
    s.showReviews=$('#showReviews').checked;
    const f=$('#heroImageFile').files[0];
    if(f){status('대문 이미지 업로드 중...');s.heroImage=await uploadImage(f,'hero')}
    await saveFile(DATA.settings,s,'Update site settings');
    state.settings=s; renderSettings(); status('저장 완료 · 잠시 후 사이트에 반영됩니다.');
  }catch(e){console.error(e);status('저장 실패',true)}
}
function renderLectures(){
  $('#lectureEditor').innerHTML=state.lectures.map((x,i)=>`<div class="editor-card" data-i="${i}">
    <div class="editor-card-head"><strong>강의 ${i+1}</strong><button class="remove-btn" data-remove-lecture="${i}">삭제</button></div>
    <div class="form-grid">
      <label class="full">강의명<input class="lec-title" value="${escAttr(x.title)}"></label>
      <label class="full">설명<textarea class="lec-desc" rows="3">${esc(x.description)}</textarea></label>
      <label class="full">태그 (쉼표로 구분)<input class="lec-tags" value="${escAttr((x.tags||[]).join(', '))}"></label>
    </div></div>`).join('');
}
function pullLectures(){
  state.lectures=$$('#lectureEditor .editor-card').map((card,i)=>({
    id: state.lectures[i]?.id || `lecture-${Date.now()}-${i}`,
    title:card.querySelector('.lec-title').value.trim(),
    description:card.querySelector('.lec-desc').value.trim(),
    tags:card.querySelector('.lec-tags').value.split(',').map(x=>x.trim()).filter(Boolean)
  }));
}
async function saveLectures(){
  try{pullLectures();status('강의 저장 중...');await saveFile(DATA.lectures,state.lectures,'Update lectures');status('강의 저장 완료');renderLectures()}
  catch(e){console.error(e);status('저장 실패',true)}
}
function renderPostList(){
  const sorted=[...state.posts].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  $('#postAdminList').innerHTML=sorted.map(p=>`<button class="post-list-item ${p.id===currentPostId?'active':''}" data-post-id="${escAttr(p.id)}">${esc(p.title||'(제목 없음)')}<small>${esc(p.date||'')} · ${esc(p.category||'')}</small></button>`).join('');
}
function newPost(){
  currentPostId=`post-${Date.now()}`;
  const today=new Date().toISOString().slice(0,10);
  state.posts.push({id:currentPostId,title:'',date:today,category:'',excerpt:'',cover:'',body:''});
  renderPostList(); renderPostEditor();
}
function renderPostEditor(){
  const p=state.posts.find(x=>x.id===currentPostId);
  if(!p){$('#postEditor').hidden=true;$('#postEditorEmpty').hidden=false;return}
  $('#postEditor').hidden=false;$('#postEditorEmpty').hidden=true;
  $('#postTitle').value=p.title||'';$('#postDate').value=p.date||'';$('#postCategory').value=p.category||'';
  $('#postExcerpt').value=p.excerpt||'';$('#postBody').innerHTML=p.body||'';
  $('#postCoverName').textContent=p.cover ? `현재: ${p.cover}`:'';
  renderPostList();
}
async function savePost(){
  const p=state.posts.find(x=>x.id===currentPostId); if(!p)return;
  try{
    status('글 저장 중...');
    p.title=$('#postTitle').value.trim();p.date=$('#postDate').value;p.category=$('#postCategory').value.trim();
    p.excerpt=$('#postExcerpt').value.trim();p.body=$('#postBody').innerHTML.trim();
    const f=$('#postCoverFile').files[0];
    if(f){status('대표 이미지 업로드 중...');p.cover=await uploadImage(f,'post')}
    await saveFile(DATA.posts,state.posts,'Update class archive');
    $('#postCoverFile').value='';renderPostList();renderPostEditor();status('게시 완료 · 잠시 후 사이트에 반영됩니다.');
  }catch(e){console.error(e);status('게시 실패',true)}
}
async function deletePost(){
  if(!currentPostId||!confirm('이 글을 삭제할까요?'))return;
  const backup=[...state.posts];
  state.posts=state.posts.filter(x=>x.id!==currentPostId);currentPostId=null;
  try{status('삭제 중...');await saveFile(DATA.posts,state.posts,'Delete class archive post');renderPostList();renderPostEditor();status('삭제 완료')}
  catch(e){state.posts=backup;console.error(e);status('삭제 실패',true)}
}
function renderReviews(){
  $('#reviewsEditor').innerHTML=state.reviews.map((r,i)=>`<div class="editor-card" data-i="${i}">
    <div class="editor-card-head"><strong>후기 ${i+1}</strong><button class="remove-btn" data-remove-review="${i}">삭제</button></div>
    <div class="form-grid"><label class="full">후기<textarea class="review-text" rows="3">${esc(r.text)}</textarea></label><label class="full">표시 이름 / 출처<input class="review-by" value="${escAttr(r.by||'')}"></label></div>
  </div>`).join('');
}
function pullReviews(){
  state.reviews=$$('#reviewsEditor .editor-card').map(card=>({text:card.querySelector('.review-text').value.trim(),by:card.querySelector('.review-by').value.trim()}));
}
async function saveReviews(){
  try{pullReviews();status('후기 저장 중...');await saveFile(DATA.reviews,state.reviews,'Update reviews');status('후기 저장 완료');renderReviews()}
  catch(e){console.error(e);status('저장 실패',true)}
}
function esc(v=''){return String(v).replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}
function escAttr(v=''){return esc(v).replace(/"/g,'&quot;')}

document.addEventListener('click',e=>{
  const nav=e.target.closest('.nav-btn'); if(nav)switchView(nav.dataset.view);
  const lr=e.target.closest('[data-remove-lecture]'); if(lr){pullLectures();state.lectures.splice(+lr.dataset.removeLecture,1);renderLectures()}
  const rr=e.target.closest('[data-remove-review]'); if(rr){pullReviews();state.reviews.splice(+rr.dataset.removeReview,1);renderReviews()}
  const pi=e.target.closest('[data-post-id]'); if(pi){currentPostId=pi.dataset.postId;renderPostEditor()}
  const tb=e.target.closest('[data-cmd]'); if(tb){document.execCommand(tb.dataset.cmd,false,tb.dataset.value||null);$('#postBody').focus()}
});
$('#connectBtn').addEventListener('click',connect);
$('#logoutBtn').addEventListener('click',logout);
$('#saveSettings').addEventListener('click',saveSettings);
$('#saveLectures').addEventListener('click',saveLectures);
$('#addLecture').addEventListener('click',()=>{pullLectures();state.lectures.push({id:`lecture-${Date.now()}`,title:'새 강의',description:'',tags:[]});renderLectures()});
$('#newPost').addEventListener('click',newPost);
$('#savePost').addEventListener('click',savePost);
$('#deletePost').addEventListener('click',deletePost);
$('#addReview').addEventListener('click',()=>{pullReviews();state.reviews.push({text:'',by:''});renderReviews()});
$('#saveReviews').addEventListener('click',saveReviews);
$('#tokenInput').addEventListener('keydown',e=>{if(e.key==='Enter')connect()});

(async()=>{
  const saved=localStorage.getItem('weraGhToken')||sessionStorage.getItem('weraGhToken');
  if(saved){token=saved;$('#tokenInput').value=saved;try{await gh(`/repos/${OWNER}/${REPO}`);await loadAll();$('#loginView').hidden=true;$('#adminView').hidden=false}catch(e){sessionStorage.removeItem('weraGhToken');localStorage.removeItem('weraGhToken')}}
})();
