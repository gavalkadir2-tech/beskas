
// ===================== STATE =====================
const KEYS=['animals','health','repro','production','feeding','rations','finance','inventory','sales','suppliers','employees','tasks','lands','slaughter','cuts','cutSales','customers','orders'];
let D={};
KEYS.forEach(k=>D[k]=[]);
D.settings={farm_name:'Bizim Çiftlik',owner:'',location:'İzmir',currency:'TRY'};
D.photos={};
D.weights=[];
D.notif_read={};

try{
  const s=localStorage.getItem('bcv3');
  if(s){const p=JSON.parse(s);KEYS.forEach(k=>{if(Array.isArray(p[k]))D[k]=p[k];});if(p.settings)D.settings={...D.settings,...p.settings};if(p.photos)D.photos=p.photos;if(Array.isArray(p.weights))D.weights=p.weights;if(p.notif_read)D.notif_read=p.notif_read;if(Array.isArray(p.auditLog))D.auditLog=p.auditLog;if(Array.isArray(p.users)&&p.users.length)D.users=p.users;if(p.currentUser)D.currentUser=p.currentUser;if(p.ai_memory)D.ai_memory=p.ai_memory;}
}catch(e){}

let _pt=null;
const persist=()=>{clearTimeout(_pt);_pt=setTimeout(()=>{
  try{localStorage.setItem('bcv3',JSON.stringify(D));}
  catch(e){
    // localStorage dolu - fotoğrafları sil ve tekrar dene
    try{
      const slim={...D,photos:{}};
      localStorage.setItem('bcv3',JSON.stringify(slim));
      showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Depo doldu, fotoğraflar geçici silindi','yl');
    }catch(e2){showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Kaydetme hatası: '+e2.message,'rd');}
  }
},400);};

// ===================== TOAST =====================
function showToast(msg,type='gr'){
  const el=document.getElementById('toast');
  el.innerHTML=msg;
  el.style.background=type==='rd'?'#991b1b':type==='yl'?'#92400e':'#166534';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}

// ===================== HELPERS =====================
const nv=v=>parseFloat(v||0)||0;
const fmt=v=>nv(v).toLocaleString('tr-TR');
const today=()=>new Date().toISOString().split('T')[0];
const empty=(cols,msg,icon)=>`<tr><td colspan="${cols}" style="padding:28px 16px;text-align:center;color:var(--sub)">
  <div style="font-size:26px;margin-bottom:6px;opacity:.5">${icon||'📭'}</div>
  <div style="font-size:12.5px;font-weight:500">${msg||'Kayıt bulunamadı'}</div>
</td></tr>`;
function stag(s){
  const m={Aktif:'t-gr',Hasta:'t-rd',Gebe:'t-pu',Satıldı:'t-gy','Öldü':'t-gy',Karantina:'t-or',Kesildi:'t-or',
    Bekliyor:'t-yl','Devam Ediyor':'t-bl',Tamamlandı:'t-gr','İptal':'t-gy',
    Düşük:'t-gy',Orta:'t-bl',Yüksek:'t-or',Kritik:'t-rd',
    Gelir:'t-gr',Gider:'t-rd','Ödendi':'t-gr',Başarılı:'t-gr',Başarısız:'t-rd',Beklemede:'t-yl',
    Aşılama:'t-bl',Tedavi:'t-rd',Muayene:'t-or',Ameliyat:'t-rd',Diğer:'t-gy',
    A:'t-gr',B:'t-yl',C:'t-or'};
  return s?`<span class="tag ${m[s]||'t-gy'}">${s}</span>`:'<span style="color:var(--sub)">-</span>';
}
const ML=()=>Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);return['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()];});
const MD=(arr,k,tf)=>Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);const pf=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return arr.filter(r=>(r.date||'').startsWith(pf)&&(!tf||r.type===tf)).reduce((s,r)=>s+nv(r[k]),0);});
const delR=(k,i)=>{
  const old=D[k]&&D[k][i];
  if(old&&typeof auditRecord==='function')auditRecord('delete',k,`${old.tag_number||old.name||old.title||old.date||'#'+i}`,old);
  D[k].splice(i,1);persist();showToast('Silindi');renderPage(curPage);
};
const gv=id=>(document.getElementById(id)||{}).value||'';
const gnv=id=>nv(gv(id));
const sv=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;};
const ss=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null){for(let o of el.options)if(o.value===v){o.selected=true;break;}}};
function calcAge(bd){if(!bd)return'-';const d=new Date(bd),n=new Date();let y=n.getFullYear()-d.getFullYear(),m=n.getMonth()-d.getMonth();if(m<0){y--;m+=12;}return y>0?`${y} yıl ${m} ay`:`${m} ay`;}
function getSpeciesIcon(sp){return{Sığır:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span>',Koyun:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="11" rx="7" ry="5"/><path d="M7 11v4a2 2 0 0 0 4 0v-1m2 1v-4m2 0v4a2 2 0 0 0 4 0"/><circle cx="8" cy="8" r="2"/></svg></span>',Keçi:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 15c0 3 2 4 4 4s4-1 4-4V9a4 4 0 0 0-8 0v6z"/><path d="M13 10h3l2-3"/><path d="M7 7l-2-3m2 3l2-3"/></svg></span>',At:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 20V10c0-4 3-7 7-7s7 3 7 7v2l2 2-2 1v5"/><path d="M8 20v-3m8 3v-3"/></svg></span>',Tavuk:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 3c-2 0-4 1.5-4 4v2H6l-2 3h4v8h8v-8h4l-2-3h-2V7c0-2.5-2-4-4-4z"/></svg></span>',Hindi:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 3c-2 0-4 1.5-4 4v2H6l-2 3h4v8h8v-8h4l-2-3h-2V7c0-2.5-2-4-4-4z"/></svg></span>',Kaz:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="10" rx="5" ry="4"/><path d="M12 14v6m-4 0h8M7 10c-2 0-4 1-4 3s2 3 4 3"/></svg></span>','Bıldırcın':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M20 4l-4 4H4l4 8 4-4 4 4 4-8-4-4z"/></svg></span>','Arı (Kovan)':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="13" rx="5" ry="4"/><path d="M12 9V5m-4 8l-2 2m10-2 2 2M9 11h6"/></svg></span>'}[sp]||'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="14" r="2"/><circle cx="19" cy="14" r="2"/><ellipse cx="12" cy="17" rx="4" ry="3"/></svg></span>';}
function toggleDark(){document.body.dataset.theme=document.body.dataset.theme==='dark'?'':'dark';}
function openSidebar(){
  document.getElementById('sb').classList.add('open');
  document.getElementById('sb-overlay').classList.add('on');
  document.body.style.overflow='hidden';
}
function closeSidebar(){
  document.getElementById('sb').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
  document.body.style.overflow='';
}
function toggleSidebar(){
  const sb=document.getElementById('sb');
  if(sb.classList.contains('open'))closeSidebar();else openSidebar();
}
function setBottomNav(page){
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('bn-'+page);
  if(btn)btn.classList.add('active');
}

// ===================== NAV =====================
const NAV=[
  {lbl:'',items:[
    {n:'Genel Bakış', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', p:'Dashboard'}
  ]},
  {lbl:'Sürü',items:[
    {n:'Hayvanlar',    ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>', p:'Animals'},
    {n:'Sağlık & Takvim', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', p:'Health'},
    {n:'Üreme',        ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', p:'Reproduction'},
    {n:'Üretim',       ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', p:'Production'},
    {n:'Yemleme',      ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/></svg>', p:'Feeding'},
    {n:'Tartım',       ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M3 6h18M6 6V4h12v2"/><path d="M3 18h18M6 18v2h12v-2"/></svg>', p:'WeightTrack'}
  ]},
  {lbl:'Kasap',items:[
    {n:'Kesim & Randıman', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v18M18 3v18M6 8h12M6 16h12"/></svg>', p:'Slaughter'},
    {n:'Parça Stok & Satış', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>', p:'Cuts'},
    {n:'Müşteriler', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', p:'Customers'},
    {n:'Siparişler', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', p:'Orders'}
  ]},
  {lbl:'İşletme',items:[
    {n:'Finans',       ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', p:'Finance'},
    {n:'Envanter',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', p:'Inventory'},
    {n:'Satışlar',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', p:'Sales'},
    {n:'Tedarikçiler', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', p:'Suppliers'}
  ]},
  {lbl:'Operasyon',items:[
    {n:'Görevler',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', p:'Tasks'},
    {n:'Çalışanlar',   ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', p:'Employees'},
    {n:'Ekipman',      ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', p:'Equipment'},
    {n:'Soy Ağacı',    ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="21" x2="23" y2="19"/><line x1="23" y1="15" x2="23" y2="19"/><polyline points="20 16 23 19 26 16"/></svg>', p:'Genealogy'},
    {n:'Arazi & Tarla', ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>', p:'Lands'},
    {n:'Takvim',       ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', p:'Calendar'}
  ]},
  {lbl:'Analiz',items:[
    {n:'Analitik',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', p:'Analytics'},
    {n:'Raporlar',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', p:'Reports'},
    {n:'Hava Durumu',  ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>', p:'Weather'},
    {n:'AI Asistanı',  ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg>', p:'AIChat'}
  ]},
  {lbl:'Sistem',items:[
    {n:'Ayarlar',      ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', p:'Settings'},
    {n:'QR & PDF',     ico:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', p:'QRScan'}
  ]}
];

// ─── Sekme yönetimi ───
function switchPanelTab(panels, tabs, active, prefix){
  try{
    document.querySelectorAll('[id^="'+prefix+'panel-"]').forEach(p=>p.style.display='none');
    document.querySelectorAll('[id^="'+prefix+'tab-"]').forEach(t=>t.classList.remove('active'));
    const p=document.getElementById(prefix+'panel-'+active);
    const t=document.getElementById(prefix+'tab-'+active);
    if(p)p.style.display='block';if(t)t.classList.add('active');
  }catch(e){}
}

function switchHealthTab(tab){
  switchPanelTab(null,null,tab,'h');
  if(tab==='vac'){
    const el=document.getElementById('vac-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderVacSchedule_into(el);}
  } else if(tab==='vetbook'){
    const el=document.getElementById('vetbook-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderVetBook_into(el);}
  } else if(tab==='diag'){
    const el=document.getElementById('diag-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderDisease_into(el);}
  } else {
    renderHealth();
  }
}
function switchLandsTab(tab){
  switchPanelTab(null,null,tab,'l');
  if(tab==='sulama'){
    const el=document.getElementById('sulama-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>loadSulama_into(el),50);}
  } else if(tab==='tarla'){
    const el=document.getElementById('tarla-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>loadTarlaUygulama_into(el),50);}
  } else { renderLands(); }
}
function switchFinanceTab(tab){
  switchPanelTab(null,null,tab,'f');
  if(tab==='pl'){
    setTimeout(()=>renderPLStatement(),50);
  } else if(tab==='cashflow'){
    setTimeout(()=>renderCashflowProjection(),50);
  } else if(tab==='breakeven'){
    setTimeout(()=>renderBreakevenAnalysis(),50);
  } else if(tab==='profitability'){
    setTimeout(()=>renderProfitabilityMatrix(),50);
  } else if(tab==='cost'){
    const el=document.getElementById('costcalc-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderCostCalc_into(el);}
  } else if(tab==='adv'){
    const el=document.getElementById('advfin-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>renderAdvancedFinance_into(el),50);}
  } else if(tab==='budget'){
    const el=document.getElementById('budget-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>renderBudgetPlanning_into(el),50);}
  } else { renderFinance(); }
}
function switchAnimalsTab(tab){
  switchPanelTab(null,null,tab,'a');
  if(tab==='bulk'){
    const el=document.getElementById('bulkops-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderBulkOps_into(el);}
  } else if(tab==='market'){
    const el=document.getElementById('market-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>loadMarketPrices_into(el),50);}
  } else { renderAnimals(); }
}
function switchProductionTab(tab){
  switchPanelTab(null,null,tab,'p');
  if(tab==='milk'){
    setTimeout(()=>renderMilkTracking(),60);
  } else if(tab==='plan'){
    const el=document.getElementById('prodplan-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderProdPlan_into(el);}
  } else if(tab==='share'){
    const el=document.getElementById('quickshare-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';setTimeout(()=>renderQuickShare_into(el),50);}
  } else { renderProduction(); }
}
function switchQRTab(tab){
  switchPanelTab(null,null,tab,'q');
  if(tab==='pdf'){
    const el=document.getElementById('pdf-content');
    if(el&&!el.dataset.loaded){el.dataset.loaded='1';renderPDFPage_into(el);}
  } else { renderQRScan(); }
}

// ─── "into" wrapper'lar — mevcut render fn'leri bir container'a yazar ───
function cloneRenderInto(renderFn, targetEl){
  // Önce normal render yap, sonra içeriği taşı
  try { renderFn(); } catch(e){}
}
function renderVacSchedule_into(el){
  if(typeof renderVacSchedule==='function'){renderVacSchedule();}
  // VacSchedule kendi pg-VacSchedule elementine yazıyor; buraya kopyala
  const src=document.getElementById('pg-VacSchedule');
  if(src)el.innerHTML=src.innerHTML;
}
function renderVetBook_into(el){
  if(typeof renderVetBook==='function'){renderVetBook();}
  const src=document.getElementById('pg-VetBook');
  if(src)el.innerHTML=src.innerHTML;
}
function renderDisease_into(el){
  if(typeof renderDisease==='function'){renderDisease();}
  const src=document.getElementById('pg-Disease');
  if(src)el.innerHTML=src.innerHTML;
}
function loadSulama_into(el){
  if(typeof loadSulama==='function'){loadSulama();}
  const src=document.getElementById('pg-Sulama');
  if(src)el.innerHTML=src.innerHTML;
}
function loadTarlaUygulama_into(el){
  if(typeof loadTarlaUygulama==='function'){loadTarlaUygulama();}
  const src=document.getElementById('pg-TarlaUygulama');
  if(src)el.innerHTML=src.innerHTML;
}
function renderCostCalc_into(el){
  if(typeof renderCostCalcPage==='function'){renderCostCalcPage();}
  const src=document.getElementById('pg-CostCalc');
  if(src)el.innerHTML=src.innerHTML;
}
function renderAdvancedFinance_into(el){
  if(typeof renderAdvancedFinance==='function'){renderAdvancedFinance();}
  const src=document.getElementById('pg-AdvFinance');
  if(src)el.innerHTML=src.innerHTML;
}
function renderBudgetPlanning_into(el){
  if(typeof renderBudgetPlanning==='function'){renderBudgetPlanning();}
  const src=document.getElementById('pg-Budget');
  if(src)el.innerHTML=src.innerHTML;
}
function renderBulkOps_into(el){
  if(typeof renderBulkOps==='function'){renderBulkOps();}
  const src=document.getElementById('pg-BulkOps');
  if(src)el.innerHTML=src.innerHTML;
}
function loadMarketPrices_into(el){
  if(typeof loadMarketPrices==='function'){loadMarketPrices();}
  const src=document.getElementById('pg-MarketPrices');
  if(src)el.innerHTML=src.innerHTML;
}
function renderProdPlan_into(el){
  if(typeof renderProdPlan==='function'){renderProdPlan();}
  const src=document.getElementById('pg-ProdPlan');
  if(src)el.innerHTML=src.innerHTML;
}
function renderQuickShare_into(el){
  if(typeof renderQuickShare==='function'){renderQuickShare();}
  const src=document.getElementById('pg-QuickShare');
  if(src)el.innerHTML=src.innerHTML;
}
function renderPDFPage_into(el){
  if(typeof renderPDFPage==='function'){renderPDFPage();}
  const src=document.getElementById('pg-PDF');
  if(src)el.innerHTML=src.innerHTML;
}
// Basit Mod'da gizlenen sayfalar — Beskas'ın et/besi+kasap işine göre "ikincil" kabul edilenler.
// Ayarlar > Görünüm'den "Gelişmiş Mod" açılırsa hepsi tekrar görünür. Hiçbir veri silinmez.
const BASIT_MOD_GIZLI=['Reproduction','Production','Inventory','Sales','Suppliers','Employees','Equipment','Genealogy','Lands','Calendar','Analytics','Reports','Weather','QRScan'];
function buildNav(){
  const basit=D.settings.basit_mod!==false; // varsayılan: açık
  document.getElementById('nav').innerHTML=NAV.map(g=>{
    const items=g.items.filter(i=>!basit||!BASIT_MOD_GIZLI.includes(i.p));
    if(!items.length)return'';
    return `<div class="sb-sec"><div class="sb-lbl">${g.lbl}</div>${items.map(i=>`<div class="ni${i.ai?' ai-nav':''}" data-p="${i.p}" onclick="showPage('${i.p}',this)"><div class="ni-ico">${i.ico}</div><span class="ni-lbl">${i.n}</span></div>`).join('')}</div>`;
  }).join('')+`<div class="sb-sec"><div class="ni" style="opacity:.75" onclick="toggleBasitMod()"><div class="ni-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></div><span class="ni-lbl">${basit?'Gelişmiş Modu Aç':'Basit Moda Dön'}</span></div></div>`;
}
function toggleBasitMod(){
  D.settings.basit_mod=D.settings.basit_mod===false?true:false;
  persist();
  buildNav();
  showToast(D.settings.basit_mod!==false?'Basit Mod açıldı — ikincil sayfalar gizlendi':'Gelişmiş Mod açıldı — tüm sayfalar görünür');
}
let curPage='Dashboard';
const CI={};
function destroyChart(id){if(CI[id]){try{CI[id].destroy();}catch(e){}CI[id]=null;}}
function mkChart(id,cfg){const el=document.getElementById(id);if(!el)return;destroyChart(id);try{CI[id]=new Chart(el,cfg);}catch(e){}}

function showPage(id,el,skipHistory){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('pg-'+id);if(!pg)return;
  pg.classList.add('on');
  if(el)el.classList.add('active');
  else{const ni=document.querySelector(`.ni[data-p="${id}"]`);if(ni)ni.classList.add('active');}
  const item=NAV.flatMap(g=>g.items).find(i=>i.p===id);
  if(id!=='AnimalDetail'){var _elt_pg_title=document.getElementById('pg-title');if(_elt_pg_title)_elt_pg_title.textContent=item?item.n:id;}
  curPage=id;
  setTimeout(()=>renderPage(id),30);
  // Mobil: sidebar kapat, overlay kaldır
  closeSidebar();
  // Bottom nav sync
  setBottomNav(id);
  // Sekme panellerini resetle (tab state temizle)
  const tabResets={
    'Health':()=>{ document.querySelectorAll('[id^="hpanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="htab-"]').forEach((t,i)=>{t.classList.toggle('active',i===0);}); },
    'Animals':()=>{ document.querySelectorAll('[id^="apanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="atab-"]').forEach((t,i)=>t.classList.toggle('active',i===0)); },
    'Finance':()=>{ document.querySelectorAll('[id^="fpanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="ftab-"]').forEach((t,i)=>t.classList.toggle('active',i===0)); },
    'Lands':()=>{ document.querySelectorAll('[id^="lpanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="ltab-"]').forEach((t,i)=>t.classList.toggle('active',i===0)); },
    'Production':()=>{ document.querySelectorAll('[id^="ppanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="ptab-"]').forEach((t,i)=>t.classList.toggle('active',i===0)); },
    'QRScan':()=>{ document.querySelectorAll('[id^="qpanel-"]').forEach((p,i)=>p.style.display=i===0?'block':'none'); document.querySelectorAll('[id^="qtab-"]').forEach((t,i)=>t.classList.toggle('active',i===0)); },
  };
  if(tabResets[id])try{tabResets[id]();}catch(e){}
  // v4 sayfa render hook
  switch(id){
    case 'MarketPrices':   setTimeout(()=>loadMarketPrices(),50); break;
    case 'AdvFinance':     setTimeout(()=>renderAdvancedFinance(),50); break;
    case 'Sulama':         setTimeout(()=>loadSulama(),50); break;
    case 'TarlaUygulama':  setTimeout(()=>loadTarlaUygulama(),50); break;
    case 'QuickShare':     setTimeout(()=>renderQuickShare(),50); break;
    case 'Budget':         setTimeout(()=>renderBudgetPlanning(),50); break;
  }
}
function renderPage(id){
  const map={Dashboard:renderDashboard,Animals:renderAnimals,Health:renderHealth,Reproduction:renderRepro,Production:renderProduction,Feeding:renderFeeding,Finance:renderFinance,Inventory:renderInventory,Sales:renderSales,Suppliers:renderSuppliers,Employees:renderEmployees,Tasks:renderTasks,Lands:renderLands,Analytics:renderAnalytics,Reports:renderReports,Calendar:renderCalendar,Weather:renderWeather,Disease:renderDisease,notifications:renderNotifs,VacSchedule:renderVacSchedule,VetBook:renderVetBook,BulkOps:renderBulkOps,CostCalc:renderCostCalcPage,ProdPlan:renderProdPlan,WeightTrack:renderWeightTrack,QRScan:renderQRScan,PDF:renderPDFPage,Integrations:renderIntegrations,AIChat:function(){},Equipment:renderEquipment,Genealogy:renderGenealogy,Slaughter:renderSlaughter,Cuts:renderCuts,Customers:renderCustomers,Orders:renderOrders};
  if(map[id])try{map[id]();}catch(e){console.warn('renderPage error ['+id+']:',e);}
}

// ===================== FARM CONTEXT =====================

// ===================== GROQ API DOĞRUDAN ÇAĞRI =====================
function getGroqKey(){
  return D.settings.groq_key || localStorage.getItem('_groq_key') || '';
}

function saveGroqKey(key){
  D.settings.groq_key = key.trim();
  localStorage.setItem('_groq_key', key.trim());
  updateGroqKeyStatus(key.trim());
}

function updateGroqKeyStatus(key){
  const el = document.getElementById('groq-key-status');
  if(!el) return;
  if(!key){
    el.style.color='#ef4444';
    el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> API key girilmemiş — AI özellikleri çalışmaz';
  } else if(key.startsWith('gsk_') && key.length > 20){
    el.style.color='#16a34a';
    el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> API key mevcut — AI hazır';
  } else {
    el.style.color='#f59e0b';
    el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Geçersiz format (gsk_ ile başlamalı)';
  }
}

async function testGroqKey(){
  const key = document.getElementById('s-groq-key')?.value?.trim() || getGroqKey();
  if(!key){ showToast('API key girin!','yl'); return; }
  const el = document.getElementById('groq-key-status');
  if(el){ el.style.color='#3b82f6'; el.textContent=' Test ediliyor...'; }
  try{
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'llama-3.1-8b-instant',max_tokens:10,messages:[{role:'user',content:'merhaba'}]})
    });
    const d = await r.json();
    if(d.choices){
      saveGroqKey(key);
      if(el){ el.style.color='#16a34a'; el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Bağlantı başarılı! API key geçerli.'; }
      showToast('API bağlantısı başarılı');
    } else {
      if(el){ el.style.color='#ef4444'; el.textContent='Hata: '+(d.error?.message||'Geçersiz key'); }
      showToast('API hatası: '+(d.error?.message||'Geçersiz key'),'rd');
    }
  }catch(e){
    if(el){ el.style.color='#ef4444'; el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> Bağlantı hatası: '+e.message; }
    showToast('Bağlantı hatası: '+e.message,'rd');
  }
}

async function testGeminiKey(){
  const key=(document.getElementById('s-gemini-key')?.value||'').trim();
  const el=document.getElementById('gemini-key-status');
  if(!key){if(el)el.textContent='API key girilmemiş';return;}
  if(el){el.textContent='Test ediliyor...';el.style.color='var(--sub)';}
  try{
    const model=document.getElementById('s-gemini-model')?.value||'gemini-1.5-flash';
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:'Merhaba'}]}],generationConfig:{maxOutputTokens:10}})
    });
    if(r.ok){if(el){el.textContent='✓ Bağlantı başarılı — Gemini hazır';el.style.color='var(--ok)';}}
    else{const d=await r.json();if(el){el.textContent='✗ Hata: '+(d?.error?.message||r.status);el.style.color='var(--danger)';}}
  }catch(e){if(el){el.textContent='✗ Bağlantı hatası';el.style.color='var(--danger)';}}
}

async function testAgroKey(){
  const key=(document.getElementById('s-agro-key')?.value||'').trim();
  const el=document.getElementById('agro-key-status');
  if(!key){if(el)el.textContent='API key girilmemiş';return;}
  if(el){el.textContent='Test ediliyor...';el.style.color='var(--sub)';}
  try{
    const r=await fetch(`https://agromonitoring.com/agro/1.0/polygons?appid=${key}`);
    if(r.ok||r.status===200){if(el){el.textContent='✓ Bağlantı başarılı — Agromonitoring hazır';el.style.color='var(--ok)';}}
    else{if(el){el.textContent='✗ Hata: Geçersiz API key ('+r.status+')';el.style.color='var(--danger)';}}
  }catch(e){if(el){el.textContent='✗ Bağlantı hatası';el.style.color='var(--danger)';}}
}
async function groqCall(messages, system='', maxTokens=1000){
  const key = getGroqKey();
  const model = D.settings.aimodel || 'llama-3.3-70b-versatile';
  const msgs = [];
  if(system) msgs.push({role:'system', content:system});
  messages.forEach(m => { if(m.role && m.content) msgs.push(m); });

  // Önce doğrudan Groq API'yi dene (API key varsa)
  if(key && key.startsWith('gsk_')){
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model, max_tokens:maxTokens, messages:msgs, temperature:0.65})
    });
    if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||'HTTP '+r.status); }
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || '';
    return {content:[{type:'text',text}]};
  }

  // Fallback: api.php (sunucu varsa)
  const r2 = await fetch('api.php',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model, max_tokens:maxTokens, system, messages})
  });
  if(!r2.ok){ const e=await r2.json().catch(()=>({})); throw new Error(e.error||'HTTP '+r2.status); }
  return await r2.json();
}
function farmCtx(){
  const now=new Date();
  const thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonth=new Date(now.getFullYear(),now.getMonth()-1,1);
  const lastMonthStr=`${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}`;

  // Finansal hesaplamalar
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  const buAyGelir=D.finance.filter(f=>f.type==='Gelir'&&(f.date||'').startsWith(thisMonth)).reduce((s,f)=>s+nv(f.amount),0);
  const buAyGider=D.finance.filter(f=>f.type==='Gider'&&(f.date||'').startsWith(thisMonth)).reduce((s,f)=>s+nv(f.amount),0);
  const giderCats={};D.finance.filter(f=>f.type==='Gider').forEach(f=>{giderCats[f.category]=(giderCats[f.category]||0)+nv(f.amount);});
  const topGider=Object.entries(giderCats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}:₺${Math.round(v/1000)}k`).join(', ');

  // Hayvan verileri
  const turler={};D.animals.forEach(a=>{turler[a.species]=(turler[a.species]||0)+1;});
  const hasta=D.animals.filter(a=>a.status==='Hasta');
  const gebe=D.animals.filter(a=>a.status==='Gebe');
  const aktif=D.animals.filter(a=>a.status==='Aktif');
  const ortalamaCanlıAğırlık=D.animals.length?Math.round(D.animals.reduce((s,a)=>s+nv(a.weight),0)/D.animals.length):0;

  // Sağlık istatistikleri
  const son30GunSaglik=D.health.filter(h=>{const d=new Date(h.date||0);return(now-d)/86400000<=30;});
  const hastaliklar={};son30GunSaglik.forEach(h=>{if(h.diagnosis){hastaliklar[h.diagnosis]=(hastaliklar[h.diagnosis]||0)+1;}});
  const yaklaşanAşi=D.health.filter(h=>h.next_date&&new Date(h.next_date)>now&&(new Date(h.next_date)-now)/86400000<=14);

  // Üretim verileri
  const sutUretim=D.production.filter(p=>p.product_type==='Süt'||p.product==='Süt');
  const buAySut=sutUretim.filter(p=>(p.date||'').startsWith(thisMonth)).reduce((s,p)=>s+nv(p.amount||p.quantity),0);

  // Stok
  const kritik=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock));
  const dusuk=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)*1.5&&nv(i.current_stock)>=nv(i.minimum_stock));

  // Görevler
  const bugunGorev=D.tasks.filter(t=>t.due_date===now.toISOString().split('T')[0]&&t.status!=='Tamamlandı');
  const gecikGorev=D.tasks.filter(t=>t.due_date&&t.due_date<now.toISOString().split('T')[0]&&t.status!=='Tamamlandı'&&t.status!=='İptal');
  const kritikGorev=D.tasks.filter(t=>t.priority==='Kritik'&&t.status==='Bekliyor');

  // Yaklaşan doğumlar
  const yakinDogum=D.repro.filter(r=>{if(!r.expected_birth_date||r.outcome!=='Beklemede')return false;const d=(new Date(r.expected_birth_date)-now)/86400000;return d>=0&&d<=30;});

  // Çalışan
  const aktifCalisan=D.employees.filter(e=>e.status==='Aktif').length;

  const farmName=D.settings.farm_name||'Bizim Çiftlik';
  const farmType=D.settings.type||'Karma';
  const location=D.settings.location||'Türkiye';
  const season=['Kış','Kış','İlkbahar','İlkbahar','İlkbahar','Yaz','Yaz','Yaz','Sonbahar','Sonbahar','Sonbahar','Kış'][now.getMonth()];

  let ctx=`Sen "${farmName}" çiftliğinin kıdemli ziraat ve hayvancılık danışmanısın. ${location} bölgesinde faaliyet gösteren bu ${farmType} çiftliği için uzman, kapsamlı ve eyleme geçirilebilir Türkçe tavsiyeler ver. Yanıtların şu özellikleri taşımalı:
- Somut ve ölçülebilir öneriler (rakamlar, yüzdeler, süreler)
- Türkiye hayvancılık mevzuatına ve TARSİM uygulamalarına uygun
- Mevsimsel ve bölgesel koşulları göz önünde bulunduran
- Risk-fayda analizi içeren
- Gerektiğinde veteriner/uzman yönlendirmesi yapan

═══ ÇIFTLIK PROFILI ═══
Ad: ${farmName} | Tip: ${farmType} | Konum: ${location} | Mevsim: ${season}
Tarih: ${now.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}

═══ SÜRÜ DURUMU ═══
Toplam Hayvan: ${D.animals.length} baş | Aktif: ${aktif.length} | Hasta: ${hasta.length} | Gebe: ${gebe.length}
Tür Dağılımı: ${Object.entries(turler).map(([k,v])=>k+' ('+v+')').join(' · ')||'Kayıt yok'}
Ort. Canlı Ağırlık: ${ortalamaCanlıAğırlık} kg
${hasta.length?`⚠️ Hasta Hayvanlar: ${hasta.map(a=>a.tag_number+(a.name?' ('+a.name+')':'')).join(', ')}`:''}
${gebe.length?`🐄 Gebe: ${gebe.map(a=>a.tag_number).join(', ')}`:''}
${yakinDogum.length?`🍼 Yaklaşan Doğum (30 gün): ${yakinDogum.length} hayvan`:''}

═══ FİNANSAL TABLO ═══
Toplam Gelir: ₺${fmt(gelir)} | Toplam Gider: ₺${fmt(gider)} | Net: ₺${fmt(gelir-gider)} (${gelir>0?((gelir-gider)/gelir*100).toFixed(1):'0'}% marj)
Bu Ay: Gelir ₺${fmt(buAyGelir)} / Gider ₺${fmt(buAyGider)} / Net ₺${fmt(buAyGelir-buAyGider)}
En Büyük Gider Kalemleri: ${topGider||'Veri yok'}
Satış Kaydı: ${D.sales.length} işlem

═══ SAĞLIK & BAKIM ═══
Son 30 Gün Sağlık Kaydı: ${son30GunSaglik.length} kayıt
${Object.keys(hastaliklar).length?`Güncel Teşhisler: ${Object.entries(hastaliklar).map(([k,v])=>k+' ('+v+')').join(', ')}`:''}
${yaklaşanAşi.length?`💉 Yaklaşan Aşı (14 gün): ${yaklaşanAşi.length} hayvan`:''}

═══ ÜRETİM ═══
Bu Ay Süt Üretimi: ${buAySut.toFixed(0)} litre
Toplam Üretim Kaydı: ${D.production.length}

═══ STOK DURUMU ═══
${kritik.length?`🔴 Kritik Stok (${kritik.length}): ${kritik.map(i=>i.name+' ('+i.current_stock+' '+i.unit+')').join(', ')}`:'✅ Kritik stok yok'}
${dusuk.length?`🟡 Düşük Stok (${dusuk.length}): ${dusuk.map(i=>i.name).join(', ')}`:''}

═══ GÖREV & PERSONEL ═══
Bugün Yapılacak: ${bugunGorev.length} | Gecikmiş: ${gecikGorev.length} | Kritik Bekleyen: ${kritikGorev.length}
Aktif Çalışan: ${aktifCalisan} kişi`;

  if(D.ai_memory&&D.ai_memory.trim())ctx+=`\n\n═══ ÇİFTLİK HAFIZASI ═══\n${D.ai_memory}`;
  if(D.settings.ai_custom&&D.settings.ai_custom.trim())ctx+=`\n\n═══ ÖZEL TALİMATLAR ═══\n${D.settings.ai_custom}`;
  return ctx;
}

// ===================== AI =====================
function formatAIResponse(raw){
  if(!raw)return'Yanıt alınamadı.';
  // Markdown → HTML dönüşümü
  return raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^#{3}\s+(.+)$/gm,'<h4 style="font-size:13px;font-weight:700;color:var(--txt);margin:12px 0 4px;border-bottom:1px solid var(--brd);padding-bottom:3px">$1</h4>')
    .replace(/^#{2}\s+(.+)$/gm,'<h3 style="font-size:14px;font-weight:700;color:var(--accent);margin:14px 0 6px">$1</h3>')
    .replace(/^#{1}\s+(.+)$/gm,'<h3 style="font-size:15px;font-weight:800;color:var(--txt);margin:14px 0 6px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code style="background:var(--bg);padding:1px 5px;border-radius:4px;font-size:11.5px;font-family:monospace">$1</code>')
    .replace(/^\s*[-•]\s+(.+)$/gm,'<div style="display:flex;gap:7px;margin:3px 0;padding:3px 0"><span style="color:var(--accent);font-weight:700;flex-shrink:0;margin-top:1px">▸</span><span>$1</span></div>')
    .replace(/^\s*\d+\.\s+(.+)$/gm,(m,p1,offset,str)=>{
      const num=str.substring(0,offset).split('\n').filter(l=>/^\s*\d+\./.test(l)).length+1;
      return `<div style="display:flex;gap:8px;margin:4px 0;padding:4px 0"><span style="background:var(--accent);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${num}</span><span>${p1}</span></div>`;
    })
    .replace(/^---+$/gm,'<hr style="border:none;border-top:1px solid var(--brd);margin:10px 0">')
    .replace(/\n{2,}/g,'</p><p style="margin:6px 0">')
    .replace(/\n/g,'<br>');
}

async function aiCall(prompt,elId,maxTokens=1500){
  const el=document.getElementById(elId);if(!el)return;
  // ai-quick-result placeholder gizle
  if(elId==='ai-quick-result'){
    const ph=document.getElementById('ai-quick-placeholder');
    const rs=document.getElementById('ai-quick-result');
    if(ph)ph.style.display='none';
    if(rs)rs.style.display='';
  }
  el.className='ai-result loading';
  el.innerHTML='<div style="display:flex;align-items:center;gap:8px;color:var(--sub);font-size:12.5px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analiz hazırlanıyor...</div>';
  if(!getGroqKey()){
    el.className='ai-result';
    el.innerHTML='<div style="padding:12px;background:var(--yellow-lt);border-radius:8px;border-left:3px solid var(--yellow)"><b>API anahtarı gerekli.</b> <a onclick="showPage(\'Settings\',null);setTimeout(()=>showStab(\'ai\',null),300)" style="cursor:pointer;color:var(--accent)">Ayarlar → AI sekmesine git →</a></div>';
    return;
  }
  try{
    const t0=Date.now();
    const data=await groqCall([{role:'user',content:prompt}],farmCtx(),maxTokens);
    const raw=data.content?.map(c=>c.text||'').join('')||'Yanıt alınamadı.';
    const elapsed=((Date.now()-t0)/1000).toFixed(1);
    el.className='ai-result';
    el.innerHTML=`<div style="font-size:10px;color:var(--sub);margin-bottom:8px;display:flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg> AI · ${elapsed}s</div>${formatAIResponse(raw)}`;
  }catch(e){
    el.className='ai-result';
    el.innerHTML=`<div style="padding:10px;background:var(--red-lt);border-radius:8px;border-left:3px solid var(--red);font-size:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:4px"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><b>Bağlantı hatası:</b> ${e.message}</div>`;
  }
}

// ===================== AI CHAT =====================
let chatHistory=[];
async function chatSend(text){
  const inp=document.getElementById('chat-in');
  const msg=(text||(inp?inp.value:'')).trim();if(!msg)return;
  if(inp)inp.value='';
  var _cs=document.getElementById('chat-sugs');if(_cs)_cs.style.display='none';
  const msgsEl=document.getElementById('chat-msgs');
  if(!msgsEl)return;
  msgsEl.innerHTML+=`<div class="msg msg-user">${msg.replace(/</g,'&lt;')}</div>`;
  const ty=document.createElement('div');ty.className='msg msg-ai';ty.textContent='⟳ Yazıyor...';
  msgsEl.appendChild(ty);msgsEl.scrollTop=msgsEl.scrollHeight;
  chatHistory.push({role:'user',content:msg});
  if(!getGroqKey()){
    ty.remove();
    msgsEl.innerHTML+='<div class="msg msg-ai">API anahtarı gerekli. Ayarlar → AI sekmesinden Groq API key girin.</div>';
    msgsEl.scrollTop=msgsEl.scrollHeight;
    return;
  }
  try{
    const sys=farmCtx()+'\n\nSOHBET KURALLARI:\n- Samimi ama profesyonel ol\n- Yanıtları kısa tut (max 4-5 paragraf)\n- Somut rakamlar ve örnekler kullan\n- Gerektiğinde çiftlik verilerini referans al\n- Markdown formatla (başlık, liste, kalın)';
    const data=await groqCall(chatHistory.slice(-12),sys,1000);
    const reply=data.content?.map(c=>c.text||'').join('')||'Yanıt alınamadı.';
    chatHistory.push({role:'assistant',content:reply});
    ty.remove();
    msgsEl.innerHTML+=`<div class="msg msg-ai">${formatAIResponse(reply)}</div>`;
  }catch(e){ty.remove();msgsEl.innerHTML+=`<div class="msg msg-ai">Hata: ${e.message}</div>`;}
  msgsEl.scrollTop=msgsEl.scrollHeight;
}
function clearChat(){chatHistory=[];document.getElementById('chat-msgs').innerHTML='<div class="msg msg-ai">Sohbet temizlendi!</div>';document.getElementById('chat-sugs').style.display='flex';}

// ===================== SESLİ KOMUT (Bas-Konuş, Groq Whisper) =====================
// Mikrofona basılı tutup konuşunca ses kaydedilir, bırakınca Groq'un Whisper API'siyle
// yazıya dökülür ve AI sohbetine otomatik gönderilir.
let _micStream=null,_micRecorder=null,_micChunks=[],_micRecording=false;

async function sesliKayitBaslat(){
  if(_micRecording)return;
  if(!getGroqKey()){showToast('Önce Ayarlar → AI sekmesinden Groq API key girin','yl');return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showToast('Bu cihaz/tarayıcı mikrofon erişimini desteklemiyor','rd');return;}
  try{
    _micStream=await navigator.mediaDevices.getUserMedia({audio:true});
  }catch(e){showToast('Mikrofon izni alınamadı: '+e.message,'rd');return;}
  _micChunks=[];
  _micRecording=true;
  document.querySelectorAll('.mic-rec-dot').forEach(el=>el.style.display='block');
  try{
    const mimeType=(window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported('audio/webm'))?'audio/webm':'';
    _micRecorder=mimeType?new MediaRecorder(_micStream,{mimeType}):new MediaRecorder(_micStream);
  }catch(e){
    showToast('Ses kaydedici başlatılamadı: '+e.message,'rd');
    _micRecording=false;
    if(_micStream){_micStream.getTracks().forEach(t=>t.stop());_micStream=null;}
    return;
  }
  _micRecorder.ondataavailable=e=>{if(e.data&&e.data.size>0)_micChunks.push(e.data);};
  _micRecorder.start();
  showToast('🎙️ Dinliyor... (bırakınca gönderilir)');
}

async function sesliKayitBitir(){
  if(!_micRecording||!_micRecorder){
    // İzin/başlatma aşamasındaysa sessizce çık
    if(_micStream){_micStream.getTracks().forEach(t=>t.stop());_micStream=null;}
    return;
  }
  _micRecording=false;
  document.querySelectorAll('.mic-rec-dot').forEach(el=>el.style.display='none');
  const rec=_micRecorder;
  const kayit=await new Promise(resolve=>{
    rec.onstop=()=>resolve(new Blob(_micChunks,{type:rec.mimeType||'audio/webm'}));
    try{rec.stop();}catch(e){resolve(new Blob(_micChunks));}
  });
  if(_micStream){_micStream.getTracks().forEach(t=>t.stop());_micStream=null;}
  if(kayit.size<800){showToast('Ses algılanamadı, tekrar deneyin','yl');return;}
  showToast('⟳ Ses yazıya dökülüyor...');
  try{
    const metin=await sesiMetneDonustur(kayit);
    if(!metin||!metin.trim()){showToast('Hiçbir şey anlaşılamadı','yl');return;}
    sesliKomutIsle(metin.trim());
  }catch(e){
    showToast('Ses tanıma hatası: '+e.message,'rd');
  }
}

async function sesiMetneDonustur(blob){
  const key=getGroqKey();
  if(!key)throw new Error('Groq API key gerekli');
  const fd=new FormData();
  fd.append('file',blob,'kayit.webm');
  fd.append('model','whisper-large-v3');
  fd.append('language','tr');
  const r=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{
    method:'POST',
    headers:{'Authorization':'Bearer '+key},
    body:fd
  });
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||('HTTP '+r.status));}
  const d=await r.json();
  return d.text||'';
}

// Yazıya dökülen sesli komutu AI sohbetine gönderir — AI sayfasında değilsek oraya geçer.
function sesliKomutIsle(metin){
  showToast('🎤 "'+metin+'"');
  if(curPage!=='AIChat'){
    showPage('AIChat',null);
    setTimeout(()=>{ if(typeof switchAITab==='function')switchAITab('chat'); chatSend(metin); },350);
  } else {
    if(typeof switchAITab==='function')switchAITab('chat');
    chatSend(metin);
  }
}

// ===================== PHOTO HELPERS =====================
function getPhotos(tag){return D.photos[tag]||[];}
function addPhoto(tag,b64){if(!D.photos[tag])D.photos[tag]=[];D.photos[tag].push(b64);persist();}
function delPhoto(tag,idx){if(D.photos[tag])D.photos[tag].splice(idx,1);persist();}
function firstPhoto(tag){const p=getPhotos(tag);return p.length?p[0]:null;}


document.getElementById('lightbox').addEventListener('click',e=>{if(e.target===document.getElementById('lightbox'))closeLightbox();});

// ===================== ANIMAL DETAIL =====================
let detailAnimalIdx=-1;
function openAnimalDetail(idx){
  detailAnimalIdx=idx;
  const a=D.animals[idx];if(!a)return;
  showPage('AnimalDetail',null);
  var _pgtEl=document.getElementById('pg-title');if(_pgtEl)_pgtEl.innerHTML=`<button onclick="showPage('Animals',null)" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--sub);padding:0 6px 0 0">← Hayvanlar</button> ${getSpeciesIcon(a.species)} ${a.tag_number}${a.name?' · '+a.name:''}`;
  renderAnimalDetail(idx);
}

function renderAnimalDetail(idx){
  const a=D.animals[idx];if(!a)return;
  const photos=getPhotos(a.tag_number);
  const healthRecs=D.health.filter(h=>h.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')||0);
  const prodRecs=D.production.filter(p=>p.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')||0);
  const reproRecs=D.repro.filter(r=>r.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')||0);
  const feedRecs=D.feeding.filter(f=>f.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')||0);
  const totalProd=prodRecs.reduce((s,p)=>s+nv(p.quantity),0);
  const totalHealth=healthRecs.reduce((s,h)=>s+nv(h.cost),0);

  // Build timeline
  const events=[];
  healthRecs.forEach(h=>events.push({date:h.date,type:'health',icon:'',title:h.record_type+(h.diagnosis?' — '+h.diagnosis:''),sub:h.vet_name||'',cls:'tl-rd'}));
  prodRecs.slice(0,5).forEach(p=>events.push({date:p.date,type:'prod',icon:'',title:`${p.production_type}: ${p.quantity} ${p.unit}`,sub:p.quality_grade?'Kalite: '+p.quality_grade:'',cls:'tl-bl'}));
  reproRecs.forEach(r=>events.push({date:r.date,type:'repro',icon:'',title:r.event_type+(r.outcome?' — '+r.outcome:''),sub:r.expected_birth_date?'Beklenen: '+r.expected_birth_date:'',cls:'tl-pu'}));
  feedRecs.slice(0,3).forEach(f=>events.push({date:f.date,type:'feed',icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 22V12M12 12C12 7 8 4 4 4c0 4 3 8 8 8zm0 0c0-5 4-8 8-8-1 4-4 8-8 8z"/></svg></span>',title:`${f.feed_name}: ${f.quantity} ${f.unit||'kg'}`,sub:'',cls:'tl-or'}));
  events.sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  const mainPhoto=photos.length?`<img src="${photos[0]}" alt="" onclick="openLightbox('${photos[0]}')"/>`
    :`<div class="animal-photo-placeholder"><div class="big-ico">${getSpeciesIcon(a.species)}</div><div style="font-size:11px">Fotoğraf yok</div></div>`;

  const html=`
  <div class="animal-hero">
    <div class="animal-hero-top">
      <div class="animal-photo-wrap">${mainPhoto}</div>
      <div class="animal-hero-info">
        <div>
          <div class="animal-hero-name">${a.name||a.tag_number}</div>
          <div class="animal-hero-tag">${stag(a.status)} <span style="color:var(--sub)">#${a.tag_number}</span></div>
          <div class="animal-detail-grid">
            <div class="adf"><div class="adf-lbl">Tür / Irk</div><div class="adf-val">${getSpeciesIcon(a.species)} ${a.species}${a.breed?' · '+a.breed:''}</div></div>
            <div class="adf"><div class="adf-lbl">Cinsiyet</div><div class="adf-val">${a.gender||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Yaş</div><div class="adf-val">${calcAge(a.birth_date)}</div></div>
            <div class="adf"><div class="adf-lbl">Ağırlık</div><div class="adf-val">${a.weight?a.weight+' kg':'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Konum</div><div class="adf-val">${a.location||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Renk</div><div class="adf-val">${a.color||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Doğum</div><div class="adf-val">${a.birth_date||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Alım Fiyatı</div><div class="adf-val">${a.purchase_price?'₺'+fmt(a.purchase_price):'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Sigorta No</div><div class="adf-val">${a.insurance_no||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Anne Küpe</div><div class="adf-val">${a.mother_tag||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Baba Küpe</div><div class="adf-val">${a.father_tag||'-'}</div></div>
            <div class="adf"><div class="adf-lbl">Günlük Süt</div><div class="adf-val">${a.daily_milk?a.daily_milk+' lt':'-'}</div></div>
          </div>
          ${a.notes?`<div style="margin-top:10px;padding:9px 12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--sub)">${a.notes}</div>`:''}
        </div>
      </div>
    </div>
    <div class="animal-hero-actions">
      <button class="btn btn-pr btn-sm" onclick="editRecord('animal',${idx})">Düzenle</button>
      <button class="btn btn-sec btn-sm" onclick="openForm('health');setTimeout(()=>{document.getElementById('f-tag').value='${a.tag_number}';},100)">+ Sağlık Kaydı</button>
      <button class="btn btn-sec btn-sm" onclick="openForm('production');setTimeout(()=>{document.getElementById('f-tag').value='${a.tag_number}';},100)">+ Üretim</button>
      <button class="btn btn-sec btn-sm" onclick="openForm('repro');setTimeout(()=>{document.getElementById('f-tag').value='${a.tag_number}';},100)">+ Üreme</button>
      <button class="btn btn-sec btn-sm" onclick="openForm('feeding');setTimeout(()=>{document.getElementById('f-tag').value='${a.tag_number}';},100)">+ Yemleme</button>
      <button class="btn btn-sec btn-sm" onclick="openForm('slaughter');setTimeout(()=>{document.getElementById('f-tag').value='${a.tag_number}';},100)">+ Kesim Kaydı</button>
      <button class="btn btn-ai btn-sm" onclick="aiAnimalDeepDive(${idx})">AI Analizi</button>
      <button class="btn btn-sec btn-sm" onclick="generateAnimalProfilePDF(${idx})"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/></svg></span> PDF</button>
      <button class="btn btn-danger btn-sm" onclick="if(confirm('Hayvanı sil?')){delR('animals',${idx});showPage('Animals',null)}">Sil</button>
    </div>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab active" onclick="switchTab(this,'tab-photos')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Fotoğraflar (${photos.length})</button>
    <button class="tab" onclick="switchTab(this,'tab-health')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Sağlık (${healthRecs.length})</button>
    <button class="tab" onclick="switchTab(this,'tab-prod')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Üretim (${prodRecs.length})</button>
    <button class="tab" onclick="switchTab(this,'tab-repro')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg> Üreme (${reproRecs.length})</button>
    <button class="tab" onclick="switchTab(this,'tab-weight');renderWeightChart(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.905 1.46L2 17h20l-2.595-7.54A2 2 0 0 0 17.5 8h-11z"/></svg> Ağırlık</button>
    <button class="tab" onclick="switchTab(this,'tab-roi');renderAnimalROI(${idx})"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1m-3-5c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3"/></svg></span> Maliyet/ROI</button>
    <button class="tab" onclick="switchTab(this,'tab-qr');renderAnimalQR(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> QR Kod</button>
    <button class="tab" onclick="switchTab(this,'tab-timeline')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> Zaman Çizelgesi</button>
    <button class="tab" onclick="switchTab(this,'tab-ai');aiAnimalDeepDive(${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/></svg> Analiz</button>
  </div>

  <!-- PHOTOS TAB -->
  <div class="tab-content on" id="tab-photos">
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Fotoğraf Galerisi</span></div>
      <div class="photo-gallery" id="photo-gallery-${a.tag_number}">
        ${photos.map((p,pi)=>`<div class="photo-thumb"><img src="${p}" onclick="openLightbox('${p}')" alt="Foto ${pi+1}"/><button class="del-ph" onclick="delAnimalPhoto('${a.tag_number}',${pi})">✕</button></div>`).join('')}
        <label class="photo-add">
          <span style="font-size:22px"></span>
          <span>Fotoğraf Ekle</span>
          <input type="file" accept="image/*" multiple style="display:none" onchange="addAnimalPhotos('${a.tag_number}',this)">
        </label>
      </div>
    </div>
  </div>

  <!-- HEALTH TAB -->
  <div class="tab-content" id="tab-health">
    <div class="g3 mb">
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${healthRecs.length}</div><div class="sc-lbl">Toplam Kayıt</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(totalHealth)}</div><div class="sc-lbl">Toplam Harcama</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${healthRecs[0]?.date||'-'}</div><div class="sc-lbl">Son Kayıt</div></div>
    </div>
    <div class="card mb"><div class="card-hd"><span class="card-t">Sağlık Kayıtları</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Tip</th><th>Teşhis</th><th>İlaç</th><th>Veteriner</th><th>Maliyet</th><th>Sonraki</th></tr></thead>
      <tbody>${healthRecs.length?healthRecs.map(h=>`<tr><td>${h.date||'-'}</td><td>${stag(h.record_type)}</td><td>${h.diagnosis||'-'}</td><td>${h.medication||'-'}</td><td>${h.vet_name||'-'}</td><td>${h.cost?'₺'+fmt(h.cost):'-'}</td><td>${h.next_date||'-'}</td></tr>`).join(''):empty(7)}</tbody></table></div>
    </div>
  </div>

  <!-- PRODUCTION TAB -->
  <div class="tab-content" id="tab-prod">
    <div class="g3 mb">
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${prodRecs.length}</div><div class="sc-lbl">Toplam Kayıt</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${totalProd.toFixed(1)}</div><div class="sc-lbl">Toplam Üretim</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${prodRecs.filter(p=>p.quality_grade==='A').length}</div><div class="sc-lbl">A Kalite Kayıt</div></div>
    </div>
    <div class="card mb"><div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Tür</th><th>Miktar</th><th>Birim</th><th>Kalite</th></tr></thead>
    <tbody>${prodRecs.length?prodRecs.map(p=>`<tr><td>${p.date||'-'}</td><td>${stag(p.production_type)}</td><td>${p.quantity}</td><td>${p.unit||'-'}</td><td>${p.quality_grade?stag(p.quality_grade):'-'}</td></tr>`).join(''):empty(5)}</tbody></table></div></div>
  </div>

  <!-- REPRO TAB -->
  <div class="tab-content" id="tab-repro">
    <div class="card mb"><div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Olay</th><th>Erkek</th><th>Beklenen Doğum</th><th>Yavru</th><th>Sonuç</th></tr></thead>
    <tbody>${reproRecs.length?reproRecs.map(r=>`<tr><td>${r.date||'-'}</td><td>${stag(r.event_type)}</td><td>${r.male_tag||'-'}</td><td>${r.expected_birth_date||'-'}</td><td>${r.offspring_count||'-'}</td><td>${stag(r.outcome)}</td></tr>`).join(''):empty(6)}</tbody></table></div></div>
  </div>

  <!-- AĞIRLIK TAKİP TAB -->
  <div class="tab-content" id="tab-weight">
    <div class="card mb">
      <div class="card-hd"><span class="card-t">ğırlık Büyüme Eğrisi</span></div>
      <div class="ch-wrap" style="height:220px"><canvas id="ch-weight-${a.tag_number}"></canvas></div>
    </div>
    <div class="card mb" id="besi-hedef-${a.tag_number}">
      <div class="card-hd"><span class="card-t">Besi Hedefi</span></div>
      <div id="besi-hedef-content-${a.tag_number}"></div>
    </div>
    <div class="card mb">
      <div class="card-hd"><span class="card-t">ırlık Kayıtları</span><button class="btn btn-pr btn-sm" onclick="openForm('production');setTimeout(()=>{sv('f-tag','${a.tag_number}');},100)">+ Kayıt Ekle</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Ağırlık</th><th>Artış</th></tr></thead>
      <tbody id="tbl-weight-${a.tag_number}"></tbody></table></div>
    </div>
  </div>

  <!-- MALİYET/ROI TAB -->
  <div class="tab-content" id="tab-roi">
    <div id="roi-content-${a.tag_number}">
      <div style="text-align:center;padding:24px;color:var(--sub);font-size:13px">Yükleniyor...</div>
    </div>
  </div>

  <!-- QR KOD TAB -->
  <div class="tab-content" id="tab-qr">
    <div class="qr-wrap">
      <canvas class="qr-canvas" id="qr-canvas-${a.tag_number}" width="200" height="200"></canvas>
      <div style="text-align:center">
        <div style="font-size:16px;font-weight:700">${a.tag_number}${a.name?' — '+a.name:''}</div>
        <div style="font-size:12px;color:var(--sub);margin:4px 0">${a.species} · ${a.status}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-pr" onclick="downloadQR('${a.tag_number}')">İndir (PNG)</button>
        <button class="btn btn-sec" onclick="printQR('${a.tag_number}')">Yazdır</button>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:10px 14px;font-size:11px;color:var(--sub);text-align:center;max-width:280px">QR kodu tarayınca direkt bu hayvanın detay sayfası açılır. Küpe veya ahır kapısına yapıştırın.
      </div>
    </div>
  </div>

  <!-- TIMELINE TAB -->
  <div class="tab-content" id="tab-timeline">
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Tüm Olaylar — Kronolojik</span></div>
      ${events.length?`<div class="timeline">${events.map(e=>`<div class="tl-item ${e.cls}"><div class="tl-date">${e.icon} ${e.date||'-'}</div><div class="tl-title">${e.title}</div>${e.sub?`<div class="tl-sub">${e.sub}</div>`:''}</div>`).join('')}</div>`:'<p class="empty">Henüz olay kaydı yok</p>'}
    </div>
  </div>

  <!-- AI TAB -->
  <div class="tab-content" id="tab-ai">
    <div class="ai-panel">
      <div class="ai-panel-hd"><div class="ai-ico"></div><span>AI Hayvan Analizi: ${a.tag_number}${a.name?' · '+a.name:''}</span></div>
      <div class="ai-chips">
        <span class="ai-chip" onclick="aiCallAnimal(${idx},'Sağlık durumu değerlendirmesi ve riskler','ai-det-${idx}')"> Sağlık</span>
        <span class="ai-chip" onclick="aiCallAnimal(${idx},'Üretim performansı ve optimizasyon','ai-det-${idx}')">Üretim</span>
        <span class="ai-chip" onclick="aiCallAnimal(${idx},'Beslenme ve kilo yönetimi önerileri','ai-det-${idx}')">Beslenme</span>
        <span class="ai-chip" onclick="aiCallAnimal(${idx},'Bu hayvan için önümüzdeki 3 aylık bakım planı','ai-det-${idx}')"> Bakım Planı</span>
        <span class="ai-chip" onclick="aiCallAnimal(${idx},'Ekonomik değer ve satış stratejisi','ai-det-${idx}')">Ekonomi</span>
      </div>
      <div class="ai-result" id="ai-det-${idx}">Analiz için bir seçenek tıklayın...</div>
    </div>
  </div>`;

  document.getElementById('animal-detail-content').innerHTML=html;
}

