function renderSpeciesProfitability() {
  const rows = [];
  const speciesList = [...new Set(D.animals.map(a => a.species).filter(Boolean))];
  speciesList.forEach(sp => {
    const animals = D.animals.filter(a => a.species === sp);
    const prod = D.production.filter(p => animals.find(a => a.tag_number === p.animal_tag));
    const sales = D.sales.filter(s => animals.find(a => a.tag_number === s.animal_tag) || animals.some(a => a.species === sp));
    const health = D.health.filter(h => animals.find(a => a.tag_number === h.animal_tag));
    const healthCost = health.reduce((s, h) => s + (parseFloat(h.cost)||0), 0);
    const salesIncome = sales.reduce((s, x) => s + (parseFloat(x.total_amount||x.total)||0), 0);
    const net = salesIncome - healthCost;
    rows.push({ sp, count: animals.length, salesIncome, healthCost, net, prodCount: prod.length });
  });
  if (!rows.length) return '<p class="empty">Yeterli veri yok</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Tür</th><th>Hayvan</th><th>Satış Geliri</th><th>Sağlık Maliyeti</th><th>Net</th><th>Üretim Kaydı</th></tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td><b>${r.sp}</b></td>
      <td>${r.count}</td>
      <td style="color:#15803d">₺${fmtNum(r.salesIncome)}</td>
      <td style="color:#dc2626">₺${fmtNum(r.healthCost)}</td>
      <td style="font-weight:700;color:${r.net>=0?'#16a34a':'#dc2626'}">₺${fmtNum(Math.abs(r.net))}</td>
      <td>${r.prodCount}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function fmtNum(n) {
  return (typeof n === 'number' ? n : parseFloat(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────────────────────
//  4. PAZAR FİYATLARI MODÜLü
// ─────────────────────────────────────────────────────────────
async function loadMarketPrices() {
  const el = document.getElementById('market-prices-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--sub)">Fiyatlar yükleniyor...</div>';
  try {
    const r = await fetch('api.php?action=market_prices');
    const data = await r.json();
    if (!data.ok) throw new Error(data.error);
    const prices = data.data.prices || [];
    const myAnimals = [...new Set(D.animals.map(a => a.species))];
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:11px;color:var(--sub)">Kaynak: ${data.data.kaynak === 'cache' ? 'Önbellekten' : '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> AI Tahmini'} · ${new Date().toLocaleTimeString('tr-TR')}</span>
        <button class="btn btn-sec btn-sm" onclick="loadMarketPrices()">Güncelle</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        ${prices.map(p => {
          const relevant = myAnimals.some(sp => p.urun?.includes(sp) || p.kategori?.includes('Et') || p.kategori?.includes('Süt'));
          return `<div style="padding:14px;border-radius:10px;border:${relevant?'2px solid var(--g2)':'1px solid var(--brd)'};background:${relevant?'rgba(45,106,79,.04)':'var(--card)'}">
            <div style="font-size:11px;color:var(--sub);margin-bottom:4px">${p.kategori || 'Genel'}</div>
            <div style="font-size:14px;font-weight:700">${p.urun}</div>
            <div style="font-size:22px;font-weight:800;color:var(--g2);margin:4px 0">₺${p.fiyat}</div>
            <div style="font-size:11px;color:var(--sub)">/${p.birim}</div>
            ${relevant ? '<div style="font-size:10px;color:var(--g2);margin-top:4px">✓ Çiftliğinizle ilgili</div>' : ''}
          </div>`;
        }).join('')}
      </div>
      <!-- Karlılık Tahmini -->
      <div class="card" style="margin-top:16px">
        <div class="card-hd"><span class="card-t">Satış Potansiyeli Tahmini</span></div>
        ${calcSalesPotential(prices)}
      </div>`;
  } catch(e) {
    el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--sub)">Fiyatlar yüklenemedi: ${e.message}<br><button class="btn btn-sec btn-sm" style="margin-top:8px" onclick="loadMarketPrices()">Tekrar Dene</button></div>`;
  }
}

function calcSalesPotential(prices) {
  if (!D.animals.length) return '<p class="empty">Hayvan verisi yok</p>';
  const items = [];
  D.animals.filter(a => a.status === 'Aktif').forEach(a => {
    const weight = parseFloat(a.weight) || 0;
    if (!weight) return;
    const priceObj = prices.find(p => p.urun?.toLowerCase().includes(a.species?.toLowerCase().slice(0,3)) || p.kategori === 'Et');
    if (!priceObj) return;
    const potential = weight * parseFloat(priceObj.fiyat);
    items.push({ tag: a.tag_number, species: a.species, weight, fiyat: priceObj.fiyat, potential });
  });
  if (!items.length) return '<p class="empty">Ağırlık verisi girilmemiş hayvanlar için hesaplanamadı</p>';
  const total = items.reduce((s, i) => s + i.potential, 0);
  return `<div class="tbl-wrap"><table><thead><tr><th>Hayvan</th><th>Tür</th><th>Ağırlık</th><th>Piyasa Fiyatı</th><th>Potansiyel Gelir</th></tr></thead>
    <tbody>${items.slice(0,10).map(i => `<tr><td><b>${i.tag}</b></td><td>${i.species}</td><td>${i.weight} kg</td><td>₺${i.fiyat}/kg</td><td style="font-weight:700;color:#16a34a">₺${fmtNum(i.potential)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4" style="font-weight:700">Toplam Potansiyel</td><td style="font-weight:800;color:var(--g2);font-size:14px">₺${fmtNum(total)}</td></tr></tfoot>
  </table></div>`;
}

// ─────────────────────────────────────────────────────────────
//  5. SULAMA TAKİBİ
// ─────────────────────────────────────────────────────────────
let sulamaData = [];

async function loadSulama() {
  try {
    const r = await fetch('api.php?action=sulama_list');
    const d = await r.json();
    sulamaData = d.ok ? d.data : [];
  } catch(e) {
    sulamaData = D.sulama || [];
  }
  renderSulama();
}

function renderSulama() {
  const el = document.getElementById('sulama-content');
  if (!el) return;
  const totalLitre = sulamaData.reduce((s, x) => s + (parseFloat(x.litre)||0), 0);
  const totalSure  = sulamaData.reduce((s, x) => s + (parseInt(x.sure_dk)||0), 0);
  const thisMonth = sulamaData.filter(x => (x.tarih||'').startsWith(new Date().toISOString().slice(0,7)));
  el.innerHTML = `
    <div class="g3 mb">
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${fmtNum(totalLitre)} lt</div><div class="sc-lbl">Toplam Su Kullanımı</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${Math.round(totalSure/60)} saat</div><div class="sc-lbl">Toplam Süre</div></div>
      <div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${thisMonth.length}</div><div class="sc-lbl">Bu Ay Sulama</div></div>
    </div>
    <!-- Sulama Formu -->
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Sulama Kaydı Ekle</span></div>
      <div class="fr3">
        <div class="fg"><label>Tarla / Parsel</label>
          <select id="sul-tarla" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)">
            <option value="">Seçin...</option>
            ${(D.lands||[]).map(l => `<option value="${l.id||l.name}">${l.name}</option>`).join('')}
            <option value="genel">Genel / Ortak</option>
          </select>
        </div>
        <div class="fg"><label>Tarih</label><input id="sul-tarih" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
        <div class="fg"><label>Süre (dakika)</label><input id="sul-sure" type="number" placeholder="60" min="0" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
      </div>
      <div class="fr3">
        <div class="fg"><label>Su Miktarı (litre)</label><input id="sul-litre" type="number" placeholder="1000" min="0" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
        <div class="fg"><label>Sulama Yöntemi</label>
          <select id="sul-metod" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)">
            <option>Damla</option><option>Yağmurlama</option><option>Salma</option><option>El</option><option>Diğer</option>
          </select>
        </div>
        <div class="fg"><label>Not</label><input id="sul-not" placeholder="Opsiyonel..." style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
      </div>
      <button class="btn btn-pr" onclick="saveSulama()">Kaydet</button>
    </div>
    <!-- Kayıt Listesi -->
    <div class="card">
      <div class="card-hd"><span class="card-t">Sulama Geçmişi</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Tarla</th><th>Süre</th><th>Miktar</th><th>Metod</th><th>Not</th></tr></thead>
        <tbody>${sulamaData.length ? sulamaData.slice(0,50).map(s => `<tr>
          <td>${s.tarih||''}</td><td>${s.tarla_adi||''}</td>
          <td>${s.sure_dk||0} dk</td><td>${s.litre||0} lt</td>
          <td>${s.metod||''}</td><td style="color:var(--sub)">${s.not||''}</td>
        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--sub)">Henüz kayıt yok</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
}

async function saveSulama() {
  const tarlaEl = document.getElementById('sul-tarla');
  const tarih   = document.getElementById('sul-tarih')?.value;
  const sure    = document.getElementById('sul-sure')?.value;
  const litre   = document.getElementById('sul-litre')?.value;
  const metod   = document.getElementById('sul-metod')?.value;
  const not     = document.getElementById('sul-not')?.value;
  const land = D.lands?.find(l => (l.id||l.name) === tarlaEl?.value);
  const rec = { tarla_id: tarlaEl?.value, tarla_adi: land?.name || tarlaEl?.value || 'Genel', tarih: tarih || new Date().toISOString().split('T')[0], sure_dk: parseInt(sure)||0, litre: parseFloat(litre)||0, metod: metod || 'Damla', not: not || '' };
  try {
    const r = await fetch('api.php?action=sulama_save', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(rec) });
    const data = await r.json();
    if (data.ok) { showToast('Sulama kaydedildi ✓'); loadSulama(); return; }
  } catch(e) {}
  // Fallback: local
  if (!D.sulama) D.sulama = [];
  D.sulama.push(rec);
  persist();
  showToast('Sulama kaydedildi ✓');
  renderSulama();
}

// ─────────────────────────────────────────────────────────────
//  6. GÜBRE & İLAÇ UYGULAMA
// ─────────────────────────────────────────────────────────────
let tarlaUygulamaData = [];

async function loadTarlaUygulama() {
  try {
    const r = await fetch('api.php?action=tarla_uygulama_list');
    const d = await r.json();
    tarlaUygulamaData = d.ok ? d.data : [];
  } catch(e) {
    tarlaUygulamaData = D.tarlaUygulama || [];
  }
  renderTarlaUygulama();
}

function renderTarlaUygulama() {
  const el = document.getElementById('tarla-uygulama-content');
  if (!el) return;
  el.innerHTML = `
    <div class="card mb">
      <div class="card-hd"><span class="card-t">Aşı / İlaç Uygulama Kaydı Ekle</span></div>
      <div class="fr3">
        <div class="fg"><label>Tarla</label>
          <select id="tu-tarla" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)">
            ${(D.lands||[]).map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
            <option value="Tüm Tarla">Tüm Tarla</option>
          </select>
        </div>
        <div class="fg"><label>Tarih</label><input id="tu-tarih" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
        <div class="fg"><label>Uygulama Tipi</label>
          <select id="tu-tip" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)">
            <option>Gübre</option><option>Herbisit</option><option>Pestisit</option><option>Fungusit</option><option>Kireçleme</option><option>Diğer</option>
          </select>
        </div>
      </div>
      <div class="fr3">
        <div class="fg"><label>Ürün Adı</label><input id="tu-urun" placeholder="Ürün adı" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
        <div class="fg"><label>Miktar & Birim</label>
          <div style="display:flex;gap:6px">
            <input id="tu-miktar" type="number" placeholder="50" style="flex:1;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/>
            <select id="tu-birim" style="width:80px;padding:7px 8px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)">
              <option>lt</option><option>kg</option><option>ton</option><option>g</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Maliyet (₺)</label><input id="tu-maliyet" type="number" placeholder="0" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
      </div>
      <div class="fg"><label>Yapan Kişi</label><input id="tu-yapan" placeholder="İşçi adı..." style="width:300px;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
      <button class="btn btn-pr" onclick="saveTarlaUygulama()">Kaydet</button>
      <button class="btn btn-ai btn-sm" style="margin-left:8px" onclick="aiTarlaOnerisi()">AI Öneri</button>
    </div>
    <div id="ai-tarla-result" style="display:none;margin-bottom:16px"></div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Uygulama Geçmişi</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Tarih</th><th>Tarla</th><th>Tip</th><th>Ürün</th><th>Miktar</th><th>Maliyet</th><th>Yapan</th></tr></thead>
        <tbody>${tarlaUygulamaData.length ? tarlaUygulamaData.slice(0,50).map(t => `<tr>
          <td>${t.tarih||''}</td><td>${t.tarla_adi||''}</td><td>${t.uygulama||''}</td><td>${t.urun||''}</td>
          <td>${t.miktar||0} ${t.birim||''}</td><td>₺${fmtNum(t.maliyet||0)}</td><td>${t.yapan||''}</td>
        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--sub)">Henüz kayıt yok</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
}

async function saveTarlaUygulama() {
  const rec = {
    tarla_adi: document.getElementById('tu-tarla')?.value || '',
    tarih:     document.getElementById('tu-tarih')?.value || new Date().toISOString().split('T')[0],
    uygulama:  document.getElementById('tu-tip')?.value || '',
    urun:      document.getElementById('tu-urun')?.value || '',
    miktar:    parseFloat(document.getElementById('tu-miktar')?.value) || 0,
    birim:     document.getElementById('tu-birim')?.value || 'lt',
    maliyet:   parseFloat(document.getElementById('tu-maliyet')?.value) || 0,
    yapan:     document.getElementById('tu-yapan')?.value || '',
  };
  try {
    const r = await fetch('api.php?action=tarla_uygulama_save', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(rec) });
    const d = await r.json();
    if (d.ok) { showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 22V12m0 0C12 7 8 4 4 4c0 4 3 8 8 8z"/><path d="M12 12c0-5 4-8 8-8-1 4-4 8-8 8z"/></svg></span> Uygulama kaydedildi ✓'); loadTarlaUygulama(); return; }
  } catch(e) {}
  if (!D.tarlaUygulama) D.tarlaUygulama = [];
  D.tarlaUygulama.push(rec);
  persist();
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 22V12m0 0C12 7 8 4 4 4c0 4 3 8 8 8z"/><path d="M12 12c0-5 4-8 8-8-1 4-4 8-8 8z"/></svg></span> Uygulama kaydedildi ✓');
  renderTarlaUygulama();
}

async function aiTarlaOnerisi() {
  const el = document.getElementById('ai-tarla-result');
  if (!el) return;
  el.style.display = '';
  el.innerHTML = '<div class="ai-result loading">Tarla önerileri hazırlanıyor...</div>';
  const lands = D.lands || [];
  const season = ['Kış','Kış','İlkbahar','İlkbahar','İlkbahar','Yaz','Yaz','Yaz','Sonbahar','Sonbahar','Sonbahar','Kış'][new Date().getMonth()];
  const prompt = `Çiftliğimde ${lands.length} tarla var. Mevsim: ${season}. Son uygulamalar: ${tarlaUygulamaData.slice(-5).map(t=>t.uygulama+'/'+t.urun).join(', ')||'yok'}. Bu mevsimde yapılması gereken gübre ve ilaç uygulamalarını 5 madde olarak öner. Kısa, pratik ve emoji ile.`;
  try {
    if(!getGroqKey()){if(el)el.textContent='API anahtarı girilmemiş.';return;}
    const r = await groqCall([{role:'user',content:prompt}], typeof farmCtx==='function'?farmCtx():'', 500);
    const data = await r.json();
    const text = (data.content || []).map(c => c.text||'').join('') || 'Öneri alınamadı';
    el.innerHTML = `<div class="ai-panel"><div class="ai-result">${text}</div></div>`;
  } catch(e) {
    el.innerHTML = '<div class="ai-result">AI bağlantısı yok</div>';
  }
}

// ─────────────────────────────────────────────────────────────
//  7. OFFLİNE SYNC SİSTEMİ
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  7. IndexedDB BÜYÜK VERİ ÖNBELLEĞİ + OFFLİNE DURUM PANELİ
// ─────────────────────────────────────────────────────────────
const IDB_NAME='CiftlikDB';const IDB_VER=1;const IDB_STORE='farm_data';
let _idb=null;

function initIndexedDB(){
  if(!window.indexedDB)return;
  const req=indexedDB.open(IDB_NAME,IDB_VER);
  req.onupgradeneeded=e=>{
    const db=e.target.result;
    if(!db.objectStoreNames.contains(IDB_STORE)){
      db.createObjectStore(IDB_STORE,{keyPath:'key'});
    }
  };
  req.onsuccess=e=>{
    _idb=e.target.result;
    console.log('[IDB] Hazır');
    // Mevcut D verilerini IDB'ye yedekle
    idbSave('farm_snapshot',{data:D,ts:Date.now()});
  };
  req.onerror=()=>console.warn('[IDB] Açılamadı');
}

function idbSave(key,val){
  if(!_idb)return;
  try{
    const tx=_idb.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put({key,value:val,ts:Date.now()});
  }catch(e){}
}

function idbLoad(key){
  return new Promise((res,rej)=>{
    if(!_idb){rej('IDB yok');return;}
    try{
      const tx=_idb.transaction(IDB_STORE,'readonly');
      const req=tx.objectStore(IDB_STORE).get(key);
      req.onsuccess=e=>res(e.target.result?.value||null);
      req.onerror=()=>rej('IDB okuma hatası');
    }catch(e){rej(e);}
  });
}

function idbDelete(key){
  if(!_idb)return;
  try{
    const tx=_idb.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
  }catch(e){}
}

// D değiştiğinde IDB'yi otomatik güncelle (persist override)
const _origPersist=typeof persist==='function'?persist:null;
function persistWithIDB(){
  if(typeof persist==='function' && persist !== persistWithIDB) persist();
  else if(_origPersist && _origPersist !== persistWithIDB) _origPersist();
  idbSave('farm_snapshot',{data:D,ts:Date.now()});
  updateOfflineIndicator();
}

// Offline'da IDB'den veri yükle
async function loadFromIDBFallback(){
  try{
    const snap=await idbLoad('farm_snapshot');
    if(snap?.data){
      Object.assign(D,snap.data);
      showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg></span> Çevrimdışı veriler yüklendi ('+new Date(snap.ts).toLocaleTimeString('tr-TR')+')','yl');
      return true;
    }
  }catch(e){}
  return false;
}

// ─── OFFLİNE DURUM PANELİ ───────────────────────────────────
function initOfflineStatusPanel(){
  // Bağlantı değiştiğinde sessizce sync yap, bildirim gösterme
  window.addEventListener('online',()=>{
    if(typeof syncWithServer==='function')syncWithServer();
  });
}

function updateConnIndicator(){
  // conn-indicator kaldırıldı
}

function showOfflinePanel(){
  const online=navigator.onLine;
  const q=typeof getSyncQueue==='function'?getSyncQueue():[];
  const idbInfo=_idb?'IndexedDB aktif':'IndexedDB desteklenmiyor';
  const swInfo='serviceWorker' in navigator?'Service Worker kayıtlı':'Service Worker yok';
  const modalHtml=`
  <div id="pwa-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:var(--card);border-radius:14px;padding:20px;width:min(400px,92vw);box-shadow:0 20px 40px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:15px;font-weight:700"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></span> PWA Durum</div>
        <button onclick="document.getElementById('pwa-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--sub)">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px">
        <div style="padding:10px;border-radius:8px;background:${online?'rgba(45,106,79,.08)':'rgba(220,38,38,.08)'};border-left:3px solid ${online?'#16a34a':'#dc2626'}">
          <b>${online?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3.3 5-3.3 13 0 18M12 3c3.3 5 3.3 13 0 18"/></svg></span> Çevrimiçi':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1"/><path d="M2 2l20 20"/><path d="M10.7 5.7a9 9 0 0 1 6.6 6.6"/></svg></span> Çevrimdışı'}</b>
          <div style="color:var(--sub);margin-top:2px;font-size:11px">${online?'Sunucu bağlantısı aktif':'Veriler yerel depolamadan okunuyor'}</div>
        </div>
        <div style="padding:10px;border-radius:8px;background:var(--bg)">
          <b><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg></span> ${idbInfo}</b>
          <div style="color:var(--sub);margin-top:2px;font-size:11px">Büyük veri seti önbelleğe alındı</div>
        </div>
        <div style="padding:10px;border-radius:8px;background:var(--bg)">
          <b><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> ${swInfo}</b>
          <div style="color:var(--sub);margin-top:2px;font-size:11px">Statik dosyalar ve CDN kaynakları önbellekte</div>
        </div>
        ${q.length>0?`
        <div style="padding:10px;border-radius:8px;background:rgba(245,158,11,.08);border-left:3px solid #f59e0b">
          <b><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span> ${q.length} kayıt senkronizasyon bekliyor</b>
          <div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;max-height:80px;overflow-y:auto">
            ${q.slice(0,5).map(qi=>`<div style="font-size:10.5px;color:var(--sub)">${qi.ts?.slice(0,16)||''} — ${qi.modul||''} ${qi.aksiyon||''}</div>`).join('')}
            ${q.length>5?`<div style="font-size:10.5px;color:var(--sub)">... ve ${q.length-5} kayıt daha</div>`:''}
          </div>
          <button class="btn btn-pr" style="margin-top:8px;width:100%" onclick="syncWithServer();document.getElementById('pwa-modal').remove()">Şimdi Senkronize Et</button>
        </div>`:`<div style="padding:10px;border-radius:8px;background:rgba(45,106,79,.06);font-size:12px;color:#16a34a"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Tüm veriler senkronize</div>`}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',modalHtml);
}

const SYNC_QUEUE_KEY = '_cf_sync_queue';

function addToSyncQueue(aksiyon, modul, veri) {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  queue.push({ id: Date.now(), aksiyon, modul, veri, ts: new Date().toISOString() });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  updateOfflineIndicator();
}

function getSyncQueue() {
  return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
}

function clearSyncQueue(syncedIds) {
  const queue = getSyncQueue().filter(q => !syncedIds.includes(q.id));
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  updateOfflineIndicator();
}

async function syncWithServer() {
  const queue = getSyncQueue();
  if (!queue.length) { return; } // Kuyruk boş, sessizce çık
  showToast(`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 22h14M5 2h14M17 22v-4.2c0-1-.4-2-1.1-2.7L12 12l-3.9 3.1A3.7 3.7 0 0 0 7 17.8V22M7 2v4.2c0 1 .4 2 1.1 2.7L12 12l3.9-3.1A3.7 3.7 0 0 0 17 6.2V2"/></svg></span> ${queue.length} kayıt sunucuya gönderiliyor...`, 'yl');
  try {
    const r = await fetch('api.php?action=sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: getDeviceId(), queue })
    });
    const data = await r.json();
    if (data.ok) {
      const syncedIds = queue.map(q => q.id);
      clearSyncQueue(syncedIds);
      // Sync tamamlandı — sessiz
    }
  } catch(e) {
    // Sync başarısız — sessiz devam
  }
}

function getDeviceId() {
  let id = localStorage.getItem('_cf_device_id');
  if (!id) { id = 'device_' + Date.now(); localStorage.setItem('_cf_device_id', id); }
  return id;
}

function updateOfflineIndicator() {
  const queue = getSyncQueue();
  let badge = document.getElementById('offline-badge');
  if (!badge && queue.length > 0) {
    badge = document.createElement('div');
    badge.id = 'offline-badge';
    badge.style.cssText = 'position:fixed;bottom:80px;left:16px;background:#f59e0b;color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;z-index:90;box-shadow:0 2px 8px rgba(0,0,0,.2)';
    badge.onclick = syncWithServer;
    document.body.appendChild(badge);
  }
  if (badge) {
    if (queue.length > 0) {
      badge.innerHTML = `<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9m14.2 0C23 8.8 23 15.2 19.1 19.1M8 16a5 5 0 0 1 0-8m8 0a5 5 0 0 1 0 8"/><circle cx="12" cy="12" r="1"/></svg></span> ${queue.length} bekleyen · Sync et`;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
}

// İnternet bağlantısı izle — sessiz sync
window.addEventListener('online',  () => { syncWithServer(); });
window.addEventListener('offline', () => { updateOfflineIndicator(); });

// ─────────────────────────────────────────────────────────────
//  8. TELEGRAm-STİL HIZLI MESAJ SİSTEMİ (WhatsApp yükseltmesi)
// ─────────────────────────────────────────────────────────────
function renderQuickShare() {
  const el = document.getElementById('quick-share-content');
  if (!el) return;
  const hasta = D.animals.filter(a => a.status === 'Hasta');
  const kritikStok = D.inventory.filter(i => (i.current_stock||0) < (i.minimum_stock||0));
  const bugunGorev = D.tasks.filter(t => t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'Tamamlandı');
  const phone = D.settings?.wa_phone || '';
  const gelir = D.finance.filter(f => f.type === 'Gelir').reduce((s, f) => s + (parseFloat(f.amount)||0), 0);
  const gider = D.finance.filter(f => f.type === 'Gider').reduce((s, f) => s + (parseFloat(f.amount)||0), 0);

  const messages = {
    daily:  ` *Çiftlik Günlük Raporu* — ${new Date().toLocaleDateString('tr-TR')}\n\n<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> Toplam Hayvan: ${D.animals.length}\n<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/></svg></span> Hasta: ${hasta.length}${hasta.length ? ' ('+hasta.map(a=>a.tag_number).join(', ')+')' : ''}\n Kritik Stok: ${kritikStok.length}${kritikStok.length ? ' ('+kritikStok.map(i=>i.name).join(', ')+')' : ''}\n<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Bugün Görev: ${bugunGorev.length}\n Net Bakiye: ₺${fmtNum(gelir-gider)}\n\n_Bizim Çiftlik Yönetim Sistemi_`,
    sick:   hasta.length ? ` *Hasta Hayvan Bildirimi*\n\n${hasta.map(a => `• ${a.tag_number} ${a.name?'('+a.name+')':''} — ${a.species}\n  Son kayıt: ${D.health.filter(h=>h.animal_tag===a.tag_number).slice(-1)[0]?.date||'yok'}`).join('\n')}\n\nLütfen acilen kontrol edin.` : '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Şu an hasta hayvan bulunmuyor.',
    stock:  kritikStok.length ? `<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> *Kritik Stok Uyarısı*\n\n${kritikStok.map(i => `• ${i.name}: ${i.current_stock} ${i.unit} (Min: ${i.minimum_stock})`).join('\n')}\n\nAcil sipariş verilmesi önerilir.` : '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Tüm stoklar yeterli seviyede.',
    tasks:  bugunGorev.length ? `<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> *Bugünkü Görevler* — ${new Date().toLocaleDateString('tr-TR')}\n\n${bugunGorev.map(t => `• ${t.title} [${t.priority||'Normal'}]`).join('\n')}` : '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Bugün tamamlanacak görev yok.',
  };

  el.innerHTML = `
    <div class="fg"><label>WhatsApp Numarası</label><input id="qs-phone" value="${phone}" placeholder="905321234567" style="width:100%;max-width:300px;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:12.5px;background:var(--card);color:var(--txt)"/></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:16px">
      ${Object.entries({ daily: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></span> Günlük Rapor', sick: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> Hasta Hayvan', stock: ' Kritik Stok', tasks: '<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Bugün Görevler' }).map(([k, label]) => `
        <div style="padding:14px;border-radius:10px;border:1px solid var(--brd);background:var(--card)">
          <div style="font-weight:600;font-size:13px;margin-bottom:8px">${label}</div>
          <div style="font-size:11px;color:var(--sub);margin-bottom:10px;white-space:pre-wrap;max-height:60px;overflow:hidden">${messages[k]}</div>
          <button class="btn btn-pr btn-sm" onclick="sendWhatsApp('${k}')">Gönder</button>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-t">Özel Mesaj</span></div>
      <div class="fg"><textarea id="qs-custom" rows="4" placeholder="Mesajınızı yazın..." style="width:100%;padding:9px 12px;border:1px solid var(--brd);border-radius:8px;font-size:12.5px;background:var(--card);color:var(--txt);font-family:inherit"></textarea></div>
      <button class="btn btn-pr" onclick="sendCustomWhatsApp()">Gönder</button>
    </div>`;

  window._qsMsgs = messages;
}

function sendWhatsApp(type) {
  const phone = (document.getElementById('qs-phone')?.value || D.settings?.wa_phone || '').replace(/\D/g,'');
  if (!phone) { showToast('WhatsApp numarası girin!', 'yl'); return; }
  const msg = window._qsMsgs?.[type] || '';
  if (phone) { D.settings.wa_phone = phone; persist(); }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function sendCustomWhatsApp() {
  const phone = (document.getElementById('qs-phone')?.value || '').replace(/\D/g,'');
  const msg = document.getElementById('qs-custom')?.value;
  if (!phone) { showToast('Numara girin!', 'yl'); return; }
  if (!msg) { showToast('Mesaj yazın!', 'yl'); return; }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ─────────────────────────────────────────────────────────────
//  9. BÜTÇE PLANLAMA
// ─────────────────────────────────────────────────────────────
async function renderBudgetPlanning() {
  const el = document.getElementById('budget-content');
  if (!el) return;
  const year = new Date().getFullYear();
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const cats = ['Yem','Veteriner','İşçilik','Yakıt','Ekipman','Kira','Diğer Gider'];
  
  // Gerçekleşen değerler
  const getReal = (ay, cat, tip) => D.finance.filter(f => (f.date||'').startsWith(`${year}-${String(ay).padStart(2,'0')}`) && (tip ? f.type === tip : true) && (cat ? f.category === cat : true)).reduce((s,f)=>s+(parseFloat(f.amount)||0),0);
  
  el.innerHTML = `
    <div class="card mb">
      <div class="card-hd">
        <span class="card-t">${year} Yıllık Bütçe Planı</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ai btn-sm" onclick="aiBudgetOnerisi()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg> AI Öner</button>
          <button class="btn btn-pr btn-sm" onclick="saveBudget()">Kaydet</button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table style="min-width:900px">
          <thead>
            <tr>
              <th>Kategori</th>
              ${months.map((m,i) => `<th style="text-align:center">${m.slice(0,3)}<br><span style="font-size:9px;color:var(--sub)">Hedef/Gerçek</span></th>`).join('')}
              <th>Yıllık Hedef</th>
            </tr>
          </thead>
          <tbody>
            ${cats.map(cat => {
              const yearTotal = months.reduce((s,_,i) => s + getReal(i+1, cat, 'Gider'), 0);
              const savedTargets = D.settings?.butce?.[year] || {};
              const yearTarget = savedTargets[cat]?.total || 0;
              return `<tr>
                <td><b>${cat}</b></td>
                ${months.map((_,i) => {
                  const real = getReal(i+1, cat, 'Gider');
                  const t = savedTargets[cat]?.[i+1] || 0;
                  const over = t > 0 && real > t;
                  return `<td style="text-align:center;min-width:80px">
                    <input id="bt-${cat.replace(/\s/g,'_')}-${i+1}" type="number" value="${t||''}" placeholder="0" style="width:70px;padding:3px 6px;border:1px solid var(--brd);border-radius:4px;font-size:11px;background:var(--card);color:var(--txt);text-align:center"/>
                    <div style="font-size:9px;color:${over?'#dc2626':'#16a34a'};margin-top:1px">${real>0?'₺'+fmtNum(real):'-'}</div>
                  </td>`;
                }).join('')}
                <td style="text-align:center;font-weight:700;color:${yearTotal>yearTarget&&yearTarget>0?'#dc2626':'var(--g2)'}">₺${fmtNum(yearTotal)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div id="ai-budget-result"></div>`;
}

function saveBudget() {
  const cats = ['Yem','Veteriner','İşçilik','Yakıt','Ekipman','Kira','Diğer Gider'];
  const year = new Date().getFullYear();
  if (!D.settings.butce) D.settings.butce = {};
  if (!D.settings.butce[year]) D.settings.butce[year] = {};
  cats.forEach(cat => {
    D.settings.butce[year][cat] = {};
    for (let i = 1; i <= 12; i++) {
      const val = parseFloat(document.getElementById(`bt-${cat.replace(/\s/g,'_')}-${i}`)?.value) || 0;
      D.settings.butce[year][cat][i] = val;
    }
    D.settings.butce[year][cat].total = Object.values(D.settings.butce[year][cat]).reduce((s,v)=>s+(v||0),0);
  });
  persist();
  showToast('Bütçe kaydedildi ✓');
}

async function aiBudgetOnerisi() {
  const el = document.getElementById('ai-budget-result');
  if (!el) return;
  el.innerHTML = '<div class="ai-panel"><div class="ai-result loading">Bütçe önerileri hazırlanıyor...</div></div>';
  const gelir = D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+(parseFloat(f.amount)||0),0);
  const gider = D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+(parseFloat(f.amount)||0),0);
  const prompt = `Çiftliğim için bütçe analizi yap. Toplam gelir: ₺${fmtNum(gelir)}, gider: ₺${fmtNum(gider)}, net: ₺${fmtNum(gelir-gider)}. ${D.animals.length} hayvan var. Gelecek yıl için aylık bütçe dağılımı öner. Her kategori için yüzde öneri ve toplam tutarla. Kısa ve pratik ol.`;
  try {
    if(!getGroqKey()){if(resultEl)resultEl.innerHTML='<p style="color:#f59e0b">API anahtarı girilmemiş.</p>';return;}
    const r = await groqCall([{role:'user',content:prompt}], typeof farmCtx==='function'?farmCtx():'', 600);
    const data = await r.json();
    const text = (data.content||[]).map(c=>c.text||'').join('') || '';
    el.innerHTML = `<div class="ai-panel"><div class="ai-panel-hd"><div class="ai-ico"></div><span>AI Bütçe Önerisi</span></div><div class="ai-result">${text}</div></div>`;
  } catch(e) { el.innerHTML = ''; }
}

// ─────────────────────────────────────────────────────────────
//  10. YENİ SAYFALARı NAVİGASYONA EKLE
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
//  11. NAVİGASYON EKLENTİSİ — yeni menü öğeleri
// ─────────────────────────────────────────────────────────────
function addNewNavItems() {
  // v4 sayfaları artık ana navigasyonda mevcut, ayrı bölüm gerekmez
}

// showPage hook v4 sayfaları için orijinal showPage'e entegre edildi

// ─────────────────────────────────────────────────────────────
//  13. v4 INIT
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════
//  GELİŞMİŞ ANALİTİK — Hayvan performans skorkartı + karşılaştırmalı analiz
// ══════════════════════════════════════════════════════════════════════

function renderAnimalPerformanceCard() {
  // Tür bazlı verimlilik skorkartı
  const el = document.getElementById('an-scorecard');
  if (!el) return;
  
  const now = new Date();
  const month3ago = new Date(now); month3ago.setMonth(month3ago.getMonth()-3);
  
  // Hayvan başı metrikler hesapla
  const speciesMetrics = {};
  D.animals.forEach(a => {
    if (!a.species) return;
    if (!speciesMetrics[a.species]) speciesMetrics[a.species] = {
      count: 0, healthCosts: 0, production: 0, sick: 0, weight: 0, weightCount: 0
    };
    const m = speciesMetrics[a.species];
    m.count++;
    if (a.status === 'Hasta') m.sick++;
    if (a.weight) { m.weight += parseFloat(a.weight)||0; m.weightCount++; }
  });
  
  D.health.forEach(h => {
    const a = D.animals.find(x => x.tag_number === h.animal_tag);
    if (!a?.species || !speciesMetrics[a.species]) return;
    speciesMetrics[a.species].healthCosts += parseFloat(h.cost||0);
  });
  
  D.production.forEach(p => {
    const a = D.animals.find(x => x.tag_number === p.animal_tag);
    if (!a?.species || !speciesMetrics[a.species]) return;
    speciesMetrics[a.species].production += parseFloat(p.quantity||0);
  });
  
  const rows = Object.entries(speciesMetrics).map(([sp, m]) => {
    const healthPerHead = m.count ? m.healthCosts/m.count : 0;
    const prodPerHead = m.count ? m.production/m.count : 0;
    const sickRate = m.count ? (m.sick/m.count*100) : 0;
    const avgWeight = m.weightCount ? m.weight/m.weightCount : 0;
    
    // Skor hesapla (0-100)
    const healthScore = Math.max(0, 100 - sickRate*5 - healthPerHead/100);
    const prodScore = Math.min(100, prodPerHead * 2);
    const overall = Math.round((healthScore * 0.6 + prodScore * 0.4));
    
    return { sp, count: m.count, healthPerHead, prodPerHead, sickRate, avgWeight, overall };
  }).sort((a,b) => b.overall - a.overall);
  
  el.innerHTML = `
    <div class="tbl-wrap">
      <table style="font-size:12.5px">
        <thead>
          <tr>
            <th>Tür</th><th style="text-align:center">Baş</th>
            <th style="text-align:center">Ortalama Ağırlık</th>
            <th style="text-align:center">Sağlık Maliyet/Baş</th>
            <th style="text-align:center">Üretim/Baş</th>
            <th style="text-align:center">Hasta Oranı</th>
            <th style="text-align:center">Genel Skor</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const scoreColor = r.overall >= 70 ? '#16a34a' : r.overall >= 40 ? '#f59e0b' : '#dc2626';
            return `<tr>
              <td><b>${r.sp}</b></td>
              <td style="text-align:center">${r.count}</td>
              <td style="text-align:center">${r.avgWeight ? r.avgWeight.toFixed(0)+' kg' : '-'}</td>
              <td style="text-align:center">₺${fmtNum(Math.round(r.healthPerHead))}</td>
              <td style="text-align:center">${r.prodPerHead.toFixed(1)}</td>
              <td style="text-align:center;color:${r.sickRate>10?'#dc2626':'#16a34a'}">${r.sickRate.toFixed(1)}%</td>
              <td style="text-align:center">
                <div style="display:inline-flex;align-items:center;gap:6px">
                  <div style="width:40px;height:6px;background:var(--brd);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${r.overall}%;background:${scoreColor}"></div>
                  </div>
                  <span style="font-weight:700;color:${scoreColor}">${r.overall}</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  GELİŞMİŞ RAPORLAR — Özelleştirilebilir rapor oluşturucu
// ══════════════════════════════════════════════════════════════════════

function generateCustomReport(sections) {
  const {jsPDF} = window.jspdf || {};
  if (!jsPDF) { showToast('PDF kütüphanesi yükleniyor...','yl'); return; }
  const doc = new jsPDF();
  const farm = D.settings;
  const today = new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  
  // Header
  doc.setFillColor(26,60,46); doc.rect(0,0,210,38,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(18);
  doc.text(farm.farm_name||'Bizim Çiftlik', 15, 16);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Kapsamlı Çiftlik Raporu', 15, 24);
  doc.text(today, 15, 31);
  doc.text(farm.owner||'', 150, 31);
  
  let y = 50;
  
  function addSection(title, content) {
    if (y > 260) { doc.addPage(); y = 20; }
    // Section header
    doc.setFillColor(240,248,240); doc.rect(10, y-5, 190, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(26,60,46);
    doc.text(title, 15, y+1);
    y += 14;
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(50,50,50);
    content(doc, () => y, (newY) => { y = newY; });
    y += 6;
  }
  
  function pdfRow(label, value, yRef, setY) {
    const yy = yRef();
    if (yy > 270) { doc.addPage(); setY(20); }
    doc.text(label, 15, yRef()); 
    doc.text(String(value).slice(0,50), 90, yRef());
    setY(yRef() + 6);
  }
  
  // Sürü özeti
  addSection('SÜRÜ ÖZET BİLGİSİ', (doc, getY, setY) => {
    const aktif = D.animals.filter(a=>a.status==='Aktif').length;
    const hasta = D.animals.filter(a=>a.status==='Hasta').length;
    const gebe = D.animals.filter(a=>a.status==='Gebe').length;
    const speciesCount = {};
    D.animals.forEach(a=>{speciesCount[a.species]=(speciesCount[a.species]||0)+1;});
    
    pdfRow('Toplam Hayvan:', D.animals.length, getY, setY);
    pdfRow('Aktif / Hasta / Gebe:', `${aktif} / ${hasta} / ${gebe}`, getY, setY);
    Object.entries(speciesCount).forEach(([sp,n]) => pdfRow(sp+':', n+' baş', getY, setY));
  });
  
  // Finansal özet
  addSection('FİNANSAL ÖZET', (doc, getY, setY) => {
    const gelir = D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+parseFloat(f.amount||0),0);
    const gider = D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+parseFloat(f.amount||0),0);
    pdfRow('Toplam Gelir:', '₺'+gelir.toLocaleString('tr-TR'), getY, setY);
    pdfRow('Toplam Gider:', '₺'+gider.toLocaleString('tr-TR'), getY, setY);
    pdfRow('Net Kâr/Zarar:', '₺'+(gelir-gider).toLocaleString('tr-TR'), getY, setY);
    pdfRow('Kâr Marjı:', gelir>0?((gelir-gider)/gelir*100).toFixed(1)+'%':'-', getY, setY);
  });
  
  // Sağlık özeti
  addSection('SAĞLIK & VETERİNER', (doc, getY, setY) => {
    const totalCost = D.health.reduce((s,h)=>s+parseFloat(h.cost||0),0);
    const byType = {};
    D.health.forEach(h=>{byType[h.record_type]=(byType[h.record_type]||0)+1;});
    pdfRow('Toplam Kayıt:', D.health.length, getY, setY);
    pdfRow('Toplam Maliyet:', '₺'+totalCost.toLocaleString('tr-TR'), getY, setY);
    Object.entries(byType).forEach(([t,n]) => pdfRow(t+':', n+' kayıt', getY, setY));
  });
  
  // Stok özeti
  addSection('ENVANTER DURUMU', (doc, getY, setY) => {
    const critical = D.inventory.filter(i=>(i.current_stock||0)<(i.minimum_stock||0));
    pdfRow('Toplam Ürün:', D.inventory.length, getY, setY);
    pdfRow('Kritik Stok:', critical.length+' ürün', getY, setY);
    critical.slice(0,5).forEach(i => pdfRow('  '+i.name+':', i.current_stock+' '+i.unit, getY, setY));
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(160,160,160);
    doc.line(10,285,200,285);
    doc.text(`${farm.farm_name||'Bizim Çiftlik'} — Sayfa ${i}/${pageCount} — ${today}`, 10, 290);
  }
  
  doc.save(`Kapsamli-Rapor-${new Date().toISOString().slice(0,10)}.pdf`);
  showToast('📄 Kapsamlı rapor indirildi ✓');
}

// ══════════════════════════════════════════════════════════════════════
//  GELİŞTİRİLMİŞ RAPORLAR SAYFASI
// ══════════════════════════════════════════════════════════════════════

// Reports sayfasına kapsamlı rapor butonu ekle (renderReports içine)


// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD — Canlı sayaç ve animasyonlar
// ══════════════════════════════════════════════════════════════════════

function animateCounters() {
  // Stat kartlarındaki sayıları animasyonlu artır
  document.querySelectorAll('.sc-val').forEach(el => {
    const target = parseFloat(el.textContent.replace(/[^0-9.-]/g,''));
    if (!isNaN(target) && target > 0 && target < 100000) {
      let current = 0;
      const increment = target / 30;
      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        const prefix = el.textContent.includes('₺') ? '₺' : '';
        const suffix = el.textContent.includes('%') ? '%' : el.textContent.includes('kg') ? 'kg' : '';
        el.textContent = prefix + Math.round(current).toLocaleString('tr-TR') + suffix;
        if (current >= target) clearInterval(timer);
      }, 30);
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  AYARLAR — Çiftlik tipi bazlı akıllı öneriler
// ══════════════════════════════════════════════════════════════════════

async function getSmartSetupSuggestions() {
  const farmType = D.settings.type || 'Karma';
  const animalCount = D.animals.length;
  const missingFeatures = [];
  
  if (!D.inventory.length) missingFeatures.push('Envanter girişi');
  if (!D.employees.length) missingFeatures.push('Çalışan kaydı');
  if (!D.lands.length) missingFeatures.push('Arazi tanımlaması');
  if (!D.settings.lat) missingFeatures.push('GPS konumu (harita için)');
  if (!D.settings.groq_key) missingFeatures.push('Groq API anahtarı (AI için)');
  if (!D.equipment?.length) missingFeatures.push('Ekipman kaydı');
  
  return missingFeatures;
}

// Ayarlar sayfasında kurulum tamamlama yüzdesi göster
function renderSetupProgress() {
  const items = [
    { label: 'Çiftlik bilgileri', done: !!(D.settings.farm_name && D.settings.owner) },
    { label: 'Hayvan kaydı', done: D.animals.length > 0 },
    { label: 'Sağlık kaydı', done: D.health.length > 0 },
    { label: 'Finans kaydı', done: D.finance.length > 0 },
    { label: 'Envanter', done: D.inventory.length > 0 },
    { label: 'AI API', done: !!(D.settings.groq_key || localStorage.getItem('_groq_key')) },
    { label: 'Çalışanlar', done: D.employees.length > 0 },
    { label: 'Ekipman', done: !!(D.equipment?.length > 0) },
  ];
  
  const done = items.filter(i => i.done).length;
  const pct = Math.round(done/items.length*100);
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
  
  const el = document.getElementById('setup-progress');
  if (!el) return;
  el.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12.5px;font-weight:600">Kurulum Tamamlama</span>
        <span style="font-size:12.5px;font-weight:700;color:${color}">${pct}%</span>
      </div>
      <div style="height:8px;background:var(--brd);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};transition:width 1s;border-radius:4px"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${items.map(item => `
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${item.done?'var(--txt)':'var(--sub)'}">
          <span style="color:${item.done?'#16a34a':'#94a3b8'};font-size:14px">${item.done?'✅':'⭕'}</span>
          ${item.label}
        </div>`).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  HAYVAN SAYFASI — Hızlı filtre butonları
// ══════════════════════════════════════════════════════════════════════



// ══════════════════════════════════════════════════════════════════════
//  GLOBAL ARAMA — Ekipman ve Genealogy sayfaları dahil et
// ══════════════════════════════════════════════════════════════════════

const _origGSR = window.showGlobalSearchResults;
window.showGlobalSearchResults = function(q) {
  if (typeof _origGSR === 'function') _origGSR(q);
  
  const dropdown = document.getElementById('global-search-results');
  if (!dropdown || !q || q.length < 2) return;
  
  const extra = [];
  
  // Ekipman arama
  if (D.equipment) {
    D.equipment.filter(e => (e.name||'').toLowerCase().includes(q.toLowerCase()) || (e.type||'').toLowerCase().includes(q.toLowerCase()))
      .slice(0,3).forEach(e => extra.push({
        icon: '🔧', title: e.name, sub: `${e.type} · ${e.status}`,
        action: `showPage('Equipment',null)`
      }));
  }
  
  // Görev arama — başlık dışı kategori ve atanan kişi
  D.tasks.filter(t => (t.assigned_to||'').toLowerCase().includes(q.toLowerCase()) || (t.category||'').toLowerCase().includes(q.toLowerCase()))
    .filter(t => !(t.title||'').toLowerCase().includes(q.toLowerCase())) // Başlıkla bulunanları çıkar
    .slice(0,2).forEach(t => extra.push({
      icon: '✅', title: t.title, sub: `${t.category||''} · ${t.assigned_to||''} · ${t.status}`,
      action: `showPage('Tasks',null)`
    }));
  
  if (extra.length > 0) {
    const existingHTML = dropdown.innerHTML;
    const extraHTML = extra.map(item => `
      <div class="gsr-item" onclick="closeGlobalSearch();${item.action}">
        <div class="gsr-ico" style="background:var(--bg);font-size:16px;display:flex;align-items:center;justify-content:center">${item.icon}</div>
        <div class="gsr-main">
          <div class="gsr-title">${item.title}</div>
          <div class="gsr-sub">${item.sub}</div>
        </div>
      </div>`).join('');
    dropdown.innerHTML = existingHTML + extraHTML;
  }
};

// ══════════════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS — Ek kısayollar
// ══════════════════════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  
  // Alt + E → Ekipman
  if (e.altKey && e.key === 'e') { e.preventDefault(); showPage('Equipment',null); }
  // Alt + G → Genealogy (Soy Ağacı)
  if (e.altKey && e.key === 'g') { e.preventDefault(); showPage('Genealogy',null); }
  // Alt + C → Karşılaştır
  if (e.altKey && e.key === 'c') { e.preventDefault(); openAnimalCompare(); }
  // Alt + R → Raporlar
  if (e.altKey && e.key === 'r') { e.preventDefault(); showPage('Reports',null); }
  // Alt + I → Envanter
  if (e.altKey && e.key === 'i') { e.preventDefault(); showPage('Inventory',null); }
  // Alt + P → Üretim
  if (e.altKey && e.key === 'p') { e.preventDefault(); showPage('Production',null); }
  // F5 → Dashboard yenile (sayfa yenilemesini engelle)
  if (e.key === 'F5' && !e.ctrlKey) { 
    e.preventDefault(); 
    if (curPage === 'Dashboard') { renderDashboard(); showToast('🔄 Dashboard yenilendi'); }
  }
});

// ══════════════════════════════════════════════════════════════════════
//  HAYVAN DETAY — Hızlı işlem menüsü
// ══════════════════════════════════════════════════════════════════════

function openAnimalQuickActions(tagNumber) {
  const animal = D.animals.find(a => a.tag_number === tagNumber);
  if (!animal) return;
  const idx = D.animals.indexOf(animal);

  // DOM ile oluştur — tırnak çakışması yok
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';

  function qaBtn(emoji, label, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + cls;
    btn.style.cssText = 'padding:16px 8px;flex-direction:column;gap:8px;display:flex;align-items:center;justify-content:center;min-height:72px;font-size:13px;font-weight:600;border-radius:10px';
    const ico = document.createElement('span');
    ico.style.fontSize = '26px';
    ico.style.lineHeight = '1';
    ico.textContent = emoji;
    const lbl = document.createElement('span');
    lbl.textContent = label;
    btn.appendChild(ico);
    btn.appendChild(lbl);
    btn.addEventListener('click', onClick);
    return btn;
  }

  grid.appendChild(qaBtn('📋','Detay','btn-pr', () => { closeModal(); openAnimalDetail(idx); }));
  grid.appendChild(qaBtn('💊','Sağlık Kaydı','btn-sec', () => { closeModal(); openForm('health'); setTimeout(()=>sv('f-tag', tagNumber), 100); }));
  grid.appendChild(qaBtn('🥛','Üretim Kaydı','btn-sec', () => { closeModal(); openForm('production'); setTimeout(()=>sv('f-tag', tagNumber), 100); }));
  grid.appendChild(qaBtn('🌾','Yemleme','btn-sec', () => { closeModal(); openForm('feeding'); setTimeout(()=>sv('f-tag', tagNumber), 100); }));
  grid.appendChild(qaBtn('🐣','Üreme Kaydı','btn-sec', () => { closeModal(); openForm('repro'); setTimeout(()=>sv('f-tag', tagNumber), 100); }));
  grid.appendChild(qaBtn('🌳','Soy Ağacı','btn-sec', () => {
    closeModal();
    const sel = document.getElementById('gen-animal-sel');
    if (sel) sel.value = tagNumber;
    showPage('Genealogy', null);
  }));
  grid.appendChild(qaBtn('🔧','Ekipman','btn-sec', () => { closeModal(); openEquipmentForm(); showToast('Ekipman formu açıldı'); }));
  grid.appendChild(qaBtn('🗑️','Sil','btn-danger', () => {
    closeModal();
    if (confirm(tagNumber + ' silinsin?')) {
      D.animals.splice(idx, 1);
      persist();
      renderAnimals();
      showToast('Silindi');
    }
  }));

  document.getElementById('md-title').textContent = tagNumber + (animal.name ? ' · ' + animal.name : '') + ' — Hızlı İşlemler';
  const body = document.getElementById('md-body');
  body.innerHTML = '';
  body.appendChild(grid);
  document.getElementById('ov').style.display = 'block';
  document.getElementById('md').style.display = 'block';
}


function initV4() {
  // ── 1. Temel UI ──
  buildNav();
  updateMenuBtn();
  window.addEventListener('resize', updateMenuBtn);
  applyAllPrefs();
  if (typeof applyRoleFilter === 'function') applyRoleFilter();
  try{ if(typeof restoreMicFabPos==='function') restoreMicFabPos(); }catch(e){}

  // ── 2. v4 sayfaları ve nav ──
  injectNewPages();
  addNewNavItems();

  // showPage hook: renderPage map içinde yönetiliyor
  if (typeof upgradeNotifButton === 'function') upgradeNotifButton();
  if (typeof updateOfflineIndicator === 'function') updateOfflineIndicator();

  // ── 3. İlk render ──
  renderDashboard();

  // ── 4. Oturum ──
  try {
    const session = localStorage.getItem('_cf_session');
    if (session) {
      const user = JSON.parse(session);
      currentSession = user;
      if (typeof updateTopbarUser === 'function') updateTopbarUser(user);
    }
  } catch(e) {}

  // ── 5. Gecikmeli işlemler ──
  setTimeout(() => { try { renderNotifs(); } catch(e) {} }, 400);
  setTimeout(() => {
    try { if (typeof loadServerNotifs === 'function') loadServerNotifs(); } catch(e) {}
  }, 600);
  setTimeout(() => {
    try { if (D.settings.ai_auto_brief !== false) autoDailyBriefing(); } catch(e) {}
  }, 1200);
  setTimeout(() => {
    try { if (typeof showPredictiveAlertsPanel === 'function') showPredictiveAlertsPanel(); } catch(e) {}
  }, 1800);

  // ── 6. Offline sync ──
  setInterval(() => {
    try {
      if (navigator.onLine && typeof getSyncQueue === 'function' && getSyncQueue().length > 0) syncWithServer();
    } catch(e) {}
  }, 5 * 60 * 1000);

  // ── 6b. Kantar otomatik senkron ──
  try{ setupKantarAutoPoll(); }catch(e){}
  // ── 6c. Bulut yedekleme otomatik başlatma ──
  try{ setupYedekAutoInterval(); }catch(e){}

  // ── 7. PWA — IndexedDB büyük veri önbelleği + Offline panel ──
  initIndexedDB();
  initOfflineStatusPanel();

  // ── 7. Service Worker — Blob URL ile inline kayıt ──
  if ('serviceWorker' in navigator) {
    try {
      const swCode = `
const CACHE='bizim-ciftlik-v4';
const ASSETS=['/','js/01-core-utils.js','js/02-hayvan-detay.js','js/03-hayvan-listesi-grafik.js','js/04-hava-hastalik-bildirim.js','js/05-kasap-kantar-yedek.js','js/06-qr-arama.js','js/07-takvim-butce.js','js/08-login-notif-sut.js','js/09-finans-raporlama.js','js/10-init.js'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request))
  );
});
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});
`;
      const swBlob = new Blob([swCode], {type:'application/javascript'});
      const swURL = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swURL, {scope: '/'}).then(reg=>{
        if('SyncManager' in window){
          navigator.serviceWorker.ready.then(sw=>{
            sw.sync.register('sync-data').catch(()=>{});
          });
        }
        navigator.serviceWorker.addEventListener('message',e=>{
          if(e.data?.type==='SYNC_REQUEST' && navigator.onLine){
            if(typeof syncWithServer==='function') syncWithServer();
          }
        });
      }).catch(()=>{
        // Blob URL scope sorunu olursa sessizce geç
      });
    } catch(e) {}
  }

  console.log('Bizim Çiftlik başlatıldı');
  // Badge güncelle
  setTimeout(updateBottomNavBadges, 600);

  // ── PWA Kurulum ──
  initPWAInstall();
}

function initPWAInstall(){
  let deferredPrompt=null;
  const banner=document.getElementById('pwa-banner');
  const installBtn=document.getElementById('pwa-install-btn');
  const dismissed=localStorage.getItem('pwa-dismissed');

  // beforeinstallprompt: Chrome/Android'de tetiklenir
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(!dismissed && banner){
      banner.style.display='flex';
    }
    if(installBtn){
      installBtn.onclick=async()=>{
        if(!deferredPrompt)return;
        deferredPrompt.prompt();
        const{outcome}=await deferredPrompt.userChoice;
        deferredPrompt=null;
        if(banner) banner.style.display='none';
        if(outcome==='accepted') showToast('✅ Uygulama ana ekrana eklendi!');
      };
    }
  });

  // Zaten yüklüyse banner gösterme
  window.addEventListener('appinstalled',()=>{
    if(banner) banner.style.display='none';
    deferredPrompt=null;
    showToast('✅ Uygulama başarıyla yüklendi!');
  });

  // iOS Safari için ayrı yönerge (beforeinstallprompt desteklemez)
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone=window.navigator.standalone===true;
  if(isIOS && !isInStandalone && !dismissed && banner){
    banner.style.display='flex';
    if(installBtn){
      installBtn.textContent='Nasıl yüklenir?';
      installBtn.onclick=()=>{
        banner.style.display='none';
        showToast('Safari → Paylaş → Ana Ekrana Ekle ✅','yl');
      };
    }
    // Banner altına iOS notu ekle
    const note=document.createElement('div');
    note.style.cssText='font-size:10px;opacity:.65;margin-top:4px;width:100%;text-align:center';
    note.textContent='Safari → Paylaş butonu → Ana Ekrana Ekle';
    banner.appendChild(note);
  }
}

// Tek güvenli başlatma noktası
