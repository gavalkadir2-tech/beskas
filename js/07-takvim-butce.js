function closeGlobalSearch() {
  const input = document.getElementById('global-search-input');
  const dropdown = document.getElementById('global-search-results');
  if (input) input.value = '';
  if (dropdown) { dropdown.innerHTML = ''; dropdown.classList.remove('open'); }
}

// Dışarı tıklayınca kapat
document.addEventListener('click', e => {
  const gs = document.getElementById('topbar-global-search');
  if (gs && !gs.contains(e.target)) closeGlobalSearch();
});

// ══════════════════════════════════════════════════════════
//  BOTTOM NAV BADGE — hasta + bekleyen görev sayısı
// ══════════════════════════════════════════════════════════
function updateBottomNavBadges() {
  const hasta = D.animals.filter(a => a.status === 'Hasta').length;
  const bekleyen = D.tasks.filter(t => t.status === 'Bekliyor' || t.status === 'Devam Ediyor').length;
  const kritikStok = D.inventory.filter(i => (i.current_stock||0) < (i.minimum_stock||0)).length;

  // Sağlık badge
  const hBtn = document.getElementById('bn-Health');
  if (hBtn) {
    let badge = hBtn.querySelector('.bn-badge');
    if (hasta > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'bn-badge'; hBtn.appendChild(badge); }
      badge.textContent = hasta;
    } else if (badge) badge.remove();
  }

  // Görevler badge
  const tBtn = document.getElementById('bn-Tasks');
  if (tBtn) {
    let badge = tBtn.querySelector('.bn-badge');
    if (bekleyen > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'bn-badge'; badge.style.background = '#f59e0b'; tBtn.appendChild(badge); }
      badge.textContent = bekleyen > 9 ? '9+' : bekleyen;
    } else if (badge) badge.remove();
  }

  // Notif dot
  const notifDot = document.getElementById('notif-dot');
  if (notifDot) notifDot.style.display = (hasta || kritikStok) ? 'block' : 'none';
}


// ══════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  // Ctrl/Cmd + K → global arama aç
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const inp = document.getElementById('global-search-input');
    if (inp) { inp.focus(); inp.select(); }
    return;
  }
  // Alt+1..9 sayfalar
  if (e.altKey && !e.ctrlKey && !e.shiftKey) {
    const map = {'1':'Dashboard','2':'Animals','h':'Health','f':'Finance','t':'Tasks','s':'Settings','w':'Weather','a':'AIChat'};
    const key = e.key.toLowerCase();
    if (map[key]) { e.preventDefault(); showPage(map[key], null); }
  }
});

// ══════════════════════════════════════════════════════════
//  TOAST GELİŞTİRME — renk tipine göre emoji prefix
// ══════════════════════════════════════════════════════════
// showToast: orijinal fonksiyon kullanılıyor

// ══════════════════════════════════════════════════════════
//  DASHBOARD: TREND HESAPLA
// ══════════════════════════════════════════════════════════






// ══════════════════════════════════════════════════════════════════════
//  GÜNLÜK PLAN AI FONKSİYONU
// ══════════════════════════════════════════════════════════════════════
async function loadTodayPlan() {
  const el = document.getElementById('today-plan');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--sub);font-size:12px">⏳ AI günlük planınız hazırlanıyor...</div>';

  const todayStr = new Date().toISOString().split('T')[0];
  const hasta = D.animals.filter(a => a.status === 'Hasta');
  const bugunGorev = D.tasks.filter(t => t.due_date === todayStr && t.status !== 'Tamamlandı');
  const kritikStok = D.inventory.filter(i => (i.current_stock||0) < (i.minimum_stock||0));
  const yaklasinAsi = D.health.filter(h => {
    if (!h.next_date) return false;
    const d = new Date(h.next_date) - new Date();
    return d >= 0 && d <= 7 * 86400000;
  });
  const soon = new Date(); soon.setDate(soon.getDate() + 3);
  const yakinDogum = D.repro.filter(r => r.expected_birth_date && new Date(r.expected_birth_date) <= soon && new Date(r.expected_birth_date) >= new Date() && r.outcome === 'Beklemede');

  const prompt = `Bugün ${todayStr} için çiftlik günlük planı hazırla. KISA ve aksiyona yönelik ol, emoji kullan.
Durum: ${hasta.length} hasta hayvan, ${bugunGorev.length} bugünkü görev, ${kritikStok.length} kritik stok, ${yaklasinAsi.length} yaklaşan aşı, ${yakinDogum.length} yakın doğum.
${hasta.length ? 'Hastalar: '+hasta.map(a=>a.tag_number).join(', ') : ''}
${bugunGorev.length ? 'Görevler: '+bugunGorev.map(t=>t.title).join(' | ') : ''}
Format: Öncelik sırasına göre 4-5 madde. Her madde 1 cümle.`;

  try {
    if (!getGroqKey()) {
      el.innerHTML = '<div style="color:var(--sub);font-size:12px">API anahtarı gerekli. <a onclick="showPage(\'Settings\',null)" style="cursor:pointer;color:var(--accent)">Ayarlar →</a></div>';
      return;
    }
    const data = await groqCall([{role:'user', content:prompt}], farmCtx(), 400);
    const text = data.content?.map(c => c.text||'').join('') || '';
    el.innerHTML = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>')
      .replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
  } catch(e) {
    el.innerHTML = '<div style="color:#dc2626;font-size:12px">Bağlantı hatası: ' + e.message + '</div>';
  }
}

// ══════════════════════════════════════════════════════════════════════
//  HAYVAN İSTATİSTİK KARTLARI DETAY
// ══════════════════════════════════════════════════════════════════════
function quickFilterAnimals(status) {
  const sel = document.getElementById('a-fst');
  if (sel) { sel.value = status; renderAnimals(); }
  showToast('Filtre: ' + (status || 'Tümü'));
}

// ══════════════════════════════════════════════════════════════════════
//  TAKVIM — Etkinlik ekleme iyileştirmesi
// ══════════════════════════════════════════════════════════════════════
function addCalendarEvent(dateStr, type) {
  const typeMap = {
    'task': () => { openForm('task'); setTimeout(() => { const dd = document.getElementById('f-dd'); if(dd) dd.value = dateStr; }, 100); },
    'health': () => { openForm('health'); setTimeout(() => { const dt = document.getElementById('f-dt'); if(dt) dt.value = dateStr; }, 100); },
    'finance': () => { openForm('finance'); setTimeout(() => { const dt = document.getElementById('f-dt'); if(dt) dt.value = dateStr; }, 100); },
  };
  if (typeMap[type]) { closeDayModal(); typeMap[type](); }
}

// ══════════════════════════════════════════════════════════════════════
//  FİNANS — Bütçe vs Gerçek widget
// ══════════════════════════════════════════════════════════════════════
function renderBudgetVsActual() {
  const el = document.getElementById('budget-vs-actual');
  if (!el) return;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const butce = D.settings.butce?.[now.getFullYear()] || {};
  const monthNum = now.getMonth() + 1;

  const cats = ['Yem','Veteriner','İşçilik','Yakıt','Ekipman','Kira','Diğer Gider'];
  const rows = cats.map(cat => {
    const target = parseFloat(butce[cat]?.[monthNum] || 0);
    const actual = D.finance.filter(f => f.type==='Gider' && f.category===cat && (f.date||'').startsWith(monthKey)).reduce((s,f)=>s+parseFloat(f.amount||0),0);
    return {cat, target, actual, over: target > 0 && actual > target};
  }).filter(r => r.target > 0 || r.actual > 0);

  if (!rows.length) {
    el.innerHTML = '<div class="empty" style="text-align:center;padding:16px">Bütçe hedefi girilmemiş. <a onclick="showPage(\'Finance\',null);switchFinanceTab(\'budget\')" style="cursor:pointer;color:var(--accent)">Bütçe Planla →</a></div>';
    return;
  }

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">` +
    rows.map(r => {
      const pct = r.target > 0 ? Math.min(150, (r.actual/r.target)*100) : 0;
      const color = r.over ? '#dc2626' : pct > 80 ? '#f59e0b' : '#16a34a';
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span style="font-weight:500">${r.cat}</span>
          <span style="color:${color}">₺${fmtNum(r.actual)} / ₺${fmtNum(r.target)}</span>
        </div>
        <div style="height:6px;background:var(--brd);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,pct)}%;background:${color};transition:width .6s;border-radius:3px"></div>
        </div>
      </div>`;
    }).join('') + '</div>';
}

// ══════════════════════════════════════════════════════════════════════
//  SÜRÜ SAĞLIK ÖZET PANELİ
// ══════════════════════════════════════════════════════════════════════
function renderHealthSummaryPanel() {
  // Son 30 günlük sağlık istatistikleri
  const now = new Date();
  const m30 = new Date(now); m30.setDate(m30.getDate()-30);
  const recent = D.health.filter(h => new Date(h.date||0) >= m30);

  // Hastalık türleri dağılımı
  const diseases = {};
  recent.forEach(h => {
    const d = h.diagnosis || 'Bilinmiyor';
    diseases[d] = (diseases[d]||0) + 1;
  });
  const top3 = Object.entries(diseases).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Veteriner maliyeti
  const vetCost = recent.reduce((s,h) => s + parseFloat(h.cost||0), 0);

  return {
    totalRecords: recent.length,
    vetCost,
    top3Diseases: top3,
    sickAnimals: D.animals.filter(a=>a.status==='Hasta').length,
    recoveryRate: D.health.length > 0 ? Math.round(D.health.filter(h=>h.outcome==='İyileşti').length / D.health.length * 100) : 0
  };
}

// ══════════════════════════════════════════════════════════════════════
//  HAYVAN SAYFASI — Tablo satırı tıklaması
// ══════════════════════════════════════════════════════════════════════
// Tablo satırına hover efekti ve tıklama ile detay açma

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD — Tüm istatistikleri yenile
// ══════════════════════════════════════════════════════════════════════
function refreshDashboard() {
  renderDashboard();
  showToast('🔄 Dashboard yenilendi');
}

// ══════════════════════════════════════════════════════════════════════
//  HAVA DURUMU — Tarımsal tavsiye entegrasyonu
// ══════════════════════════════════════════════════════════════════════
async function getWeatherBasedAdvice() {
  const el = document.getElementById('weather-advice');
  if (!el) return;

  // Mevcut hava verisini kullan
  const cache = window._weatherCache;
  if (!cache?.current) {
    el.textContent = 'Hava verisi yükleniyor...';
    return;
  }

  const c = cache.current;
  const temp = c.temperature_2m;
  const wind = c.wind_speed_10m;
  const hum = c.relative_humidity_2m;
  const code = c.weather_code;

  const conditions = [];
  if (temp > 35) conditions.push('çok sıcak (' + temp + '°C)');
  if (temp < 5) conditions.push('soğuk (' + temp + '°C)');
  if (wind > 50) conditions.push('fırtınalı (' + wind + ' km/h)');
  if (hum > 80) conditions.push('yüksek nemli (%' + hum + ')');
  if (code >= 61 && code <= 67) conditions.push('yağmurlu');
  if (code >= 71 && code <= 77) conditions.push('karlı');

  if (!conditions.length) {
    el.textContent = '✅ Hava koşulları çiftlik çalışmaları için uygun.';
    return;
  }

  await aiCall(
    'Bu anda hava: ' + conditions.join(', ') + '. Sürü bakımı için 3 somut tavsiye ver. Emoji ile kısa maddeler.',
    'weather-advice',
    300
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ENVANTER — Stok uyarı animasyonu
// ══════════════════════════════════════════════════════════════════════
function blinkCriticalStock() {
  const criticalRows = document.querySelectorAll('#tbl-inv .t-rd');
  criticalRows.forEach(el => {
    el.closest('tr')?.style && (el.closest('tr').style.animation = 'pulse 2s infinite');
  });
}

// ══════════════════════════════════════════════════════════════════════
//  GELİŞMİŞ EXPORT — Excel'e tüm veri
// ══════════════════════════════════════════════════════════════════════
function exportAllToExcelAdvanced() {
  if (!window.XLSX) { showToast('Excel kütüphanesi yükleniyor...', 'yl'); return; }
  const wb = XLSX.utils.book_new();

  const sheets = [
    { name: 'Hayvanlar', data: D.animals },
    { name: 'Sağlık', data: D.health },
    { name: 'Finans', data: D.finance },
    { name: 'Envanter', data: D.inventory },
    { name: 'Satışlar', data: D.sales },
    { name: 'Üretim', data: D.production },
    { name: 'Görevler', data: D.tasks },
    { name: 'Çalışanlar', data: D.employees },
    { name: 'Tedarikçiler', data: D.suppliers },
    { name: 'Arazi', data: D.lands },
    { name: 'Ekipman', data: D.equipment || [] },
    { name: 'Bakım', data: D.maintenance || [] },
    { name: 'Tartım', data: D.weights || [] },
  ];

  sheets.forEach(sheet => {
    if (sheet.data && sheet.data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0,31));
    }
  });

  // Özet sayfası
  const summary = [
    { Kategori: 'Toplam Hayvan', Değer: D.animals.length },
    { Kategori: 'Aktif Hayvan', Değer: D.animals.filter(a=>a.status==='Aktif').length },
    { Kategori: 'Hasta Hayvan', Değer: D.animals.filter(a=>a.status==='Hasta').length },
    { Kategori: 'Toplam Gelir (₺)', Değer: D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+parseFloat(f.amount||0),0).toFixed(2) },
    { Kategori: 'Toplam Gider (₺)', Değer: D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+parseFloat(f.amount||0),0).toFixed(2) },
    { Kategori: 'Sağlık Kaydı', Değer: D.health.length },
    { Kategori: 'Bekleyen Görev', Değer: D.tasks.filter(t=>t.status==='Bekliyor').length },
    { Kategori: 'Kritik Stok', Değer: D.inventory.filter(i=>(i.current_stock||0)<(i.minimum_stock||0)).length },
    { Kategori: 'Rapor Tarihi', Değer: new Date().toLocaleString('tr-TR') },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Özet');

  XLSX.writeFile(wb, `BizimCiftlik-TamVeri-${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('📊 Tüm veriler Excel\'e aktarıldı ✓');
}

// ══════════════════════════════════════════════════════════════════════
//  TOPLU AŞILAMA — Progress tracker
// ══════════════════════════════════════════════════════════════════════
let _bulkVaccineProgress = { total: 0, done: 0, running: false };

async function startBulkVaccination(vaccine, animalTags) {
  if (!animalTags.length) { showToast('Hayvan seçilmedi!', 'yl'); return; }

  _bulkVaccineProgress = { total: animalTags.length, done: 0, running: true };
  const progressEl = document.getElementById('bulk-vaccine-progress');

  for (const tag of animalTags) {
    if (!_bulkVaccineProgress.running) break;

    D.health.push({
      animal_tag: tag,
      record_type: 'Aşılama',
      date: new Date().toISOString().split('T')[0],
      diagnosis: vaccine,
      medication: vaccine,
    });

    _bulkVaccineProgress.done++;

    if (progressEl) {
      const pct = Math.round(_bulkVaccineProgress.done / _bulkVaccineProgress.total * 100);
      progressEl.innerHTML = `
        <div style="margin-bottom:6px;font-size:12.5px">
          ${_bulkVaccineProgress.done}/${_bulkVaccineProgress.total} tamamlandı (${pct}%)
        </div>
        <div style="height:8px;background:var(--brd);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#16a34a;transition:width .3s;border-radius:4px"></div>
        </div>`;
    }
    await new Promise(r => setTimeout(r, 50)); // UI güncelleme için
  }

  persist();
  _bulkVaccineProgress.running = false;
  showToast(`✅ ${_bulkVaccineProgress.done} hayvana ${vaccine} aşısı kaydedildi`);
}

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD — renderDashboard'a bugün planı yükle
// ══════════════════════════════════════════════════════════════════════
// renderDashboard çağrıldığında today-plan div'inde placeholder göster




// ══════════════════════════════════════════════════════════════════════
//  EKİPMAN & BAKIM MODÜLÜ
// ══════════════════════════════════════════════════════════════════════

// Veri yapısı init
if (!D.equipment)   D.equipment   = [];
if (!D.maintenance) D.maintenance = [];

// Ekipman form aç
function openEquipmentForm(idx) {
  const eq = idx !== undefined ? D.equipment[idx] : null;
  const html = `
    <div class="fr">
      <div class="fg"><label>Ekipman Adı *</label><input id="eq-nm" placeholder="John Deere 5075E" value="${eq?eq.name:''}"/></div>
      <div class="fg"><label>Tür</label>
        <select id="eq-type">
          ${['Traktör','Biçer-dövme','Sulama Pompası','Jeneratör','Pulluk','Römork','Elektrik Motoru','İlaçlama Makinesi','Diğer'].map(t=>`<option ${eq&&eq.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>Marka / Model</label><input id="eq-brand" placeholder="John Deere 5075E" value="${eq?eq.brand:''}"/></div>
      <div class="fg"><label>Yıl</label><input id="eq-year" type="number" min="1950" max="2030" value="${eq?eq.year:''}"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Plaka / Seri No</label><input id="eq-plate" value="${eq?eq.plate:''}"/></div>
      <div class="fg"><label>Alım Fiyatı (₺)</label><input id="eq-price" type="number" value="${eq?eq.purchase_price:''}"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Sonraki Bakım Tarihi</label><input id="eq-next-maint" type="date" value="${eq?eq.next_maintenance:''}"/></div>
      <div class="fg"><label>Saymetre (saat/km)</label><input id="eq-hours" type="number" value="${eq?eq.hours:''}"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Durum</label>
        <select id="eq-status">
          ${['Aktif','Bakımda','Arızalı','Pasif'].map(s=>`<option ${eq&&eq.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>Sigorta Bitiş</label><input id="eq-insurance" type="date" value="${eq?eq.insurance_end:''}"/></div>
    </div>
    <div class="fg"><label>Notlar</label><textarea id="eq-notes">${eq?eq.notes:''}</textarea></div>
    <div class="modal-act">
      <button class="btn btn-sec" onclick="closeModal()">İptal</button>
      <button class="btn btn-pr" onclick="saveEquipment(${idx!==undefined?idx:-1})">Kaydet</button>
    </div>`;
  document.getElementById('md-title').textContent = idx !== undefined ? 'Ekipmanı Düzenle' : 'Yeni Ekipman';
  document.getElementById('md-body').innerHTML = html;
  document.getElementById('ov').style.display = 'block';
  document.getElementById('md').style.display = 'block';
}

function saveEquipment(idx) {
  const rec = {
    name: document.getElementById('eq-nm')?.value || '',
    type: document.getElementById('eq-type')?.value || 'Diğer',
    brand: document.getElementById('eq-brand')?.value || '',
    year: parseInt(document.getElementById('eq-year')?.value) || null,
    plate: document.getElementById('eq-plate')?.value || '',
    purchase_price: parseFloat(document.getElementById('eq-price')?.value) || null,
    next_maintenance: document.getElementById('eq-next-maint')?.value || '',
    hours: parseFloat(document.getElementById('eq-hours')?.value) || null,
    status: document.getElementById('eq-status')?.value || 'Aktif',
    insurance_end: document.getElementById('eq-insurance')?.value || '',
    notes: document.getElementById('eq-notes')?.value || '',
    created_at: idx < 0 ? new Date().toISOString() : (D.equipment[idx]?.created_at || '')
  };
  if (!rec.name) { showToast('Ekipman adı zorunlu!', 'yl'); return; }
  if (idx < 0) D.equipment.push(rec);
  else D.equipment[idx] = rec;
  persist();
  closeModal();
  showToast('Ekipman kaydedildi ✓');
  renderEquipment();
}

function openMaintenanceForm(eqName) {
  const eqOptions = D.equipment.map((e,i) => `<option value="${e.name}" ${eqName===e.name?'selected':''}>${e.name}</option>`).join('');
  const html = `
    <div class="fr">
      <div class="fg"><label>Ekipman *</label>
        <select id="mnt-eq">${eqOptions || '<option>-- Önce ekipman ekleyin --</option>'}</select>
      </div>
      <div class="fg"><label>Bakım Tipi</label>
        <select id="mnt-type">
          ${['Periyodik Bakım','Yağ Değişimi','Filtre Değişimi','Lastik','Elektrik','Motor','Fren','Arıza Tamiri','Yıkama / Genel Bakım','Diğer'].map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label>Tarih *</label><input id="mnt-date" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="fg"><label>Yapan / Servis</label><input id="mnt-by" placeholder="Yetkili Servis / Ad"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Maliyet (₺)</label><input id="mnt-cost" type="number" min="0"/></div>
      <div class="fg"><label>Sonraki Bakım Tarihi</label><input id="mnt-next" type="date"/></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Saymetre (bakım anında)</label><input id="mnt-hours" type="number" min="0"/></div>
      <div class="fg"><label>Kullanılan Parçalar</label><input id="mnt-parts" placeholder="Yağ filtresi, motor yağı..."/></div>
    </div>
    <div class="fg"><label>Açıklama / Notlar</label><textarea id="mnt-notes" style="min-height:55px"></textarea></div>
    <div class="modal-act">
      <button class="btn btn-sec" onclick="closeModal()">İptal</button>
      <button class="btn btn-pr" onclick="saveMaintenance()">Kaydet</button>
    </div>`;
  document.getElementById('md-title').textContent = 'Bakım Kaydı Ekle';
  document.getElementById('md-body').innerHTML = html;
  document.getElementById('ov').style.display = 'block';
  document.getElementById('md').style.display = 'block';
}

function saveMaintenance() {
  const rec = {
    equipment_name: document.getElementById('mnt-eq')?.value || '',
    type: document.getElementById('mnt-type')?.value || '',
    date: document.getElementById('mnt-date')?.value || new Date().toISOString().split('T')[0],
    performed_by: document.getElementById('mnt-by')?.value || '',
    cost: parseFloat(document.getElementById('mnt-cost')?.value) || 0,
    next_date: document.getElementById('mnt-next')?.value || '',
    hours: parseFloat(document.getElementById('mnt-hours')?.value) || null,
    parts: document.getElementById('mnt-parts')?.value || '',
    notes: document.getElementById('mnt-notes')?.value || ''
  };
  D.maintenance.push(rec);
  // Ekipmanın sonraki bakım tarihini güncelle
  if (rec.next_date) {
    const eq = D.equipment.find(e => e.name === rec.equipment_name);
    if (eq) eq.next_maintenance = rec.next_date;
  }
  persist();
  closeModal();
  showToast('Bakım kaydedildi ✓');
  renderEquipment();
}

function renderEquipment() {
  if (!D.equipment) D.equipment = [];
  if (!D.maintenance) D.maintenance = [];
  
  const filterStatus = document.getElementById('eq-filter-status')?.value || '';
  const today = new Date().toISOString().split('T')[0];
  const soon14 = new Date(); soon14.setDate(soon14.getDate()+14);
  const soon14str = soon14.toISOString().split('T')[0];
  
  // İstatistikler
  const total = D.equipment.length;
  const active = D.equipment.filter(e => e.status === 'Aktif').length;
  const broken = D.equipment.filter(e => e.status === 'Arızalı').length;
  const upcoming = D.equipment.filter(e => e.next_maintenance && e.next_maintenance <= soon14str && e.next_maintenance >= today).length;
  const totalMaintCost = D.maintenance.reduce((s,m) => s + (m.cost||0), 0);
  
  const statsEl = document.getElementById('eq-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="sc sc-v2 stripe-green"><div class="sc-val">${total}</div><div class="sc-lbl">Toplam Ekipman</div></div>
    <div class="sc sc-v2 stripe-blue"><div class="sc-val">${active}</div><div class="sc-lbl">Aktif</div></div>
    <div class="sc sc-v2 stripe-red"><div class="sc-val">${broken}</div><div class="sc-lbl">Arızalı</div></div>
    <div class="sc sc-v2 stripe-amber"><div class="sc-val">₺${fmtNum(totalMaintCost)}</div><div class="sc-lbl">Toplam Bakım Maliyeti</div></div>`;

  // Uyarılar
  const alertsEl = document.getElementById('eq-alerts');
  if (alertsEl) {
    const overdueEq = D.equipment.filter(e => e.next_maintenance && e.next_maintenance < today);
    const soonEq = D.equipment.filter(e => e.next_maintenance && e.next_maintenance >= today && e.next_maintenance <= soon14str);
    const brokenEq = D.equipment.filter(e => e.status === 'Arızalı');
    let alertHTML = '';
    brokenEq.forEach(e => alertHTML += `<div class="alert-box alert-rd">⚠️ <b>${e.name}</b> arızalı — bakım gerekiyor</div>`);
    overdueEq.forEach(e => alertHTML += `<div class="alert-box alert-rd">🔧 <b>${e.name}</b> bakımı gecikti — planlanan: ${e.next_maintenance}</div>`);
    soonEq.forEach(e => alertHTML += `<div class="alert-box alert-yl">⏰ <b>${e.name}</b> bakımı yaklaşıyor: ${e.next_maintenance}</div>`);
    alertsEl.innerHTML = alertHTML;
  }
  
  // Ekipman listesi
  const listEl = document.getElementById('eq-list');
  if (listEl) {
    const filtered = filterStatus ? D.equipment.filter(e => e.status === filterStatus) : D.equipment;
    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty">Ekipman kaydı yok. + Ekipman Ekle butonunu kullanın.</div>';
    } else {
      const typeIcons = {'Traktör':'🚜','Biçer-dövme':'🌾','Sulama Pompası':'💧','Jeneratör':'⚡','Pulluk':'🔧','Römork':'🚛','Elektrik Motoru':'⚡','İlaçlama Makinesi':'💊','Diğer':'🔩'};
      listEl.innerHTML = filtered.map((eq, idx) => {
        const realIdx = D.equipment.indexOf(eq);
        const statusColor = {Aktif:'#16a34a',Bakımda:'#f59e0b',Arızalı:'#dc2626',Pasif:'#94a3b8'}[eq.status] || '#94a3b8';
        const lastMaint = D.maintenance.filter(m => m.equipment_name === eq.name).sort((a,b) => b.date.localeCompare(a.date))[0];
        const isOverdue = eq.next_maintenance && eq.next_maintenance < today;
        const isSoon = eq.next_maintenance && eq.next_maintenance >= today && eq.next_maintenance <= soon14str;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--brd);border-radius:10px;margin-bottom:8px;background:var(--card);transition:.15s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
            <div style="font-size:28px;flex-shrink:0">${typeIcons[eq.type]||'🔧'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13.5px">${eq.name}</div>
              <div style="font-size:11.5px;color:var(--sub)">${eq.brand||''} ${eq.year||''} ${eq.plate?'· '+eq.plate:''}</div>
              <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">
                <span style="font-size:10.5px;padding:2px 8px;border-radius:10px;background:${statusColor}20;color:${statusColor};font-weight:600">${eq.status}</span>
                ${eq.next_maintenance ? `<span style="font-size:10.5px;color:${isOverdue?'#dc2626':isSoon?'#d97706':'var(--sub)'}">🔧 Sonraki bakım: ${eq.next_maintenance}</span>` : ''}
                ${lastMaint ? `<span style="font-size:10.5px;color:var(--sub)">Son bakım: ${lastMaint.date}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
              <button class="btn btn-pr btn-sm" onclick="openMaintenanceForm('${eq.name}')">+ Bakım</button>
              <button class="btn btn-sec btn-sm" onclick="openEquipmentForm(${realIdx})">Düzenle</button>
              <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?')){D.equipment.splice(${realIdx},1);persist();renderEquipment();showToast('Silindi')}">Sil</button>
            </div>
          </div>`;
      }).join('');
    }
  }
  
  // Bakım takvimi — sonraki 30 gün
  const calEl = document.getElementById('eq-calendar');
  if (calEl) {
    const upcoming30 = D.equipment
      .filter(e => e.next_maintenance)
      .sort((a,b) => a.next_maintenance.localeCompare(b.next_maintenance))
      .slice(0, 10);
    if (!upcoming30.length) {
      calEl.innerHTML = '<div class="empty">Planlanmış bakım yok</div>';
    } else {
      calEl.innerHTML = upcoming30.map(eq => {
        const d = new Date(eq.next_maintenance);
        const diff = Math.ceil((d - new Date()) / 86400000);
        const isOv = diff < 0;
        const isSoon2 = diff >= 0 && diff <= 14;
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border-left:3px solid ${isOv?'#dc2626':isSoon2?'#f59e0b':'#16a34a'};background:${isOv?'var(--red-lt)':isSoon2?'var(--yellow-lt)':'var(--accent-lt)'};margin-bottom:6px">
          <div style="text-align:center;min-width:40px">
            <div style="font-size:16px;font-weight:800;line-height:1">${d.getDate()}</div>
            <div style="font-size:9px;color:var(--sub)">${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:12.5px;font-weight:600">${eq.name}</div>
            <div style="font-size:11px;color:var(--sub)">${isOv?'⚠️ '+Math.abs(diff)+' gün gecikti':diff===0?'Bugün!':diff+' gün kaldı'}</div>
          </div>
          <button class="btn btn-pr btn-sm" onclick="openMaintenanceForm('${eq.name}')">Yap</button>
        </div>`;
      }).join('');
    }
  }
  
  // Bakım geçmişi tablosu
  const tbody = document.getElementById('tbl-maintenance');
  if (tbody) {
    const list = [...D.maintenance].sort((a,b) => b.date.localeCompare(a.date));
    tbody.innerHTML = list.length ? list.map((m,i) => `
      <tr>
        <td><b>${m.equipment_name}</b></td>
        <td><span class="tag t-bl">${m.type}</span></td>
        <td>${m.date}</td>
        <td>${m.performed_by||'-'}</td>
        <td>${m.cost ? '₺'+fmtNum(m.cost) : '-'}</td>
        <td>${m.next_date||'-'}</td>
        <td><span class="tag t-gr">Tamamlandı</span></td>
      </tr>`) .join('') : empty(7, 'Bakım kaydı yok', '🔧');
  }
}

function exportEquipmentPDF() {
  const {jsPDF} = window.jspdf || {};
  if (!jsPDF) { showToast('PDF kütüphanesi yükleniyor...', 'yl'); return; }
  const doc = new jsPDF('landscape');
  doc.setFillColor(26,60,46); doc.rect(0,0,297,25,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text((D.settings.farm_name||'Çiftlik') + ' — Ekipman & Bakım Raporu', 15, 16);
  doc.text(new Date().toLocaleDateString('tr-TR'), 255, 16);
  doc.setTextColor(50,50,50); let y = 35;
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  ['Ekipman','Tür','Durum','Sonraki Bakım','Toplam Maliyet'].forEach((h,i) => doc.text(h, [10,60,100,140,180][i], y));
  doc.line(10,y+2,285,y+2); y+=8;
  doc.setFont('helvetica','normal');
  D.equipment.forEach(eq => {
    if (y > 185) { doc.addPage('landscape'); y=20; }
    const cost = D.maintenance.filter(m=>m.equipment_name===eq.name).reduce((s,m)=>s+(m.cost||0),0);
    doc.text((eq.name||'').slice(0,18), 10, y);
    doc.text((eq.type||'').slice(0,12), 60, y);
    doc.text(eq.status||'-', 100, y);
    doc.text(eq.next_maintenance||'-', 140, y);
    doc.text('₺'+fmtNum(cost), 180, y);
    y += 6;
  });
  doc.save('Ekipman-Raporu-' + new Date().toISOString().split('T')[0] + '.pdf');
  showToast('PDF indiriliyor ✓');
}

// ══════════════════════════════════════════════════════════════════════
//  SOY AĞACI (GENEALOGY) MODÜLÜ
// ══════════════════════════════════════════════════════════════════════

function renderGenealogy() {
  const selEl = document.getElementById('gen-animal-sel');
  const depthEl = document.getElementById('gen-depth');
  
  // Hayvan seçim listesini doldur
  if (selEl) {
    const opts = D.animals.map(a => `<option value="${a.tag_number}">${a.tag_number}${a.name?' — '+a.name:''} (${a.species})</option>`).join('');
    if (selEl.innerHTML === '' || selEl.children.length < 2) {
      selEl.innerHTML = '<option value="">-- Hayvan Seçin --</option>' + opts;
    }
  }
  
  const tag = selEl?.value;
  const depth = parseInt(depthEl?.value || '3');
  
  if (!tag) {
    document.getElementById('genealogy-tree').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:var(--sub);font-size:13px;flex-direction:column;gap:8px"><div style="font-size:48px;opacity:.3">🌳</div><div>Soy ağacı için hayvan seçin</div></div>';
    renderFamilyGroups();
    return;
  }
  
  const animal = D.animals.find(a => a.tag_number === tag);
  if (!animal) return;
  
  // Soy ağacı verisi oluştur
  function buildTree(tag, currentDepth) {
    if (currentDepth <= 0) return null;
    const a = D.animals.find(x => x.tag_number === tag);
    if (!a) return { tag, name: '?', species: '?', unknown: true };
    
    const mother = a.mother_tag ? buildTree(a.mother_tag, currentDepth - 1) : null;
    const father = a.father_tag ? buildTree(a.father_tag, currentDepth - 1) : null;
    
    // Bu hayvanın yavruları
    const offspring = D.animals.filter(x => x.mother_tag === tag || x.father_tag === tag);
    
    return { tag, name: a.name, species: a.species, breed: a.breed, status: a.status,
             gender: a.gender, birth_date: a.birth_date, weight: a.weight,
             mother, father, offspring_count: offspring.length };
  }
  
  const tree = buildTree(tag, depth);
  
  // SVG tabanlı ağaç çiz
  const treeEl = document.getElementById('genealogy-tree');
  if (treeEl) {
    treeEl.innerHTML = renderTreeSVG(tree, depth);
  }
  
  // Özet
  const sumEl = document.getElementById('gen-summary');
  if (sumEl && animal) {
    const offspring = D.animals.filter(a => a.mother_tag === tag || a.father_tag === tag);
    const knownParents = [animal.mother_tag, animal.father_tag].filter(Boolean).length;
    sumEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px">
          <span style="color:var(--sub);font-size:12px">Tür / Irk</span>
          <span style="font-weight:600;font-size:12px">${animal.species} ${animal.breed?'/ '+animal.breed:''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px">
          <span style="color:var(--sub);font-size:12px">Bilinen Ebeveyn</span>
          <span style="font-weight:600;font-size:12px">${knownParents} / 2</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px">
          <span style="color:var(--sub);font-size:12px">Yavru Sayısı</span>
          <span style="font-weight:600;font-size:12px">${offspring.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px">
          <span style="color:var(--sub);font-size:12px">Cinsiyet</span>
          <span style="font-weight:600;font-size:12px">${animal.gender||'-'}</span>
        </div>
        ${animal.birth_date ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px">
          <span style="color:var(--sub);font-size:12px">Doğum Tarihi</span>
          <span style="font-weight:600;font-size:12px">${animal.birth_date} (${calcAge(animal.birth_date)})</span>
        </div>` : ''}
      </div>`;
  }
  
  // Akrabalık katsayısı (basit hesap)
  const inbreedingEl = document.getElementById('gen-inbreeding');
  if (inbreedingEl && animal) {
    // Basit akrabalık kontrolü — anne ve baba aynı ata mı?
    let inbreedingScore = 0;
    let notes = [];
    if (animal.mother_tag && animal.father_tag) {
      const mother = D.animals.find(a => a.tag_number === animal.mother_tag);
      const father = D.animals.find(a => a.tag_number === animal.father_tag);
      if (mother && father) {
        // Anne ve babanın ebeveynleri kontrol et
        if (mother.mother_tag && father.mother_tag && mother.mother_tag === father.mother_tag) {
          inbreedingScore += 25; notes.push('Ortak büyükanne');
        }
        if (mother.father_tag && father.father_tag && mother.father_tag === father.father_tag) {
          inbreedingScore += 25; notes.push('Ortak büyükbaba');
        }
      }
    }
    
    const scoreColor = inbreedingScore === 0 ? '#16a34a' : inbreedingScore <= 12.5 ? '#f59e0b' : '#dc2626';
    const scoreLabel = inbreedingScore === 0 ? 'Düşük (İdeal)' : inbreedingScore <= 12.5 ? 'Orta' : 'Yüksek (Risk)';
    
    inbreedingEl.innerHTML = `
      <div style="text-align:center;padding:12px">
        <div style="font-size:36px;font-weight:800;color:${scoreColor}">${inbreedingScore}%</div>
        <div style="font-size:12.5px;color:${scoreColor};font-weight:600;margin:4px 0">${scoreLabel}</div>
        ${notes.length ? `<div style="font-size:11.5px;color:var(--sub);margin-top:6px">${notes.join(' · ')}</div>` : '<div style="font-size:11.5px;color:var(--sub);margin-top:6px">Akrabalık tespiti yapılmadı</div>'}
      </div>
      <div style="height:8px;background:var(--brd);border-radius:4px;overflow:hidden;margin:0 12px">
        <div style="height:100%;width:${inbreedingScore}%;background:${scoreColor};transition:width .8s;border-radius:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--sub);margin:4px 12px 0">
        <span>İdeal (0%)</span><span>Sınır (%12.5)</span><span>Risk (%25+)</span>
      </div>`;
  }
  
  renderFamilyGroups();
}

function renderTreeSVG(tree, depth) {
  if (!tree) return '<div class="empty">Soy ağacı oluşturulamadı</div>';
  
  // Basit HTML tabanlı ağaç
  function nodeHTML(node, gen) {
    if (!node) return `<div class="gen-node gen-unknown"><div class="gen-node-tag">?</div><div class="gen-node-name">Bilinmiyor</div></div>`;
    const genderColor = node.gender === 'Erkek' ? '#3b82f6' : node.gender === 'Dişi' ? '#ec4899' : '#94a3b8';
    const isMain = gen === 0;
    return `<div class="gen-node ${isMain?'gen-node-main':''}" onclick="if(D.animals.find(a=>a.tag_number==='${node.tag}'))document.getElementById('gen-animal-sel').value='${node.tag}';renderGenealogy();" style="cursor:${node.unknown?'default':'pointer'}">
      <div class="gen-node-avatar" style="border-color:${genderColor}">${getSpeciesIcon(node.species)}</div>
      <div class="gen-node-tag">${node.tag||'?'}</div>
      <div class="gen-node-name">${node.name||'-'}</div>
      <div class="gen-node-meta">${node.species||''} ${node.breed?'·'+node.breed:''}</div>
    </div>`;
  }
  
  // 3 kuşak ağacı HTML
  const mainNode = nodeHTML(tree, 0);
  const motherNode = tree.mother ? nodeHTML(tree.mother, 1) : nodeHTML(null, 1);
  const fatherNode = tree.father ? nodeHTML(tree.father, 1) : nodeHTML(null, 1);
  
  const mgm = tree.mother?.mother ? nodeHTML(tree.mother.mother, 2) : nodeHTML(null, 2);
  const mgf = tree.mother?.father ? nodeHTML(tree.mother.father, 2) : nodeHTML(null, 2);
  const pgm = tree.father?.mother ? nodeHTML(tree.father.mother, 2) : nodeHTML(null, 2);
  const pgf = tree.father?.father ? nodeHTML(tree.father.father, 2) : nodeHTML(null, 2);
  
  return `
    <style>
      .gen-tree { display:flex;flex-direction:column;align-items:center;gap:0;padding:16px;font-family:inherit }
      .gen-row { display:flex;justify-content:center;gap:12px;position:relative }
      .gen-row-g3 { display:flex;justify-content:center;gap:8px }
      .gen-col { display:flex;flex-direction:column;align-items:center;gap:0 }
      .gen-node { background:var(--card);border:2px solid var(--brd);border-radius:12px;padding:10px;text-align:center;min-width:100px;max-width:120px;transition:all .15s;position:relative }
      .gen-node:hover:not(.gen-unknown) { border-color:var(--accent);box-shadow:0 4px 16px rgba(45,106,79,.15);transform:translateY(-2px) }
      .gen-node-main { border-color:var(--accent)!important;background:var(--accent-lt);min-width:120px }
      .gen-unknown { opacity:.5;border-style:dashed }
      .gen-node-avatar { font-size:22px;margin-bottom:4px }
      .gen-node-tag { font-size:11px;font-weight:700;color:var(--txt) }
      .gen-node-name { font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px }
      .gen-node-meta { font-size:9.5px;color:var(--sub);margin-top:2px }
      .gen-connector { width:2px;height:24px;background:var(--brd);margin:0 auto }
      .gen-h-connector { height:2px;background:var(--brd);flex:1;margin-top:22px }
    </style>
    <div class="gen-tree">
      <!-- Kuşak 3 (büyük ebeveynler) -->
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:0">
        <div style="display:flex;flex-direction:column;align-items:center">${mgm}<div class="gen-connector"></div></div>
        <div style="width:8px"></div>
        <div style="display:flex;flex-direction:column;align-items:center">${mgf}<div class="gen-connector"></div></div>
        <div style="width:32px"></div>
        <div style="display:flex;flex-direction:column;align-items:center">${pgm}<div class="gen-connector"></div></div>
        <div style="width:8px"></div>
        <div style="display:flex;flex-direction:column;align-items:center">${pgf}<div class="gen-connector"></div></div>
      </div>
      <!-- Kuşak 2 (anne-baba) -->
      <div style="display:flex;gap:60px;justify-content:center;margin-bottom:0">
        <div style="display:flex;flex-direction:column;align-items:center">${motherNode}<div class="gen-connector"></div></div>
        <div style="display:flex;flex-direction:column;align-items:center">${fatherNode}<div class="gen-connector"></div></div>
      </div>
      <!-- Kuşak 1 (seçili hayvan) -->
      <div style="display:flex;justify-content:center">${mainNode}</div>
      <!-- Yavrular -->
      ${(tree.offspring_count||0) > 0 ? `<div class="gen-connector"></div><div style="background:var(--accent-lt);border:1px solid var(--accent);border-radius:8px;padding:6px 14px;font-size:11.5px;color:var(--accent);font-weight:600">${tree.offspring_count} yavru</div>` : ''}
    </div>`;
}

function renderFamilyGroups() {
  const el = document.getElementById('gen-families');
  if (!el) return;
  
  // Anne çizgisi üzerinden aile grupları
  const families = {};
  D.animals.forEach(a => {
    const key = a.mother_tag || a.father_tag || 'unknown';
    if (!families[key]) families[key] = { parent: key, members: [] };
    families[key].members.push(a);
  });
  
  const groups = Object.values(families).filter(g => g.members.length >= 2).slice(0, 8);
  
  if (!groups.length) {
    el.innerHTML = '<div class="empty">Anne/baba bağlantısı olan hayvan bulunamadı. Hayvan kayıtlarına anne/baba küpe no girin.</div>';
    return;
  }
  
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:4px">` +
    groups.map(g => {
      const parent = D.animals.find(a => a.tag_number === g.parent);
      return `<div style="padding:14px;border:1px solid var(--brd);border-radius:10px;background:var(--card)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="font-size:22px">${getSpeciesIcon(parent?.species||'')}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${parent?.name||g.parent} <span style="color:var(--sub);font-weight:400">(${parent?.species||'?'})</span></div>
            <div style="font-size:11px;color:var(--sub)">${g.members.length} yavru</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${g.members.map(m => `<span style="padding:3px 9px;background:var(--bg);border-radius:10px;font-size:11px;font-weight:500;cursor:pointer" onclick="document.getElementById('gen-animal-sel').value='${m.tag_number}';renderGenealogy()">${m.tag_number}${m.name?' · '+m.name:''}</span>`).join('')}
        </div>
      </div>`;
    }).join('') + '</div>';
}

async function aiGeneticAnalysis() {
  const tag = document.getElementById('gen-animal-sel')?.value;
  if (!tag) { showToast('Önce hayvan seçin!', 'yl'); return; }
  const animal = D.animals.find(a => a.tag_number === tag);
  const offspring = D.animals.filter(a => a.mother_tag === tag || a.father_tag === tag);
  const prompt = `${tag} (${animal?.name||''}), Tür: ${animal?.species}, Irk: ${animal?.breed||'?'}, Cinsiyet: ${animal?.gender}, Yaş: ${calcAge(animal?.birth_date)}, ${offspring.length} yavrusu var. Anne: ${animal?.mother_tag||'?'}, Baba: ${animal?.father_tag||'?'}. Bu hayvanın genetik değerini değerlendir, ıslah potansiyelini ve damızlık değerini analiz et.`;
  await aiCall(prompt, 'ai-genealogy', 600);
}

async function aiBreedingRecommendation() {
  const tag = document.getElementById('gen-animal-sel')?.value;
  if (!tag) { showToast('Önce hayvan seçin!', 'yl'); return; }
  const animal = D.animals.find(a => a.tag_number === tag);
  const sameSpecies = D.animals.filter(a => a.species === animal?.species && a.tag_number !== tag);
  const prompt = `${tag} (${animal?.species}, ${animal?.breed||'?'}, ${animal?.gender}) için en uygun çiftleşme partneri öner. Sürüde ${sameSpecies.length} aynı türden hayvan var. Akrabalık katsayısını minimize et, genetik çeşitliliği artır. Somut küpe numaraları öner veya dışarıdan alım tavsiyesi ver.`;
  await aiCall(prompt, 'ai-genealogy', 800);
}

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD SPARKLINES
// ══════════════════════════════════════════════════════════════════════
function renderDashboardSparklines() {
  // Son 7 günlük mini trend verileri — stat kartlarının altına
  const today = new Date();
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });
  
  // Her gün için hayvan durumu
  const healthData = last7.map(day => {
    return D.health.filter(h => (h.date||'').slice(0,10) === day).length;
  });
  
  const taskData = last7.map(day => {
    return D.tasks.filter(t => (t.due_date||'').slice(0,10) === day).length;
  });
  
  // Mini sparkline çizici
  function sparkline(data, color) {
    const max = Math.max(...data, 1);
    const w = 60, h = 24;
    const pts = data.map((v,i) => {
      const x = (i / (data.length-1)) * w;
      const y = h - (v/max) * h;
      return `${x},${y}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" style="display:block">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
      <circle cx="${(data.length-1)/(data.length-1)*w}" cy="${h-(data[data.length-1]/max)*h}" r="2.5" fill="${color}"/>
    </svg>`;
  }
  
  // Sparkline verilerini stat card subtext'ine ekle
  const sparkEl = document.getElementById('dash-sparklines');
  if (sparkEl) {
    sparkEl.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px 0">
        <div style="display:flex;align-items:center;gap:8px">
          <div>${sparkline(healthData, '#ef4444')}</div>
          <div style="font-size:11px;color:var(--sub)">Sağlık <b style="color:var(--txt)">${healthData[healthData.length-1]}</b> bugün</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div>${sparkline(taskData, '#f59e0b')}</div>
          <div style="font-size:11px;color:var(--sub)">Görev <b style="color:var(--txt)">${taskData[taskData.length-1]}</b> bugün</div>
        </div>
      </div>`;
  }
}

// ══════════════════════════════════════════════════════════════════════
//  HAYVAN KARŞILAŞTIRMA
// ══════════════════════════════════════════════════════════════════════
function openAnimalCompare() {
  const opts = D.animals.map(a => `<option value="${a.tag_number}">${a.tag_number}${a.name?' · '+a.name:''}</option>`).join('');
  const html = `
    <p style="font-size:12.5px;color:var(--sub);margin-bottom:14px">İki hayvanı yan yana karşılaştırın</p>
    <div class="fr">
      <div class="fg"><label>Hayvan 1</label><select id="cmp-a1">${opts}</select></div>
      <div class="fg"><label>Hayvan 2</label><select id="cmp-a2">${opts}</select></div>
    </div>
    <div class="modal-act">
      <button class="btn btn-sec" onclick="closeModal()">İptal</button>
      <button class="btn btn-pr" onclick="showAnimalCompare()">Karşılaştır</button>
    </div>`;
  document.getElementById('md-title').textContent = 'Hayvan Karşılaştır';
  document.getElementById('md-body').innerHTML = html;
  document.getElementById('ov').style.display = 'block';
  document.getElementById('md').style.display = 'block';
}

function showAnimalCompare() {
  const t1 = document.getElementById('cmp-a1')?.value;
  const t2 = document.getElementById('cmp-a2')?.value;
  if (!t1 || !t2 || t1 === t2) { showToast('Farklı iki hayvan seçin!', 'yl'); return; }
  
  const a1 = D.animals.find(a => a.tag_number === t1);
  const a2 = D.animals.find(a => a.tag_number === t2);
  if (!a1 || !a2) return;
  
  const h1 = D.health.filter(h => h.animal_tag === t1);
  const h2 = D.health.filter(h => h.animal_tag === t2);
  const p1 = D.production.filter(p => p.animal_tag === t1);
  const p2 = D.production.filter(p => p.animal_tag === t2);
  const hc1 = h1.reduce((s,h) => s+(h.cost||0), 0);
  const hc2 = h2.reduce((s,h) => s+(h.cost||0), 0);
  const prod1 = p1.reduce((s,p) => s+(parseFloat(p.quantity)||0), 0);
  const prod2 = p2.reduce((s,p) => s+(parseFloat(p.quantity)||0), 0);
  
  function compareRow(label, v1, v2, higherBetter) {
    const n1 = parseFloat(v1), n2 = parseFloat(v2);
    const c1 = !isNaN(n1) && !isNaN(n2) ? (higherBetter ? (n1>=n2?'#16a34a':'#dc2626') : (n1<=n2?'#16a34a':'#dc2626')) : 'var(--txt)';
    const c2 = !isNaN(n1) && !isNaN(n2) ? (higherBetter ? (n2>=n1?'#16a34a':'#dc2626') : (n2<=n1?'#16a34a':'#dc2626')) : 'var(--txt)';
    return `<tr>
      <td style="color:var(--sub);font-size:12px">${label}</td>
      <td style="text-align:center;font-weight:600;color:${c1}">${v1||'-'}</td>
      <td style="text-align:center;font-weight:600;color:${c2}">${v2||'-'}</td>
    </tr>`;
  }
  
  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="padding:14px;background:var(--bg);border-radius:10px;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">${getSpeciesIcon(a1.species)}</div>
        <div style="font-weight:700">${a1.tag_number}${a1.name?' · '+a1.name:''}</div>
        <div style="font-size:11.5px;color:var(--sub)">${a1.species} ${a1.breed?'/ '+a1.breed:''}</div>
        ${stag(a1.status)}
      </div>
      <div style="padding:14px;background:var(--bg);border-radius:10px;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">${getSpeciesIcon(a2.species)}</div>
        <div style="font-weight:700">${a2.tag_number}${a2.name?' · '+a2.name:''}</div>
        <div style="font-size:11.5px;color:var(--sub)">${a2.species} ${a2.breed?'/ '+a2.breed:''}</div>
        ${stag(a2.status)}
      </div>
    </div>
    <div class="tbl-wrap">
      <table style="font-size:12.5px">
        <thead><tr><th>Kriter</th><th style="text-align:center">${a1.tag_number}</th><th style="text-align:center">${a2.tag_number}</th></tr></thead>
        <tbody>
          ${compareRow('Ağırlık', (a1.weight||0)+' kg', (a2.weight||0)+' kg', true)}
          ${compareRow('Yaş', calcAge(a1.birth_date), calcAge(a2.birth_date), false)}
          ${compareRow('Günlük Süt', (a1.daily_milk||0)+' lt', (a2.daily_milk||0)+' lt', true)}
          ${compareRow('Sağlık Kaydı', h1.length+' kayıt', h2.length+' kayıt', false)}
          ${compareRow('Sağlık Maliyeti', '₺'+fmtNum(hc1), '₺'+fmtNum(hc2), false)}
          ${compareRow('Toplam Üretim', prod1.toFixed(1)+' birim', prod2.toFixed(1)+' birim', true)}
          ${compareRow('Alım Fiyatı', a1.purchase_price?'₺'+fmtNum(a1.purchase_price):'-', a2.purchase_price?'₺'+fmtNum(a2.purchase_price):'-', false)}
        </tbody>
      </table>
    </div>
    <div class="modal-act">
      <button class="btn btn-sec" onclick="closeModal()">Kapat</button>
      <button class="btn btn-pr" onclick="closeModal();openAnimalDetail(${D.animals.indexOf(a1)})">Hayvan 1 Detay</button>
    </div>`;
  
  document.getElementById('md-body').innerHTML = html;
  document.getElementById('md-title').textContent = 'Hayvan Karşılaştırma: ' + t1 + ' vs ' + t2;
}

// ══════════════════════════════════════════════════════════════════════
//  AKILLI HATIRLATICI SİSTEMİ
// ══════════════════════════════════════════════════════════════════════
function checkSmartReminders() {
  const today = new Date();
  const reminders = [];
  const todayStr = today.toISOString().split('T')[0];
  
  // 1. Yaklaşan aşılar (7 gün)
  const soon7 = new Date(today); soon7.setDate(soon7.getDate()+7);
  D.health.filter(h => h.next_date && h.next_date >= todayStr && h.next_date <= soon7.toISOString().split('T')[0])
    .forEach(h => reminders.push({
      type: 'vaccine', priority: 'high',
      title: `💉 ${h.animal_tag} aşı hatırlatması`,
      body: `${h.record_type} — ${h.next_date}`,
      action: () => showPage('VacSchedule', null)
    }));
  
  // 2. Bugünkü görevler
  D.tasks.filter(t => t.due_date === todayStr && t.status !== 'Tamamlandı')
    .forEach(t => reminders.push({
      type: 'task', priority: t.priority === 'Kritik' ? 'critical' : 'normal',
      title: `✅ Bugün: ${t.title}`,
      body: `Öncelik: ${t.priority||'Normal'}`,
      action: () => showPage('Tasks', null)
    }));
  
  // 3. Kritik stok
  D.inventory.filter(i => (i.current_stock||0) < (i.minimum_stock||0))
    .forEach(i => reminders.push({
      type: 'stock', priority: 'high',
      title: `📦 Kritik stok: ${i.name}`,
      body: `${i.current_stock} ${i.unit} kaldı (min: ${i.minimum_stock})`,
      action: () => showPage('Inventory', null)
    }));
  
  // 4. Hasta hayvanlar
  D.animals.filter(a => a.status === 'Hasta')
    .forEach(a => reminders.push({
      type: 'health', priority: 'critical',
      title: `🐄 ${a.tag_number} hasta`,
      body: 'Veteriner kontrolü gerekebilir',
      action: () => openAnimalDetailByTag(a.tag_number)
    }));
  
  // 5. Ekipman bakımı
  if (D.equipment) {
    D.equipment.filter(e => e.next_maintenance && e.next_maintenance <= todayStr)
      .forEach(e => reminders.push({
        type: 'equipment', priority: 'normal',
        title: `🔧 ${e.name} bakım zamanı`,
        body: `Planlanan: ${e.next_maintenance}`,
        action: () => showPage('Equipment', null)
      }));
  }
  
  // Browser notification (izin varsa)
  if ('Notification' in window && Notification.permission === 'granted') {
    reminders.filter(r => r.priority === 'critical').forEach(r => {
      new Notification(r.title, { body: r.body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌿</text></svg>' });
    });
  }
  
  return reminders;
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') showToast('🔔 Bildirimler etkinleştirildi!');
    });
  }
}

// Bildirim izni iste (ilk açılışta)
setTimeout(requestNotificationPermission, 3000);

// Her 30 dakikada bir hatırlatıcı kontrolü
setInterval(checkSmartReminders, 30 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════
//  GELİŞTİRİLMİŞ ARAMA — hayvan karşılaştır kısayolu
// ══════════════════════════════════════════════════════════════════════
// globalSearch fonksiyonuna "karşılaştır" özelliği ekle
const _origGlobalSearch = window.globalSearch;
window.globalSearch = function(q) {
  if (typeof _origGlobalSearch === 'function') _origGlobalSearch(q);
  // "karşılaştır" veya "vs" içeriyorsa karşılaştır butonu göster
  const dropdown = document.getElementById('global-search-results');
  if (dropdown && q && (q.includes(' vs ') || q.toLowerCase().includes('karşılaştır'))) {
    const parts = q.replace(/karşılaştır/i,'').split(' vs ').map(s=>s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const a1 = D.animals.find(a => a.tag_number.toLowerCase().includes(parts[0].toLowerCase()) || (a.name||'').toLowerCase().includes(parts[0].toLowerCase()));
      const a2 = D.animals.find(a => a.tag_number.toLowerCase().includes(parts[1].toLowerCase()) || (a.name||'').toLowerCase().includes(parts[1].toLowerCase()));
      if (a1 && a2) {
        const existing = dropdown.innerHTML;
        dropdown.innerHTML = `<div class="gsr-item" onclick="closeGlobalSearch();document.getElementById('cmp-a1')&&(document.getElementById('cmp-a1').value='${a1.tag_number}');document.getElementById('cmp-a2')&&(document.getElementById('cmp-a2').value='${a2.tag_number}');showAnimalCompare&&showAnimalCompare()">
          <div class="gsr-ico" style="background:#e0e7ff;color:#4f46e5">⚖️</div>
          <div class="gsr-main"><div class="gsr-title">${a1.tag_number} vs ${a2.tag_number} karşılaştır</div></div>
        </div>` + existing;
        dropdown.classList.add('open');
      }
    }
  }
};

// ══════════════════════════════════════════════════════════════════════
//  injectNewPages GÜNCELLEME — Equipment ve Genealogy sayfaları için
// ══════════════════════════════════════════════════════════════════════
function injectNewPages() {
  // Equipment ve Genealogy sayfaları HTML'e gömülü, ek enjeksiyon gerekmez
}

// NAV CSS — yeni sayfalar için aktif renk


// ===================== INIT =====================
function updateMenuBtn(){document.getElementById('menu-btn').style.display=window.innerWidth<=900?'flex':'none';}
// Ana init DOMContentLoaded bekliyor — initApp() initV4() ile birleştirildi

// Form kaydetme audit wrap — saveForm sonrası audit kayıt
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});



// ===== v4.0 Eklentisi =====
// ===== Bizim Çiftlik v4.0 - Entegre =====

// ─────────────────────────────────────────────────────────────
//  1. GERÇEKÇİ KULLANICI GİRİŞ SİSTEMİ (Modal Tabanlı)
// ─────────────────────────────────────────────────────────────
let currentSession = JSON.parse(localStorage.getItem('_cf_session') || 'null');

function showLoginModal() {
  const html = `
    <div id="login-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
      <div style="background:var(--card);border-radius:20px;padding:32px;width:380px;max-width:95vw;border:1px solid var(--brd);box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:8px"></div>
          <div style="font-size:20px;font-weight:800;color:var(--g)">Bizim Çiftlik</div>
          <div style="font-size:12px;color:var(--sub);margin-top:4px">Giriş yapın veya PIN kullanın</div>
        </div>
        <div class="tabs" style="margin-bottom:20px">
          <button class="tab active" onclick="switchLoginTab('pass',this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Şifre</button>
          <button class="tab" onclick="switchLoginTab('pin',this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01"/></svg> PIN</button>
        </div>
        <div id="login-tab-pass">
          <div class="fg"><label>Kullanıcı Adı</label><input id="l-user" placeholder="mudur" style="width:100%;padding:9px 12px;border:1px solid var(--brd);border-radius:8px;font-size:14px;background:var(--card);color:var(--txt)"/></div>
          <div class="fg"><label>Şifre</label><input id="l-pass" type="password" placeholder="••••••••" style="width:100%;padding:9px 12px;border:1px solid var(--brd);border-radius:8px;font-size:14px;background:var(--card);color:var(--txt)" onkeydown="if(event.key==='Enter')doLogin()"/></div>
          <button class="btn btn-pr" style="width:100%;padding:11px;font-size:14px;margin-top:8px" onclick="doLogin()">Giriş Yap</button>
        </div>
        <div id="login-tab-pin" style="display:none">
          <div style="text-align:center;margin-bottom:16px;font-size:13px;color:var(--sub)">Kullanıcı seçin ve PIN girin:</div>
          <div id="pin-users-list"></div>
        </div>
        <div id="login-err" style="display:none;margin-top:12px;padding:8px 12px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:12.5px;text-align:center"></div>
        <div style="margin-top:16px;text-align:center">
          <button class="btn btn-sec btn-sm" onclick="skipLogin()" style="font-size:11px;color:var(--sub)">Misafir olarak devam et →</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  loadPinUsers();
}

function switchLoginTab(tab, btn) {
  document.getElementById('login-tab-pass').style.display = tab === 'pass' ? '' : 'none';
  document.getElementById('login-tab-pin').style.display  = tab === 'pin'  ? '' : 'none';
  document.querySelectorAll('#login-overlay .tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function loadPinUsers() {
  const el = document.getElementById('pin-users-list');
  if (!el) return;
  try {
    const r = await fetch('api.php?action=users_list');
    const data = await r.json();
    const users = data.ok ? data.data : D.users || [];
    el.innerHTML = users.map((u,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--brd);border-radius:8px;margin-bottom:6px">
        <div style="font-size:22px">${u.avatar || ''}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${u.display_name || u.name}</div><div style="font-size:11px;color:var(--sub)">${u.role}</div></div>
        <input id="pin-inp-${i}" type="password" maxlength="6" placeholder="PIN" style="width:75px;padding:6px;border:1px solid var(--brd);border-radius:6px;font-size:14px;text-align:center;background:var(--card);color:var(--txt)" onkeydown="if(event.key==='Enter')doPinLogin(${i},'${u.display_name||u.name}','${u.role}','${u.pin||u.pin}')"/>
        <button class="btn btn-pr btn-sm" onclick="doPinLogin(${i},'${u.display_name||u.name}','${u.role}','${u.pin||''}')">→</button>
      </div>`).join('');
  } catch(e) {
    // API yoksa local users kullan
    const users = D.users || [];
    el.innerHTML = users.map((u,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--brd);border-radius:8px;margin-bottom:6px">
        <div style="font-size:22px"></div>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${u.name}</div><div style="font-size:11px;color:var(--sub)">${u.role}</div></div>
        <input id="pin-inp-${i}" type="password" maxlength="6" placeholder="PIN" style="width:75px;padding:6px;border:1px solid var(--brd);border-radius:6px;font-size:14px;text-align:center;background:var(--card);color:var(--txt)"/>
        <button class="btn btn-pr btn-sm" onclick="localPinLogin(${i},document.getElementById('pin-inp-${i}').value)">→</button>
      </div>`).join('');
  }
}

function localPinLogin(idx, pin) {
  const u = D.users[idx];
  if (!u) return;
  if (u.pin && pin !== u.pin) { showLoginErr('Yanlış PIN!'); return; }
  completeLogin({ name: u.name, role: u.role, avatar: '' });
}

async function doLogin() {
  const username = document.getElementById('l-user')?.value?.trim();
  const password = document.getElementById('l-pass')?.value;
  if (!username || !password) { showLoginErr('Kullanıcı adı ve şifre gerekli'); return; }
  try {
    const r = await fetch('api.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json();
    if (!data.ok) { showLoginErr(data.error || 'Giriş başarısız'); return; }
    if (data.data.token) localStorage.setItem('_cf_token', data.data.token);
    completeLogin(data.data.user);
  } catch(e) {
    // Fallback: local kullanıcılar
    const user = D.users?.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (user && (!user.pin || password === user.pin)) {
      completeLogin({ name: user.name, role: user.role });
    } else {
      showLoginErr('Kullanıcı bulunamadı veya şifre hatalı');
    }
  }
}

function doPinLogin(idx, name, role, correctPin) {
  const entered = document.getElementById('pin-inp-' + idx)?.value;
  if (correctPin && entered !== correctPin) { showLoginErr('Yanlış PIN!'); return; }
  completeLogin({ name, role, avatar: '' });
}

function completeLogin(user) {
  currentSession = user;
  localStorage.setItem('_cf_session', JSON.stringify(user));
  D.currentUser = { name: user.name, role: user.role };
  document.getElementById('login-overlay')?.remove();
  updateTopbarUser(user);
  applyRoleFilter();
  showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6m-2 0V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0"/></svg></span> Hoş geldin, ${user.name}!`);
}

function skipLogin() {
  document.getElementById('login-overlay')?.remove();
  showToast('Misafir modunda devam ediliyor');
}

function showLoginErr(msg) {
  const el = document.getElementById('login-err');
  if (el) { el.textContent = msg; el.style.display = ''; }
}

function updateTopbarUser(user) {
  // Topbar'a kullanıcı badge'i ekle
  const topR = document.querySelector('.top-r');
  if (!topR) return;
  let badge = document.getElementById('topbar-user');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'topbar-user';
    badge.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg);border:1px solid var(--brd);border-radius:20px;cursor:pointer;font-size:12px';
    badge.onclick = showUserSwitchModal;
    topR.insertBefore(badge, topR.firstChild);
  }
  badge.innerHTML = `<span style="font-size:14px">${user.avatar || ''}</span><span style="font-weight:600">${user.name}</span>`;
}

function showUserSwitchModal() {
  const html = `
    <div style="padding:4px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;background:var(--bg);margin-bottom:16px">
        <span style="font-size:32px">${currentSession?.avatar || ''}</span>
        <div><div style="font-weight:700;font-size:14px">${currentSession?.name || '-'}</div><div style="font-size:12px;color:var(--sub)">${currentSession?.role || '-'}</div></div>
      </div>
      <button class="btn btn-sec" style="width:100%;margin-bottom:8px" onclick="closeModal();showLoginModal()">Rol Değiştir</button>
      <button class="btn btn-danger" style="width:100%" onclick="closeModal();sbSignOut()">Hesaptan Çıkış Yap (${sbUser?.email || ''})</button>
    </div>`;
  openGenericModal(' Hesap', html);
}

