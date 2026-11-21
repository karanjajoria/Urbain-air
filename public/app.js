
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={m:{},get(k){if(k in this.m)return this.m[k];try{return localStorage.getItem(k)}catch{return null}},set(k,v){this.m[k]=v;try{localStorage.setItem(k,v)}catch{}}};
let lang=store.get('lang')||((navigator.language||'').startsWith('hi')?'hi':'en');
const t=(k,o)=>{let s=T[lang][k]??T.en[k]??k;if(o)for(const x in o)s=s.replace('{'+x+'}',o[x]);return s};
const cols=['#5f9e68','#9a8a1c','#c9741a','#c8472f','#8a3a6b','#6b2036'],lim=[50,100,150,200,300,1e9];
const bi=a=>lim.findIndex(l=>a<=l);
const hh=x=>x?x.slice(11,16):'';
let air=null,plan=null,tab=0,ctx='',last='',src='',upd='';
async function getJSON(u,o){const r=await fetch(u,o);const j=await r.json();if(!r.ok)throw new Error(j.error||t('fail'));return j}

function applyLang(){
  document.documentElement.lang=lang;$('#lang').value=lang;store.set('lang',lang);
  document.querySelectorAll('[data-i18n]').forEach(e=>e.innerHTML=t(e.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(e=>e.placeholder=t(e.dataset.i18nPh));
  if(air){renderAir();renderChips();$('#src').textContent=t(src);}
  if(plan){renderTab();progress()}
  if(!$('#go').disabled)$('#go').textContent=t('go');
}
function renderAir(){
  const a=air,i=bi(a.aqi);document.documentElement.style.setProperty('--band',cols[i]);
  const cig=a.pm2_5/22,n=Math.min(10,Math.ceil(cig));let c='';
  for(let k=0;k<n;k++)c+=`<div class="cig" style="--f:${Math.max(0,Math.min(1,cig-k))*100}%"></div>`;
  $('#verdict').innerHTML=`<div class="city">${esc(a.city)} ${t('now')}</div><div class="v">${t('b')[i]}</div><div>${t('bt')[i]}</div>
   <div class="cigs" aria-hidden="true">${c}</div><div class="meta">${t('cig',{x:cig.toFixed(1)})}</div>
   <div class="stats"><div><b>${a.aqi}</b>${t('ac')}</div><div><b>${Math.round(a.pm2_5)}</b>${t('pm')}</div><div><b>${Math.round(a.pm10)}</b>${t('pc')}</div><div><b>${Math.round(a.no2)}</b>${t('no2')}</div></div>
   <div class="upd">${t('upd',{x:upd})} <button type="button" id="refresh">${t('ref')}</button></div>`;
  $('#refresh').onclick=()=>run(last);
  const mx=Math.max(...a.forecast.map(h=>h.pm));
  $('#chart').innerHTML=a.forecast.map(h=>`<i class="${h.t===a.cleanestHour?'best':''}" style="height:${h.pm/mx*100}%"></i>`).join('');
  $('#axis').innerHTML=[0,6,12,18,23].filter(k=>a.forecast[k]).map(k=>`<span>${hh(a.forecast[k].t)}</span>`).join('');
  $('#win').textContent=t('win',{a:hh(a.cleanestHour),b:hh(a.dirtiestHour)});
}
function renderChips(){$('#chips').innerHTML=['c1','c2','c3'].map(k=>`<button type="button">${t(k)}</button>`).join('');
  $('#chips').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#q').value=b.textContent;$('#ask').click()})}
const sections=()=>[
 (plan.routine||[]).map(x=>({t:`${x.when}: ${x.action}`,e:x.impact,w:x.why})),
 (plan.indoor||[]).map(x=>({t:`${x.hack} (${x.cost})`,e:x.impact,w:x.why})),
 (plan.swaps||[]).map(x=>({t:t('inst',{a:x.instead_of,b:x.try}),e:x.impact}))];
const dk=x=>'done:'+new Date().toDateString()+':'+x;
function progress(){let tot=0,d=0;sections().forEach(s=>s.forEach(i=>{tot++;if(store.get(dk(i.t)))d++}));
  $('#pbar').style.width=(tot?d/tot*100:0)+'%';$('#ptxt').textContent=tot&&d===tot?t('alldone'):t('pd',{d,t:tot})}
function renderTab(){
  document.querySelectorAll('[role=tab]').forEach((b,i)=>{b.setAttribute('aria-selected',i===tab);b.tabIndex=i===tab?0:-1});
  const p=$('#p');p.setAttribute('aria-labelledby','t'+tab);
  if(tab<3){
    p.innerHTML=sections()[tab].map((i,n)=>{const d=store.get(dk(i.t));return `<div class="item${d?' done':''}"><input type="checkbox" id="c${n}" ${d?'checked':''} data-k="${esc(dk(i.t))}"><div><label for="c${n}" class="t">${esc(i.t)}</label>${i.e?`<div class="impact"><b>${t('eff')}</b> ${esc(i.e)}</div>`:''}${i.w?`<details><summary>${t('why')}</summary>${esc(i.w)}</details>`:''}</div></div>`}).join('');
    p.querySelectorAll('input').forEach(c=>c.onchange=()=>{store.set(c.dataset.k,c.checked?'1':'');c.closest('.item').classList.toggle('done',c.checked);progress()});
  }else p.innerHTML=`<b>${t('prot')}</b><ul class="plain">${(plan.protect||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p></p><b>${t('nb')}</b><ul class="plain">${(plan.community||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
}
document.querySelectorAll('[role=tab]').forEach((b,i)=>{b.onclick=()=>{tab=i;renderTab()};b.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){tab=(tab+(e.key==='ArrowRight'?1:3))%4;renderTab();$('#t'+tab).focus()}}});

async function loadPlan(){
  const fd=new FormData($('#f')),profile={};
  ['kids','elderly','respiratory','pregnant'].forEach(k=>profile[k]=fd.has(k));
  ['commute','heating','cooking','purifier'].forEach(k=>profile[k]=fd.get(k));
  const r=await getJSON('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({air,profile,lang})});
  plan=r.plan;src=r.source==='gemini'?'srcg':'srcr';$('#src').textContent=t(src);
  ctx=`${air.city}, AQI ${air.aqi}, PM2.5 ${Math.round(air.pm2_5)}. Cleanest ${hh(air.cleanestHour)}, worst ${hh(air.dirtiestHour)}. ${plan.headline||''}`;
  renderTab();progress();
}
async function run(query){
  last=query;$('#err').textContent='';$('#go').disabled=true;$('#go').textContent=t('busy');document.body.classList.add('busy');
  try{
    air=await getJSON('/api/air?'+query);upd=new Date().toTimeString().slice(0,5);renderAir();renderChips();
    await loadPlan();
    $('#out').style.display='block';$('#pers').open=false;store.set('city',$('#city').value);$('#verdict').scrollIntoView({behavior:'smooth'});
  }catch(e){$('#err').textContent=e.message}
  document.body.classList.remove('busy');$('#go').disabled=false;$('#go').textContent=t('go');
}
$('#f').addEventListener('submit',e=>{e.preventDefault();const c=$('#city').value.trim();if(!c){$('#err').textContent=t('needc');$('#city').focus();return}run('city='+encodeURIComponent(c))});
$('#geo').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>run(`lat=${p.coords.latitude}&lon=${p.coords.longitude}`),()=>{$('#err').textContent=t('locb')}):($('#err').textContent=t('locn'));
$('#lang').onchange=async e=>{lang=e.target.value;applyLang();if(air){$('#go').disabled=true;document.body.classList.add('busy');try{await loadPlan()}catch(x){$('#err').textContent=x.message}document.body.classList.remove('busy');$('#go').disabled=false}};
$('#ask').onclick=async()=>{const q=$('#q').value.trim();if(!q)return;$('#ans').textContent=t('think');
  try{const r=await getJSON('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,context:ctx,lang})});$('#ans').textContent=r.answer}catch(e){$('#ans').textContent=e.message}};
$('#share').onclick=async()=>{
  const text=`${air.city}: ${t('b')[bi(air.aqi)]} (AQI ${air.aqi}). ${t('shb')} ${hh(air.cleanestHour)}.\n${t('today')}:\n`+(plan.routine||[]).slice(0,3).map(x=>`- ${x.action}`).join('\n');
  try{if(navigator.share)await navigator.share({text});else{await navigator.clipboard.writeText(text);$('#share').textContent=t('copied')}}catch{}};
const sc=store.get('city');if(sc)$('#city').value=sc;
applyLang();
