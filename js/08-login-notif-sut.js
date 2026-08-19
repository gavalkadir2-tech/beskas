function doLogout() {
  localStorage.removeItem('_cf_session');
  localStorage.removeItem('_cf_token');
  currentSession = null;
  closeModal();
  document.getElementById('topbar-user')?.remove();
  showLoginModal();
}

// ─────────────────────────────────────────────────────────────
//  2. GELİŞMİŞ BİLDİRİM SİSTEMİ
// ─────────────────────────────────────────────────────────────
let _notifPanel = null;

async function loadServerNotifs() {
  try {
    const r = await fetch('api.php?action=notifs');
    const data = await r.json();
    if (data.ok) {
      const unread = data.data.unread;
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
      if (dot && unread > 0) dot.title = unread + ' okunmamış bildirim';
      return data.data.items;
    }
  } catch(e) {}
  return [];
}

async function showNotifPanel() {
  const items = await loadServerNotifs();
  const localAlerts = [];
  // Lokal uyarıları da ekle
  D.animals.filter(a => a.status === 'Hasta').forEach(a => localAlerts.push({ type: 'alarm', baslik: `<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> ${a.tag_number} hasta`, mesaj: 'Veteriner kontrolü gerekiyor', created_at: new Date().toISOString(), okundu: 0 }));
  D.inventory.filter(i => (i.current_stock||0) < (i.minimum_stock||0)).forEach(i => localAlerts.push({ type: 'uyari', baslik: ` ${i.name} kritik stok`, mesaj: `Mevcut: ${i.current_stock} ${i.unit}`, created_at: new Date().toISOString(), okundu: 0 }));

  const allNotifs = [...localAlerts, ...items].slice(0, 30);
  const typeColor = { alarm: '#ef4444', uyari: '#f59e0b', bilgi: '#3b82f6', hata: '#8b5cf6' };
  const typeIco   = { alarm: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#dc2626" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>', uyari: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#d97706" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>', bilgi: '', hata: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#7c3aed" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>' };

  const html = `
    <div style="max-height:70vh;overflow-y:auto">
      ${allNotifs.length ? allNotifs.map(n => `
        <div style="padding:12px 14px;border-bottom:1px solid var(--brd);display:flex;gap:10px;align-items:flex-start;opacity:${n.okundu ? '0.5' : '1'}">
          <span style="font-size:16px;flex-shrink:0">${typeIco[n.type] || ''}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600">${n.baslik}</div>
            ${n.mesaj ? `<div style="font-size:11px;color:var(--sub);margin-top:2px">${n.mesaj}</div>` : ''}
            <div style="font-size:10px;color:var(--sub);margin-top:3px">${new Date(n.created_at).toLocaleString('tr-TR')}</div>
          </div>
          ${n.id && !n.okundu ? `<button class="btn btn-sec btn-sm" onclick="markNotifRead(${n.id})">✓ Okundu</button>` : ''}
        </div>`).join('') : '<div style="text-align:center;padding:30px;color:var(--sub)">Bildirim yok</div>'}
    </div>
    <div style="padding:12px;border-top:1px solid var(--brd);display:flex;gap:8px">
      <button class="btn btn-sec btn-sm" onclick="markNotifRead(-1);closeModal()">Tümünü Okundu Say</button>
    </div>`;
  openGenericModal(' Bildirimler', html);
}

async function markNotifRead(id) {
  try {
    await fetch('api.php?action=notif_read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    loadServerNotifs();
  } catch(e) {}
}

// Bildirim butonunu güncelle
function upgradeNotifButton() {
  const btn = document.querySelector('.icon-btn[onclick*="notifications"]');
  if (btn) btn.setAttribute('onclick', 'showNotifPanel()');
}

// ─────────────────────────────────────────────────────────────
//  3. GELİŞMİŞ FİNANSAL DASHBOARD
// ─────────────────────────────────────────────────────────────
// ===================== SÜT TAKİP MODÜLü =====================
function renderMilkTracking(){
  const el=document.getElementById('milk-content');if(!el)return;
  const sütRecords=D.production.filter(p=>p.product_type==='Süt'||p.type==='Süt'||p.product==='Süt');
  const sütInekler=D.animals.filter(a=>a.species==='Sığır'&&(a.status==='Aktif'||a.status==='Gebe'));
  const now=new Date();
  const days30=Array.from({length:30},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-29+i);return d.toISOString().slice(0,10);});
  const dailyTotals=days30.map(day=>{
    const recs=sütRecords.filter(r=>(r.date||r.production_date||'').slice(0,10)===day);
    const sabah=recs.filter(r=>(r.session||'').includes('Sabah')).reduce((s,r)=>s+nv(r.amount||r.quantity),0);
    const aksam=recs.filter(r=>(r.session||'').includes('Akşam')).reduce((s,r)=>s+nv(r.amount||r.quantity),0);
    const total=recs.reduce((s,r)=>s+nv(r.amount||r.quantity),0);
    return{day,sabah,aksam,total};
  });
  const total30=dailyTotals.reduce((s,d)=>s+d.total,0);
  const avg30=total30/30;
  const cowData=sütInekler.map(cow=>{
    const recs=sütRecords.filter(r=>(r.animal_tag||r.tag_number)===cow.tag_number);
    const monthly=recs.filter(r=>(now-new Date(r.date||r.production_date||now))/86400000<=30).reduce((s,r)=>s+nv(r.amount||r.quantity),0);
    const lastBirth=D.repro.filter(r=>r.tag_number===cow.tag_number&&r.actual_birth_date).sort((a,b)=>new Date(b.actual_birth_date)-new Date(a.actual_birth_date))[0];
    const lactDays=lastBirth?Math.round((now-new Date(lastBirth.actual_birth_date))/86400000):null;
    return{...cow,monthly,daily:(monthly/30).toFixed(1),lactDays};
  }).sort((a,b)=>b.monthly-a.monthly);

  el.innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div class="sc sc-v2" style="--sc-stripe:#3b82f6"><div class="sc-val">${total30.toFixed(0)}<span style="font-size:12px;font-weight:400">L</span></div><div class="sc-lbl">Son 30 Gün</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#16a34a"><div class="sc-val">${avg30.toFixed(1)}<span style="font-size:12px;font-weight:400">L/gün</span></div><div class="sc-lbl">Günlük Ort.</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#8b5cf6"><div class="sc-val">${sütInekler.length}</div><div class="sc-lbl">Sağılan İnek</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#f59e0b"><div class="sc-val">${sütInekler.length?((avg30/Math.max(1,sütInekler.length)).toFixed(1)):'-'}<span style="font-size:12px;font-weight:400">L</span></div><div class="sc-lbl">Baş Başı/Gün</div></div>
  </div>
  <div class="g2c mb">
    <div class="card">
      <div class="card-hd"><span class="card-t">30 Günlük Süt Trendi</span><button class="btn btn-pr btn-sm" onclick="openForm('production')">+ Kayıt</button></div>
      <div style="height:200px"><canvas id="ch-milk-daily"></canvas></div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Hızlı Sağım Girişi</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px">Tarih</label><input type="date" id="milk-date" value="${now.toISOString().slice(0,10)}" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--bg);color:var(--txt)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 3v4m-4.5 2-2-2m13 2 2-2"/></svg></span> Sabah (L)</label><input type="number" id="milk-sabah" placeholder="0" step="0.1" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:13px;background:var(--bg);color:var(--txt)"></div>
          <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 17h18M17 17V7l-4-4-4 4v10M9 17v-5h6v5"/></svg></span> Akşam (L)</label><input type="number" id="milk-aksam" placeholder="0" step="0.1" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:13px;background:var(--bg);color:var(--txt)"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="m9 3 6 6-1.5 1.5L9 6"/><path d="M14.5 8.5 19 13l-1.5 1.5L13 10m-4 4-5 5m7-1-2 2m-3 0h10"/></svg></span> SCC (x1000/mL)</label><input type="number" id="milk-scc" placeholder="ör: 150" step="1" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--bg);color:var(--txt)"></div>
          <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M7 8h10l-1 11H8L7 8z"/><path d="M5 8c0-3 3-5 7-5s7 2 7 5"/><path d="M3 8h18"/></svg></span> Tank (L)</label><input type="number" id="milk-tank-cur" placeholder="Mevcut litre" step="1" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--bg);color:var(--txt)"></div>
        </div>
        <div><label style="font-size:11px;color:var(--sub);display:block;margin-bottom:3px">İnek</label><select id="milk-cow" style="width:100%;padding:6px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--bg);color:var(--txt)"><option value="">Tüm Sürü</option>${sütInekler.map(c=>`<option value="${c.tag_number}">${c.name||c.tag_number}</option>`).join('')}</select></div>
        <button class="btn btn-pr" onclick="saveMilkRecord()"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></span> Kaydet</button>
        <div id="milk-save-result"></div>
      </div>
    </div>
  </div>

  <!-- Tank & SCC satırı -->
  <div class="g2 mb">
    <div class="card">
      <div class="card-hd"><span class="card-t"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M7 8h10l-1 11H8L7 8z"/><path d="M5 8c0-3 3-5 7-5s7 2 7 5"/><path d="M3 8h18"/></svg></span> Soğutma Tankı</span>
        <button class="btn btn-sec btn-sm" onclick="renderTankGauge()">↻</button>
      </div>
      <div id="tank-gauge">
        <div style="text-align:center;padding:16px;color:var(--sub);font-size:12px">Tank miktarı girişi yapın</div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd">
        <span class="card-t"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="m9 3 6 6-1.5 1.5L9 6"/><path d="M14.5 8.5 19 13l-1.5 1.5L13 10m-4 4-5 5m7-1-2 2m-3 0h10"/></svg></span> SCC Kalite Trendi</span>
        <div style="display:flex;gap:6px">
          <span style="padding:2px 8px;background:#16a34a22;color:#16a34a;border-radius:20px;font-size:10px;font-weight:700">&lt;200k İyi</span>
          <span style="padding:2px 8px;background:#dc262622;color:#dc2626;border-radius:20px;font-size:10px;font-weight:700">&gt;400k Risk</span>
        </div>
      </div>
      <div id="scc-chart-wrap" style="height:150px">
        <div style="text-align:center;padding:40px;color:var(--sub);font-size:12px">SCC kayıtları girildiğinde görünür</div>
      </div>
    </div>
  </div>

  <div class="card mb">
    <div class="card-hd"><span class="card-t">Laktasyon Eğrisi — Wood Modeli (305 Gün)</span><button class="btn btn-sec btn-sm" onclick="aiCall('Süt üretim verimlilik analizi: günlük ort. ${avg30.toFixed(1)}L, ${sütInekler.length} inek. Laktasyon optimizasyonu için öneriler.','ai-milk')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> AI</button></div>
    <div style="height:200px"><canvas id="ch-lactation"></canvas></div>
    <div class="ai-result" id="ai-milk" style="display:none;margin-top:8px"></div>
  </div>
  <div class="card mb">
    <div class="card-hd"><span class="card-t">İnek Başı Performans</span></div>
    ${cowData.length?`<div class="tbl-wrap"><table><thead><tr><th>İnek</th><th>Küpe</th><th>Aylık (L)</th><th>Günlük</th><th>Laktasyon Günü</th><th>Durum</th></tr></thead><tbody>${cowData.map(c=>{const perf=c.daily>=25?'Yüksek':c.daily>=15?'Orta':'Düşük';const col=perf==='Yüksek'?'#16a34a':perf==='Orta'?'#d97706':'#dc2626';return`<tr><td><b>${c.name||'-'}</b></td><td style="font-size:11px;color:var(--sub)">${c.tag_number}</td><td style="font-weight:700">${c.monthly.toFixed(0)} L</td><td>${c.daily} L</td><td>${c.lactDays!==null?c.lactDays+' gün':'-'}</td><td><span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${col}22;color:${col}">${perf}</span></td></tr>`;}).join('')}</tbody></table></div>`:`<p class="empty">Üretim kayıtlarında süt verisi bulunan inek yok.</p>`}
  </div>
  <div class="card">
    <div class="card-hd"><span class="card-t">SCC Kalite Referansı</span></div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
      ${[['Mükemmel','< 200k','#16a34a'],['İyi','200–400k','#d97706'],['Orta','400–800k','#f59e0b'],['Yüksek Risk','> 800k','#dc2626']].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:7px 12px;background:${c}11;border-radius:6px;border-left:3px solid ${c}"><span>${l}</span><span style="font-weight:700;color:${c}">${v}</span></div>`).join('')}
    </div>
  </div>`;

  setTimeout(()=>{
    const ctx1=document.getElementById('ch-milk-daily');
    if(ctx1&&window.Chart){destroyChart('ch-milk-daily');mkChart('ch-milk-daily',{type:'bar',data:{labels:days30.map((_,i)=>i%5===0?days30[i].slice(5):''),datasets:[{label:'Sabah',data:dailyTotals.map(d=>d.sabah||d.total*0.55),backgroundColor:'rgba(251,191,36,.8)',borderRadius:3,stack:'s'},{label:'Akşam',data:dailyTotals.map(d=>d.aksam||d.total*0.45),backgroundColor:'rgba(59,130,246,.7)',borderRadius:3,stack:'s'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>v+'L',font:{size:10}},stacked:true},x:{ticks:{font:{size:9}},stacked:true}},plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});}
    const ctx2=document.getElementById('ch-lactation');
    if(ctx2&&window.Chart){destroyChart('ch-lactation');const woodData=Array.from({length:305},(_,i)=>{const t=i+1;return+(15*Math.pow(t,0.25)*Math.exp(-0.003*t)).toFixed(2);});mkChart('ch-lactation',{type:'line',data:{labels:Array.from({length:305},(_,i)=>i+1),datasets:[{label:'Teorik (Wood)',data:woodData,borderColor:'rgba(59,130,246,.5)',borderWidth:1.5,pointRadius:0,tension:.4,borderDash:[5,3]},{label:'Gerçek Veri',data:[...Array(275).fill(null),...dailyTotals.map(d=>d.total/Math.max(1,sütInekler.length))],borderColor:'#2d6a4f',borderWidth:2,pointRadius:2,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>v+'L',font:{size:10}}},x:{ticks:{font:{size:9},maxTicksLimit:10},title:{display:true,text:'Laktasyon Günü',font:{size:10}}}},plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});}
  },130);
  // SCC trend & tank gauge
  setTimeout(()=>{ renderSCCTrend(); renderTankGauge(); },200);
}
function saveMilkRecord(){
  const date=document.getElementById('milk-date')?.value;
  const sabah=parseFloat(document.getElementById('milk-sabah')?.value)||0;
  const aksam=parseFloat(document.getElementById('milk-aksam')?.value)||0;
  const cow=document.getElementById('milk-cow')?.value;
  const scc=parseFloat(document.getElementById('milk-scc')?.value)||null;
  const tankCur=parseFloat(document.getElementById('milk-tank-cur')?.value)||null;
  const result=document.getElementById('milk-save-result');
  if(!date||(!sabah&&!aksam)){if(result)result.innerHTML='<div style="color:#dc2626;font-size:12px">Tarih ve miktar gerekli.</div>';return;}
  const base={date,product_type:'Süt',product:'Süt',unit:'litre',quality:'İyi'};
  if(sabah)D.production.push({...base,amount:sabah,quantity:sabah,session:'Sabah',animal_tag:cow||'',scc:scc||null});
  if(aksam)D.production.push({...base,amount:aksam,quantity:aksam,session:'Akşam',animal_tag:cow||'',scc:null});
  // Tank takibi
  if(tankCur!==null){
    if(!D.milk_tank)D.milk_tank=[];
    D.milk_tank.push({date,litre:tankCur});
  }
  persist();showToast('Sağım kaydedildi ✓');
  if(result)result.innerHTML=`<div style="color:#16a34a;font-size:12px;padding:6px 10px;background:var(--accent-lt);border-radius:6px">✓ ${date}: ${(sabah+aksam).toFixed(1)}L${scc?` · SCC: ${scc}k`:''}${tankCur?` · Tank: ${tankCur}L`:''}</div>`;
  document.getElementById('milk-sabah').value='';
  document.getElementById('milk-aksam').value='';
  if(document.getElementById('milk-scc'))document.getElementById('milk-scc').value='';
  if(document.getElementById('milk-tank-cur'))document.getElementById('milk-tank-cur').value='';
  renderMilkTracking();
}

function renderSCCTrend(){
  const el=document.getElementById('scc-chart-wrap');if(!el)return;
  const records=D.production.filter(p=>(p.product_type==='Süt'||p.product==='Süt')&&p.scc);
  if(!records.length){el.innerHTML='<p class="empty">SCC kaydı yok</p>';return;}
  records.sort((a,b)=>a.date>b.date?1:-1);
  el.innerHTML='<canvas id="ch-scc" style="height:150px"></canvas>';
  setTimeout(()=>{
    mkChart('ch-scc',{type:'line',data:{
      labels:records.map(r=>r.date.slice(5)),
      datasets:[{label:'SCC (x1000)',data:records.map(r=>r.scc),borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,.08)',tension:.4,fill:true,pointRadius:4,borderWidth:2}]
    },options:{responsive:true,maintainAspectRatio:false,
      scales:{
        y:{beginAtZero:true,ticks:{callback:v=>v+'k',font:{size:10}},
          grid:{color:'rgba(0,0,0,.04)'},
          annotation:{lines:[{value:200,label:'İyi sınırı',color:'#16a34a'},{value:400,label:'Risk',color:'#dc2626'}]}
        },
        x:{ticks:{font:{size:9},maxTicksLimit:8}}
      },
      plugins:{legend:{display:false}}}});
  },80);
}

function renderTankGauge(){
  const el=document.getElementById('tank-gauge');if(!el)return;
  const tankCap=parseFloat(D.settings.tank_capacity)||2000;
  const recs=D.milk_tank||[];
  const lastRec=recs.length?recs[recs.length-1]:null;
  const cur=lastRec?lastRec.litre:0;
  const pct=Math.min(100,(cur/tankCap)*100);
  const col=pct>85?'#dc2626':pct>60?'#f59e0b':'#3b82f6';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:16px">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:4px">
          <span>Soğutma Tankı</span><span>${cur}L / ${tankCap}L</span>
        </div>
        <div style="height:16px;background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--brd)">
          <div style="height:100%;width:${pct.toFixed(1)}%;background:${col};transition:width .6s;border-radius:8px"></div>
        </div>
        <div style="font-size:10.5px;color:var(--sub);margin-top:3px">
          ${pct>85?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Kapasite dolu — sevkiyat gerekli':pct>60?'Kapasite doluyor':'Normal doluluk'}
          ${lastRec?` · Son kayıt: ${lastRec.date}`:''}
        </div>
      </div>
      <div style="text-align:center;width:64px">
        <div style="font-size:22px;font-weight:800;color:${col}">${pct.toFixed(0)}%</div>
        <div style="font-size:10px;color:var(--sub)">Doluluk</div>
      </div>
    </div>`;
}



// ===================== P&L TABLOSU =====================
function renderPLStatement(){
  const el=document.getElementById('pl-content');if(!el)return;
  const now=new Date();
  const thisYear=now.getFullYear();
  const months=Array.from({length:12},(_,i)=>{
    const d=new Date(thisYear,i,1);
    return {key:`${thisYear}-${String(i+1).padStart(2,'0')}`,lbl:['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][i]};
  });
  const gelir=D.finance.filter(f=>f.type==='Gelir');
  const gider=D.finance.filter(f=>f.type==='Gider');

  // Gelir kategorileri
  const gelirCats=[...new Set(gelir.map(f=>f.category||'Diğer'))];
  const giderCats=[...new Set(gider.map(f=>f.category||'Diğer'))];

  // Aylık toplamlar
  const mGelir=months.map(m=>gelir.filter(f=>(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));
  const mGider=months.map(m=>gider.filter(f=>(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));
  const mNet=months.map((_,i)=>mGelir[i]-mGider[i]);
  const totGelir=mGelir.reduce((s,v)=>s+v,0);
  const totGider=mGider.reduce((s,v)=>s+v,0);
  const totNet=totGelir-totGider;
  const margin=totGelir>0?((totNet/totGelir)*100).toFixed(1):0;

  // Kategori satırı oluşturucu
  function catRows(cats,records,colorClass){
    return cats.map(cat=>{
      const vals=months.map(m=>records.filter(f=>(f.date||'').startsWith(m.key)&&(f.category||'Diğer')===cat).reduce((s,f)=>s+nv(f.amount),0));
      const tot=vals.reduce((s,v)=>s+v,0);
      if(tot===0)return '';
      return`<tr>
        <td style="padding-left:20px;color:var(--sub);font-size:11.5px">${cat}</td>
        ${vals.map(v=>`<td style="text-align:right;font-size:11px;color:${colorClass}">${v?'₺'+fmtNum(v):'-'}</td>`).join('')}
        <td style="text-align:right;font-weight:700;color:${colorClass}">₺${fmtNum(tot)}</td>
      </tr>`;
    }).join('');
  }

  el.innerHTML=`
  <!-- KPI özet bar -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div class="sc sc-v2" style="--sc-stripe:#16a34a"><div class="sc-val">₺${fmtNum(totGelir)}</div><div class="sc-lbl">Toplam Gelir</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#dc2626"><div class="sc-val">₺${fmtNum(totGider)}</div><div class="sc-lbl">Toplam Gider</div></div>
    <div class="sc sc-v2" style="--sc-stripe:${totNet>=0?'#3b82f6':'#f59e0b'}"><div class="sc-val" style="color:${totNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(totNet))}</div><div class="sc-lbl">Net ${totNet>=0?'Kâr':'Zarar'}</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#8b5cf6"><div class="sc-val">${margin}%</div><div class="sc-lbl">Kâr Marjı</div></div>
  </div>

  <!-- Trend grafik -->
  <div class="card mb">
    <div class="card-hd">
      <span class="card-t">Aylık P&L Trendi — ${thisYear}</span>
      <button class="btn btn-sec btn-sm" onclick="aiCall('${thisYear} yılı gelir-gider trendimi analiz et, en iyi ve en kötü ayları değerlendir, önümüzdeki 3 ay tahmini ver.','ai-pl-trend')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> AI Yorum</button>
    </div>
    <div style="height:220px"><canvas id="ch-pl-trend"></canvas></div>
    <div class="ai-result" id="ai-pl-trend" style="display:none;margin-top:8px"></div>
  </div>

  <!-- P&L Tablosu -->
  <div class="card">
    <div class="card-hd"><span class="card-t">Kâr & Zarar Tablosu</span>
      <button class="btn btn-sec btn-sm" onclick="exportPLtoCSV()"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span> CSV İndir</button>
    </div>
    <div class="tbl-wrap">
      <table style="font-size:12px">
        <thead>
          <tr style="background:var(--bg)">
            <th style="min-width:140px;text-align:left">Kalem</th>
            ${months.map(m=>`<th style="text-align:right;min-width:60px">${m.lbl}</th>`).join('')}
            <th style="text-align:right;min-width:80px">TOPLAM</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:var(--accent-lt)">
            <td style="font-weight:700;color:var(--accent)">GELİRLER</td>
            ${mGelir.map(v=>`<td style="text-align:right;color:#15803d;font-weight:600">₺${fmtNum(v)}</td>`).join('')}
            <td style="text-align:right;font-weight:800;color:#16a34a">₺${fmtNum(totGelir)}</td>
          </tr>
          ${catRows(gelirCats,gelir,'#16a34a')}
          <tr style="background:var(--red-lt)">
            <td style="font-weight:700;color:#dc2626">GİDERLER</td>
            ${mGider.map(v=>`<td style="text-align:right;color:#dc2626;font-weight:600">₺${fmtNum(v)}</td>`).join('')}
            <td style="text-align:right;font-weight:800;color:#dc2626">₺${fmtNum(totGider)}</td>
          </tr>
          ${catRows(giderCats,gider,'#dc2626')}
          <tr style="background:var(--blue-lt);border-top:2px solid var(--brd2)">
            <td style="font-weight:800">NET KÂR / ZARAR</td>
            ${mNet.map(v=>`<td style="text-align:right;font-weight:700;color:${v>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(v))}</td>`).join('')}
            <td style="text-align:right;font-weight:800;font-size:13px;color:${totNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(totNet))}</td>
          </tr>
          <tr>
            <td style="color:var(--sub);font-size:11px">Kâr Marjı %</td>
            ${mGelir.map((g,i)=>{const m2=g>0?((mNet[i]/g)*100).toFixed(0):0;return`<td style="text-align:right;font-size:10.5px;color:${m2>=0?'#16a34a':'#dc2626'}">${m2}%</td>`}).join('')}
            <td style="text-align:right;font-size:11px;color:${margin>=0?'#16a34a':'#dc2626'}">${margin}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;

  // Chart
  setTimeout(()=>{
    const ctx=document.getElementById('ch-pl-trend');if(!ctx||!window.Chart)return;
    destroyChart('ch-pl-trend');
    mkChart('ch-pl-trend',{
      type:'bar',
      data:{
        labels:months.map(m=>m.lbl),
        datasets:[
          {label:'Gelir',data:mGelir,backgroundColor:'rgba(45,106,79,.7)',borderRadius:4},
          {label:'Gider',data:mGider,backgroundColor:'rgba(220,38,38,.6)',borderRadius:4},
          {label:'Net',data:mNet,type:'line',borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',tension:.4,fill:true,pointRadius:3}
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,
        scales:{y:{beginAtZero:true,ticks:{callback:v=>'₺'+fmtNum(v),font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},x:{ticks:{font:{size:10}}}},
        plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}
      }
    });
  },100);
}

function exportPLtoCSV(){
  const now=new Date();const y=now.getFullYear();
  const months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`);
  const lbls=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const gelir=D.finance.filter(f=>f.type==='Gelir');
  const gider=D.finance.filter(f=>f.type==='Gider');
  const rows=[['Kalem',...lbls,'Toplam']];
  rows.push(['GELİRLER',...months.map(m=>gelir.filter(f=>(f.date||'').startsWith(m)).reduce((s,f)=>s+nv(f.amount),0)),gelir.reduce((s,f)=>s+nv(f.amount),0)]);
  rows.push(['GİDERLER',...months.map(m=>gider.filter(f=>(f.date||'').startsWith(m)).reduce((s,f)=>s+nv(f.amount),0)),gider.reduce((s,f)=>s+nv(f.amount),0)]);
  const csv=rows.map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent('\uFEFF'+csv);
  a.download=`PL_${y}.csv`;a.click();
  showToast('CSV indirildi ✓');
}

// ===================== NAKİT AKIŞI PROJEKSİYONU =====================
function renderCashflowProjection(){
  const el=document.getElementById('cashflow-content');if(!el)return;
  const now=new Date();
  // Son 6 ay gerçek + sonraki 6 ay projeksiyon
  const allMonths=Array.from({length:12},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    return{
      key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      lbl:['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]+' '+String(d.getFullYear()).slice(2),
      isFuture:d>now
    };
  });

  // Gerçek veriler
  const realGelir=allMonths.map(m=>D.finance.filter(f=>f.type==='Gelir'&&(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));
  const realGider=allMonths.map(m=>D.finance.filter(f=>f.type==='Gider'&&(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));

  // Projeksiyon: son 3 ayın ortalaması + %5 büyüme tahmini
  const last3G=realGelir.filter(v=>v>0).slice(-3);
  const last3Gi=realGider.filter(v=>v>0).slice(-3);
  const avgG=last3G.length?last3G.reduce((s,v)=>s+v,0)/last3G.length:0;
  const avgGi=last3Gi.length?last3Gi.reduce((s,v)=>s+v,0)/last3Gi.length:0;

  const projGelir=allMonths.map((m,i)=>m.isFuture?Math.round(avgG*(1+0.02*(i-5))):realGelir[i]);
  const projGider=allMonths.map((m,i)=>m.isFuture?Math.round(avgGi*(1+0.01*(i-5))):realGider[i]);

  // Kümülatif nakit akışı
  let cumulative=0;
  const cumFlow=allMonths.map((_,i)=>{
    cumulative+=(projGelir[i]-projGider[i]);
    return cumulative;
  });

  // Gelecek 6 ay özet
  const futureMonths=allMonths.filter(m=>m.isFuture);
  const projTopGelir=futureMonths.reduce((s,m,i)=>s+projGelir[allMonths.indexOf(m)],0);
  const projTopGider=futureMonths.reduce((s,m,i)=>s+projGider[allMonths.indexOf(m)],0);
  const projNet=projTopGelir-projTopGider;

  el.innerHTML=`
  <!-- Projeksiyon özet -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
    <div class="card" style="padding:14px;border-left:3px solid #16a34a">
      <div style="font-size:10.5px;color:var(--sub);margin-bottom:4px;text-transform:uppercase">Tahmini Gelir (6 ay)</div>
      <div style="font-size:20px;font-weight:800;color:#16a34a">₺${fmtNum(projTopGelir)}</div>
    </div>
    <div class="card" style="padding:14px;border-left:3px solid #dc2626">
      <div style="font-size:10.5px;color:var(--sub);margin-bottom:4px;text-transform:uppercase">Tahmini Gider (6 ay)</div>
      <div style="font-size:20px;font-weight:800;color:#dc2626">₺${fmtNum(projTopGider)}</div>
    </div>
    <div class="card" style="padding:14px;border-left:3px solid ${projNet>=0?'#3b82f6':'#f59e0b'}">
      <div style="font-size:10.5px;color:var(--sub);margin-bottom:4px;text-transform:uppercase">Tahmini Net</div>
      <div style="font-size:20px;font-weight:800;color:${projNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(projNet))}</div>
    </div>
  </div>

  <!-- Nakit akışı grafik -->
  <div class="card mb">
    <div class="card-hd">
      <span class="card-t">Nakit Akışı (Gerçek + Projeksiyon)</span>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--sub)"><span style="width:20px;height:2px;background:#2d6a4f;display:inline-block"></span>Gerçek</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--sub)"><span style="width:20px;height:2px;background:#2d6a4f;display:inline-block;opacity:.4;border-top:2px dashed #16a34a"></span>Projeksiyon</span>
        <button class="btn btn-sec btn-sm" onclick="aiCall('Nakit akışı projeksiyonuma göre finansal risklerimi ve fırsatlarımı değerlendir.','ai-cashflow')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> Analiz</button>
      </div>
    </div>
    <div style="height:240px"><canvas id="ch-cashflow"></canvas></div>
    <div class="ai-result" id="ai-cashflow" style="display:none;margin-top:8px"></div>
  </div>

  <!-- Kümülatif nakit -->
  <div class="card mb">
    <div class="card-hd"><span class="card-t">Kümülatif Net Nakit Pozisyonu</span></div>
    <div style="height:160px"><canvas id="ch-cumulative"></canvas></div>
  </div>

  <!-- Aylık detay tablo -->
  <div class="card">
    <div class="card-hd"><span class="card-t">Aylık Nakit Akışı Detayı</span></div>
    <div class="tbl-wrap">
      <table style="font-size:12px">
        <thead><tr>
          <th>Ay</th><th style="text-align:right">Gelir</th><th style="text-align:right">Gider</th>
          <th style="text-align:right">Net</th><th style="text-align:right">Kümülatif</th><th style="text-align:center">Durum</th>
        </tr></thead>
        <tbody>
          ${allMonths.map((m,i)=>{
            const net=projGelir[i]-projGider[i];
            const isFut=m.isFuture;
            return`<tr style="${isFut?'opacity:.7;background:var(--bg)':''}">
              <td>${m.lbl}${isFut?' <span style="font-size:9px;color:var(--sub)">(proj.)</span>':''}</td>
              <td style="text-align:right;color:#16a34a">₺${fmtNum(projGelir[i])}</td>
              <td style="text-align:right;color:#dc2626">₺${fmtNum(projGider[i])}</td>
              <td style="text-align:right;font-weight:700;color:${net>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(net))}</td>
              <td style="text-align:right;font-weight:600;color:${cumFlow[i]>=0?'#3b82f6':'#f59e0b'}">₺${fmtNum(cumFlow[i])}</td>
              <td style="text-align:center">${net>=0?'<span class="tag t-gr">Pozitif</span>':'<span class="tag t-rd">Negatif</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;

  setTimeout(()=>{
    // Nakit akış grafiği
    const borderDash=allMonths.map(m=>m.isFuture?[6,3]:undefined);
    const ctx1=document.getElementById('ch-cashflow');if(ctx1&&window.Chart){
      destroyChart('ch-cashflow');
      mkChart('ch-cashflow',{type:'bar',data:{
        labels:allMonths.map(m=>m.lbl),
        datasets:[
          {label:'Gelir',data:projGelir,backgroundColor:allMonths.map(m=>m.isFuture?'rgba(45,106,79,.35)':'rgba(45,106,79,.7)'),borderRadius:3},
          {label:'Gider',data:projGider,backgroundColor:allMonths.map(m=>m.isFuture?'rgba(220,38,38,.25)':'rgba(220,38,38,.6)'),borderRadius:3}
        ]
      },options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>'₺'+fmtNum(v),font:{size:10}},grid:{color:'rgba(0,0,0,.04)'}},x:{ticks:{font:{size:10}}}},plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});
    }
    // Kümülatif
    const ctx2=document.getElementById('ch-cumulative');if(ctx2&&window.Chart){
      destroyChart('ch-cumulative');
      mkChart('ch-cumulative',{type:'line',data:{
        labels:allMonths.map(m=>m.lbl),
        datasets:[{label:'Kümülatif Net',data:cumFlow,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.1)',tension:.4,fill:true,pointRadius:3,
          segment:{borderDash:ctx=>{const m=allMonths[ctx.p1DataIndex];return m?.isFuture?[6,3]:undefined;}}}]
      },options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>'₺'+fmtNum(v),font:{size:10}}},x:{ticks:{font:{size:10}}}},plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});
    }
  },120);
}

// ===================== BAŞABAŞ ANALİZİ =====================
function renderBreakevenAnalysis(){
  const el=document.getElementById('breakeven-content');if(!el)return;

  // Sabit / Değişken gider tahmini
  const SABIT_CATS=['Kira','Sigorta','Ekipman','İşçilik'];
  const giderAll=D.finance.filter(f=>f.type==='Gider');
  const totalGelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const sabitGider=giderAll.filter(f=>SABIT_CATS.includes(f.category)).reduce((s,f)=>s+nv(f.amount),0);
  const degiskenGider=giderAll.filter(f=>!SABIT_CATS.includes(f.category)).reduce((s,f)=>s+nv(f.amount),0);
  const toplamGider=sabitGider+degiskenGider;
  const netKar=totalGelir-toplamGider;

  // Başabaş noktası: Sabit Gider / (1 - Değişken Gider Oranı)
  const degOran=totalGelir>0?degiskenGider/totalGelir:0.6;
  const kilavuzOran=1-degOran;
  const breakevenGelir=kilavuzOran>0?sabitGider/kilavuzOran:0;
  const breakevenPct=totalGelir>0?Math.min(200,(breakevenGelir/totalGelir)*100).toFixed(0):0;
  const guvenlikMarji=totalGelir-breakevenGelir;

  // Senaryo analizi
  const scenarios=[
    {lbl:'%20 Gelir Düşüşü', gelir:totalGelir*0.8, label:'Kötümser'},
    {lbl:'Mevcut Durum',      gelir:totalGelir,     label:'Gerçek'},
    {lbl:'%20 Gelir Artışı',  gelir:totalGelir*1.2, label:'İyimser'},
  ];

  el.innerHTML=`
  <!-- Başabaş özet -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div class="card" style="padding:14px;border-left:3px solid #8b5cf6">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;margin-bottom:4px">Sabit Gider</div>
      <div style="font-size:18px;font-weight:800">₺${fmtNum(sabitGider)}</div>
      <div style="font-size:10.5px;color:var(--sub)">Kira, sigorta, işçilik...</div>
    </div>
    <div class="card" style="padding:14px;border-left:3px solid #f59e0b">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;margin-bottom:4px">Değişken Gider</div>
      <div style="font-size:18px;font-weight:800">₺${fmtNum(degiskenGider)}</div>
      <div style="font-size:10.5px;color:var(--sub)">${(degOran*100).toFixed(0)}% gelir oranı</div>
    </div>
    <div class="card" style="padding:14px;border-left:3px solid #3b82f6">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;margin-bottom:4px">Başabaş Noktası</div>
      <div style="font-size:18px;font-weight:800;color:${totalGelir>=breakevenGelir?'#16a34a':'#dc2626'}">₺${fmtNum(breakevenGelir)}</div>
      <div style="font-size:10.5px;color:var(--sub)">Minimum gelir hedefi</div>
    </div>
    <div class="card" style="padding:14px;border-left:3px solid ${guvenlikMarji>=0?'#16a34a':'#dc2626'}">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;margin-bottom:4px">Güvenlik Marjı</div>
      <div style="font-size:18px;font-weight:800;color:${guvenlikMarji>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(guvenlikMarji))}</div>
      <div style="font-size:10.5px;color:var(--sub)">${guvenlikMarji>=0?'Başabaşın üzerinde':'Başabaş altında'}</div>
    </div>
  </div>

  <!-- Başabaş görsel -->
  <div class="card mb">
    <div class="card-hd">
      <span class="card-t">Başabaş Analizi — Görsel</span>
      <button class="btn btn-sec btn-sm" onclick="aiCall('Başabaş analizimi yorumla: sabit gider ${fmtNum(sabitGider)}₺, değişken gider oranı %${(degOran*100).toFixed(0)}, başabaş noktası ${fmtNum(breakevenGelir)}₺. Nasıl iyileştiririm?','ai-breakeven')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> Analiz</button>
    </div>
    <!-- Başabaş progress bar -->
    <div style="margin:12px 0">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:6px">
        <span>₺0</span><span>Başabaş: ₺${fmtNum(breakevenGelir)}</span><span>Mevcut: ₺${fmtNum(totalGelir)}</span>
      </div>
      <div style="position:relative;height:28px;background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--brd)">
        <div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(100,breakevenPct)}%;background:linear-gradient(90deg,#fee2e2,#fca5a5);transition:width .8s"></div>
        <div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(100,totalGelir>0?100:0)}%;background:rgba(45,106,79,.25);transition:width .8s"></div>
        <div style="position:absolute;left:${Math.min(98,breakevenPct)}%;top:0;height:100%;width:2px;background:#dc2626"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--txt)">
          ${totalGelir>=breakevenGelir?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Başabaş noktası geçildi':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Başabaş için '+fmtNum(breakevenGelir-totalGelir)+'₺ daha gerekli'}
        </div>
      </div>
    </div>
    <div style="height:220px;margin-top:12px"><canvas id="ch-breakeven"></canvas></div>
    <div class="ai-result" id="ai-breakeven" style="display:none;margin-top:8px"></div>
  </div>

  <!-- Senaryo analizi -->
  <div class="card mb">
    <div class="card-hd"><span class="card-t">Senaryo Analizi</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${scenarios.map(s=>{
        const sNet=s.gelir-toplamGider;
        const sPct=toplamGider>0?((sNet/s.gelir)*100).toFixed(1):0;
        const isOk=s.gelir>=breakevenGelir;
        return`<div style="padding:14px;border-radius:10px;border:1px solid var(--brd);background:${isOk?'rgba(45,106,79,.04)':'rgba(220,38,38,.04)'}">
          <div style="font-size:11px;font-weight:700;color:var(--sub);margin-bottom:8px">${s.lbl}</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">Gelir: ₺${fmtNum(s.gelir)}</div>
          <div style="font-size:12px;color:#dc2626;margin-bottom:4px">Gider: ₺${fmtNum(toplamGider)}</div>
          <div style="font-size:14px;font-weight:800;color:${sNet>=0?'#16a34a':'#dc2626'}">Net: ₺${fmtNum(Math.abs(sNet))}</div>
          <div style="margin-top:8px;font-size:11px">${isOk?'<span style="color:#15803d"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Kârlı</span>':'<span style="color:#dc2626"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> Zararlı</span>'}</div>
          <div style="font-size:10.5px;color:var(--sub);margin-top:2px">Kâr marjı: ${sPct}%</div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Gider yapısı dağılımı -->
  <div class="g2">
    <div class="card">
      <div class="card-hd"><span class="card-t">Gider Yapısı</span></div>
      <div style="height:200px"><canvas id="ch-be-costs"></canvas></div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Kârlılığı Artırma Önerileri</span></div>
      <div style="font-size:12.5px;line-height:1.7">
        ${guvenlikMarji<0?`<div style="padding:8px;background:var(--red-lt);border-radius:6px;margin-bottom:10px;font-size:12px;color:#dc2626"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Başabaş noktasına ulaşmak için ₺${fmtNum(breakevenGelir-totalGelir)} ek gelir gerekiyor.</div>`:''}
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="padding:8px;background:var(--bg);border-radius:6px;border-left:3px solid #16a34a"><b>Gelir artışı:</b> Mevcut hayvanların ürün verimliliğini %10 artırmak ₺${fmtNum(totalGelir*0.1)} ek gelir sağlar.</div>
          <div style="padding:8px;background:var(--bg);border-radius:6px;border-left:3px solid #f59e0b"><b>Değişken gider:</b> Yem maliyetini %5 düşürmek ₺${fmtNum(degiskenGider*0.05)} tasarruf eder.</div>
          <div style="padding:8px;background:var(--bg);border-radius:6px;border-left:3px solid #3b82f6"><b>Başabaş güvenliği:</b> Güvenlik marjını %${totalGelir>0?((guvenlikMarji/totalGelir)*100).toFixed(0):0} düzeyinde tutun.</div>
        </div>
      </div>
    </div>
  </div>`;

  setTimeout(()=>{
    // Başabaş grafiği (gelir & toplam maliyet çizgisi)
    const ctx1=document.getElementById('ch-breakeven');
    if(ctx1&&window.Chart){
      destroyChart('ch-breakeven');
      const xVals=Array.from({length:11},(_,i)=>totalGelir*i*0.2);
      const totalCostLine=xVals.map(x=>sabitGider+degOran*x);
      mkChart('ch-breakeven',{type:'line',data:{
        labels:xVals.map(v=>'₺'+fmtNum(v)),
        datasets:[
          {label:'Gelir',data:xVals,borderColor:'#2d6a4f',tension:0,borderWidth:2,pointRadius:0},
          {label:'Toplam Maliyet',data:totalCostLine,borderColor:'#dc2626',tension:0,borderWidth:2,pointRadius:0,borderDash:[6,3]},
          {label:'Sabit Gider',data:xVals.map(()=>sabitGider),borderColor:'#f59e0b',tension:0,borderWidth:1.5,pointRadius:0,borderDash:[4,4]}
        ]
      },options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>'₺'+fmtNum(v),font:{size:10}}},x:{ticks:{font:{size:9},maxTicksLimit:6}}},plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});
    }
    // Gider yapısı
    const ctx2=document.getElementById('ch-be-costs');
    if(ctx2&&window.Chart){
      destroyChart('ch-be-costs');
      mkChart('ch-be-costs',{type:'doughnut',data:{
        labels:['Sabit Gider','Değişken Gider'],
        datasets:[{data:[sabitGider,degiskenGider],backgroundColor:['#8b5cf6','#f59e0b'],borderWidth:0,hoverOffset:6}]
      },options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:10,padding:8}}}}});
    }
  },120);
}

// ===================== KÂRLILlK MATRİSİ =====================
function renderProfitabilityMatrix(){
  const el=document.getElementById('profitability-content');if(!el)return;
  const now=new Date();
  const thisYear=now.getFullYear();
  const months=Array.from({length:12},(_,i)=>({
    key:`${thisYear}-${String(i+1).padStart(2,'0')}`,
    lbl:['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][i]
  }));

  // Toplam gelir & gider
  const totGelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const totGider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  const totNet=totGelir-totGider;
  const hayvanSay=D.animals.filter(a=>a.status==='Aktif').length||1;

  // Hayvan başı metrikler
  const hbGelir=totGelir/hayvanSay;
  const hbGider=totGider/hayvanSay;
  const hbNet=totNet/hayvanSay;

  // Tür bazlı kârlılık (satış + üretim gelirlerini türe dağıt)
  const speciesData={};
  D.animals.forEach(a=>{
    if(!a.species)return;
    if(!speciesData[a.species])speciesData[a.species]={count:0,salesRevenue:0,healthCost:0};
    speciesData[a.species].count++;
  });
  // Satış gelirlerini dağıt
  D.sales&&D.sales.forEach(s=>{
    const a=D.animals.find(x=>x.tag_number===s.tag_number||x.id===s.animal_id);
    if(a&&a.species&&speciesData[a.species])speciesData[a.species].salesRevenue+=nv(s.price||s.amount||0);
  });
  // Sağlık maliyetleri
  D.health&&D.health.forEach(h=>{
    const a=D.animals.find(x=>x.tag_number===h.tag_number||x.tag_number===h.animal_tag);
    if(a&&a.species&&speciesData[a.species])speciesData[a.species].healthCost+=nv(h.cost||0);
  });

  // Kategori bazlı gelir-gider
  const gelirCats={};const giderCats={};
  D.finance.filter(f=>f.type==='Gelir').forEach(f=>{const c=f.category||'Diğer';gelirCats[c]=(gelirCats[c]||0)+nv(f.amount);});
  D.finance.filter(f=>f.type==='Gider').forEach(f=>{const c=f.category||'Diğer';giderCats[c]=(giderCats[c]||0)+nv(f.amount);});

  // Sezonsal: aylık net
  const mGelir=months.map(m=>D.finance.filter(f=>f.type==='Gelir'&&(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));
  const mGider=months.map(m=>D.finance.filter(f=>f.type==='Gider'&&(f.date||'').startsWith(m.key)).reduce((s,f)=>s+nv(f.amount),0));
  const mNet=months.map((_,i)=>mGelir[i]-mGider[i]);
  const bestMonthIdx=mNet.indexOf(Math.max(...mNet));
  const worstMonthIdx=mNet.indexOf(Math.min(...mNet));

  // ROI
  const roi=totGider>0?((totNet/totGider)*100).toFixed(1):0;

  el.innerHTML=`
  <!-- Özet KPI -->\n
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div class="sc sc-v2" style="--sc-stripe:#16a34a">
      <div class="sc-val" style="color:${totNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(totNet))}</div>
      <div class="sc-lbl">Net ${totNet>=0?'Kâr':'Zarar'}</div>
    </div>
    <div class="sc sc-v2" style="--sc-stripe:#3b82f6">
      <div class="sc-val">${roi}%</div>
      <div class="sc-lbl">Yatırım Getirisi (ROI)</div>
    </div>
    <div class="sc sc-v2" style="--sc-stripe:#8b5cf6">
      <div class="sc-val">₺${fmtNum(Math.round(hbNet))}</div>
      <div class="sc-lbl">Hayvan Başı Net</div>
    </div>
    <div class="sc sc-v2" style="--sc-stripe:#f59e0b">
      <div class="sc-val">${months[bestMonthIdx]?.lbl||'-'}</div>
      <div class="sc-lbl">En Kârlı Ay</div>
    </div>
  </div>

  <div class="g2 mb">
    <!-- Hayvan başı maliyet tablosu -->
    <div class="card">
      <div class="card-hd">
        <span class="card-t">Hayvan Başı Analiz</span>
        <button class="btn btn-sec btn-sm" onclick="aiCall('Hayvan başı gelir ${fmtNum(Math.round(hbGelir))}₺, gider ${fmtNum(Math.round(hbGider))}₺, net ${fmtNum(Math.round(hbNet))}₺. Bu rakamları sektör ortalamasıyla kıyasla, nasıl iyileştirebilirim?','ai-profitability')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> AI</button>
      </div>
      <table style="width:100%;font-size:12.5px;border-collapse:collapse">
        <tr style="background:var(--bg)"><th style="padding:8px;text-align:left;font-size:11px;color:var(--sub)">Metrik</th><th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Hayvan Başı</th><th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Toplam</th></tr>
        <tr style="border-bottom:1px solid var(--brd)"><td style="padding:8px;color:#15803d;font-weight:600">Gelir</td><td style="padding:8px;text-align:right">₺${fmtNum(Math.round(hbGelir))}</td><td style="padding:8px;text-align:right;font-weight:700">₺${fmtNum(totGelir)}</td></tr>
        <tr style="border-bottom:1px solid var(--brd)"><td style="padding:8px;color:#dc2626;font-weight:600">Gider</td><td style="padding:8px;text-align:right">₺${fmtNum(Math.round(hbGider))}</td><td style="padding:8px;text-align:right;font-weight:700">₺${fmtNum(totGider)}</td></tr>
        <tr style="background:var(--accent-lt)"><td style="padding:8px;font-weight:800">NET</td><td style="padding:8px;text-align:right;font-weight:800;color:${hbNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.round(hbNet))}</td><td style="padding:8px;text-align:right;font-weight:800;color:${totNet>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(totNet))}</td></tr>
        <tr><td style="padding:8px;color:var(--sub);font-size:11px">ROI</td><td colspan="2" style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${roi}%</td></tr>
      </table>
      <div class="ai-result" id="ai-profitability" style="margin-top:8px;display:none"></div>
    </div>

    <!-- Tür başı kârlılık -->
    <div class="card">
      <div class="card-hd"><span class="card-t">Tür Başı Kârlılık Matrisi</span></div>
      ${Object.keys(speciesData).length?`
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr style="background:var(--bg)">
          <th style="padding:8px;text-align:left;font-size:11px;color:var(--sub)">Tür</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Baş</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Satış</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Sağlık</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:var(--sub)">Net/Baş</th>
        </tr>
        ${Object.entries(speciesData).map(([sp,d])=>{
          const netPerHead=d.count>0?(d.salesRevenue-d.healthCost)/d.count:0;
          const isPos=netPerHead>=0;
          return`<tr style="border-bottom:1px solid var(--brd)">
            <td style="padding:8px;font-weight:600">${sp}</td>
            <td style="padding:8px;text-align:right">${d.count}</td>
            <td style="padding:8px;text-align:right;color:#16a34a">₺${fmtNum(d.salesRevenue)}</td>
            <td style="padding:8px;text-align:right;color:#dc2626">₺${fmtNum(d.healthCost)}</td>
            <td style="padding:8px;text-align:right;font-weight:700;color:${isPos?'#16a34a':'#dc2626'}">₺${fmtNum(Math.round(Math.abs(netPerHead)))}</td>
          </tr>`;
        }).join('')}
      </table>`:`<div class="empty">Satış ve sağlık verisi girildiğinde tür analizi görünür</div>`}
    </div>
  </div>

  <!-- Sezonsal Analiz -->
  <div class="card mb">
    <div class="card-hd">
      <span class="card-t">Sezonsal Kâr/Zarar Analizi — ${thisYear}</span>
      <div style="display:flex;gap:8px;align-items:center;font-size:11px">
        <span style="color:#15803d;font-weight:600">En iyi: ${months[bestMonthIdx]?.lbl} (₺${fmtNum(mNet[bestMonthIdx])})</span>
        <span style="color:#dc2626;font-weight:600">En kötü: ${months[worstMonthIdx]?.lbl} (₺${fmtNum(mNet[worstMonthIdx])})</span>
      </div>
    </div>
    <div style="height:220px"><canvas id="ch-seasonal"></canvas></div>
    <!-- Ay bazlı mini tablo -->
    <div style="margin-top:12px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px">
      ${months.slice(0,6).map((m,i)=>`
        <div style="text-align:center;padding:6px;border-radius:6px;background:${mNet[i]>=0?'rgba(45,106,79,.08)':'rgba(220,38,38,.08)'}">
          <div style="font-size:9.5px;color:var(--sub)">${m.lbl}</div>
          <div style="font-size:11px;font-weight:700;color:${mNet[i]>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(mNet[i]))}</div>
        </div>`).join('')}
    </div>
    <div style="margin-top:4px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px">
      ${months.slice(6).map((m,i)=>`
        <div style="text-align:center;padding:6px;border-radius:6px;background:${mNet[i+6]>=0?'rgba(45,106,79,.08)':'rgba(220,38,38,.08)'}">
          <div style="font-size:9.5px;color:var(--sub)">${m.lbl}</div>
          <div style="font-size:11px;font-weight:700;color:${mNet[i+6]>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(mNet[i+6]))}</div>
        </div>`).join('')}
    </div>
  </div>

  <!-- Gelir & Gider Kategori Dağılımı -->
  <div class="g2 mb">
    <div class="card">
      <div class="card-hd"><span class="card-t">Gelir Dağılımı</span></div>
      <div style="height:200px"><canvas id="ch-gelir-cats"></canvas></div>
      <div style="margin-top:10px">
        ${Object.entries(gelirCats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,v])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--brd);font-size:11.5px">
            <span>${c}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:60px;height:4px;background:var(--bg);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${totGelir>0?(v/totGelir*100).toFixed(0):0}%;background:#16a34a"></div>
              </div>
              <span style="font-weight:600;color:#16a34a">₺${fmtNum(v)}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Gider Dağılımı</span></div>
      <div style="height:200px"><canvas id="ch-gider-cats"></canvas></div>
      <div style="margin-top:10px">
        ${Object.entries(giderCats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,v])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--brd);font-size:11.5px">
            <span>${c}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:60px;height:4px;background:var(--bg);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${totGider>0?(v/totGider*100).toFixed(0):0}%;background:#dc2626"></div>
              </div>
              <span style="font-weight:600;color:#dc2626">₺${fmtNum(v)}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;

  // Grafikler
  setTimeout(()=>{
    // Sezonsal bar+line
    const ctx1=document.getElementById('ch-seasonal');
    if(ctx1&&window.Chart){
      destroyChart('ch-seasonal');
      mkChart('ch-seasonal',{type:'bar',data:{
        labels:months.map(m=>m.lbl),
        datasets:[
          {label:'Gelir',data:mGelir,backgroundColor:'rgba(45,106,79,.65)',borderRadius:4,order:2},
          {label:'Gider',data:mGider,backgroundColor:'rgba(220,38,38,.55)',borderRadius:4,order:2},
          {label:'Net',data:mNet,type:'line',borderColor:'#3b82f6',backgroundColor:'transparent',tension:.4,pointRadius:4,pointBackgroundColor:'#3b82f6',order:1,borderWidth:2}
        ]
      },options:{responsive:true,maintainAspectRatio:false,
        scales:{y:{ticks:{callback:v=>'₺'+fmtNum(v),font:{size:10}},grid:{color:'rgba(0,0,0,.04)'}},x:{ticks:{font:{size:10}}}},
        plugins:{legend:{labels:{font:{size:10},boxWidth:10}}}}});
    }
    // Gelir donut
    const ctx2=document.getElementById('ch-gelir-cats');
    if(ctx2&&window.Chart){
      destroyChart('ch-gelir-cats');
      const gk=Object.keys(gelirCats),gv=Object.values(gelirCats);
      const cols=['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#dcfce7'];
      mkChart('ch-gelir-cats',{type:'doughnut',data:{labels:gk,datasets:[{data:gv,backgroundColor:cols.slice(0,gk.length),borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false}}}});
    }
    // Gider donut
    const ctx3=document.getElementById('ch-gider-cats');
    if(ctx3&&window.Chart){
      destroyChart('ch-gider-cats');
      const gk2=Object.keys(giderCats),gv2=Object.values(giderCats);
      const cols2=['#dc2626','#ef4444','#f87171','#fca5a5','#fecaca','#fee2e2'];
      mkChart('ch-gider-cats',{type:'doughnut',data:{labels:gk2,datasets:[{data:gv2,backgroundColor:cols2.slice(0,gk2.length),borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false}}}});
    }
  },150);
}



function renderAdvancedFinance(){
  const gelir = D.finance.filter(f => f.type === 'Gelir');
  const gider = D.finance.filter(f => f.type === 'Gider');
  const totalGelir = gelir.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const totalGider = gider.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const net = totalGelir - totalGider;
  const margin = totalGelir > 0 ? ((net / totalGelir) * 100).toFixed(1) : 0;

  // Aylık karşılaştırma (son 12 ay)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const monthLabels = months.map(m => { const p = m.split('-'); return p[1] + '/' + p[0].slice(2); });
  const monthGelir  = months.map(m => gelir.filter(f => (f.date||'').startsWith(m)).reduce((s,f) => s+(parseFloat(f.amount)||0), 0));
  const monthGider  = months.map(m => gider.filter(f => (f.date||'').startsWith(m)).reduce((s,f) => s+(parseFloat(f.amount)||0), 0));
  const monthNet    = months.map((_, i) => monthGelir[i] - monthGider[i]);

  // Kategori bazlı gider
  const catGider = {};
  gider.forEach(f => { catGider[f.category] = (catGider[f.category]||0) + (parseFloat(f.amount)||0); });

  // KDV/Vergi tahmini (basit)
  const kdvTahmini = totalGelir * 0.08;
  const gelirVergisi = net > 0 ? net * 0.15 : 0;

  const el = document.getElementById('adv-finance-content');
  if (!el) return;
  el.innerHTML = `
    <!-- KPI Kartları -->
    <div class="g4" style="margin-bottom:16px">
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-gr">Gelir</span></div><div class="sc-val">₺${fmtNum(totalGelir)}</div><div class="sc-lbl">Toplam Gelir</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-rd">Gider</span></div><div class="sc-val">₺${fmtNum(totalGider)}</div><div class="sc-lbl">Toplam Gider</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico" style="background:${net>=0?'#f0fdf4':'#fff0f0'}"></div><span class="badge ${net>=0?'bg-gr':'bg-rd'}">${net>=0?'Kâr':'Zarar'}</span></div><div class="sc-val" style="color:${net>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(net))}</div><div class="sc-lbl">Net ${net>=0?'Kâr':'Zarar'}</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div><span class="badge bg-bl">Marj</span></div><div class="sc-val">${margin}%</div><div class="sc-lbl">Kâr Marjı</div></div>
    </div>
    <!-- Yıllık Trend -->
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Aylık Gelir/Gider/Net Trend</span></div>
      <div style="height:200px"><canvas id="ch-adv-fin"></canvas></div>
    </div>
    <!-- Gider Analizi -->
    <div class="g2 mb">
      <div class="card">
        <div class="card-hd"><span class="card-t">Gider Kategorileri</span></div>
        <div style="height:180px"><canvas id="ch-adv-gider"></canvas></div>
      </div>
      <div class="card">
        <div class="card-hd"><span class="card-t">Vergi & Yükümlülük Tahmini</span></div>
        <div style="padding:4px">
          <div class="cost-row"><span class="cr-label">Toplam Gelir</span><span class="cr-val">₺${fmtNum(totalGelir)}</span></div>
          <div class="cost-row"><span class="cr-label">Toplam Gider</span><span class="cr-val">₺${fmtNum(totalGider)}</span></div>
          <div class="cost-row"><span class="cr-label">Net Kâr</span><span class="cr-val" style="color:${net>=0?'#16a34a':'#dc2626'}">₺${fmtNum(net)}</span></div>
          <div class="cost-row"><span class="cr-label">KDV Tahmini (%8)</span><span class="cr-val">₺${fmtNum(kdvTahmini)}</span></div>
          <div class="cost-row"><span class="cr-label">Gelir Vergisi (%15)</span><span class="cr-val">₺${fmtNum(gelirVergisi)}</span></div>
          <div class="cost-total"><span>Toplam Yük</span><span>₺${fmtNum(kdvTahmini + gelirVergisi)}</span></div>
          <div style="font-size:10px;color:var(--sub);margin-top:8px"> Tahmini değerler. Mali müşavirinize danışın.</div>
        </div>
      </div>
    </div>
    <!-- Hayvan Başı Maliyet -->
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Hayvan Bazlı Kârlılık Analizi</span></div>
      ${renderSpeciesProfitability()}
    </div>`;

  // Grafikleri çiz
  setTimeout(() => {
    const ctx1 = document.getElementById('ch-adv-fin');
    if (ctx1 && window.Chart) {
      if (ctx1._chart) ctx1._chart.destroy();
      ctx1._chart = new Chart(ctx1, { type: 'bar', data: { labels: monthLabels, datasets: [
        { label: 'Gelir', data: monthGelir, backgroundColor: 'rgba(45,106,79,.7)', borderRadius: 4 },
        { label: 'Gider', data: monthGider, backgroundColor: 'rgba(239,68,68,.6)', borderRadius: 4 },
        { label: 'Net',   data: monthNet,   type: 'line', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.08)', tension: .4, fill: true }
      ]}, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }}} });
    }
    const ctx2 = document.getElementById('ch-adv-gider');
    if (ctx2 && window.Chart) {
      if (ctx2._chart) ctx2._chart.destroy();
      const cats = Object.keys(catGider);
      ctx2._chart = new Chart(ctx2, { type: 'doughnut', data: { labels: cats, datasets: [{ data: cats.map(c => catGider[c]), backgroundColor: ['#ef4444','#f59e0b','#3b82f6','#8b5cf6','#10b981','#f97316','#14b8a6','#6366f1'] }]}, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 10 }}}}} });
    }
  }, 100);
}

