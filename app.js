const $=s=>document.querySelector(s);const API='http://localhost:41595';let articles=[],activeFilter='全部',current=null,busy=false,library=null;let issueDate='2026-10-15',issueLoad=0,issueKey='2026-10-15';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6500)}
async function api(path,body,timeout=8000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(API+path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body),headers:{'Content-Type':'text/plain'}}:{}),signal:controller.signal});if(!r.ok)throw new Error('Eagle 返回 HTTP '+r.status);const j=await r.json();if(j.status!=='success')throw new Error(j.message||j.error||'Eagle 未完成请求');return j.data;}finally{clearTimeout(timer)}}
function connectionError(e){return '暂时无法连接本机 Eagle。请在这台电脑打开 Eagle，并在浏览器询问时允许此页面访问本地网络。若应用内浏览器仍受限，请用 Chrome 打开本页后重试。没有确认收录成功。'+(e?.message&&!/fetch|network|abort/i.test(e.message)?'（'+e.message+'）':'')}
async function connect(show=true){$('#connect span').textContent='Eagle · 正在连接';try{const folders=await api('/api/folder/list');if(!Array.isArray(folders))throw Error('无法读取 Eagle 文件夹');library={};$('#connect').classList.add('connected');$('#connect span').textContent='Eagle · 已连接本机';if(show)toast('已连接这台电脑正在打开的 Eagle 资源库');return library}catch(e){library=null;$('#connect').classList.remove('connected');$('#connect span').textContent='Eagle · 点击重连';if(show)toast(connectionError(e));throw e}}
// Shared with Eagle filing: use reviewed per-image content tags, never library-private tags.
const FILTER_ORDER=['品牌设计','平面设计','字体设计','海报设计','包装设计','版式设计','标志设计','广告设计','视觉设计'];
function articleTags(a){
 const tags=Object.values(a.collectionPlans||{}).filter(p=>!p.exclude).flatMap(p=>p.tags||[]);
 return [...new Set([...tags,a.category,a.secondary].filter(t=>t&&FILTER_ORDER.includes(t)))];
}
function renderFilters(){
 const counts=new Map(FILTER_ORDER.map(tag=>[tag,articles.filter(a=>articleTags(a).includes(tag)).length]));
 const tags=['全部',...FILTER_ORDER.filter(tag=>counts.get(tag)>0)];
 if(!tags.includes(activeFilter))activeFilter='全部';
 $('.toolbar nav').innerHTML=tags.map(tag=>`<button class="filter ${tag===activeFilter?'active':''}" data-filter="${tag}" aria-pressed="${tag===activeFilter}">${tag} <span>${String(tag==='全部'?articles.length:counts.get(tag)).padStart(2,'0')}</span></button>`).join('');
 document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});render()});
}
let sharedPlans;
async function attachFilingPlans(rows){
 if(rows.every(a=>a.collectionPlans))return;
 try{sharedPlans=sharedPlans||await fetch('collection-plans.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('分类读取失败');return r.json()});for(const a of rows)a.collectionPlans=a.collectionPlans||sharedPlans.articles?.[a.id]||{};}catch(e){/* Existing article categories remain usable if plans cannot be loaded. */}
}
function render(){const q=$('#search').value.trim().toLowerCase();const list=articles.filter(a=>(activeFilter==='全部'||articleTags(a).includes(activeFilter))&&JSON.stringify(a).toLowerCase().includes(q));$('#count').textContent='精选 '+list.length+' 条';$('#empty').hidden=!!list.length;$('#articles').innerHTML=list.map(a=>`<article class="article" id="${a.id}"><div class="number">${String(articles.indexOf(a)+1).padStart(2,'0')}</div><button class="cover ${a.unavailable?'failed':''}" data-id="${a.id}" aria-label="预览 ${esc(a.name)} 的精选图片"><img referrerpolicy="no-referrer" src="${a.unavailable?'data:,':esc(a.images[0])}" alt="${esc(a.name)} 作品图" ${articles.indexOf(a)?'loading="lazy"':''}><span class="cover-fallback">${esc(a.name)}</span><span class="image-count">${a.unavailable?'点击读取作品图':a.images.length+' 张预览 · 点击查看更多 ↗'}</span></button><div class="body"><div class="meta"><span class="tag">${a.category}</span><span class="region">${a.region}</span><span class="date">${a.date}</span></div><h2>${esc(a.title)}</h2><div class="studio">${esc(a.studio)}</div><p class="summary">${esc(a.summary)}</p><div class="card-bottom"><div class="source"><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.source)} ↗</a> · ${a.kind}<small>${esc(a.note)}</small>${(a.references||[]).map(r=>`<small><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)} ↗</a></small>`).join('')}</div><button class="collect" data-id="${a.id}">${a.unavailable?'查看收录状态':'收录到 Eagle'} <span>＋</span></button></div><div class="card-status" id="status-${a.id}" role="status"></div></div></article>`).join('');document.querySelectorAll('.cover[data-id]').forEach(b=>b.addEventListener('click',()=>openGallery(b.dataset.id)));document.querySelectorAll('.collect[data-id]').forEach(b=>b.addEventListener('click',()=>collectArticle(b.dataset.id)));document.querySelectorAll('.cover img').forEach(img=>img.onerror=()=>img.parentElement.classList.add('failed'))}
function imageBlocked(i){return !!current.collectionPlans?.[imageKey(current.images[i])]?.exclude||[...document.querySelectorAll('.pick input.choose')].some(input=>Number(input.value)===i&&input.dataset.blocked)}
function selected(){return [...document.querySelectorAll('.pick input.choose:checked')].map(i=>Number(i.value)).filter(i=>!imageBlocked(i))}
function updateSelection(){
 const inputs=[...document.querySelectorAll('.pick input.choose')],eligible=inputs.filter(i=>!imageBlocked(Number(i.value)));
 inputs.forEach(i=>{const blocked=imageBlocked(Number(i.value));i.disabled=blocked||busy||galleryLoading;if(blocked)i.checked=false});
 const n=selected().length;$('#selection').textContent='已选 '+n+' / '+current.images.length+' 张';$('#import').disabled=!n||busy||galleryLoading;$('#import').textContent=busy?'正在收录…':'收录所选 '+n+' 张';
 $('#select-all').disabled=busy||galleryLoading||!eligible.length;$('#select-all').textContent=eligible.length&&eligible.every(i=>i.checked)?'取消全选':'全选';
}
function toggleSelection(){if(busy||galleryLoading)return;const inputs=[...document.querySelectorAll('.pick input.choose')].filter(i=>!imageBlocked(Number(i.value))),checked=!inputs.every(i=>i.checked);inputs.forEach(i=>i.checked=checked);updateSelection()}
let galleryLoad=0,galleryLoading=false;
const DESIGN_TAGS=['字体设计','品牌设计','广告设计','视觉设计','包装设计','版式设计','海报设计','标志设计'];
const FASHION_PATHS=['时装摄影','产品摄影','模特摄影','活动纪实','设计'];
function drawGallery(){
 $('#gallery-grid').innerHTML=current.images.map((url,i)=>{
  const plan=current.collectionPlans?.[imageKey(url)],ready=plan&&!plan.exclude;
  const summary=ready?plan.paths.map(x=>x.join(' / ')).join('；')+' · '+[...plan.tags,...(plan.brands||[])].join('、')+' · 收录年份自动添加':plan?.exclude?'此图已明确排除，不可收录':'未审核（封面亦同），不默认选中；可手动选择。仅沿用本篇唯一且已存在的设计项目目录，否则存 Eagle 根目录；只加收录年份，不猜分类、内容或品牌标签。';
  return `<div class="pick" data-image="${i}"><label><input class="choose" type="checkbox" ${ready?'checked':plan?.exclude?'disabled data-blocked="excluded"':''} value="${i}" aria-label="选择第 ${i+1} 张"><img referrerpolicy="no-referrer" src="${esc(url)}" alt="${esc(current.name)} 作品 ${i+1}" loading="lazy"><span>作品图 ${String(i+1).padStart(2,'0')}</span></label><p class="filing-summary">${esc(summary)}</p></div>`;
 }).join('');
 document.querySelectorAll('.pick input.choose').forEach(i=>i.onchange=updateSelection);
 document.querySelectorAll('.pick img').forEach(img=>img.onerror=()=>{const input=img.closest('.pick').querySelector('.choose');input.checked=false;input.dataset.blocked='failed';input.disabled=true;img.nextElementSibling.textContent='图片暂不可读取，已排除';updateSelection()});updateSelection();
}
function filingPlan(i){
 if(imageBlocked(i))throw Error('此图已排除或读取失败，不可收录');
 const plan=current.collectionPlans?.[imageKey(current.images[i])];
 if(!plan){
  const paths=Object.values(current.collectionPlans||{}).filter(p=>!p.exclude&&!(p.brands||[]).length).flatMap(p=>p.paths||[]).filter(p=>Array.isArray(p)&&p.length===2&&p[0]==='设计'&&typeof p[1]==='string'&&p[1].trim());
  const unique=[...new Map(paths.map(p=>[JSON.stringify(p),p])).values()];
  return {index:i,url:current.images[i],manual:true,paths:unique.length===1?unique:[],tags:[]};
 }
 if(!plan||plan.exclude||!plan.paths?.length)throw Error('此图尚未完成分类审核，已停止收录');
 if(!plan.paths.every(p=>p.length>=2&&['设计','时尚'].includes(p[0])))throw Error('预设目录不完整，已停止收录');
 if(plan.paths.some(p=>p[0]==='设计')&&(plan.brands||[]).length)throw Error('设计图片不应有品牌标签，已停止收录');
 return {index:i,url:current.images[i],paths:plan.paths,tags:[...new Set([...plan.tags,...(plan.brands||[])])]};
}
async function collectArticle(id){
 if(busy||galleryLoading)return;
 await openGallery(id);
 if(current?.id!==id||galleryLoading)return;
 // One-click authorization covers reviewed defaults only, never the manual fallback.
 document.querySelectorAll('.pick input.choose').forEach(input=>{const plan=current.collectionPlans?.[imageKey(current.images[Number(input.value)])];if(!plan||plan.exclude)input.checked=false});updateSelection();
 if(!selected().length){$('#result').textContent='本篇没有默认勾选的已审核图；可手动选择未审核图（含封面）后点击收录。';return}
 await collect();
}
async function openGallery(id){
 if(busy)return;const a=articles.find(x=>x.id===id);if(!a)return;current=a;galleryLoading=false;
 $('#dialog-title').textContent=a.name;$('#destination').textContent='已审核图按方案归档；手动未审核图沿用已有项目目录或存根目录，只加收录年份。';
 $('#result').className='';drawGallery();$('#gallery').showModal();
 $('#result').textContent=selected().length?'已审核图片已默认勾选；可手动加选未审核图。点击收录才保存到当前电脑的 Eagle。':'本篇没有默认勾选的已审核图；可手动选择未审核图（含封面）后点击收录。';
}
async function ensureFolder(name,parent,children){const f=(children||[]).find(f=>f.name===name);if(f)return f;const created=await api('/api/folder/create',{folderName:name,...(parent?{parent}: {})});if(!created?.id)throw new Error('Eagle 没有返回文件夹编号');return created}
const imageKey=url=>url.split('?')[0];
async function existing(){const all=[];for(let offset=0;;offset+=200){const rows=await api('/api/item/list?limit=200&offset='+offset);if(!Array.isArray(rows))throw Error('无法核查全库素材，已停止收录');all.push(...rows.filter(r=>!r.isDeleted));if(rows.length<200)break;if(offset>=200000)throw Error('资源库较大，无法完成全库核查，已停止收录');}return all}
const hasImage=(rows,url)=>rows.find(r=>String(r.annotation||'').split('\n').includes('Image: '+imageKey(url))||String(r.annotation||'').split('\n').includes('SourceImage: '+imageKey(url))||imageKey(r.url||'')===imageKey(url));
async function folderPath(path,tree){let children=tree,parent=null,f;for(const name of path){f=await ensureFolder(name,parent,children);if(!children.some(x=>x.id===f.id))children.push(f);f.children=f.children||[];children=f.children;parent=f.id;}return f.id}
function existingFolderPath(path,tree){let children=tree,folder;for(const name of path){const matches=children.filter(f=>f.name===name);if(matches.length!==1||!matches[0].id)return null;folder=matches[0];children=folder.children||[]}return folder?.id||null}
function importYear(){return new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric'}).format(new Date())}
async function collect(){
 if(busy||galleryLoading||!selected().length)return;let plans;
 try{plans=selected().map(filingPlan)}catch(e){$('#result').className='error';$('#result').textContent=e.message;return}
 const a=current;++galleryLoad;busy=true;$('#issue-select').disabled=true;updateSelection();$('.close').disabled=true;
 document.querySelectorAll('.image-filing input,.image-filing select,.image-filing textarea,.choose').forEach(x=>x.disabled=true);
 $('#result').className='';$('#result').textContent='正在连接 Eagle 并核查全库相同来源素材…';
 let completed=0;
 try{
  await connect(false);const tree=await api('/api/folder/list');if(!Array.isArray(tree))throw Error('无法核实文件夹，已停止');let rows=await existing();
  // Resolve manual destinations before any reviewed import can create folders.
  for(const plan of plans)if(plan.manual)plan.folderIds=plan.paths.map(path=>existingFolderPath(path,tree)).filter(Boolean);
  for(const plan of plans){
   if(imageBlocked(plan.index))throw Error('所选图片已排除或读取失败，已停止收录');
   const ids=plan.manual?plan.folderIds:[];if(!plan.manual)for(const path of plan.paths)ids.push(await folderPath(path,tree));
   if(imageBlocked(plan.index))throw Error('所选图片已排除或读取失败，已停止收录');
   let item=hasImage(rows,plan.url),isNew=!item;
   if(!item){
    const year=importYear();
    await api('/api/item/addFromURL',{url:plan.url,name:a.name+' — '+String(plan.index+1).padStart(2,'0'),website:a.url,...(ids.length?{folderId:ids[0]}:{}),tags:[...plan.tags,year],annotation:'项目说明：'+a.summary+'\n署名：'+a.studio+'\n来源：'+a.url+'\nSourceImage: '+imageKey(plan.url)+'\nEagleAddedYear: '+year},120000);
    for(let n=0;n<12;n++){rows=await existing();item=hasImage(rows,plan.url);if(item)break;await new Promise(r=>setTimeout(r,1000))}
    if(!item)throw Error('Eagle 已接收图片，但尚未核实入库；再次操作会先查重');
   }
   // Existing item's original import year must not become the reorganisation year.
   const marker=String(item.annotation||'').match(/EagleAddedYear: (\d{4})/),years=(item.tags||[]).filter(t=>/^\d{4}$/.test(t));
   const year=marker?.[1]||(years.length===1?years[0]:null);
   if(!year)throw Error('发现已存在素材（'+item.name+'），原收录年份尚未核实。已跳过，保留原素材，请在聊天中核实后整理');
   const folders=[...new Set([...(item.folders||[]),...ids])];
   const tags=[...new Set([...(item.tags||[]),...plan.tags,year])];
   await api('/api/item/update',{id:item.id,tags,folders});
   rows=await existing();const actual=rows.find(x=>x.id===item.id);
   if(!actual||!tags.every(t=>(actual.tags||[]).includes(t))||!folders.every(id=>(actual.folders||[]).includes(id)))throw Error('当前 Eagle 接口未确认全部目录或标签。保留单份素材，未重复导入；请在聊天中继续整理');
   completed++;$('#result').textContent='已核实归档 '+completed+' / '+plans.length+' 张';
  }
  $('#result').textContent='已核实归档 '+completed+' 张。已审核图按方案保存；手动未审核图沿用已有项目目录或根目录，不新增内容标签；年份沿用实际收录年。';$('#status-'+a.id).textContent='✓ 已核实归档 '+completed+' 张';
 }catch(e){$('#result').className='error';$('#result').textContent='已核实 '+completed+' / '+plans.length+' 张。'+(/fetch|network|abort/i.test(e.message)?connectionError(e):e.message)+'。未确认部分不会声称完成。'}
 finally{busy=false;$('#issue-select').disabled=false;$('.close').disabled=false;updateSelection()}
}
$('#connect').onclick=()=>connect().catch(()=>{});$('#search').oninput=render;document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));render()});$('.close').onclick=()=>{if(!busy)$('#gallery').close()};$('#gallery').addEventListener('cancel',e=>{if(busy)e.preventDefault()});$('#import').onclick=collect;$('#select-all').onclick=toggleSelection;
async function loadIssue(entry){
 const ticket=++issueLoad;$('#gallery').close();const response=await fetch(entry.file,{cache:'no-cache'});if(!response.ok)throw Error('读取失败');const data=await response.json();await attachFilingPlans(data.articles);if(ticket!==issueLoad)return;
 issueDate=data.date;issueKey=entry.id||entry.date;articles=data.articles;activeFilter='全部';renderFilters();current=null;$('#gallery').close();$('#search').value='';
 $('#coverage').textContent=data.coverage||'试刊快照 · 来源日期见各条';
 $('.filter[data-filter="全部"] span').textContent=String(articles.length).padStart(2,'0');
 $('#archive-note').textContent=issueKey===(issues[0].id||issues[0].date)?'当前最新一期 · 已存档':'往期存档 · 按图片内容归档';
 history.replaceState(null,'','?issue='+encodeURIComponent(issueKey));render();
}
let issues=[];
fetch('issues.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('读取失败');return r.json()}).then(async rows=>{
 issues=rows;const select=$('#issue-select');select.innerHTML=rows.map((r,i)=>`<option value="${esc(r.id||r.date)}">${esc(r.date)} · ${esc(r.label)} · ${r.count} 条${i?'':' · 最新'}</option>`).join('');
 const chosen=rows.find(r=>(r.id||r.date)===new URLSearchParams(location.search).get('issue'))||rows[0];select.value=chosen.id||chosen.date;
 select.onchange=()=>{if(busy){select.value=issueKey;toast('请等待当前收录完成后切换简报');return}loadIssue(rows.find(r=>(r.id||r.date)===select.value)).catch(()=>toast('该期读取失败，请重试'))};await loadIssue(chosen);
}).catch(()=>{$('#empty').hidden=false;$('#empty').textContent='简报存档读取失败，请刷新重试。'});
