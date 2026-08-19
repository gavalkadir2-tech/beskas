function renderWeightChart(idxOrEmpty){
  // Eğer idx parametre geldiyse hayvan detay sayfası için çalıştır
  if(idxOrEmpty!==undefined&&idxOrEmpty!==null&&idxOrEmpty!==''){
    const a=D.animals[idxOrEmpty];if(!a)return;
    const tbodyId='tbl-weight-'+a.tag_number;const tbody=document.getElementById(tbodyId);
    const points=[];
    if(a.birth_weight&&a.birth_date)points.push({date:a.birth_date,w:nv(a.birth_weight)});
    if(a.weight)points.push({date:today(),w:nv(a.weight)});
    D.health.filter(h=>h.animal_tag===a.tag_number&&h.weight).forEach(h=>points.push({date:h.date,w:nv(h.weight)}));
    if(D.weights)D.weights.filter(w=>w.tag===a.tag_number).forEach(w=>points.push({date:w.date,w:nv(w.weight)}));
    points.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const canvasId='ch-weight-'+a.tag_number;
    if(points.length>=2)mkChart(canvasId,{type:'line',data:{labels:points.map(p=>p.date),datasets:[{label:'Ağırlık (kg)',data:points.map(p=>p.w),borderColor:'#2d6a4f',backgroundColor:'rgba(45,106,79,.1)',tension:.4,fill:true,pointRadius:5}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false}}}});
    if(tbody)tbody.innerHTML=points.map((p,i)=>{const diff=i>0?(p.w-points[i-1].w).toFixed(1):'-';const color=i>0?(p.w>=points[i-1].w?'#16a34a':'#dc2626'):'';return`<tr><td>${p.date}</td><td><b>${p.w} kg</b></td><td style="color:${color}">${i>0?(nv(diff)>=0?'+':'')+diff+' kg':'-'}</td></tr>`;}).join('')||'<tr><td colspan="3" class="empty">Veri yok</td></tr>';
    // Besi Hedefi kartı
    const bhEl=document.getElementById('besi-hedef-content-'+a.tag_number);
    if(bhEl){
      const g=calcGDA(a.tag_number);
      const target=nv(a.target_weight);
      if(!target){
        bhEl.innerHTML=`<div style="font-size:12.5px;color:var(--sub);padding:6px 0">Hedef ağırlık girilmemiş. <button class="btn btn-sec btn-sm" onclick="editRecord('animal',${idxOrEmpty})">Hayvanı Düzenle</button></div>`;
      }else{
        const est=estimateTargetInfo(a.tag_number);
        const lastW=g?g.lastWeight:nv(a.weight)||0;
        const progress=target&&lastW?Math.min(100,Math.round(lastW/target*100)):0;
        let estLine='—';
        if(est){
          if(est.reached)estLine=`<span style="color:#2d6a4f;font-weight:700">Hedefe ulaşıldı ✓</span>`;
          else if(est.estDate)estLine=`<b>${est.estDate}</b> <span style="color:var(--sub)">(yaklaşık ${est.daysLeft} gün)</span>`;
          else estLine=`<span style="color:var(--sub)">GDA hesaplanamıyor (yetersiz veri veya kilo artışı yok)</span>`;
        }
        bhEl.innerHTML=`
          <div class="g3" style="margin-bottom:10px">
            <div class="sc"><div class="sc-val">${lastW||'-'} kg</div><div class="sc-lbl">Güncel Ağırlık</div></div>
            <div class="sc"><div class="sc-val">${target} kg</div><div class="sc-lbl">Hedef Ağırlık</div></div>
            <div class="sc"><div class="sc-val">${g?(g.gda>=0?'+':'')+g.gda.toFixed(2):'-'} kg</div><div class="sc-lbl">GDA (Günlük Ort. Artış)</div></div>
          </div>
          <div style="background:var(--bg);border-radius:10px;height:10px;width:100%;overflow:hidden;margin-bottom:6px">
            <div style="background:${progress>=100?'#2d6a4f':progress>=70?'#f59e0b':'#ef4444'};height:10px;width:${progress}%"></div>
          </div>
          <div style="font-size:12px;color:var(--sub);margin-bottom:8px">${progress}% tamamlandı</div>
          <div style="font-size:12.5px">Tahmini Hedef Tarihi: ${estLine}</div>`;
      }
    }
    return;
  }
  // Tartım Takibi sayfası için — seçili hayvan
  const tag=document.getElementById('wt-animal-sel')?.value;
  if(!tag||!D.weights)return;
  const ws=D.weights.filter(w=>w.tag===tag).sort((a,b)=>a.date.localeCompare(b.date));
  if(!ws.length){destroyChart('ch-weight');return;}
  const animal=D.animals.find(a=>a.tag_number===tag);
  const datasets=[{label:'Ağırlık (kg)',data:ws.map(w=>nv(w.weight)),borderColor:'#2d6a4f',backgroundColor:'rgba(45,106,79,.06)',tension:.4,fill:true,pointRadius:5,pointHoverRadius:8}];
  if(animal?.target_weight)datasets.push({label:'Hedef',data:ws.map(()=>nv(animal.target_weight)),borderColor:'#ef4444',borderDash:[5,5],borderWidth:1.5,pointRadius:0,fill:false});
  mkChart('ch-weight',{type:'line',data:{labels:ws.map(w=>w.date),datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:11}}}},scales:{y:{beginAtZero:false,grid:{color:'rgba(0,0,0,.04)'}}}}});
}

// ===================== YAZDIRMA =====================
function printReport(pageId){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('print-target'));
  const pg=document.getElementById('pg-'+pageId);if(pg)pg.classList.add('print-target');
  window.print();
}
function printCurrentPage(){printReport(curPage);}


function renderAnimals(){
  // Stat kartları
  const statsEl = document.getElementById('animals-stats');
  if (statsEl) {
    const aktif = D.animals.filter(a=>a.status==='Aktif').length;
    const hasta = D.animals.filter(a=>a.status==='Hasta').length;
    const gebe = D.animals.filter(a=>a.status==='Gebe').length;
    const satilan = D.animals.filter(a=>a.status==='Satıldı').length;
    const speciesCount = {};
    D.animals.forEach(a=>{speciesCount[a.species]=(speciesCount[a.species]||0)+1;});
    const topSpecies = Object.entries(speciesCount).sort((a,b)=>b[1]-a[1]).slice(0,1)[0];
    statsEl.innerHTML = `
      <div class="sc sc-v2 stripe-green" style="cursor:pointer" onclick="quickFilterAnimals('Aktif')">
        <div class="sc-top"><div class="sc-ico ico-green"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><span class="badge bg-gr">${Math.round(aktif/Math.max(1,D.animals.length)*100)}%</span></div>
        <div class="sc-val">${aktif}</div><div class="sc-lbl">Aktif Hayvan</div>
      </div>
      <div class="sc sc-v2 stripe-red" style="cursor:pointer" onclick="quickFilterAnimals('Hasta')">
        <div class="sc-top"><div class="sc-ico ico-red"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>${hasta>0?'<span class="badge bg-rd">Dikkat</span>':'<span class="badge bg-gr">İyi</span>'}</div>
        <div class="sc-val">${hasta}</div><div class="sc-lbl">Hasta</div>
      </div>
      <div class="sc sc-v2 stripe-purple" style="cursor:pointer" onclick="quickFilterAnimals('Gebe')">
        <div class="sc-top"><div class="sc-ico ico-purple"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div></div>
        <div class="sc-val">${gebe}</div><div class="sc-lbl">Gebe</div>
      </div>
      <div class="sc sc-v2 stripe-blue">
        <div class="sc-top"><div class="sc-ico ico-blue"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div></div>
        <div class="sc-val">${topSpecies ? topSpecies[0] : '-'}</div><div class="sc-lbl">Ana Tür (${topSpecies?topSpecies[1]:0} baş)</div>
      </div>`;
  }
  const q=(gv('a-search')||'').toLowerCase(),sp=gv('a-fsp'),st=gv('a-fst');
  const list=D.animals.filter(a=>(!q||(a.tag_number||'').toLowerCase().includes(q)||(a.name||'').toLowerCase().includes(q)||(a.species||'').toLowerCase().includes(q))&&(!sp||a.species===sp)&&(!st||a.status===st));
  // ── İstatistik kartları ──
  const aktif=D.animals.filter(a=>a.status==='Aktif').length;
  const hasta=D.animals.filter(a=>a.status==='Hasta').length;
  const gebe=D.animals.filter(a=>a.status==='Gebe').length;
  const satilan=D.animals.filter(a=>a.status==='Satıldı').length;
  const sEl=document.getElementById('animals-stats');
  if(sEl)sEl.innerHTML=`
    <div class="sc sc-v2 stripe-green" style="cursor:pointer" onclick="document.getElementById('a-fst').value='Aktif';renderAnimals()">
      <div class="sc-top"><div class="sc-ico ico-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></svg></div><span class="badge bg-gr">${aktif}</span></div>
      <div class="sc-val">${D.animals.length}</div><div class="sc-lbl">Toplam Hayvan</div>
    </div>
    <div class="sc sc-v2 stripe-red" style="cursor:pointer" onclick="document.getElementById('a-fst').value='Hasta';renderAnimals()">
      <div class="sc-top"><div class="sc-ico ico-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><span class="badge ${hasta>0?'bg-rd':'bg-gr'}">${hasta}</span></div>
      <div class="sc-val" style="color:${hasta>0?'#dc2626':'var(--txt)'}">${hasta}</div><div class="sc-lbl">Hasta</div>
    </div>
    <div class="sc sc-v2 stripe-purple" style="cursor:pointer" onclick="document.getElementById('a-fst').value='Gebe';renderAnimals()">
      <div class="sc-top"><div class="sc-ico ico-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M8 16h8a4 4 0 0 1 4 4H4a4 4 0 0 1 4-4z"/></svg></div><span class="badge bg-gy">${gebe}</span></div>
      <div class="sc-val">${gebe}</div><div class="sc-lbl">Gebe</div>
    </div>
    <div class="sc sc-v2 stripe-blue">
      <div class="sc-top"><div class="sc-ico ico-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/></svg></div></div>
      <div class="sc-val">${satilan}</div><div class="sc-lbl">Satılan</div>
    </div>`;
  var _el_tbl_animals=document.getElementById('tbl-animals');if(_el_tbl_animals)_el_tbl_animals.innerHTML=list.length?list.map(a=>{
    const i=D.animals.indexOf(a);
    const ph=firstPhoto(a.tag_number);
    const thumb=ph?`<img src="${ph}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="openAnimalDetail(${i})">`:`<div style="width:32px;height:32px;border-radius:6px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer" onclick="openAnimalDetail(${i})">${getSpeciesIcon(a.species)}</div>`;
    return`<tr>
      <td>${thumb}</td>
      <td><b style="cursor:pointer;color:var(--g2);text-decoration:underline" onclick="openAnimalDetail(${i})">${a.tag_number}</b></td>
      <td>${a.name||'-'}</td><td>${a.species}</td><td>${a.breed||'-'}</td><td>${a.gender||'-'}</td>
      <td>${calcAge(a.birth_date)}</td><td>${a.weight?a.weight+' kg':'-'}</td><td>${a.location||'-'}</td><td>${stag(a.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sec btn-sm" onclick="openAnimalDetail(${i})" title="Detay">🔍</button>
        <button class="btn btn-sec btn-sm" onclick="openAnimalQuickActions('${a.tag_number}')" title="Hızlı İşlemler">⚡</button>
        <button class="btn btn-sec btn-sm" onclick="editRecord('animal',${i})" title="Düzenle">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('animals',${i})" title="Sil">🗑️</button>
      </td></tr>`;
  }).join(''):empty(11);
}

// ===================== HEALTH =====================
function renderHealth(){
  const q=(gv('h-search')||'').toLowerCase(),tp=gv('h-ftype');
  const list=D.health.filter(h=>(!q||(h.animal_tag||'').toLowerCase().includes(q)||(h.diagnosis||'').toLowerCase().includes(q))&&(!tp||h.record_type===tp));
  var _el_tbl_health=document.getElementById('tbl-health');if(_el_tbl_health)_el_tbl_health.innerHTML=list.length?[...list].reverse().map(h=>{const i=D.health.indexOf(h);return`<tr><td><b style="cursor:pointer;color:var(--g2)" onclick="openAnimalDetailByTag('${h.animal_tag}')">${h.animal_tag}</b></td><td>${stag(h.record_type)}</td><td>${h.date||'-'}</td><td>${h.diagnosis||'-'}</td><td>${h.medication||'-'}</td><td>${h.vet_name||'-'}</td><td>${h.cost?'₺'+fmt(h.cost):'-'}</td><td>${h.next_date||'-'}</td>
    <td><button class="btn btn-sec btn-sm" onclick="editRecord('health',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('health',${i})">🗑️</button></td></tr>`}).join(''):empty(9);
}
function openAnimalDetailByTag(tag){const i=D.animals.findIndex(a=>a.tag_number===tag);if(i>=0)openAnimalDetail(i);}

// ===================== REPRO =====================
function renderRepro(){
  const now=new Date();
  const today_str=now.toISOString().split('T')[0];
  const soon30=new Date(now);soon30.setDate(soon30.getDate()+30);
  const soon30_str=soon30.toISOString().split('T')[0];

  // ── İstatistik kartları ──
  const gebe=D.repro.filter(r=>r.outcome==='Beklemede'&&r.expected_birth_date).length;
  const yakin=D.repro.filter(r=>r.outcome==='Beklemede'&&r.expected_birth_date&&r.expected_birth_date<=soon30_str&&r.expected_birth_date>=today_str).length;
  const basarili=D.repro.filter(r=>r.outcome==='Başarılı').length;
  const toplam=D.repro.length;

  const stEl=document.getElementById('repro-stats');
  if(stEl)stEl.innerHTML=`
    <div class="sc sc-v2 stripe-purple"><div class="sc-top"><div class="sc-ico ico-purple">🐄</div></div><div class="sc-val">${gebe}</div><div class="sc-lbl">Gebe Hayvan</div></div>
    <div class="sc sc-v2 stripe-red"><div class="sc-top"><div class="sc-ico ico-red">🍼</div></div><div class="sc-val">${yakin}</div><div class="sc-lbl">Bu Ay Doğum</div></div>
    <div class="sc sc-v2 stripe-green"><div class="sc-top"><div class="sc-ico ico-green">✅</div></div><div class="sc-val">${basarili}</div><div class="sc-lbl">Başarılı Üreme</div></div>
    <div class="sc sc-v2 stripe-blue"><div class="sc-top"><div class="sc-ico ico-blue">📋</div></div><div class="sc-val">${toplam}</div><div class="sc-lbl">Toplam Kayıt</div></div>`;

  // ── Yaklaşan Doğumlar Paneli ──
  const dogunumlarEl=document.getElementById('upcoming-births');
  if(dogunumlarEl){
    const upcoming=D.repro
      .filter(r=>r.outcome==='Beklemede'&&r.expected_birth_date&&r.expected_birth_date>=today_str)
      .sort((a,b)=>a.expected_birth_date.localeCompare(b.expected_birth_date))
      .slice(0,8);
    if(upcoming.length){
      dogunumlarEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px">`+
        upcoming.map(r=>{
          const daysLeft=Math.ceil((new Date(r.expected_birth_date)-now)/86400000);
          const urgent=daysLeft<=7;
          const a=D.animals.find(x=>x.tag_number===r.animal_tag);
          return`<div class="vac-item ${urgent?'vac-overdue':'vac-soon'}">
            <div style="font-size:20px">${urgent?'🚨':'🐣'}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">${r.animal_tag}${a&&a.name?' · '+a.name:''}</div>
              <div style="font-size:11px;color:var(--sub)">${r.expected_birth_date} · ${daysLeft} gün kaldı</div>
            </div>
            <span class="badge ${daysLeft<=3?'bg-rd':daysLeft<=7?'bg-yl':'bg-gy'}">${daysLeft<=3?'ACİL':daysLeft<=7?'Yakın':'Normal'}</span>
          </div>`;
        }).join('') + `</div>`;
    } else {
      dogunumlarEl.innerHTML='<p style="color:var(--sub);font-size:12px;padding:8px">Yaklaşan doğum yok</p>';
    }
  }

  // ── Gebelik Takvimi ──
  const gcEl=document.getElementById('gestation-calendar');
  if(gcEl){
    const pregnant=D.animals.filter(a=>a.status==='Gebe');
    if(pregnant.length){
      gcEl.innerHTML=pregnant.map(a=>{
        const repr=D.repro.filter(r=>r.animal_tag===a.tag_number&&r.outcome==='Beklemede').sort((x,y)=>y.date?.localeCompare(x.date||'')).slice(0,1)[0];
        const mating=repr?.date;
        const expected=repr?.expected_birth_date;
        let progress=0;
        if(mating&&expected){
          const total=new Date(expected)-new Date(mating);
          const elapsed=now-new Date(mating);
          progress=Math.min(100,Math.max(0,Math.round(elapsed/total*100)));
        }
        return`<div style="padding:10px;border-radius:8px;border:1px solid var(--brd);background:var(--bg)">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-weight:600;font-size:12.5px">${a.tag_number}${a.name?' · '+a.name:''}</span>
            <span style="font-size:11px;color:var(--sub)">${expected||'Beklenen tarihi bilinmiyor'}</span>
          </div>
          <div style="background:var(--brd);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:100%;width:${progress}%;background:${progress>80?'#dc2626':progress>50?'#f59e0b':'#8b5cf6'};border-radius:4px;transition:width .8s"></div>
          </div>
          <div style="font-size:10px;color:var(--sub);margin-top:3px">Gebelik ilerlemesi: %${progress}</div>
        </div>`;
      }).join('');
    } else {
      gcEl.innerHTML='<p style="font-size:12px;color:var(--sub)">Gebe hayvan yok</p>';
    }
  }

  // ── Ana tablo ──
  const tbl=document.getElementById('tbl-repro');
  if(tbl)tbl.innerHTML=D.repro.length?[...D.repro].reverse().map((r,_)=>{
    const i=D.repro.indexOf(r);
    const a=D.animals.find(x=>x.tag_number===r.animal_tag);
    const daysToExpected=r.expected_birth_date&&r.outcome==='Beklemede'?
      Math.ceil((new Date(r.expected_birth_date)-now)/86400000):null;
    return`<tr>
      <td><b style="cursor:pointer;color:var(--accent)" onclick="openAnimalDetailByTag('${r.animal_tag}')">${r.animal_tag}</b>${a&&a.name?`<div style="font-size:10px;color:var(--sub)">${a.name}</div>`:''}</td>
      <td>${stag(r.event_type)}</td>
      <td>${r.date||'-'}</td>
      <td>${r.male_tag||'-'}</td>
      <td>${r.expected_birth_date||'-'}${daysToExpected!==null?`<div style="font-size:10px;color:${daysToExpected<=7?'#dc2626':'var(--sub)'}">${daysToExpected} gün</div>`:''}</td>
      <td>${r.offspring_count||'-'}</td>
      <td>${stag(r.outcome)}</td>
      <td>
        <button class="btn btn-sec btn-sm" onclick="editRecord('repro',${i})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('repro',${i})">🗑</button>
      </td></tr>`;
  }).join(''):empty(8,'Üreme kaydı yok','🐄');
}
function renderProduction(){
  const f=gv('p-filter');const list=D.production.filter(p=>!f||p.production_type===f);
  var _el_tbl_prod=document.getElementById('tbl-prod');if(_el_tbl_prod)_el_tbl_prod.innerHTML=list.length?[...list].reverse().map(p=>{const i=D.production.indexOf(p);return`<tr><td><b style="cursor:pointer;color:var(--g2)" onclick="openAnimalDetailByTag('${p.animal_tag}')">${p.animal_tag}</b></td><td>${stag(p.production_type)}</td><td>${p.date||'-'}</td><td>${p.quantity}</td><td>${p.unit||'-'}</td><td>${p.quality_grade?stag(p.quality_grade):'-'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('production',${i})">🗑️</button></td></tr>`}).join(''):empty(7);
  const types=['Süt','Yumurta','Yün','Et','Diğer'],cols=['#2d6a4f','#f59e0b','#8b5cf6','#ef4444','#64748b'];
  mkChart('ch-prod',{type:'bar',data:{labels:ML(),datasets:types.map((t,i)=>({label:t,data:Array.from({length:6},(_,j)=>{const d=new Date();d.setMonth(d.getMonth()-5+j);const pf=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return D.production.filter(p=>p.production_type===t&&(p.date||'').startsWith(pf)).reduce((s,p)=>s+nv(p.quantity),0);}),backgroundColor:cols[i]+'99',borderColor:cols[i],borderWidth:1}))},options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});
  const ptc={};D.production.forEach(p=>{ptc[p.production_type]=(ptc[p.production_type]||0)+nv(p.quantity);});const pk=Object.keys(ptc);
  mkChart('ch-prod-pie',{type:'pie',data:{labels:pk.length?pk:['Boş'],datasets:[{data:pk.length?pk.map(k=>ptc[k]):[1],backgroundColor:pk.length?cols.slice(0,pk.length):['#e2e8f0']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
}
function renderFeeding(){
  document.getElementById('tbl-feed').innerHTML=D.feeding.length?[...D.feeding].reverse().map((f,_)=>{const i=D.feeding.indexOf(f);return`<tr><td>${f.animal_tag||'-'}</td><td>${f.feed_name}</td><td>${stag(f.feed_type)}</td><td>${f.quantity} ${f.unit||'kg'}</td><td>${f.date||'-'}</td><td>${f.total_cost?'₺'+fmt(f.total_cost):'-'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('feeding',${i})">🗑️</button></td></tr>`}).join(''):empty(7);
  document.getElementById('ration-list').innerHTML=D.rations.length?D.rations.map((r,i)=>`<div style="padding:9px;border:1px solid var(--brd);border-radius:8px;margin-bottom:7px"><div style="display:flex;justify-content:space-between"><b style="font-size:12.5px">${r.name}</b><span class="tag t-bl">${r.species}</span></div><div style="font-size:11px;color:var(--sub);margin-top:3px">${r.total_daily_kg||0} kg/gün · ₺${fmt(r.daily_cost)}/gün</div></div>`).join(''):'<p class="empty">Rasyon planı yok</p>';
}
function renderFinance(){
  // Bütçe hedefi varsa widget göster
  const hasBudget = D.settings.butce && Object.keys(D.settings.butce).length > 0;
  const bvaWrap = document.getElementById('budget-vs-actual-wrap');
  if (bvaWrap) {
    bvaWrap.style.display = hasBudget ? 'block' : 'none';
    if (hasBudget) setTimeout(renderBudgetVsActual, 100);
  }
  const tp=gv('fin-type'),cat=gv('fin-cat');
  const list=D.finance.filter(f=>(!tp||f.type===tp)&&(!cat||f.category===cat));
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  var _el_fin_stats=document.getElementById('fin-stats');if(_el_fin_stats)_el_fin_stats.innerHTML=`
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#15803d">₺${fmt(gelir)}</div><div class="sc-lbl">Toplam Gelir</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#dc2626">₺${fmt(gider)}</div><div class="sc-lbl">Toplam Gider</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:${gelir-gider>=0?'#16a34a':'#dc2626'}">₺${fmt(gelir-gider)}</div><div class="sc-lbl">Net Bakiye</div></div>`;
  document.getElementById('tbl-fin').innerHTML=list.length?[...list].reverse().map(f=>{const i=D.finance.indexOf(f);return`<tr><td>${f.date||'-'}</td><td>${stag(f.type)}</td><td><span class="tag t-gy">${f.category}</span></td><td>${f.description||'-'}</td><td>${f.payment_method||'-'}</td><td style="font-weight:600;color:${f.type==='Gelir'?'#16a34a':'#dc2626'}">₺${fmt(f.amount)}</td>
    <td><button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('finance',${i})">🗑️</button></td></tr>`}).join(''):empty(7);
  mkChart('ch-fin',{type:'bar',data:{labels:ML(),datasets:[{label:'Gelir',data:MD(D.finance,'amount','Gelir'),backgroundColor:'rgba(45,106,79,.75)'},{label:'Gider',data:MD(D.finance,'amount','Gider'),backgroundColor:'rgba(239,68,68,.65)'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
  const cats={};D.finance.filter(f=>f.type==='Gider').forEach(f=>{cats[f.category]=(cats[f.category]||0)+nv(f.amount);});const ck=Object.keys(cats);const cc=['#ef4444','#f59e0b','#8b5cf6','#3b82f6','#10b981','#f97316','#6366f1'];
  mkChart('ch-fin-cat',{type:'doughnut',data:{labels:ck.length?ck:['Boş'],datasets:[{data:ck.length?ck.map(k=>cats[k]):[1],backgroundColor:ck.length?cc.slice(0,ck.length):['#e2e8f0']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
}
// ===================== WHATSAPP BİLDİRİM (wa.me — hesap/ücret gerektirmez) =====================
// Telefonu Türkiye formatına (90XXXXXXXXXX) çevirip wa.me linkini yeni sekmede açar.
// Kullanıcı WhatsApp'ta mesajı kontrol edip kendisi gönderir (tam otomatik değil, tek tık).
function waGonder(phone,mesaj){
  if(!phone){showToast('Bu kayıtta telefon numarası yok','yl');return;}
  let numara=String(phone).replace(/[^0-9]/g,'');
  if(!numara){showToast('Geçerli telefon numarası bulunamadı','yl');return;}
  if(numara.startsWith('0'))numara='90'+numara.slice(1);
  else if(!numara.startsWith('90'))numara='90'+numara;
  window.open(`https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`,'_blank');
}
// ===================== RAWBT HIZLI YAZDIRMA (Android — yazdırma diyaloğunu atlar) =====================
function waButon(phone,mesaj,etiket){
  return `<button class="btn btn-sec btn-sm" style="color:#25D366;border-color:#25D366" onclick='waGonder(${JSON.stringify(phone||"")},${JSON.stringify(mesaj)})' title="WhatsApp ile gönder">💬${etiket?' '+etiket:''}</button>`;
}
// RawBT kuruluysa (ücretsiz, Play Store) bu link doğrudan yazıcıya gönderir, hiçbir onay ekranı açılmaz.
// RawBT kurulu değilse Android bu linki açamaz ve sessizce başarısız olur — bu yüzden 🏷️/🧾 (window.print)
// butonları HER ZAMAN ayrıca duruyor, RawBT olmayan cihazlar/Windows/iPad için yedek yol olarak.
function rawbtYazdir(text){
  const url='intent:'+encodeURIComponent(text)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
  window.location.href=url;
}
function etiketRawbtYazdir(urunAdi,miktarKg,birimFiyat,toplam,ekBilgi){
  const isletme=D.settings.farm_name||'Bizim Çiftlik';
  const tarih=new Date().toLocaleString('tr-TR');
  const cizgi='--------------------------------\n';
  let t='     '+isletme+'\n'+cizgi;
  t+=urunAdi+'\n';
  t+='Agirlik: '+nv(miktarKg).toFixed(2)+' kg\n';
  t+='Birim Fiyat: '+fmt(birimFiyat)+' TL/kg\n';
  t+=cizgi;
  t+='TOPLAM: '+fmt(toplam)+' TL\n';
  if(ekBilgi)t+=ekBilgi+'\n';
  t+=tarih+'\n\n\n';
  rawbtYazdir(t);
}
function fisRawbtYazdir(kalemler,toplam,musteri,odemeDurumu){
  const isletme=D.settings.farm_name||'Bizim Çiftlik';
  const adres=D.settings.location||'';
  const tarih=new Date().toLocaleString('tr-TR');
  const cizgi='--------------------------------\n';
  let t='     '+isletme+'\n';
  if(adres)t+='     '+adres+'\n';
  t+='     '+tarih+'\n'+cizgi;
  if(musteri)t+='Musteri: '+musteri+'\n'+cizgi;
  kalemler.forEach(k=>{
    t+=k.ad+'\n';
    t+='  '+nv(k.miktar).toFixed(2)+' kg x '+fmt(k.birimFiyat)+' TL = '+fmt(k.tutar)+' TL\n';
  });
  t+=cizgi;
  t+='TOPLAM: '+fmt(toplam)+' TL\n';
  t+='Odeme: '+(odemeDurumu||'-')+'\n\n';
  t+='Tesekkur ederiz!\n\n\n';
  rawbtYazdir(t);
}

// ===================== ETİKET & FİŞ YAZDIRMA (window.print — herhangi bir kurulu yazıcıyla çalışır) =====================
// Termal etiket/fiş yazıcın normal bir yazıcı olarak kurulduğunda (çoğu USB/Bluetooth
// termal yazıcı böyle çalışır), tarayıcının yazdırma diyaloğu üzerinden basar.
// Yazıcı henüz yoksa da bu fonksiyonlar PDF olarak kaydetmeye izin verir (yazdır > PDF olarak kaydet).

// Ürün Etiketi — tartılan parçanın üzerine yapıştırılacak küçük etiket (50mm x 30mm)
function etiketYazdir(urunAdi, miktarKg, birimFiyat, toplam, ekBilgi) {
  const isletme = D.settings.farm_name || 'Bizim Çiftlik';
  const tarih = new Date().toLocaleString('tr-TR');
  const w = window.open('', '_blank', 'width=400,height=300');
  w.document.write(`<html><head><title>Etiket Yazdır</title>
    <style>
      @page { size: 50mm 30mm; margin: 0; }
      body { margin: 0; padding: 2mm; font-family: Arial, sans-serif; width: 46mm; }
      .isletme { font-size: 8px; text-align: center; color: #555; }
      .urun { font-size: 12px; font-weight: 700; text-align: center; margin: 2px 0; }
      .satir { display: flex; justify-content: space-between; font-size: 9px; margin: 1px 0; }
      .toplam { font-size: 14px; font-weight: 700; text-align: center; border-top: 1px dashed #000; margin-top: 3px; padding-top: 2px; }
      .tarih { font-size: 7px; text-align: center; color: #777; margin-top: 2px; }
    </style></head>
    <body>
      <div class="isletme">${isletme}</div>
      <div class="urun">${urunAdi}</div>
      <div class="satir"><span>Ağırlık:</span><span><b>${nv(miktarKg).toFixed(2)} kg</b></span></div>
      <div class="satir"><span>Birim Fiyat:</span><span>₺${fmt(birimFiyat)}/kg</span></div>
      <div class="toplam">₺${fmt(toplam)}</div>
      ${ekBilgi ? `<div class="satir" style="justify-content:center">${ekBilgi}</div>` : ''}
      <div class="tarih">${tarih}</div>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}

// Satış Fişi — ödeme sonrası müşteriye verilecek makbuz (58mm rulo)
function fisYazdir(kalemler, toplam, musteri, odemeDurumu) {
  const isletme = D.settings.farm_name || 'Bizim Çiftlik';
  const adres = D.settings.location || '';
  const tarih = new Date().toLocaleString('tr-TR');
  const kalemHtml = kalemler.map(k => `
    <div class="kalem">
      <div>${k.ad}</div>
      <div class="satir"><span>${nv(k.miktar).toFixed(2)} kg x ₺${fmt(k.birimFiyat)}</span><span>₺${fmt(k.tutar)}</span></div>
    </div>`).join('');
  const w = window.open('', '_blank', 'width=400,height=500');
  w.document.write(`<html><head><title>Fiş Yazdır</title>
    <style>
      @page { size: 58mm auto; margin: 0; }
      body { margin: 0; padding: 3mm; font-family: 'Courier New', monospace; width: 52mm; font-size: 10px; }
      .baslik { text-align: center; font-weight: 700; font-size: 12px; }
      .alt { text-align: center; font-size: 8px; color: #444; margin-bottom: 4px; }
      .cizgi { border-top: 1px dashed #000; margin: 4px 0; }
      .kalem { margin: 3px 0; }
      .satir { display: flex; justify-content: space-between; }
      .toplam { font-size: 13px; font-weight: 700; display: flex; justify-content: space-between; margin-top: 4px; }
      .teşekkur { text-align: center; margin-top: 8px; font-size: 9px; }
    </style></head>
    <body>
      <div class="baslik">${isletme}</div>
      ${adres ? `<div class="alt">${adres}</div>` : ''}
      <div class="alt">${tarih}</div>
      ${musteri ? `<div class="satir"><span>Müşteri:</span><span>${musteri}</span></div>` : ''}
      <div class="cizgi"></div>
      ${kalemHtml}
      <div class="cizgi"></div>
      <div class="toplam"><span>TOPLAM</span><span>₺${fmt(toplam)}</span></div>
      <div class="satir"><span>Ödeme:</span><span>${odemeDurumu || '-'}</span></div>
      <div class="teşekkur">Bizi tercih ettiğiniz için teşekkür ederiz!</div>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}
function renderInventory(){
  const low=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock));
  document.getElementById('inv-alerts').innerHTML=low.map(i=>`<div class="alert-box alert-yl"><b>${i.name}</b> kritik stok: ${i.current_stock} ${i.unit}</div>`).join('');
  document.getElementById('tbl-inv').innerHTML=D.inventory.length?D.inventory.map((item,i)=>{const isLow=nv(item.current_stock)<nv(item.minimum_stock);const pct=item.minimum_stock>0?Math.min(100,nv(item.current_stock)/nv(item.minimum_stock)*100):100;return`<tr><td><b>${item.name}</b></td><td><span class="tag t-bl">${item.category}</span></td>
    <td><div style="display:flex;align-items:center;gap:6px"><span>${item.current_stock}</span><div class="progress" style="width:55px"><div class="progress-bar" style="width:${pct.toFixed(0)}%;background:${isLow?'#ef4444':'#2d6a4f'}"></div></div></div></td>
    <td>${item.minimum_stock||'-'}</td><td>${item.unit}</td><td>${item.unit_cost?'₺'+fmt(item.unit_cost):'-'}</td><td>${item.expiry_date||'-'}</td>
    <td><span class="tag ${isLow?'t-rd':'t-gr'}">${isLow?'Kritik':'Yeterli'}</span></td>
    <td>${isLow&&item.supplier?(()=>{const sup=D.suppliers.find(s=>s.name===item.supplier);return sup&&sup.phone?waButon(sup.phone,`Merhaba ${item.supplier}, ${item.name} stoğumuz azaldı (${item.current_stock} ${item.unit} kaldı). Sipariş verebilir miyiz?`):'';})():''}<button class="btn btn-sec btn-sm" onclick="editRecord('inventory',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('inventory',${i})">🗑️</button></td></tr>`;}).join(''):empty(9);
}
function renderSales(){
  const f=gv('sale-f');const list=D.sales.filter(s=>!f||s.sale_type===f);
  const total=D.sales.reduce((s,x)=>s+nv(x.total_amount),0);const paid=D.sales.filter(x=>x.payment_status==='Ödendi').reduce((s,x)=>s+nv(x.total_amount),0);
  var _el_sales_stats=document.getElementById('sales-stats');if(_el_sales_stats)_el_sales_stats.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${D.sales.length}</div><div class="sc-lbl">Toplam</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(total)}</div><div class="sc-lbl">Tutar</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(paid)}</div><div class="sc-lbl">Tahsil</div></div>`;
  var _el_tbl_sales=document.getElementById('tbl-sales');if(_el_tbl_sales)_el_tbl_sales.innerHTML=list.length?[...list].reverse().map(s=>{const i=D.sales.indexOf(s);return`<tr><td>${s.date||'-'}</td><td>${stag(s.sale_type)}</td><td>${s.animal_tag||'-'}</td><td>${s.buyer_name||'-'}</td><td>${s.quantity} ${s.unit||''}</td><td>₺${fmt(s.unit_price)}</td><td style="font-weight:600">₺${fmt(s.total_amount)}</td><td>${stag(s.payment_status)}</td>
    <td><button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('sales',${i})">🗑️</button></td></tr>`}).join(''):empty(9);
}
function renderSlaughter(){
  const list=D.slaughter||[];
  const count=list.length;
  const avgYield=count?(list.reduce((s,r)=>s+(nv(r.yield_pct)||0),0)/count):0;
  const totalCost=list.reduce((s,r)=>s+nv(r.cost),0);
  const stEl=document.getElementById('sl-stats');
  if(stEl)stEl.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${count}</div><div class="sc-lbl">Toplam Kesim</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${avgYield.toFixed(1)} %</div><div class="sc-lbl">Ort. Randıman</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(totalCost)}</div><div class="sc-lbl">Toplam Kesim Maliyeti</div></div>`;
  const tbEl=document.getElementById('tbl-slaughter');
  if(tbEl)tbEl.innerHTML=list.length?[...list].reverse().map(r=>{
    const i=D.slaughter.indexOf(r);
    const y=nv(r.yield_pct);
    const low=y&&avgYield&&y<avgYield-5;
    return`<tr>
      <td><strong>${r.animal_tag}</strong></td>
      <td>${r.date||'-'}</td>
      <td>${r.live_weight?r.live_weight+' kg':'-'}</td>
      <td>${r.carcass_weight?r.carcass_weight+' kg':'-'}</td>
      <td><span style="color:${low?'#ef4444':'#16a34a'};font-weight:600">${y?y+' %':'-'}</span>${low?' ⚠️':''}</td>
      <td>${r.cost?'₺'+fmt(r.cost):'-'}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes||'-'}</td>
      <td><button class="btn btn-sec btn-sm" onclick="editRecord('slaughter',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('slaughter',${i})">🗑️</button> <button class="btn btn-pr btn-sm" onclick="openForm('cut');setTimeout(()=>{sv('f-tag','${r.animal_tag}');sv('f-dt','${r.date||''}');},100)">+ Parça Çıkar</button></td>
    </tr>`;
  }).join(''):empty(8);
}
function renderCuts(){
  const cuts=D.cuts||[],cutSales=D.cutSales||[];
  const totalProduced=cuts.reduce((s,c)=>s+nv(c.quantity_kg),0);
  const totalRemaining=cuts.reduce((s,c)=>s+nv(c.remaining_kg),0);
  const totalSalesRev=cutSales.reduce((s,c)=>s+nv(c.total_amount),0);
  const stEl=document.getElementById('cuts-stats');
  if(stEl)stEl.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${totalProduced.toFixed(1)} kg</div><div class="sc-lbl">Toplam Üretilen</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${totalRemaining.toFixed(1)} kg</div><div class="sc-lbl">Kalan Stok</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(totalSalesRev)}</div><div class="sc-lbl">Parça Satış Geliri</div></div>`;
  // Parça bazlı kalan stok özeti
  const byPart={};
  cuts.forEach(c=>{byPart[c.part_name]=(byPart[c.part_name]||0)+nv(c.remaining_kg);});
  const sumEl=document.getElementById('cuts-summary');
  if(sumEl){
    const parts=Object.entries(byPart).filter(([,v])=>v>0.001);
    sumEl.innerHTML=parts.length?parts.map(([p,v])=>`<div style="padding:8px 14px;border-radius:8px;background:var(--bg);border:1px solid var(--brd);font-size:12.5px"><b>${p}</b>: ${v.toFixed(1)} kg</div>`).join(''):empty(1);
  }
  // Parça üretim tablosu
  const tbCuts=document.getElementById('tbl-cuts');
  if(tbCuts)tbCuts.innerHTML=cuts.length?[...cuts].reverse().map(c=>{
    const i=D.cuts.indexOf(c);
    const soldOut=nv(c.remaining_kg)<=0.001;
    return`<tr>
      <td>${c.animal_tag||'-'}</td>
      <td>${c.date||'-'}</td>
      <td>${c.part_name}</td>
      <td>${nv(c.quantity_kg).toFixed(1)} kg</td>
      <td><span style="color:${soldOut?'var(--sub)':'#16a34a'};font-weight:600">${nv(c.remaining_kg).toFixed(1)} kg</span>${soldOut?' <span class="tag t-gy">Tükendi</span>':''}</td>
      <td><button class="btn btn-sec btn-sm" onclick="editRecord('cut',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('cuts',${i})">🗑️</button></td>
    </tr>`;
  }).join(''):empty(6);
  // Parça satış tablosu
  const tbSales=document.getElementById('tbl-cutsales');
  if(tbSales)tbSales.innerHTML=cutSales.length?[...cutSales].reverse().map(s=>{
    const i=D.cutSales.indexOf(s);
    return`<tr>
      <td>${s.date||'-'}</td>
      <td>${s.part_name}</td>
      <td>${nv(s.quantity_kg).toFixed(1)} kg</td>
      <td>₺${fmt(s.unit_price)}</td>
      <td style="font-weight:600">₺${fmt(s.total_amount)}</td>
      <td>${s.buyer_name||'-'}</td>
      <td>${stag(s.payment_status)}</td>
      <td>
        <button class="btn btn-sec btn-sm" onclick='etiketYazdir(${JSON.stringify(s.part_name)},${nv(s.quantity_kg)},${nv(s.unit_price)},${nv(s.total_amount)})' title="Ürün etiketi yazdır (yazdırma diyaloğu)">🏷️</button>
        <button class="btn btn-sec btn-sm" onclick='etiketRawbtYazdir(${JSON.stringify(s.part_name)},${nv(s.quantity_kg)},${nv(s.unit_price)},${nv(s.total_amount)})' title="RawBT ile hızlı etiket yazdır (Android)">🏷️⚡</button>
        <button class="btn btn-sec btn-sm" onclick='fisYazdir([{ad:${JSON.stringify(s.part_name)},miktar:${nv(s.quantity_kg)},birimFiyat:${nv(s.unit_price)},tutar:${nv(s.total_amount)}}],${nv(s.total_amount)},${JSON.stringify(s.buyer_name||"")},${JSON.stringify(s.payment_status||"")})' title="Fiş yazdır (yazdırma diyaloğu)">🧾</button>
        <button class="btn btn-sec btn-sm" onclick='fisRawbtYazdir([{ad:${JSON.stringify(s.part_name)},miktar:${nv(s.quantity_kg)},birimFiyat:${nv(s.unit_price)},tutar:${nv(s.total_amount)}}],${nv(s.total_amount)},${JSON.stringify(s.buyer_name||"")},${JSON.stringify(s.payment_status||"")})' title="RawBT ile hızlı fiş yazdır (Android)">🧾⚡</button>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('cutSales',${i})">🗑️</button>
      </td>
    </tr>`;
  }).join(''):empty(8);
}
function renderCustomers(){
  const customers=D.customers||[],orders=D.orders||[];
  const totalSpent=orders.filter(o=>o.status==='Teslim Edildi').reduce((s,o)=>s+nv(o.total_amount),0);
  const stEl=document.getElementById('cust-stats');
  if(stEl)stEl.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${customers.length}</div><div class="sc-lbl">Toplam Müşteri</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${orders.length}</div><div class="sc-lbl">Toplam Sipariş</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(totalSpent)}</div><div class="sc-lbl">Teslim Edilen Sipariş Geliri</div></div>`;
  const tbEl=document.getElementById('tbl-customers');
  if(tbEl)tbEl.innerHTML=customers.length?customers.map((c,i)=>{
    const custOrders=orders.filter(o=>o.customer_name===c.name);
    const spent=custOrders.filter(o=>o.status==='Teslim Edildi').reduce((s,o)=>s+nv(o.total_amount),0);
    return`<tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone||'-'}</td>
      <td>${c.address||'-'}</td>
      <td>${custOrders.length}</td>
      <td style="font-weight:600">₺${fmt(spent)}</td>
      <td>${waButon(c.phone,`Merhaba ${c.name}, `)} <button class="btn btn-sec btn-sm" onclick="editRecord('customer',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('customers',${i})">🗑️</button></td>
    </tr>`;
  }).join(''):empty(6);
}
function renderOrders(){
  const f=gv('ord-f-status');
  const all=D.orders||[];
  const list=all.filter(o=>!f||o.status===f);
  const bekleyen=all.filter(o=>o.status==='Bekliyor'||o.status==='Hazır').length;
  const teslim=all.filter(o=>o.status==='Teslim Edildi').length;
  const bekleyenTutar=all.filter(o=>o.status==='Bekliyor'||o.status==='Hazır').reduce((s,o)=>s+nv(o.total_amount),0);
  const stEl=document.getElementById('ord-stats');
  if(stEl)stEl.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${bekleyen}</div><div class="sc-lbl">Bekleyen Sipariş</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${teslim}</div><div class="sc-lbl">Teslim Edildi</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">₺${fmt(bekleyenTutar)}</div><div class="sc-lbl">Bekleyen Sipariş Tutarı</div></div>`;
  const tbEl=document.getElementById('tbl-orders');
  if(tbEl)tbEl.innerHTML=list.length?[...list].reverse().map(o=>{
    const i=all.indexOf(o);
    const canDeliver=o.status==='Bekliyor'||o.status==='Hazır';
    return`<tr>
      <td><strong>${o.customer_name}</strong>${o.phone?'<br><span style="font-size:10px;color:var(--sub)">'+o.phone+'</span>':''}</td>
      <td>${o.part_name}</td>
      <td>${nv(o.quantity_kg).toFixed(1)} kg</td>
      <td>${o.delivery_date||'-'}</td>
      <td style="font-weight:600">₺${fmt(o.total_amount)}</td>
      <td>${stag(o.payment_status)}</td>
      <td>${stag(o.status)}</td>
      <td>
        ${canDeliver?`<button class="btn btn-pr btn-sm" onclick="deliverOrder(${i})">Teslim Et</button>`:''}
        ${o.status==='Hazır'?waButon(o.phone,`Merhaba ${o.customer_name}, siparişiniz hazır! ${o.part_name} - ${o.quantity_kg}kg - ${fmt(o.total_amount)}₺. Dükkandan teslim alabilirsiniz.`,'Hazır Bildir'):''}
        ${o.status==='Bekliyor'?waButon(o.phone,`Merhaba ${o.customer_name}, siparişiniz alındı: ${o.part_name} ${o.quantity_kg}kg. Teslim tarihi: ${o.delivery_date||'-'}.`,'Onay Gönder'):''}
        ${o.status==='Teslim Edildi'?waButon(o.phone,`Merhaba ${o.customer_name}, bizi tercih ettiğiniz için teşekkür ederiz!`,'Teşekkür'):''}
        <button class="btn btn-sec btn-sm" onclick='etiketYazdir(${JSON.stringify(o.part_name)},${nv(o.quantity_kg)},${nv(o.unit_price)},${nv(o.total_amount)},${JSON.stringify(o.customer_name||"")})' title="Ürün etiketi yazdır (yazdırma diyaloğu)">🏷️</button>
        <button class="btn btn-sec btn-sm" onclick='etiketRawbtYazdir(${JSON.stringify(o.part_name)},${nv(o.quantity_kg)},${nv(o.unit_price)},${nv(o.total_amount)},${JSON.stringify(o.customer_name||"")})' title="RawBT ile hızlı etiket yazdır (Android)">🏷️⚡</button>
        <button class="btn btn-sec btn-sm" onclick='fisYazdir([{ad:${JSON.stringify(o.part_name)},miktar:${nv(o.quantity_kg)},birimFiyat:${nv(o.unit_price)},tutar:${nv(o.total_amount)}}],${nv(o.total_amount)},${JSON.stringify(o.customer_name||"")},${JSON.stringify(o.payment_status||"")})' title="Fiş yazdır (yazdırma diyaloğu)">🧾</button>
        <button class="btn btn-sec btn-sm" onclick='fisRawbtYazdir([{ad:${JSON.stringify(o.part_name)},miktar:${nv(o.quantity_kg)},birimFiyat:${nv(o.unit_price)},tutar:${nv(o.total_amount)}}],${nv(o.total_amount)},${JSON.stringify(o.customer_name||"")},${JSON.stringify(o.payment_status||"")})' title="RawBT ile hızlı fiş yazdır (Android)">🧾⚡</button>
        <button class="btn btn-sec btn-sm" onclick="editRecord('order',${i})">✏️</button>
        ${canDeliver?`<button class="btn btn-danger btn-sm" onclick="cancelOrder(${i})">İptal</button>`:''}
      </td>
    </tr>`;
  }).join(''):empty(8);
}
function renderSuppliers(){
  var _el_tbl_supp=document.getElementById('tbl-supp');if(_el_tbl_supp)_el_tbl_supp.innerHTML=D.suppliers.length?D.suppliers.map((s,i)=>`<tr><td><b>${s.name}</b></td><td><span class="tag t-bl">${s.category}</span></td><td>${s.contact_person||'-'}</td><td>${s.phone||'-'}</td><td style="color:#f59e0b">${'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(Math.min(5,s.rating||0))}${'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(Math.max(0,5-(s.rating||0)))}</td>
    <td>${waButon(s.phone,`Merhaba ${s.contact_person||s.name}, sizinle görüşmek istiyorum.`)} <button class="btn btn-sec btn-sm" onclick="editRecord('supplier',${i})">✏️</button> <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('suppliers',${i})">🗑️</button></td></tr>`).join(''):empty(6);
}
function renderEmployees(){
  // ── İstatistik kartları ──
  const aktif=D.employees.filter(e=>e.status==='Aktif').length;
  const izin=D.employees.filter(e=>e.status==='İzinli').length;
  const totalSalary=D.employees.filter(e=>e.status==='Aktif').reduce((s,e)=>s+(parseFloat(e.salary)||0),0);
  const roles={};D.employees.forEach(e=>{roles[e.role]=(roles[e.role]||0)+1;});

  const stEl=document.getElementById('emp-stats');
  if(stEl)stEl.innerHTML=`
    <div class="sc sc-v2 stripe-blue"><div class="sc-top"><div class="sc-ico ico-blue">👥</div><span class="badge bg-gr">${aktif} aktif</span></div><div class="sc-val">${D.employees.length}</div><div class="sc-lbl">Toplam Çalışan</div></div>
    <div class="sc sc-v2 stripe-amber"><div class="sc-top"><div class="sc-ico ico-yellow">🏖️</div></div><div class="sc-val">${izin}</div><div class="sc-lbl">İzinde</div></div>
    <div class="sc sc-v2 stripe-green"><div class="sc-top"><div class="sc-ico ico-green">💰</div></div><div class="sc-val">₺${totalSalary.toLocaleString('tr-TR')}</div><div class="sc-lbl">Aylık Maaş Toplamı</div></div>
    <div class="sc sc-v2 stripe-purple"><div class="sc-top"><div class="sc-ico ico-purple">📋</div></div><div class="sc-val">${Object.keys(roles).length}</div><div class="sc-lbl">Farklı Görev</div></div>`;

  // ── Görev dağılımı ──
  const rolesEl=document.getElementById('emp-roles');
  if(rolesEl&&Object.keys(roles).length){
    rolesEl.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${Object.entries(roles).map(([r,n])=>`
        <div style="padding:8px 14px;border-radius:20px;background:var(--bg);border:1px solid var(--brd);font-size:12px">
          <span style="font-weight:600">${r}</span> <span style="color:var(--accent);font-weight:700">${n}</span>
        </div>`).join('')}
    </div>`;
  }

  // ── Tablo ──
  const tbl=document.getElementById('tbl-emp');
  if(tbl)tbl.innerHTML=D.employees.length?D.employees.map((e,i)=>`<tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${(e.name||'?').charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:600">${e.name}</div>
          ${e.email?`<div style="font-size:10px;color:var(--sub)">${e.email}</div>`:''}
        </div>
      </div>
    </td>
    <td><span class="tag t-bl">${e.role}</span></td>
    <td>${e.phone?`<a href="tel:${e.phone}" style="color:var(--accent)">${e.phone}</a>`:'-'}</td>
    <td>${e.start_date||'-'}</td>
    <td style="font-weight:600">${e.salary?'₺'+parseFloat(e.salary).toLocaleString('tr-TR'):'-'}</td>
    <td>${stag(e.status)}</td>
    <td>
      ${waButon(e.phone,`Merhaba ${e.name}, `)}
      <button class="btn btn-sec btn-sm" onclick="editRecord('employee',${i})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="if(confirm('Çalışan silinsin?'))delR('employees',${i})">🗑</button>
    </td>
  </tr>`).join(''):empty(7,'Henüz çalışan eklenmedi','👤');
}
function renderTasks(){
  const fs=gv('task-fs'),fp=gv('task-fp');
  const list=[...D.tasks].filter(t=>(!fs||t.status===fs)&&(!fp||t.priority===fp)).sort((a,b)=>{const p={Kritik:0,Yüksek:1,Orta:2,Düşük:3};return(p[a.priority]||2)-(p[b.priority]||2);});
  var _el_tbl_tasks=document.getElementById('tbl-tasks');if(_el_tbl_tasks)_el_tbl_tasks.innerHTML=list.length?list.map(t=>{const i=D.tasks.indexOf(t);return`<tr><td><b>${t.title}</b>${t.description?`<div style="font-size:10px;color:var(--sub)">${t.description}</div>`:''}</td><td><span class="tag t-gy">${t.category||'-'}</span></td><td>${stag(t.priority)}</td><td>${t.due_date||'-'}</td><td>${t.assigned_to||'-'}</td><td>${stag(t.status)}</td>
    <td style="white-space:nowrap">${t.status!=='Tamamlandı'?`<button class="btn btn-pr btn-sm" onclick="completeTask(${i})">✅ Tamamla</button> `:''}
    ${(()=>{const emp=D.employees.find(e=>e.name===t.assigned_to);return emp&&emp.phone?waButon(emp.phone,`Merhaba ${emp.name}, "${t.title}" görevi sana atandı.${t.due_date?' Son tarih: '+t.due_date:''}${t.description?'\n\nDetay: '+t.description:''}`):'';})()}
    <button class="btn btn-sec btn-sm" onclick="editRecord('task',${i})">✏️</button>
    <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('tasks',${i})">🗑️</button></td></tr>`}).join(''):empty(7);
}
function completeTask(i){if(D.tasks[i]){D.tasks[i].status='Tamamlandı';persist();showToast('Tamamlandı ✓');renderTasks();}}
function renderAnalytics(){
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  const net=gelir-gider;
  const hasta=D.animals.filter(a=>a.status==='Hasta').length;
  const gebe=D.animals.filter(a=>a.status==='Gebe').length;
  const aktif=D.animals.filter(a=>a.status==='Aktif').length;
  // Temel istatistik kartları
  const _as=document.getElementById('animals-stats')||document.getElementById('an-stats');if(_as)_as.innerHTML=`
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-gr">${aktif} aktif</span></div><div class="sc-val">${D.animals.length}</div><div class="sc-lbl">Toplam Hayvan</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge ${net>=0?'bg-gr':'bg-rd'}">${net>=0?'Kâr':'Zarar'}</span></div><div class="sc-val" style="color:${net>=0?'#16a34a':'#dc2626'}">₺${fmt(Math.abs(net))}</div><div class="sc-lbl">Net Kâr/Zarar</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-rd">${hasta}</span></div><div class="sc-val">${hasta}</div><div class="sc-lbl">Hasta Hayvan</div></div>
    <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-yl">${D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length}</span></div><div class="sc-val">${D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length}</div><div class="sc-lbl">Kritik Stok</div></div>`;
  // KPI kartları
  const hayvanBasiMaliyet=D.animals.length?Math.round(gider/D.animals.length):0;
  const verimlilik=gelir?Math.round((net/gelir)*100):0;
  const saglikMaliyet=D.health.reduce((s,h)=>s+nv(h.cost),0);
  const toplamUretim=D.production.reduce((s,p)=>s+nv(p.quantity),0);
  const kpiEl=document.getElementById('an-kpi-cards')||document.getElementById('animals-kpi');
  if(kpiEl)kpiEl.innerHTML=`
    <div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:9px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:16px"></div><div><div style="font-size:12px;font-weight:600">Hayvan Başı Maliyet</div><div style="font-size:10px;color:var(--sub)">Toplam gider / hayvan sayısı</div></div></div><div style="font-size:22px;font-weight:700">₺${fmt(hayvanBasiMaliyet)}</div><div style="background:var(--bg);border-radius:6px;height:6px;margin-top:8px"><div style="background:${hayvanBasiMaliyet<5000?'#2d6a4f':'#ef4444'};height:6px;border-radius:6px;width:${Math.min(100,hayvanBasiMaliyet/100)}%"></div></div></div>
    <div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:9px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px"></div><div><div style="font-size:12px;font-weight:600">Kâr Marjı</div><div style="font-size:10px;color:var(--sub)">Net kâr / toplam gelir</div></div></div><div style="font-size:22px;font-weight:700;color:${verimlilik>=0?'#16a34a':'#dc2626'}">${verimlilik}%</div><div style="background:var(--bg);border-radius:6px;height:6px;margin-top:8px"><div style="background:${verimlilik>=20?'#2d6a4f':verimlilik>=0?'#f59e0b':'#ef4444'};height:6px;border-radius:6px;width:${Math.min(100,Math.max(0,verimlilik))}%"></div></div></div>`;
  // Hayvan durumu grafiği
  const ss={};D.animals.forEach(a=>{ss[a.status]=(ss[a.status]||0)+1;});const ssk=Object.keys(ss);
  mkChart('ch-an-st',{type:'doughnut',data:{labels:ssk.length?ssk:['Veri Yok'],datasets:[{data:ssk.length?ssk.map(k=>ss[k]):[1],backgroundColor:ssk.length?['#2d6a4f','#ef4444','#8b5cf6','#94a3b8','#f59e0b','#3b82f6'].slice(0,ssk.length):['#e2e8f0'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11}}}}}});
  // Gelir kaynakları
  const ic={};D.finance.filter(f=>f.type==='Gelir').forEach(f=>{ic[f.category]=(ic[f.category]||0)+nv(f.amount);});const ick=Object.keys(ic);
  mkChart('ch-an-inc',{type:'bar',data:{labels:ick.length?ick:['Veri Yok'],datasets:[{data:ick.length?ick.map(k=>ic[k]):[1],backgroundColor:'rgba(45,106,79,.75)',borderColor:'#2d6a4f',borderWidth:1,borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  // 6 Aylık net kâr trendi
  const profitLabels=[];const profitData=[];
  for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);const pf=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;profitLabels.push(d.toLocaleDateString('tr-TR',{month:'short',year:'2-digit'}));const monthGelir=D.finance.filter(f=>f.type==='Gelir'&&(f.date||'').startsWith(pf)).reduce((s,f)=>s+nv(f.amount),0);const monthGider=D.finance.filter(f=>f.type==='Gider'&&(f.date||'').startsWith(pf)).reduce((s,f)=>s+nv(f.amount),0);profitData.push(monthGelir-monthGider);}
  mkChart('ch-an-profit',{type:'line',data:{labels:profitLabels,datasets:[{label:'Net Kâr',data:profitData,borderColor:'#2d6a4f',backgroundColor:'rgba(45,106,79,.06)',tension:.4,fill:true,pointRadius:4,pointBackgroundColor:profitData.map(v=>v>=0?'#2d6a4f':'#ef4444')}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(0,0,0,.05)'}}}}});
  // Sağlık maliyet trendi
  const hLabels=[];const hData=[];
  for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);const pf=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;hLabels.push(d.toLocaleDateString('tr-TR',{month:'short'}));hData.push(D.health.filter(h=>(h.date||'').startsWith(pf)).reduce((s,h)=>s+nv(h.cost),0));}
  mkChart('ch-an-health',{type:'bar',data:{labels:hLabels,datasets:[{label:'Sağlık Maliyeti',data:hData,backgroundColor:'rgba(239,68,68,.65)',borderColor:'#ef4444',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  // Üretim türleri
  const pt={};D.production.forEach(p=>{pt[p.production_type]=(pt[p.production_type]||0)+nv(p.quantity);});const ptk=Object.keys(pt);
  mkChart('ch-an-prod',{type:'polarArea',data:{labels:ptk.length?ptk:['Veri Yok'],datasets:[{data:ptk.length?ptk.map(k=>pt[k]):[1],backgroundColor:ptk.length?['rgba(45,106,79,.7)','rgba(59,130,246,.7)','rgba(139,92,246,.7)','rgba(245,158,11,.7)']:['rgba(200,200,200,.5)']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10}}}}}});
  // Hayvan başı maliyet (top 8)
  const percap=D.animals.slice(0,8).map(a=>{const animalHealth=D.health.filter(h=>h.animal_tag===a.tag_number).reduce((s,h)=>s+nv(h.cost),0);return{lbl:a.tag_number+(a.name?` (${a.name})`:''),val:animalHealth};}).sort((a,b)=>b.val-a.val).slice(0,8);
  mkChart('ch-an-percap',{type:'horizontalBar'||'bar',data:{labels:percap.map(p=>p.lbl),datasets:[{data:percap.map(p=>p.val),backgroundColor:'rgba(139,92,246,.7)',borderColor:'#8b5cf6',borderWidth:1,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
  // Skorkartı
  const scores=[
    {lbl:'Sürü Sağlığı',val:Math.max(0,100-hasta*20),desc:`${hasta} hasta hayvan`,color:hasta===0?'#2d6a4f':hasta<=2?'#f59e0b':'#ef4444'},
    {lbl:'Finansal Durum',val:Math.max(0,Math.min(100,50+verimlilik)),desc:`%${verimlilik} kâr marjı`,color:verimlilik>=20?'#2d6a4f':verimlilik>=0?'#f59e0b':'#ef4444'},
    {lbl:'Stok Durumu',val:Math.max(0,100-D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length*25),desc:`${D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length} kritik stok`,color:D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length===0?'#2d6a4f':'#f59e0b'},
    {lbl:'Görev Tamamlama',val:D.tasks.length?Math.round(D.tasks.filter(t=>t.status==='Tamamlandı').length/D.tasks.length*100):100,desc:`${D.tasks.filter(t=>t.status==='Tamamlandı').length}/${D.tasks.length} görev`,color:'#3b82f6'},
  ];
  const scEl=document.getElementById('an-scorecard');
  if(scEl)scEl.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">${scores.map(s=>`<div style="padding:14px;border-radius:10px;border:1px solid var(--brd)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:12.5px;font-weight:600">${s.lbl}</span><span style="font-size:18px;font-weight:700;color:${s.color}">${s.val}</span></div><div style="background:var(--bg);border-radius:6px;height:8px;margin-bottom:6px"><div style="background:${s.color};height:8px;border-radius:6px;width:${s.val}%;transition:.4s"></div></div><div style="font-size:10.5px;color:var(--sub)">${s.desc}</div></div>`).join('')}</div>`;
}
function renderReports(){
  mkChart('rpt-fin',{type:'bar',data:{labels:ML(),datasets:[{label:'Gelir',data:MD(D.finance,'amount','Gelir'),backgroundColor:'rgba(45,106,79,.7)'},{label:'Gider',data:MD(D.finance,'amount','Gider'),backgroundColor:'rgba(239,68,68,.6)'}]},options:{responsive:true,maintainAspectRatio:false}});
  const sc={};D.animals.forEach(a=>{sc[a.species]=(sc[a.species]||0)+1;});const sk=Object.keys(sc);
  mkChart('rpt-sp',{type:'pie',data:{labels:sk.length?sk:['Boş'],datasets:[{data:sk.length?sk.map(k=>sc[k]):[1],backgroundColor:sk.length?['#2d6a4f','#2d6a4f','#52b788','#74c69d','#95d5b2']:['#e2e8f0']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
  const ht={};D.health.forEach(h=>{ht[h.record_type]=(ht[h.record_type]||0)+1;});const hk=Object.keys(ht);
  mkChart('rpt-hlt',{type:'bar',data:{labels:hk.length?hk:['Boş'],datasets:[{data:hk.length?hk.map(k=>ht[k]):[1],backgroundColor:'rgba(59,130,246,.7)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  mkChart('rpt-prd',{type:'line',data:{labels:ML(),datasets:[{label:'Üretim',data:Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);const pf=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return D.production.filter(p=>(p.date||'').startsWith(pf)).reduce((s,p)=>s+nv(p.quantity),0);}),borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,.07)',tension:.4,fill:true}]},options:{responsive:true,maintainAspectRatio:false}});

  // Kapsamlı rapor butonları ekle
  setTimeout(() => {
    const reportsEl = document.getElementById('pg-Reports');
    if (!reportsEl) return;
    const firstCard = reportsEl.querySelector('.ai-panel');
    if (firstCard && !firstCard.previousElementSibling?.classList?.contains('reports-quick-btns')) {
      const div = document.createElement('div');
      div.className = 'reports-quick-btns';
      div.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px';
      div.innerHTML = '<button class="btn btn-pr" onclick="generateCustomReport([])">📊 Kapsamlı PDF</button><button class="btn btn-sec" onclick="generateMonthlyPDF()">📅 Aylık</button><button class="btn btn-sec" onclick="generateHealthPDF()">🏥 Sağlık</button><button class="btn btn-sec" onclick="generateAnimalListPDF()">🐄 Sürü</button>';
      firstCard.parentNode.insertBefore(div, firstCard);
    }
  }, 100);
}
// ===================== TAKVİM (GELİŞMİŞ) =====================
let calViewYear=new Date().getFullYear(),calViewMonth=new Date().getMonth();
const CAL_MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function calPrev(){calViewMonth--;if(calViewMonth<0){calViewMonth=11;calViewYear--;}renderCalendar();}
function calNext(){calViewMonth++;if(calViewMonth>11){calViewMonth=0;calViewYear++;}renderCalendar();}
function calToday(){calViewYear=new Date().getFullYear();calViewMonth=new Date().getMonth();renderCalendar();}
function renderCalendar(){
  const year=calViewYear,month=calViewMonth;
  const titleEl=document.getElementById('cal-title');
  if(titleEl)titleEl.textContent=`${CAL_MONTHS[month]} ${year}`;
  const evts={};
  D.tasks.forEach(t=>{if(t.due_date&&t.status!=='Tamamlandı')(evts[t.due_date]=evts[t.due_date]||[]).push({l:t.title,c:'#f59e0b',cat:'Görev',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span>'});});
  D.health.forEach(h=>{if(h.next_date)(evts[h.next_date]=evts[h.next_date]||[]).push({l:(h.animal_tag||'')+': '+(h.record_type||''),c:'#ef4444',cat:'Sağlık',ico:''});});
  D.repro.forEach(r=>{if(r.expected_birth_date)(evts[r.expected_birth_date]=evts[r.expected_birth_date]||[]).push({l:(r.animal_tag||'')+' doğum bekleniyor',c:'#8b5cf6',cat:'Üreme',ico:''});});
  D.finance.forEach(f=>{if(f.date&&f.type==='Gider'&&nv(f.amount)>5000)(evts[f.date]=evts[f.date]||[]).push({l:'₺'+fmt(nv(f.amount))+' '+f.category,c:'#3b82f6',cat:'Finans',ico:''});});
  const fd=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate();
  const todayStr=today();
  let html=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:6px">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--sub);padding:6px 0;border-bottom:2px solid var(--brd)">${d}</div>`).join('')}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
  const startOffset=fd===0?6:fd-1;
  // Önceki ayın son günleri (grileşmiş)
  const prevDim=new Date(year,month,0).getDate();
  for(let i=startOffset-1;i>=0;i--){html+=`<div style="min-height:70px;border:1px solid var(--brd);border-radius:8px;padding:5px;opacity:.3;background:var(--bg)"><div style="font-size:11px;color:var(--sub)">${prevDim-i}</div></div>`;}
  for(let d=1;d<=dim;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ev=evts[ds]||[],isT=ds===todayStr;
    const isWknd=([...Array(startOffset)].length+d-1)%7>=5;
    html+=`<div onclick="openDayModal('${ds}')" style="min-height:70px;border:${isT?'2px solid #40916c':'1px solid var(--brd)'};border-radius:8px;padding:5px;background:${isT?'rgba(45,106,79,.07)':isWknd?'var(--bg)':'var(--card)'};cursor:pointer;transition:.12s" onmouseover="this.style.boxShadow='0 3px 12px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='none'">
      <div style="font-size:11px;font-weight:${isT?700:400};color:${isT?'#16a34a':isWknd?'#94a3b8':'var(--txt)'}; margin-bottom:3px;display:flex;align-items:center;gap:3px">${isT?`<span style="background:#2d6a4f;color:#fff;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px">${d}</span>`:d}${ev.length>2?`<span style="font-size:9px;background:var(--g2);color:#fff;border-radius:10px;padding:0 4px;margin-left:auto">+${ev.length-1}</span>`:''}
      </div>
      ${ev.slice(0,2).map(e=>`<div style="font-size:9px;background:${e.c}18;color:${e.c};padding:2px 5px;border-radius:4px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border-left:2px solid ${e.c}">${e.ico} ${e.l}</div>`).join('')}
    </div>`;
  }
  // Sonraki ayın ilk günleri
  const totalCells=startOffset+dim;const remaining=(7-totalCells%7)%7;
  for(let i=1;i<=remaining;i++){html+=`<div style="min-height:70px;border:1px solid var(--brd);border-radius:8px;padding:5px;opacity:.3;background:var(--bg)"><div style="font-size:11px;color:var(--sub)">${i}</div></div>`;}
  var _el_cal_wrap=document.getElementById('cal-wrap');if(_el_cal_wrap)_el_cal_wrap.innerHTML=html+'</div>';
}
function openDayModal(ds){
  const evts=[];
  D.tasks.forEach(t=>{if(t.due_date===ds)evts.push({ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span>',cat:'Görev',l:t.title,sub:`Öncelik: ${t.priority||'-'} | Atanan: ${t.assigned_to||'-'}`,c:'#f59e0b',status:t.status});});
  D.health.forEach(h=>{if(h.next_date===ds)evts.push({ico:'',cat:'Sağlık',l:`${h.animal_tag}: ${h.record_type}`,sub:`Teşhis: ${h.diagnosis||'-'} | Vet: ${h.vet_name||'-'}`,c:'#ef4444'});});
  D.repro.forEach(r=>{if(r.expected_birth_date===ds)evts.push({ico:'',cat:'Üreme',l:`${r.animal_tag} doğum bekleniyor`,sub:`Erkek: ${r.male_tag||'-'}`,c:'#8b5cf6'});});
  D.finance.forEach(f=>{if(f.date===ds&&nv(f.amount)>5000)evts.push({ico:'',cat:'Finans',l:`${f.type}: ${f.category}`,sub:`₺${fmt(nv(f.amount))} — ${f.description||''}`,c:'#3b82f6'});});
  const [y,m,d]=ds.split('-');
  var _cmd=document.getElementById('cal-modal-date');if(_cmd)_cmd.textContent=`${d} ${CAL_MONTHS[parseInt(m)-1]} ${y}`;
  document.getElementById('cal-modal-events').innerHTML=evts.length
    ?evts.map(e=>`<div style="padding:10px;border-radius:8px;border-left:3px solid ${e.c};background:${e.c}10;margin-bottom:8px"><div style="font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">${e.ico} ${e.l}${e.status?`<span class="tag t-gy" style="margin-left:auto">${e.status}</span>`:''}</div><div style="font-size:11px;color:var(--sub);margin-top:3px">${e.sub}</div></div>`).join('')
    :`<div style="text-align:center;padding:20px;color:var(--sub);font-size:13px">Bu gün için etkinlik yok</div>`;
  var _cdm=document.getElementById('cal-day-modal');if(_cdm)_cdm.style.display='block';
}
function closeDayModal(){document.getElementById('cal-day-modal').style.display='none';}

// ===================== HAVA DURUMU (GERÇEK API) =====================
let _weatherCache=null,_weatherCacheTime=0;

async function getAutoLocation(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve(null);return;}
    navigator.geolocation.getCurrentPosition(
      pos=>resolve({lat:pos.coords.latitude,lon:pos.coords.longitude,auto:true}),
      ()=>resolve(null),
      {timeout:5000,maximumAge:300000}
    );
  });
}

async function fetchWeather(){
  if(_weatherCache&&Date.now()-_weatherCacheTime<600000)return _weatherCache;
  // GPS konum al, yoksa settings'e bak, yoksa varsayılan
  let lat=D.settings.lat||null, lon=D.settings.lon||null;
  try{
    const geo=await getAutoLocation();
    if(geo){
      lat=geo.lat; lon=geo.lon;
      // Koordinatları settings'e kaydet (kalıcı konum)
      D.settings.lat=lat; D.settings.lon=lon;
      // Reverse geocode ile şehir adı al
      try{
        const rg=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`);
        const rd=await rg.json();
        const city=rd.address?.city||rd.address?.town||rd.address?.county||rd.address?.state||'';
        if(city&&!D.settings.location_auto_locked){
          D.settings.location=city;
          const locEl=document.getElementById('w-location');
          if(locEl)locEl.textContent='📍 '+city;
        }
      }catch(e){}
      persist();
    }
  }catch(e){}
  if(!lat||!lon){lat=D.settings.lat||38.42;lon=D.settings.lon||27.14;}
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
    const r=await fetch(url);if(!r.ok)throw new Error('API hatası');
    const d=await r.json();
    _weatherCache=d;_weatherCacheTime=Date.now();
    return d;
  }catch(e){return null;}
}
function wmoIcon(size,color){
  const s=size||48,c=color||'currentColor';
  return {
    sun:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><circle cx="24" cy="24" r="10" fill="#FBBF24" stroke="#F59E0B" stroke-width="1.5"/><g stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><line x1="24" y1="4" x2="24" y2="10"/><line x1="24" y1="38" x2="24" y2="44"/><line x1="4" y1="24" x2="10" y2="24"/><line x1="38" y1="24" x2="44" y2="24"/><line x1="9.37" y1="9.37" x2="13.54" y2="13.54"/><line x1="34.46" y1="34.46" x2="38.63" y2="38.63"/><line x1="38.63" y1="9.37" x2="34.46" y2="13.54"/><line x1="13.54" y1="34.46" x2="9.37" y2="38.63"/></g></svg>`,
    cloud:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><circle cx="14" cy="24" r="9" fill="#FBBF24" stroke="#F59E0B" stroke-width="1"/><path d="M32 36H14a11 11 0 1 1 3.5-21.4A9 9 0 1 1 32 36z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/></svg>`,
    overcast:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M34 38H12a10 10 0 1 1 3-19.6A8 8 0 1 1 34 38z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1.5"/></svg>`,
    fog:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M30 20H14a8 8 0 1 1 2.4-15.7A6.5 6.5 0 1 1 30 20z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/><g stroke="#94A3B8" stroke-width="2" stroke-linecap="round"><line x1="8" y1="26" x2="38" y2="26"/><line x1="12" y1="31" x2="36" y2="31"/><line x1="16" y1="36" x2="34" y2="36"/></g></svg>`,
    drizzle:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M32 28H14a10 10 0 1 1 3-19.6A8 8 0 1 1 32 28z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1.5"/><g stroke="#60A5FA" stroke-width="2" stroke-linecap="round"><line x1="16" y1="34" x2="14" y2="40"/><line x1="24" y1="34" x2="22" y2="40"/><line x1="32" y1="34" x2="30" y2="40"/></g></svg>`,
    rain:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M34 26H14a10 10 0 1 1 3-19.6A8 8 0 1 1 34 26z" fill="#94A3B8" stroke="#64748B" stroke-width="1.5"/><g stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"><line x1="14" y1="33" x2="12" y2="41"/><line x1="22" y1="33" x2="20" y2="41"/><line x1="30" y1="33" x2="28" y2="41"/><line x1="38" y1="33" x2="36" y2="41"/></g></svg>`,
    snow:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M34 26H14a10 10 0 1 1 3-19.6A8 8 0 1 1 34 26z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/><g stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"><line x1="16" y1="34" x2="16" y2="42"/><line x1="13" y1="37" x2="19" y2="37"/><line x1="13" y1="35" x2="19" y2="39"/><line x1="13" y1="39" x2="19" y2="35"/><line x1="28" y1="34" x2="28" y2="42"/><line x1="25" y1="37" x2="31" y2="37"/><line x1="25" y1="35" x2="31" y2="39"/><line x1="25" y1="39" x2="31" y2="35"/></g></svg>`,
    thunder:`<svg viewBox="0 0 48 48" width="${s}" height="${s}" fill="none"><path d="M36 26H14a10 10 0 1 1 3-19.6A8 8 0 1 1 36 26z" fill="#64748B" stroke="#475569" stroke-width="1.5"/><path d="M26 28l-4 8h6l-4 8" stroke="#FBBF24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
  };
}
