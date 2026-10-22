const $=s=>document.querySelector(s);let articles=[],activeFilter='全部',current=null,issues=[],issueKey='',issueLoad=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6500)}
function render(){const q=$('#search').value.trim().toLowerCase();const list=articles.filter(a=>(activeFilter==='全部'||[a.category,a.secondary].includes(activeFilter))&&JSON.stringify(a).toLowerCase().includes(q));$('#count').textContent='精选 '+list.length+' 条';$('#empty').hidden=!!list.length;$('#articles').innerHTML=list.map(a=>`<article class="article" id="${a.id}"><div class="number">${String(articles.indexOf(a)+1).padStart(2,'0')}</div><button class="cover ${a.unavailable?'failed':''}" data-id="${a.id}" aria-label="预览 ${esc(a.name)} 的精选图片"><img src="${a.unavailable?'data:,':esc(a.images[0])}" alt="${esc(a.name)} 作品图" ${articles.indexOf(a)?'loading="lazy"':''}><span class="cover-fallback">${esc(a.name)}</span><span class="image-count">${a.unavailable?'点击读取作品图':a.images.length+' 张预览 · 点击查看更多 ↗'}</span></button><div class="body"><div class="meta"><span class="tag">${a.category}</span><span class="region">${a.region}</span><span class="date">${a.date}</span></div><h2>${esc(a.title)}</h2><div class="studio">${esc(a.studio)}</div><p class="summary">${esc(a.summary)}</p><div class="card-bottom"><div class="source"><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.source)} ↗</a> · ${a.kind}<small>${esc(a.note)}</small>${(a.references||[]).map(r=>`<small><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)} ↗</a></small>`).join('')}</div><button class="collect" data-id="${a.id}">${a.unavailable?'查看原文':'图片 / 收录'} <span>＋</span></button></div><div class="card-status" id="status-${a.id}" role="status"></div></div></article>`).join('');document.querySelectorAll('.cover[data-id]').forEach(b=>b.addEventListener('click',()=>openGallery(b.dataset.id)));document.querySelectorAll('.collect[data-id]').forEach(b=>b.addEventListener('click',()=>collectArticle(b.dataset.id)));document.querySelectorAll('.cover img').forEach(img=>img.onerror=()=>img.parentElement.classList.add('failed'))}

function collectArticle(id){openGallery(id)}
function openGallery(id){
 const a=articles.find(x=>x.id===id);if(!a)return;current=a;
 $('#dialog-title').textContent=a.name;$('#result').textContent='';
 $('#selection').textContent=a.images.length+' 张作品图';
 $('#local-collect').href='http://127.0.0.1:8765/?issue='+encodeURIComponent(issueKey)+'#'+encodeURIComponent(id);
 $('#gallery-grid').innerHTML=a.images.map((u,i)=>`<a class="pick" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="${esc(a.name)} 作品 ${i+1}" loading="lazy"><span>作品图 ${String(i+1).padStart(2,'0')} · 点击查看原图 ↗</span></a>`).join('');
 if(!a.images.length)$('#result').textContent='这篇暂没有可预览的作品图，请查看原文。';
 $('#gallery').showModal();
}
$('#search').oninput=render;
$('.close').onclick=()=>$('#gallery').close();
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));render()});
async function loadIssue(entry){
 const ticket=++issueLoad;$('#gallery').close();const r=await fetch(entry.file,{cache:'no-cache'});if(!r.ok)throw Error('读取失败');const d=await r.json();if(ticket!==issueLoad)return;
 issueKey=entry.id||entry.date;articles=d.articles;current=null;activeFilter='全部';$('#search').value='';document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter==='全部'));
 $('#coverage').textContent=d.coverage||'来源日期见各条';$('.filter[data-filter="全部"] span').textContent=String(articles.length).padStart(2,'0');$('#archive-note').textContent=issueKey===(issues[0].id||issues[0].date)?'当前最新一期 · 已存档':'往期存档';
 history.replaceState(null,'','?issue='+encodeURIComponent(issueKey));render();
}
fetch('issues.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('读取失败');return r.json()}).then(async rows=>{
 issues=rows;const select=$('#issue-select');select.innerHTML=rows.map((r,i)=>`<option value="${esc(r.id||r.date)}">${esc(r.date)} · ${esc(r.label)} · ${r.count} 条${i?'':' · 最新'}</option>`).join('');
 const chosen=rows.find(r=>(r.id||r.date)===new URLSearchParams(location.search).get('issue'))||rows[0];select.value=chosen.id||chosen.date;
 select.onchange=()=>loadIssue(rows.find(r=>(r.id||r.date)===select.value)).catch(()=>toast('该期读取失败，请重试'));await loadIssue(chosen);
}).catch(()=>{$('#empty').hidden=false;$('#empty').textContent='简报读取失败，请刷新重试。'});
