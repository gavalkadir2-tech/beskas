function switchTab(btn,tabId){
  if(!btn)return;
  try{
    const wrap=btn.closest('.pg,.card,.tab-container')||document.getElementById('pg-AnimalDetail')||document.body;
    wrap.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    wrap.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('on'));
    btn.classList.add('active');
    const tc=document.getElementById(tabId);if(tc)tc.classList.add('on');
  }catch(e){}
}

async function aiCallAnimal(idx,prompt,elId){
  const a=D.animals[idx];if(!a)return;
  const el=document.getElementById(elId);if(!el)return;
  const health=D.health.filter(h=>h.animal_tag===a.tag_number);
  const prod=D.production.filter(p=>p.animal_tag===a.tag_number);
  const repro=D.repro.filter(r=>r.animal_tag===a.tag_number);
  const fullPrompt=`Hayvan: Küpe=${a.tag_number}, İsim=${a.name||'-'}, Tür=${a.species}, Irk=${a.breed||'-'}, Cinsiyet=${a.gender||'-'}, Doğum=${a.birth_date||'-'}, Yaş=${calcAge(a.birth_date)}, Ağırlık=${a.weight||'-'}kg, Renk=${a.color||'-'}, Durum=${a.status}, Günlük Süt=${a.daily_milk||'-'}lt, Konum=${a.location||'-'}, Anne=${a.mother_tag||'-'}, Baba=${a.father_tag||'-'}, Sigorta=${a.insurance_no||'-'}
Sağlık geçmişi (${health.length} kayıt): ${health.slice(-5).map(h=>h.date+':'+h.record_type+'/'+h.diagnosis).join(' | ')||'yok'}
Üretim (${prod.length} kayıt): ${prod.slice(-5).map(p=>p.date+':'+p.quantity+p.unit).join(' | ')||'yok'}
Üreme (${repro.length} kayıt): ${repro.map(r=>r.event_type+'/'+r.outcome).join(' | ')||'yok'}
Notlar: ${a.notes||'-'}

Görev: ${prompt}`;
  await aiCall(fullPrompt,elId);
}

async function aiAnimalDeepDive(idx){
  const _lastTab=document.querySelector('#pg-AnimalDetail .tab:last-child');if(_lastTab)switchTab(_lastTab,'tab-ai');
  await aiCallAnimal(idx,'Bu hayvanın tüm verilerini kapsamlı analiz et: sağlık durumu, üretim performansı, ekonomik değer ve önümüzdeki 30 gün için bakım planı.','ai-det-'+idx);
}

function renderAnimalROI(idx){
  const a=D.animals[idx];if(!a)return;
  const el=document.getElementById(`roi-content-${a.tag_number}`);if(!el)return;

  const purchasePrice=nv(a.purchase_price);
  const healthCost=D.health.filter(h=>h.animal_tag===a.tag_number).reduce((s,h)=>s+nv(h.cost),0);
  const feedCost=(D.feeding||[]).filter(f=>f.animal_tag===a.tag_number).reduce((s,f)=>s+nv(f.cost||0),0);
  const slaughterCost=(D.slaughter||[]).filter(s=>s.animal_tag===a.tag_number).reduce((s,r)=>s+nv(r.cost),0);
  const totalCost=purchasePrice+healthCost+feedCost+slaughterCost;

  const salesRev=(D.sales||[]).filter(s=>s.tag_number===a.tag_number||s.animal_id===a.id).reduce((s,sl)=>s+nv(sl.total_amount||sl.price||0),0);
  const prodRev=(D.production||[]).filter(p=>p.animal_tag===a.tag_number).reduce((s,p)=>s+nv(p.value||p.revenue||0),0);
  const totalRev=salesRev+prodRev;
  const netROI=totalRev-totalCost;
  const roiPct=totalCost>0?((netROI/totalCost)*100).toFixed(1):0;
  const ageMonths=a.birth_date?Math.round((Date.now()-new Date(a.birth_date))/2628e6):null;
  const estValue=purchasePrice*(1+nv(roiPct)/100)||0;

  el.innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
    <div class="sc sc-v2" style="--sc-stripe:#dc2626"><div class="sc-val">₺${fmtNum(totalCost)}</div><div class="sc-lbl">Toplam Maliyet</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#16a34a"><div class="sc-val">₺${fmtNum(totalRev)}</div><div class="sc-lbl">Toplam Gelir</div></div>
    <div class="sc sc-v2" style="--sc-stripe:${netROI>=0?'#3b82f6':'#f59e0b'}">
      <div class="sc-val" style="color:${netROI>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(netROI))}</div>
      <div class="sc-lbl">Net ${netROI>=0?'Kâr':'Zarar'}</div>
    </div>
  </div>

  <div class="g2 mb">
    <div class="card">
      <div class="card-hd"><span class="card-t">Maliyet Dökümü</span></div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px">
        ${[['Alım Fiyatı',purchasePrice,'#8b5cf6'],['Sağlık Giderleri',healthCost,'#dc2626'],['Yem Maliyeti',feedCost,'#f59e0b'],['Kesim Maliyeti',slaughterCost,'#0ea5e9'],['TOPLAM',totalCost,'#374151']].map(([l,v,c])=>`
        <div style="display:flex;justify-content:space-between;padding:7px 10px;border-radius:6px;background:var(--bg);border-left:3px solid ${c}">
          <span style="font-weight:${l==='TOPLAM'?700:400}">${l}</span>
          <span style="font-weight:700;color:${c}">₺${fmtNum(v)}</span>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Gelir & Değer</span></div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px">
        ${[['Satış Geliri',salesRev,'#16a34a'],['Üretim Geliri',prodRev,'#22c55e'],['Tahmini Değer',estValue,'#3b82f6'],['ROI',roiPct+'%',netROI>=0?'#16a34a':'#dc2626']].map(([l,v,c])=>`
        <div style="display:flex;justify-content:space-between;padding:7px 10px;border-radius:6px;background:var(--bg);border-left:3px solid ${c}">
          <span>${l}</span>
          <span style="font-weight:700;color:${c}">${typeof v==='number'?'₺'+fmtNum(v):v}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="card mb">
    <div class="card-hd">
      <span class="card-t">Kârlılık Göstergesi</span>
    </div>
    <div style="margin:8px 0">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:5px">
        <span>Maliyet: ₺${fmtNum(totalCost)}</span>
        <span>Gelir: ₺${fmtNum(totalRev)}</span>
      </div>
      <div style="position:relative;height:24px;background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--brd)">
        <div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(100,totalCost>0?Math.min(100,(totalRev/Math.max(totalCost,totalRev))*100):0).toFixed(0)}%;background:${netROI>=0?'#16a34a':'#dc2626'};opacity:.7;transition:width .8s;border-radius:8px"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">
          ROI: ${roiPct}% ${netROI>=0?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span>':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>'}
        </div>
      </div>
    </div>
    ${ageMonths!==null?`<div style="font-size:11px;color:var(--sub);margin-top:6px">Yaş: ${ageMonths} ay · Aylık ortalama maliyet: ₺${fmtNum(Math.round(totalCost/Math.max(1,ageMonths)))}</div>`:''}
  </div>`;
}

function generateAnimalProfilePDF(idx){
  const {jsPDF}=window.jspdf||{};
  if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const a=D.animals[idx];if(!a)return;
  const farm=D.settings;
  const doc=new jsPDF();

  // Header banner
  doc.setFillColor(26,60,46);doc.rect(0,0,210,35,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');doc.setFontSize(18);
  doc.text(farm.farm_name||'Bizim Çiftlik',15,16);
  doc.setFontSize(11);doc.setFont('helvetica','normal');
  doc.text('Hayvan Profil Raporu',15,26);
  doc.text(new Date().toLocaleDateString('tr-TR'),150,26);

  // Animal info block
  doc.setTextColor(50,50,50);
  doc.setFillColor(240,248,240);doc.rect(15,42,85,50,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(26,60,46);
  doc.text(a.tag_number+(a.name?' — '+a.name:''),20,52);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(60,60,60);
  const fields=[['Tür / Irk',`${a.species||'-'}${a.breed?' / '+a.breed:''}`],['Cinsiyet',a.gender||'-'],['Doğum',a.birth_date||'-'],['Ağırlık',a.weight?a.weight+' kg':'-'],['Konum',a.location||'-'],['Durum',a.status||'-']];
  let fy=60;fields.forEach(([l,v])=>{doc.text(l+':',20,fy);doc.setFont('helvetica','bold');doc.text(v,60,fy);doc.setFont('helvetica','normal');fy+=7;});

  // Right block: cost/roi
  const hCost=D.health.filter(h=>h.animal_tag===a.tag_number).reduce((s,h)=>s+nv(h.cost),0);
  const salesRev=(D.sales||[]).filter(s=>s.tag_number===a.tag_number).reduce((s,sl)=>s+nv(sl.total_amount||0),0);
  doc.setFillColor(248,250,248);doc.rect(110,42,85,50,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(26,60,46);doc.text('Ekonomik Özet',115,52);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(60,60,60);
  [['Alım Fiyatı','₺'+fmt(a.purchase_price||0)],['Sağlık Maliyeti','₺'+fmt(hCost)],['Satış Geliri','₺'+fmt(salesRev)]].forEach(([l,v],i)=>{doc.text(l+':',115,62+i*8);doc.setFont('helvetica','bold');doc.text(v,160,62+i*8);doc.setFont('helvetica','normal');});

  let y=105;
  const section=(title)=>{
    doc.setFillColor(240,244,240);doc.rect(15,y-5,180,8,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(26,60,46);
    doc.text(title,20,y);y+=10;
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,60);
  };

  // Health records
  section('SAĞLIK GEÇMİŞİ (Son 10 Kayıt)');
  const hRecs=D.health.filter(h=>h.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')).slice(0,10);
  if(hRecs.length){
    doc.setFont('helvetica','bold');doc.setFontSize(8);
    ['Tarih','Tip','Teşhis','İlaç','Veteriner','Maliyet'].forEach((h,i)=>doc.text(h,[20,45,80,120,155,180][i],y));
    y+=2;doc.line(15,y,195,y);y+=5;
    doc.setFont('helvetica','normal');
    hRecs.forEach(h=>{
      if(y>270){doc.addPage();y=20;}
      doc.text((h.date||'').slice(5),20,y);doc.text((h.record_type||'').slice(0,10),45,y);doc.text((h.diagnosis||'').slice(0,18),80,y);doc.text((h.medication||'').slice(0,12),120,y);doc.text((h.vet_name||'').slice(0,12),155,y);doc.text(h.cost?'₺'+fmt(h.cost):'-',180,y);y+=6;
    });
  }else{doc.text('Sağlık kaydı yok',20,y);y+=8;}

  y+=4;
  // Production
  section('ÜRETİM KAYITLARI (Son 10)');
  const pRecs=D.production.filter(p=>p.animal_tag===a.tag_number).sort((a,b)=>b.date?.localeCompare(a.date||'')).slice(0,10);
  if(pRecs.length){
    doc.setFont('helvetica','bold');doc.setFontSize(8);
    ['Tarih','Tür','Miktar','Birim','Kalite'].forEach((h,i)=>doc.text(h,[20,45,85,110,135][i],y));
    y+=2;doc.line(15,y,195,y);y+=5;
    doc.setFont('helvetica','normal');
    pRecs.forEach(p=>{
      if(y>270){doc.addPage();y=20;}
      doc.text((p.date||'').slice(5),20,y);doc.text((p.production_type||p.product_type||'').slice(0,14),45,y);doc.text(String(p.quantity||0),85,y);doc.text(p.unit||'',110,y);doc.text(p.quality_grade||'-',135,y);y+=6;
    });
  }else{doc.text('Üretim kaydı yok',20,y);y+=8;}

  // Footer
  doc.setFontSize(8);doc.setTextColor(160,160,160);
  doc.line(15,280,195,280);
  doc.text(`${farm.farm_name||'Bizim Çiftlik'} · ${farm.phone||''} · Oluşturulma: ${new Date().toLocaleString('tr-TR')}`,15,285);
  doc.save(`Hayvan-Profil-${a.tag_number}-${today()}.pdf`);
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/></svg></span> Hayvan profil PDF indirildi ✓');
}

function addAnimalPhotos(tag,input){
  const files=Array.from(input.files);
  let loaded=0;
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      addPhoto(tag,e.target.result);
      loaded++;
      if(loaded===files.length){
        showToast(`${loaded} fotoğraf eklendi ✓`);
        if(curPage==='AnimalDetail')renderAnimalDetail(detailAnimalIdx);
        // update tab label
        const photos=getPhotos(tag);
        const tabBtn=document.querySelector('#pg-AnimalDetail .tab');
        if(tabBtn)tabBtn.innerHTML=`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Fotoğraflar (${photos.length})`;
      }
    };
    reader.readAsDataURL(file);
  });
  input.value='';
}

function delAnimalPhoto(tag,idx){
  delPhoto(tag,idx);
  showToast('Fotoğraf silindi');
  if(curPage==='AnimalDetail')renderAnimalDetail(detailAnimalIdx);
}

// ===================== LIGHTBOX =====================
function openLightbox(src){document.getElementById('lightbox-img').src=src;document.getElementById('lightbox').classList.add('on');}
function closeLightbox(){document.getElementById('lightbox').classList.remove('on');}

// ===================== DASHBOARD =====================
// ---- PREMIUM DASHBOARD ----
let _finPeriod=6;
function setFinPeriod(n,btn){
  _finPeriod=n;
  document.querySelectorAll('.cpb').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderDashFinChart();
}
function renderDashFinChart(){
  const months=[];const labels=[];
  const now=new Date();
  for(let i=_finPeriod-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    labels.push(['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]);
  }
  const gelirData=months.map(m=>D.finance.filter(f=>f.type==='Gelir'&&f.date?.startsWith(m)).reduce((s,f)=>s+nv(f.amount),0));
  const giderData=months.map(m=>D.finance.filter(f=>f.type==='Gider'&&f.date?.startsWith(m)).reduce((s,f)=>s+nv(f.amount),0));
  mkChart('ch-dash-fin',{type:'line',data:{labels,datasets:[
    {label:'Gelir',data:gelirData,borderColor:'#2d6a4f',backgroundColor:'rgba(45,106,79,.07)',tension:.45,fill:true,pointRadius:4,pointBackgroundColor:'#16a34a'},
    {label:'Gider',data:giderData,borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.05)',tension:.45,fill:true,pointRadius:4,pointBackgroundColor:'#ef4444'}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:12}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:10},callback:v=>'₺'+v.toLocaleString('tr-TR')}},x:{grid:{display:false},ticks:{font:{size:10}}}}}});
  // Finance summary bar
  const totalGelir=gelirData.reduce((a,b)=>a+b,0);
  const totalGider=giderData.reduce((a,b)=>a+b,0);
  const net=totalGelir-totalGider;
  const el=document.getElementById('dash-fin-summary');
  if(el)el.innerHTML=`<div class="dfs-item"><div class="dfs-label">Toplam Gelir</div><div class="dfs-val green">₺${fmt(totalGelir)}</div></div><div class="dfs-item"><div class="dfs-label">Toplam Gider</div><div class="dfs-val red">₺${fmt(totalGider)}</div></div><div class="dfs-item"><div class="dfs-label">Net Kâr/Zarar</div><div class="dfs-val ${net>=0?'green':'red'}">₺${fmt(net)}</div></div>`;
}

function renderDashboard(){
  // ---- Hero update ----
  const farmName=D.settings.farm_name||'Bizim Çiftlik';
  const titleEl=document.getElementById('dash-farm-title');if(titleEl)titleEl.textContent=farmName;
  const dateEl=document.getElementById('dash-hero-date');
  if(dateEl){const d=new Date();dateEl.textContent=d.toLocaleDateString('tr-TR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
  const hasta=D.animals.filter(a=>a.status==='Hasta').length;
  const kpiH=D.animals.length?Math.round((1-hasta/D.animals.length)*100):100;
  const arcEl=document.getElementById('ring-health-arc');
  if(arcEl){const c=2*Math.PI*66;setTimeout(()=>{arcEl.style.strokeDasharray=`${c*kpiH/100} ${c}`;},300);}
  const valEl=document.getElementById('ring-health-val');if(valEl)valEl.textContent=kpiH+'%';
  const dhmsA=document.getElementById('dhms-animals');if(dhmsA)dhmsA.querySelector('.dhms-val').textContent=D.animals.length;
  const gorev=D.tasks.filter(t=>t.status==='Bekliyor'||t.status==='Devam Ediyor').length;
  const dhmsT=document.getElementById('dhms-tasks');if(dhmsT)dhmsT.querySelector('.dhms-val').textContent=gorev;
  const stockOk=D.inventory.length?D.inventory.filter(i=>nv(i.current_stock)>=nv(i.minimum_stock)).length:0;
  const dhmsS=document.getElementById('dhms-stock');if(dhmsS)dhmsS.querySelector('.dhms-val').textContent=stockOk+'/'+D.inventory.length;

  // ---- Stat cards (premium stripe style) ----
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  const satılan=D.animals.filter(a=>a.status==='Satıldı').length;
  const gebe=D.animals.filter(a=>a.status==='Gebe').length;
  function statCard(ico,label,val,sub,stripe,cls,page,trend){
    return`<div class="sc sc-v2 stripe-${stripe}" onclick="${page?`showPage('${page}',null)`:''}" style="cursor:${page?'pointer':'default'}">
      <div class="sc-top" style="margin-bottom:8px"><div class="sc-ico ico-${cls}">${ico}</div><span class="badge ${sub.cls}">${sub.txt}</span></div>
      <div class="sc-val">${val}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <div class="sc-lbl">${label}</div>
        ${trend?trendBadge(trend):''}
      </div>
    </div>`;
  }
  const finTrend=calcMonthTrend('finance','amount','Gelir');
  const dsEl=document.getElementById('dash-stats');
  if(dsEl)dsEl.innerHTML=
    statCard('<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" fill="none" stroke="currentColor" stroke-width="2"/></svg>','Toplam Hayvan',D.animals.length,{cls:'bg-gr',txt:'+'+D.animals.filter(a=>a.status==='Aktif').length+' aktif'},'green','green','Animals',null)+
    statCard('<svg viewBox="0 0 24 24" width="18" height="18"><path d="M22 12h-4l-3 9L9 3l-3 9H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>','Hasta Hayvan',hasta,{cls:hasta?'bg-rd':'bg-gr',txt:hasta?hasta+' tedavi gerekli':'Tüm sağlıklı'},'red','red','Health',null)+
    statCard('<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>','Net Bakiye','₺'+fmt(gelir-gider),{cls:gelir-gider>=0?'bg-gr':'bg-rd',txt:gelir-gider>=0?'Kârlı':'Zararlı'},'blue','blue','Finance',finTrend)+
    statCard('<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 11l3 3L22 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>','Bekleyen Görev',gorev,{cls:gorev?'bg-yl':'bg-gy',txt:gorev?gorev+' bekliyor':'Hepsi tamam'},'amber','yellow','Tasks',null);

  // ---- KPI Rings ----
  const kpiT=D.tasks.length?Math.round(D.tasks.filter(t=>t.status==='Tamamlandı').length/D.tasks.length*100):0;
  const kpiS=D.inventory.length?Math.round(D.inventory.filter(i=>nv(i.current_stock)>=nv(i.minimum_stock)).length/D.inventory.length*100):100;
  function ring(val,color,label){const r=28,ci=2*Math.PI*r,dash=ci*(val/100);return`<div class="gauge-wrap"><div class="ring-wrap"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--brd)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${dash.toFixed(2)} ${ci.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 32 32)"/></svg><span class="ring-val" style="color:${color}">${val}%</span></div><div class="gauge-lbl">${label}</div></div>`;}
  const kpiEl=document.getElementById('dash-kpi');if(kpiEl)kpiEl.innerHTML=ring(kpiH,'#16a34a','Sağlık')+ring(kpiT,'#3b82f6','Görevler')+ring(kpiS,'#d97706','Stok');

  // ---- Finance chart ----
  renderDashFinChart();

  // ---- Donut ----
  const sc={};D.animals.forEach(a=>{sc[a.species]=(sc[a.species]||0)+1;});const sk=Object.keys(sc);const cols=['#1a3c2e','#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#d8f3dc'];
  mkChart('ch-dash-sp',{type:'doughnut',data:{labels:sk.length?sk:['Boş'],datasets:[{data:sk.length?sk.map(k=>sc[k]):[1],backgroundColor:sk.length?cols.slice(0,sk.length):['#e2e8f0'],borderWidth:0,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'right',labels:{font:{size:10},boxWidth:10,padding:10}}}}});

  // ---- Tables ----
  const dtblA=document.getElementById('dash-tbl-a');if(dtblA)dtblA.innerHTML=D.animals.length?[...D.animals].slice(-6).reverse().map(a=>`<tr><td><b style="cursor:pointer;color:var(--accent)" onclick="openAnimalDetail(${D.animals.indexOf(a)})">${a.tag_number}</b></td><td>${a.species}</td><td>${stag(a.status)}</td><td>${a.weight?a.weight+'kg':'-'}</td></tr>`).join(''):empty(4);
  const urgent=[...D.tasks].filter(t=>t.status!=='Tamamlandı'&&t.status!=='İptal').sort((a,b)=>{const p={Kritik:0,Yüksek:1,Orta:2,Düşük:3};return(p[a.priority]||2)-(p[b.priority]||2);}).slice(0,5);
  const dtasks=document.getElementById('dash-tasks');if(dtasks)dtasks.innerHTML=urgent.length?urgent.map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--brd)"><div style="display:flex;align-items:center;gap:8px"><div style="width:6px;height:6px;border-radius:50%;background:${t.priority==='Kritik'?'#ef4444':t.priority==='Yüksek'?'#f59e0b':'#6b7280'};flex-shrink:0"></div><div><div style="font-size:12.5px;font-weight:500">${t.title}</div><div style="font-size:10px;color:var(--sub)">${t.due_date||''}</div></div></div>${stag(t.priority)}</div>`).join(''):'<p class="empty"> Bekleyen görev yok ✓</p>';

  // ---- Alerts ----
  const alerts=[];
  D.animals.filter(a=>a.status==='Hasta').forEach(a=>alerts.push({t:'rd',m:`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg></span> ${a.tag_number} hasta — veteriner kontrolü`}));
  D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).forEach(i=>alerts.push({t:'yl',m:` ${i.name} kritik stok seviyesi`}));
  D.tasks.filter(t=>t.priority==='Kritik'&&t.status==='Bekliyor').forEach(t=>alerts.push({t:'rd',m:`⚠️ Kritik Görev: ${t.title}`}));
  const alertsEl=document.getElementById('dash-alerts');if(alertsEl)alertsEl.innerHTML=alerts.length?`<div style="margin-bottom:12px">${alerts.map(a=>`<div class="alert-box alert-${a.t}">${a.m}</div>`).join('')}</div>`:'';
  const nd=document.getElementById('notif-dot');if(nd)nd.style.display=alerts.length?'block':'none';

  // ---- Targets & Vaccines ----
  renderDashTargets();
  renderDashVacUpcoming();

  // ---- Anomali Paneli & Badge ----
  setTimeout(()=>{
    renderAnomalyPanel('anomaly-panel');
    updateAnomalyBadge();
  },200);

  // Aktivite akısı
  renderActivityFeed();
  // Sparklines
  setTimeout(renderDashboardSparklines, 400);
  // Badge guncelle
  updateBottomNavBadges();

  // Günlük plan otomatik yükle
  if(getGroqKey()&&D.animals.length>0)setTimeout(loadTodayPlan,2000);
}

function renderActivityFeed(){
  const el=document.getElementById('dash-activity');
  if(!el)return;
  // Son 15 aktiviteyi topla
  const activities=[];
  const now=new Date();
  const fmtTime=d=>{
    if(!d)return'';
    const diff=Math.floor((now-new Date(d))/1000);
    if(diff<60)return diff+'sn önce';
    if(diff<3600)return Math.floor(diff/60)+'dk önce';
    if(diff<86400)return Math.floor(diff/3600)+'sa önce';
    return new Date(d).toLocaleDateString('tr-TR',{day:'2-digit',month:'short'});
  };
  D.health.slice(-5).forEach(h=>activities.push({
    type:'health',icon:'💊',color:'#dc2626',bg:'#fee2e2',
    title:`${h.animal_tag} — ${h.record_type||'Sağlık kaydı'}`,
    sub:h.diagnosis||h.medication||'',
    time:h.date,ts:new Date(h.date||0).getTime()
  }));
  D.finance.slice(-5).forEach(f=>activities.push({
    type:'finance',icon:f.type==='Gelir'?'📈':'📉',color:f.type==='Gelir'?'#16a34a':'#dc2626',bg:f.type==='Gelir'?'#dcfce7':'#fee2e2',
    title:`${f.type}: ₺${parseFloat(f.amount||0).toLocaleString('tr-TR')}`,
    sub:f.description||f.category||'',
    time:f.date,ts:new Date(f.date||0).getTime()
  }));
  D.tasks.filter(t=>t.status==='Tamamlandı').slice(-3).forEach(t=>activities.push({
    type:'task',icon:'✅',color:'#16a34a',bg:'#dcfce7',
    title:`Görev tamamlandı: ${t.title}`,
    sub:t.assigned_to||'',
    time:t.due_date,ts:new Date(t.due_date||0).getTime()
  }));
  D.animals.slice(-3).forEach(a=>activities.push({
    type:'animal',icon:'🐄',color:'#2d6a4f',bg:'#dcfce7',
    title:`Yeni hayvan: ${a.tag_number}${a.name?' — '+a.name:''}`,
    sub:`${a.species||''} · ${a.status||''}`,
    time:a.purchase_date||a.birth_date,ts:new Date(a.purchase_date||a.birth_date||0).getTime()
  }));
  D.sales.slice(-3).forEach(s=>activities.push({
    type:'sale',icon:'🛒',color:'#3b82f6',bg:'#eff6ff',
    title:`Satış: ${s.sale_type||'Satış'} — ₺${parseFloat(s.total_amount||0).toLocaleString('tr-TR')}`,
    sub:s.buyer_name||'',
    time:s.date,ts:new Date(s.date||0).getTime()
  }));

  activities.sort((a,b)=>b.ts-a.ts);
  const top=activities.slice(0,10);

  if(!top.length){
    el.innerHTML='<p style="text-align:center;padding:20px;color:var(--sub);font-size:12px">Henüz aktivite yok</p>';
    return;
  }

  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:0">`+
    top.map(a=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--brd)">
      <div style="width:30px;height:30px;border-radius:8px;background:${a.bg};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${a.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.title}</div>
        ${a.sub?`<div style="font-size:10.5px;color:var(--sub)">${a.sub}</div>`:''}
      </div>
      <div style="font-size:10px;color:var(--sub);flex-shrink:0;white-space:nowrap">${fmtTime(a.time)}</div>
    </div>`).join('') + `</div>`;
}

function calcMonthTrend(key, field, type) {
  const now = new Date();
  const cur = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,7);
  const prev = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7);
  const arr = D[key] || [];
  const curVal  = arr.filter(r => type ? r.type===type : true).filter(r => (r.date||'').startsWith(cur)).reduce((s,r) => s+(parseFloat(r[field])||0), 0);
  const prevVal = arr.filter(r => type ? r.type===type : true).filter(r => (r.date||'').startsWith(prev)).reduce((s,r) => s+(parseFloat(r[field])||0), 0);
  if (prevVal === 0) return { pct: null, dir: 'neutral' };
  const pct = Math.round(((curVal - prevVal) / Math.max(1,prevVal)) * 100);
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}
function trendBadge(trend) {
  if (!trend || trend.pct === null) return '';
  const icon = trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→';
  return `<span class="stat-trend ${trend.dir}" style="font-size:11px;font-weight:600">${icon} ${Math.abs(trend.pct)}%</span>`;
}

function renderDashTargets(){
  const el=document.getElementById('dash-targets');if(!el)return;
  const targets=D.settings.prod_targets||{};
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const milkReal=D.production.filter(p=>p.date?.startsWith(monthKey)&&p.production_type==='Süt').reduce((s,p)=>s+nv(p.quantity),0);
  const eggReal=D.production.filter(p=>p.date?.startsWith(monthKey)&&p.production_type==='Yumurta').reduce((s,p)=>s+nv(p.quantity),0);
  const salesReal=D.sales.filter(s=>s.date?.startsWith(monthKey)).reduce((s,x)=>s+nv(x.total),0);
  const gelirReal=D.finance.filter(f=>f.date?.startsWith(monthKey)&&f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const items=[
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M8 2h8l1 6H7L8 2z"/><path d="M7 8l1 13h8l1-13"/></svg></span>',lbl:'Süt (lt)',real:milkReal,target:nv(targets.milk)||500,unit:'lt'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="13" rx="6" ry="8"/></svg></span>',lbl:'Yumurta',real:eggReal,target:nv(targets.egg)||300,unit:'adet'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>',lbl:'Satış',real:salesReal,target:nv(targets.sales)||10000,unit:'₺'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1m-3-5c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3"/></svg></span>',lbl:'Gelir',real:gelirReal,target:nv(targets.income)||15000,unit:'₺'},
  ];
  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">`+items.map(item=>{
    const pct=item.target?Math.min(100,Math.round(item.real/item.target*100)):0;
    const col=pct>=100?'#22c55e':pct>=60?'#f59e0b':'#ef4444';
    return`<div style="padding:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;font-weight:500;color:var(--txt)">${item.ico} ${item.lbl}</span>
        <span style="font-size:11px;color:var(--sub)">${pct}%</span>
      </div>
      <div style="background:var(--brd);border-radius:4px;height:5px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width 0.8s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:3px">
        <span style="font-size:10px;color:${col};font-weight:600">${item.unit==='₺'?'₺'+fmt(item.real):fmt(item.real)}</span>
        <span style="font-size:10px;color:var(--sub)">${item.unit==='₺'?'₺'+fmt(item.target):fmt(item.target)}</span>
      </div>
    </div>`;
  }).join('')+`</div>`;
}

function renderDashVacUpcoming(){
  const el=document.getElementById('dash-vac-upcoming');if(!el)return;
  const now=new Date();
  const soon=new Date();soon.setDate(soon.getDate()+30);
  const soonStr=soon.toISOString().split('T')[0];
  const todayStr=now.toISOString().split('T')[0];
  const upcoming=D.health.filter(h=>h.next_date&&h.next_date>=todayStr&&h.next_date<=soonStr)
    .sort((a,b)=>a.next_date.localeCompare(b.next_date)).slice(0,5);
  const overdue=D.health.filter(h=>h.next_date&&h.next_date<todayStr).slice(0,3);
  const all=[...overdue.map(h=>({...h,_late:true})),...upcoming];
  if(!all.length){el.innerHTML='<p class="empty">Yaklaşan aşı/ilaç yok ✓</p>';return;}
  el.innerHTML=all.map(h=>`<div class="vac-item ${h._late?'vac-overdue':'vac-soon'}">
    <div class="vac-ico">${h._late?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>':''}</div>
    <div class="vac-info">
      <div class="vac-name">${h.animal_tag} — ${h.record_type||''} ${h.diagnosis?'('+h.diagnosis+')':''}</div>
      <div class="vac-date">${h._late?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span> Gecikti: ':' '} ${h.next_date||''} ${h.medication?'· '+h.medication:''}</div>
    </div>
    <button class="btn btn-pr btn-sm" onclick="openForm('health');setTimeout(()=>sv('f-tag','${h.animal_tag}'),100)">+ Kayıt</button>
  </div>`).join('');
}

// ===================== İLAÇ & AŞI TAKVİMİ =====================
function renderVacSchedule(){
  const filter=document.getElementById('vac-filter')?.value||'';
  const now=new Date();
  const todayStr=now.toISOString().split('T')[0];
  const soonDate=new Date();soonDate.setDate(soonDate.getDate()+30);
  const soonStr=soonDate.toISOString().split('T')[0];
  // Tüm sağlık kayıtlarından next_date olanlar
  const allRecs=D.health.filter(h=>h.next_date);
  const overdue=allRecs.filter(h=>h.next_date<todayStr);
  const soon=allRecs.filter(h=>h.next_date>=todayStr&&h.next_date<=soonStr);
  const ok=allRecs.filter(h=>h.next_date>soonStr);
  const statsEl=document.getElementById('vac-stats');
  if(statsEl)statsEl.innerHTML=`
    <div class="sc" onclick="document.getElementById('vac-filter').value='overdue';renderVacSchedule()"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-rd">${overdue.length}</span></div><div class="sc-val">${overdue.length}</div><div class="sc-lbl">Gecikmiş</div></div>
    <div class="sc" onclick="document.getElementById('vac-filter').value='soon';renderVacSchedule()"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-yl">${soon.length}</span></div><div class="sc-val">${soon.length}</div><div class="sc-lbl">Bu Ay</div></div>
    <div class="sc" onclick="document.getElementById('vac-filter').value='ok';renderVacSchedule()"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-gr">${ok.length}</span></div><div class="sc-val">${ok.length}</div><div class="sc-lbl">Güncel</div></div>`;
  let list=filter==='overdue'?overdue:filter==='soon'?soon:filter==='ok'?ok:allRecs;
  list=[...list].sort((a,b)=>a.next_date.localeCompare(b.next_date));
  const listEl=document.getElementById('vac-list');if(!listEl)return;
  if(!list.length){listEl.innerHTML='<p class="empty">Bu kategoride kayıt yok</p>';return;}
  listEl.innerHTML=list.map(h=>{
    const late=h.next_date<todayStr;
    const isSoon=h.next_date>=todayStr&&h.next_date<=soonStr;
    const cls=late?'vac-overdue':isSoon?'vac-soon':'vac-ok';
    const daysLeft=Math.ceil((new Date(h.next_date)-now)/(1000*86400));
    return`<div class="vac-item ${cls}">
      <div class="vac-ico">${late?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>':isSoon?'':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span>'}</div>
      <div class="vac-info" style="flex:1">
        <div class="vac-name">${h.animal_tag} — ${h.record_type} ${h.medication?'· '+h.medication:''}</div>
        <div class="vac-date">Tarih: ${h.next_date} · ${late?'<b style="color:#dc2626">'+Math.abs(daysLeft)+' gün gecikti</b>':daysLeft===0?'<b style="color:#d97706">Bugün!</b>':'<b style="color:#15803d">'+daysLeft+' gün kaldı</b>'} ${h.diagnosis?'· '+h.diagnosis:''}</div>
      </div>
      <button class="btn btn-pr btn-sm" onclick="openForm('health');setTimeout(()=>sv('f-tag','${h.animal_tag}'),100)">✓ Uygula</button>
    </div>`;
  }).join('');
}

// ===================== VETERİNER DEFTERİ =====================
function renderVetBook(){renderVetGecmis();}
function switchVetTab(tab,btn){
  ['gecmis','receteler','vetler'].forEach(t=>{const el=document.getElementById('vet-'+t);if(el)el.style.display=t===tab?'':'none';});
  document.querySelectorAll('#pg-VetBook .tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(tab==='gecmis')renderVetGecmis();
  if(tab==='receteler')renderVetReceteler();
  if(tab==='vetler')renderVetContacts();
}
function renderVetGecmis(){
  const q=(document.getElementById('vet-search')?.value||'').toLowerCase();
  const tp=document.getElementById('vet-ftype')?.value||'';
  const list=D.health.filter(h=>(!tp||h.record_type===tp)&&(!q||(h.animal_tag||'').toLowerCase().includes(q)||(h.diagnosis||'').toLowerCase().includes(q)||(h.medication||'').toLowerCase().includes(q)||(h.vet_name||'').toLowerCase().includes(q)));
  const totalCost=list.reduce((s,h)=>s+nv(h.cost),0);
  const statsEl=document.getElementById('vet-stats');
  if(statsEl)statsEl.innerHTML=`
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${list.length}</div><div class="sc-lbl">Toplam Kayıt</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(totalCost)}</div><div class="sc-lbl">Toplam Harcama</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${new Set(list.map(h=>h.animal_tag)).size}</div><div class="sc-lbl">Farklı Hayvan</div></div>`;
  const tbody=document.getElementById('tbl-vet-gecmis');if(!tbody)return;
  tbody.innerHTML=[...list].reverse().map(h=>{const i=D.health.indexOf(h);return`<tr>
    <td>${h.date||'-'}</td>
    <td><b style="cursor:pointer;color:var(--g2)" onclick="openAnimalDetailByTag('${h.animal_tag}')">${h.animal_tag}</b></td>
    <td>${stag(h.record_type)}</td><td>${h.diagnosis||'-'}</td>
    <td>${h.medication||'-'}${h.dose?' ('+h.dose+')':''}</td>
    <td>${h.vet_name||'-'}</td><td>${h.cost?'₺'+fmt(h.cost):'-'}</td><td>${h.next_date||'-'}</td>
  </tr>`}).join('')||empty(8);
}
function renderVetReceteler(){
  const el=document.getElementById('vet-recete-list');if(!el)return;
  const active=D.health.filter(h=>h.medication&&h.next_date&&h.next_date>=today());
  if(!active.length){el.innerHTML='<p class="empty">Aktif reçete yok</p>';return;}
  el.innerHTML=active.map(h=>`<div class="vet-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="vc-name">${h.medication}${h.dose?' · '+h.dose:''}</div>
        <div class="vc-spec">${h.animal_tag} · ${h.record_type}</div>
        <div style="font-size:12px">${h.diagnosis||''}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:var(--sub)">
        <div>Başlangıç: ${h.date||'-'}</div>
        <div>Bitiş: <b>${h.next_date}</b></div>
      </div>
    </div>
  </div>`).join('');
}
function renderVetContacts(){
  const el=document.getElementById('vet-contacts-list');if(!el)return;
  const contacts=D.settings.vet_contacts||[];
  if(!contacts.length){el.innerHTML='<p class="empty">Henüz veteriner eklenmedi</p>';return;}
  el.innerHTML=contacts.map((v,i)=>`<div class="vet-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="vc-name"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>‍<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2v20M2 12h20m-3.5-6.5-2 2m-9 9-2 2m13 0-2-2m-9-9-2 2"/></svg></span> ${v.name}</div>
        <div class="vc-spec">${v.speciality||'Genel Veteriner'}</div>
        <div style="display:flex;gap:12px;font-size:12px;margin-top:6px">
          ${v.phone?`<span><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6 2 2 0 0 1 2-2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z"/></svg></span> ${v.phone}</span>`:''}
          ${v.address?`<span> ${v.address}</span>`:''}
        </div>
        ${v.notes?`<div style="font-size:11px;color:var(--sub);margin-top:4px">${v.notes}</div>`:''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="delVetContact(${i})">🗑️</button>
    </div>
  </div>`).join('');
}
function addVetContact(){
  const name=prompt('Veteriner adı:');if(!name||!name.trim())return;
  const phone=prompt('Telefon:');
  const speciality=prompt('Uzmanlık (boş bırakılabilir):');
  if(!D.settings.vet_contacts)D.settings.vet_contacts=[];
  D.settings.vet_contacts.push({name:name.trim(),phone:phone||'',speciality:speciality||'',address:'',notes:''});
  persist();renderVetContacts();showToast('Veteriner eklendi ✓');
}
function delVetContact(i){
  D.settings.vet_contacts.splice(i,1);persist();renderVetContacts();showToast('Silindi');
}

// ===================== TOPLU İŞLEM =====================
let _bulkSelected=new Set();
let _bulkOp='';
function renderBulkOps(){
  _bulkSelected.clear();renderBulkList();setBulkOp('vac');
}
function renderBulkList(){
  const sp=document.getElementById('bulk-fsp')?.value||'';
  const st=document.getElementById('bulk-fst')?.value||'';
  const list=D.animals.filter(a=>(!sp||a.species===sp)&&(!st||a.status===st));
  const el=document.getElementById('bulk-animal-list');if(!el)return;
  el.innerHTML=list.map(a=>`<div class="bulk-animal-row">
    <input type="checkbox" ${_bulkSelected.has(a.tag_number)?'checked':''} onchange="toggleBulkSel('${a.tag_number}',this.checked)">
    <span style="font-size:18px">${getSpeciesIcon(a.species)}</span>
    <span style="font-weight:600;color:var(--g2)">${a.tag_number}</span>
    <span>${a.name||''}</span>
    <span style="color:var(--sub);font-size:11px">${a.species} · ${a.status}</span>
  </div>`).join('')||'<p class="empty">Hayvan bulunamadı</p>';
  var _bc=document.getElementById('bulk-count');if(_bc)_bc.textContent=_bulkSelected.size;
}
function toggleBulkSel(tag,on){on?_bulkSelected.add(tag):_bulkSelected.delete(tag);var _bc=document.getElementById('bulk-count');if(_bc)_bc.textContent=_bulkSelected.size;}
function bulkSelectAll(){
  const sp=document.getElementById('bulk-fsp')?.value||'';
  const st=document.getElementById('bulk-fst')?.value||'';
  D.animals.filter(a=>(!sp||a.species===sp)&&(!st||a.status===st)).forEach(a=>_bulkSelected.add(a.tag_number));
  renderBulkList();
}
function setBulkOp(op){
  _bulkOp=op;
  document.querySelectorAll('.bulk-op-card').forEach(c=>c.style.border='2px solid var(--brd)');
  const el=document.getElementById('bop-'+op);if(el)el.style.border='2px solid var(--g2)';
  const forms={
    vac:`<div class="fg"><label>Aşı Adı *</label><input id="bulk-vac-name" placeholder="FMD, Brucella..."/></div>
         <div class="fr"><div class="fg"><label>Uygulama Tarihi</label><input id="bulk-vac-date" type="date" value="${today()}"/></div><div class="fg"><label>Sonraki Tarih</label><input id="bulk-vac-next" type="date"/></div></div>
         <div class="fg"><label>Veteriner</label><input id="bulk-vac-vet" placeholder="Dr. Adı"/></div>`,
    med:`<div class="fg"><label>İlaç Adı *</label><input id="bulk-med-name" placeholder="Antibiyotik, vitamin..."/></div>
         <div class="fr"><div class="fg"><label>Doz</label><input id="bulk-med-dose" placeholder="10ml/kg"/></div><div class="fg"><label>Tarih</label><input id="bulk-med-date" type="date" value="${today()}"/></div></div>
         <div class="fg"><label>Teşhis / Sebep</label><input id="bulk-med-diag"/></div>`,
    task:`<div class="fg"><label>Görev Başlığı *</label><input id="bulk-task-title"/></div>
          <div class="fr"><div class="fg"><label>Öncelik</label><select id="bulk-task-pri"><option>Orta</option><option>Yüksek</option><option>Kritik</option><option>Düşük</option></select></div><div class="fg"><label>Vade</label><input id="bulk-task-due" type="date"/></div></div>`,
    status:`<div class="fg"><label>Yeni Durum</label><select id="bulk-status-val"><option>Aktif</option><option>Hasta</option><option>Gebe</option><option>Karantina</option><option>Satıldı</option><option>Kesildi</option><option>Öldü</option></select></div>`
  };
  var _el_bulk_op_form=document.getElementById('bulk-op-form');if(_el_bulk_op_form)_el_bulk_op_form.innerHTML=forms[op]||'';
}
function executeBulkOp(){
  if(!_bulkSelected.size){showToast('Hayvan seçin!','yl');return;}
  const tags=Array.from(_bulkSelected);
  let count=0;
  if(_bulkOp==='vac'){
    const name=document.getElementById('bulk-vac-name')?.value||'';
    if(!name){showToast('Aşı adı girin!','yl');return;}
    tags.forEach(tag=>{D.health.push({animal_tag:tag,record_type:'Aşılama',date:document.getElementById('bulk-vac-date')?.value||today(),diagnosis:name,medication:name,next_date:document.getElementById('bulk-vac-next')?.value||'',vet_name:document.getElementById('bulk-vac-vet')?.value||''});count++;});
    showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> ${count} hayvana aşı kaydedildi`,'gr');
  } else if(_bulkOp==='med'){
    const name=document.getElementById('bulk-med-name')?.value||'';
    if(!name){showToast('İlaç adı girin!','yl');return;}
    tags.forEach(tag=>{D.health.push({animal_tag:tag,record_type:'Tedavi',date:document.getElementById('bulk-med-date')?.value||today(),diagnosis:document.getElementById('bulk-med-diag')?.value||'',medication:name,dose:document.getElementById('bulk-med-dose')?.value||''});count++;});
    showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> ${count} hayvana ilaç kaydedildi`,'gr');
  } else if(_bulkOp==='task'){
    const title=document.getElementById('bulk-task-title')?.value||'';
    if(!title){showToast('Görev başlığı girin!','yl');return;}
    tags.forEach(tag=>{D.tasks.push({title:title+' ('+tag+')',priority:document.getElementById('bulk-task-pri')?.value||'Orta',due_date:document.getElementById('bulk-task-due')?.value||'',status:'Bekliyor',assigned_to:'',notes:'Toplu işlem: '+tag});count++;});
    showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> ${count} hayvana görev atandı`,'gr');
  } else if(_bulkOp==='status'){
    const newSt=document.getElementById('bulk-status-val')?.value||'Aktif';
    tags.forEach(tag=>{const a=D.animals.find(x=>x.tag_number===tag);if(a){a.status=newSt;count++;}});
    showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> ${count} hayvanın durumu güncellendi`,'gr');
  }
  persist();
  const _bulkLink=(_bulkOp==='vac'||_bulkOp==='med')?'<a href="#" onclick="showPage(\"Health\",null)" style="color:#166534;font-weight:600">Sağlık kayıtlarına git →</a>':'';
  var _el_bulk_result=document.getElementById('bulk-result');if(_el_bulk_result)_el_bulk_result.innerHTML=`<div class="alert-box alert-gr">${count} hayvan için işlem tamamlandı. ${_bulkLink}</div>`;
  _bulkSelected.clear();renderBulkList();
}

// ===================== MALİYET ANALİZİ =====================
function renderCostCalcPage(){
  const sel=document.getElementById('cost-animal');
  if(sel){sel.innerHTML='<option value="">-- Hayvan Seçin --</option>'+D.animals.map(a=>`<option value="${a.tag_number}">${a.tag_number}${a.name?' — '+a.name:''} (${a.species})</option>`).join('');}
}
function renderCostCalc(){
  const tag=document.getElementById('cost-animal')?.value;if(!tag)return;
  const a=D.animals.find(x=>x.tag_number===tag);if(!a)return;
  const health=D.health.filter(h=>h.animal_tag===tag);
  const feeding=D.feeding.filter(f=>f.animal_tag===tag||f.animal_tag==='Tüm Sürü');
  const prod=D.production.filter(p=>p.animal_tag===tag);
  const sales=D.sales.filter(s=>s.animal_tag===tag);
  const healthCost=health.reduce((s,h)=>s+nv(h.cost),0);
  const feedCost=feeding.reduce((s,f)=>s+nv(f.total_cost),0);
  const purchCost=nv(a.purchase_price);
  const totalCost=healthCost+feedCost+purchCost;
  const totalIncome=sales.reduce((s,x)=>s+nv(x.total),0);
  const totalProd=prod.reduce((s,p)=>s+nv(p.quantity),0);
  const profit=totalIncome-totalCost;
  const sumEl=document.getElementById('cost-summary');
  if(sumEl)sumEl.innerHTML=`
    <div class="card-hd"><span class="card-t">${tag} Maliyet Özeti</span></div>
    <div class="cost-row"><span class="cr-label">Alım Fiyatı</span><span class="cr-val">₺${fmt(purchCost)}</span></div>
    <div class="cost-row"><span class="cr-label"> Sağlık Harcaması</span><span class="cr-val">₺${fmt(healthCost)}</span></div>
    <div class="cost-row"><span class="cr-label">Yem Maliyeti</span><span class="cr-val">₺${fmt(feedCost)}</span></div>
    <div class="cost-total"><span>Toplam Maliyet</span><span>₺${fmt(totalCost)}</span></div>
    <div class="cost-row" style="margin-top:8px"><span class="cr-label">Satış Geliri</span><span class="cr-val">₺${fmt(totalIncome)}</span></div>
    <div class="cost-row"><span class="cr-label">Toplam Üretim</span><span class="cr-val">${totalProd.toFixed(1)} birim</span></div>
    <div style="padding:12px 16px;border-radius:9px;background:${profit>=0?'#f0fdf4':'#fef2f2'};display:flex;justify-content:space-between;font-weight:700;font-size:15px;margin-top:8px">
      <span>${profit>=0?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Kâr':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> Zarar'}</span>
      <span style="color:${profit>=0?'#16a34a':'#dc2626'}">₺${fmt(Math.abs(profit))}</span>
    </div>`;
  var _el_cost_detail=document.getElementById('cost-detail');if(_el_cost_detail)_el_cost_detail.innerHTML=`
    <div class="g2">
      <div class="card mb"><div class="card-hd"><span class="card-t">Sağlık Giderleri (${health.length} kayıt)</span></div>
        ${health.map(h=>`<div class="cost-row"><span class="cr-label">${h.date} · ${h.record_type}</span><span class="cr-val">₺${fmt(h.cost)}</span></div>`).join('')||'<p class="empty">Kayıt yok</p>'}
      </div>
      <div class="card mb"><div class="card-hd"><span class="card-t">Satışlar (${sales.length} kayıt)</span></div>
        ${sales.map(s=>`<div class="cost-row"><span class="cr-label">${s.date} · ${s.type}</span><span class="cr-val">₺${fmt(s.total)}</span></div>`).join('')||'<p class="empty">Satış yok</p>'}
      </div>
    </div>`;
}
function renderFlockCost(){
  const totalHealth=D.health.reduce((s,h)=>s+nv(h.cost),0);
  const totalFeed=D.feeding.reduce((s,f)=>s+nv(f.total_cost),0);
  const totalPurch=D.animals.reduce((s,a)=>s+nv(a.purchase_price),0);
  const totalSales=D.sales.reduce((s,x)=>s+nv(x.total),0);
  const totalIncome=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const totalExpense=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  const totalCost=totalHealth+totalFeed+totalPurch+totalExpense;
  const profit=totalIncome-totalCost;
  const perHead=D.animals.length?totalCost/D.animals.length:0;
  const sumEl=document.getElementById('cost-summary');
  if(sumEl)sumEl.innerHTML=`
    <div class="card-hd"><span class="card-t">Tüm Sürü Maliyet Analizi</span></div>
    <div class="cost-row"><span class="cr-label">Toplam Hayvan Alım</span><span class="cr-val">₺${fmt(totalPurch)}</span></div>
    <div class="cost-row"><span class="cr-label"> Sağlık Harcamaları</span><span class="cr-val">₺${fmt(totalHealth)}</span></div>
    <div class="cost-row"><span class="cr-label">Yem Maliyeti</span><span class="cr-val">₺${fmt(totalFeed)}</span></div>
    <div class="cost-row"><span class="cr-label"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg></span> Diğer Giderler</span><span class="cr-val">₺${fmt(totalExpense)}</span></div>
    <div class="cost-total"><span>Toplam Maliyet</span><span>₺${fmt(totalCost)}</span></div>
    <div class="cost-row" style="margin-top:8px"><span class="cr-label">Toplam Gelir</span><span class="cr-val">₺${fmt(totalIncome)}</span></div>
    <div class="cost-row"><span class="cr-label">Hayvan Başı Maliyet</span><span class="cr-val">₺${fmt(perHead)}</span></div>
    <div style="padding:12px;border-radius:9px;background:${profit>=0?'#f0fdf4':'#fef2f2'};display:flex;justify-content:space-between;font-weight:700;font-size:15px;margin-top:8px">
      <span>${profit>=0?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Net Kâr':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> Net Zarar'}</span>
      <span style="color:${profit>=0?'#16a34a':'#dc2626'}">₺${fmt(Math.abs(profit))}</span>
    </div>`;
}

// ===================== ÜRETİM PLANLAMA =====================
function renderProdPlan(){
  const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const targets=D.settings.prod_targets_monthly||{};
  const el=document.getElementById('prod-target-table');if(!el)return;
  el.innerHTML=`<div class="plan-row" style="font-weight:700;color:var(--sub);border-bottom:2px solid var(--brd)">
    <span>Ay</span><span><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M8 2h8l1 6H7L8 2z"/><path d="M7 8l1 13h8l1-13"/></svg></span> Süt (lt)</span><span><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="13" rx="6" ry="8"/></svg></span> Yumurta</span><span>Satış (₺)</span>
  </div>`+months.map((m,i)=>{
    const mk=String(i+1).padStart(2,'0');
    const year=new Date().getFullYear();
    const realMilk=D.production.filter(p=>p.date?.startsWith(`${year}-${mk}`)&&p.production_type==='Süt').reduce((s,p)=>s+nv(p.quantity),0);
    const realSales=D.sales.filter(s=>s.date?.startsWith(`${year}-${mk}`)).reduce((s,x)=>s+nv(x.total),0);
    const t=targets[mk]||{};
    return`<div class="plan-row ${i===new Date().getMonth()?'style="background:var(--bg)"':''}">
      <span style="font-weight:${i===new Date().getMonth()?700:400}">${m}</span>
      <span><input class="target-input" id="pt-milk-${mk}" value="${t.milk||''}" placeholder="0" type="number" min="0"><span style="font-size:10px;color:var(--sub)">Gerçek: ${realMilk.toFixed(0)}</span></span>
      <span><input class="target-input" id="pt-egg-${mk}" value="${t.egg||''}" placeholder="0" type="number" min="0"></span>
      <span><input class="target-input" id="pt-sales-${mk}" value="${t.sales||''}" placeholder="0" type="number" min="0"><span style="font-size:10px;color:var(--sub)">Gerçek: ₺${fmt(realSales)}</span></span>
    </div>`;
  }).join('');
  // Grafik
  renderProdPlanChart(months,targets);
  // Verimlilik skorları
  renderEfficiencyScores();
}
function saveProdTargets(){
  const months=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
  if(!D.settings.prod_targets_monthly)D.settings.prod_targets_monthly={};
  months.forEach(mk=>{
    D.settings.prod_targets_monthly[mk]={
      milk:document.getElementById(`pt-milk-${mk}`)?.value||0,
      egg:document.getElementById(`pt-egg-${mk}`)?.value||0,
      sales:document.getElementById(`pt-sales-${mk}`)?.value||0,
    };
  });
  persist();showToast('Hedefler kaydedildi ✓');renderProdPlan();
}
function renderProdPlanChart(months,targets){
  const year=new Date().getFullYear();
  const realMilk=months.map((_,i)=>{const mk=String(i+1).padStart(2,'0');return D.production.filter(p=>p.date?.startsWith(`${year}-${mk}`)&&p.production_type==='Süt').reduce((s,p)=>s+nv(p.quantity),0);});
  const targetMilk=months.map((_,i)=>{const mk=String(i+1).padStart(2,'0');return nv((targets[mk]||{}).milk)||0;});
  mkChart('ch-plan-bar',{type:'bar',data:{labels:months.map((m,i)=>m.slice(0,3)),datasets:[{label:'Hedef',data:targetMilk,backgroundColor:'rgba(59,130,246,.4)',borderColor:'#3b82f6',borderWidth:2},{label:'Gerçek',data:realMilk,backgroundColor:'rgba(45,106,79,.6)',borderColor:'#2d6a4f',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}});
}
function renderEfficiencyScores(){
  const el=document.getElementById('efficiency-scores');if(!el)return;
  const bySpecies={};
  D.animals.forEach(a=>{
    if(!bySpecies[a.species])bySpecies[a.species]={count:0,milk:0,eggs:0,health:0};
    bySpecies[a.species].count++;
    bySpecies[a.species].milk+=nv(a.daily_milk);
  });
  const rows=Object.entries(bySpecies).map(([sp,data])=>{
    const perHead=data.count?data.milk/data.count:0;
    const healthCount=D.health.filter(h=>{const a=D.animals.find(x=>x.tag_number===h.animal_tag);return a&&a.species===sp;}).length;
    return{sp,count:data.count,perHead,healthCount};
  });
  el.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>Tür</th><th>Hayvan</th><th>Günlük Süt/baş</th><th>Sağlık Kaydı</th><th>Sağlık Skoru</th></tr></thead><tbody>
  ${rows.map(r=>{
    const healthScore=r.count?Math.max(0,100-Math.round(r.healthCount/r.count*10)):100;
    return`<tr><td>${getSpeciesIcon(r.sp)} ${r.sp}</td><td>${r.count}</td><td>${r.perHead.toFixed(1)} lt</td><td>${r.healthCount}</td><td><span class="badge ${healthScore>=80?'bg-gr':healthScore>=60?'bg-yl':'bg-rd'}">${healthScore}%</span></td></tr>`;
  }).join('')}
  </tbody></table></div>`;
}

// ===================== QR KOD =====================
function renderAnimalQR(idx){
  const a=D.animals[idx];if(!a)return;
  const canvas=document.getElementById('qr-canvas-'+a.tag_number);if(!canvas)return;
  // Basit QR simülasyonu — gerçek QR için URL tabanlı link
  const url=window.location.href.split('?')[0]+'?animal='+encodeURIComponent(a.tag_number);
  // QR verisi canvas'a piksel piksel çiz (mini QR pattern)
  drawSimpleQR(canvas, url, a.tag_number);
}
function drawSimpleQR(canvas, data, label){
  const ctx=canvas.getContext('2d');
  const size=canvas.width;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
  // QR kod kütüphanesi olmadan basit görsel — gerçek kullanım için cdn'den qrcode.js yükle
  ctx.fillStyle='#1e293b';
  // Köşe kareleri
  [[0,0],[size-56,0],[0,size-56]].forEach(([x,y])=>{
    ctx.fillRect(x+4,y+4,48,48);
    ctx.fillStyle='#ffffff';ctx.fillRect(x+10,y+10,36,36);
    ctx.fillStyle='#1e293b';ctx.fillRect(x+16,y+16,24,24);
  });
  // Veri alanında rastgele ama tutarlı piksel desen (data hash)
  let hash=0;for(let i=0;i<data.length;i++)hash=(hash*31+data.charCodeAt(i))&0xffffffff;
  const rng=(n)=>{hash=(hash*1103515245+12345)&0x7fffffff;return hash%n;};
  ctx.fillStyle='#1e293b';
  for(let row=1;row<15;row++){
    for(let col=1;col<15;col++){
      if((row<3&&col<3)||(row<3&&col>11)||(row>11&&col<3))continue;
      if(rng(2))ctx.fillRect(12+col*12,12+row*12,10,10);
    }
  }
  // Etiket
  ctx.fillStyle='#475569';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
  ctx.fillText(label,size/2,size-8);
}
function downloadQR(tag){
  const canvas=document.getElementById('qr-canvas-'+tag);if(!canvas)return;
  const a=document.createElement('a');a.download='QR-'+tag+'.png';a.href=canvas.toDataURL('image/png');a.click();
}
function printQR(tag){
  const canvas=document.getElementById('qr-canvas-'+tag);if(!canvas)return;
  const img=canvas.toDataURL('image/png');
  const w=window.open('');
  w.document.write(`<html><body style="text-align:center;font-family:sans-serif"><img src="${img}" style="width:200px"><br><b>${tag}</b><\/body><\/html>`);
  w.document.close();w.print();
}

// ===================== AĞIRLIK GRAFİĞİ (hayvan detay içi - legacy) =====================
