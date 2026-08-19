function calcSaleTotal(){const el=document.getElementById('f-tl');if(el){const t=gnv('f-qt')*gnv('f-up');el.value=isNaN(t)?'':t.toFixed(2);}}
function calcFeedCost(){const el=document.getElementById('f-tc');if(el){const t=gnv('f-qt')*gnv('f-cp');el.value=isNaN(t)?'':t.toFixed(2);}}
function deliverOrder(idx){
  const o=D.orders[idx];if(!o||o.status==='Teslim Edildi'||o.status==='İptal')return;
  const avail=(D.cuts||[]).filter(c=>c.part_name===o.part_name).reduce((s,c)=>s+nv(c.remaining_kg),0);
  if(nv(o.quantity_kg)>avail+0.001){showToast(`Yetersiz stok! ${o.part_name} kalan stok: ${avail.toFixed(1)} kg`,'yl');return;}
  let remaining=nv(o.quantity_kg);
  const matches=(D.cuts||[]).filter(c=>c.part_name===o.part_name&&nv(c.remaining_kg)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  for(const c of matches){
    if(remaining<=0)break;
    const take=Math.min(nv(c.remaining_kg),remaining);
    c.remaining_kg=parseFloat((nv(c.remaining_kg)-take).toFixed(2));
    remaining-=take;
  }
  D.finance.push({type:'Gelir',category:'Et Satışı',amount:nv(o.total_amount),date:today(),description:`Sipariş teslimi: ${o.part_name}${o.customer_name?' - '+o.customer_name:''} (${o.quantity_kg}kg)`,payment_method:'Nakit'});
  o.status='Teslim Edildi';o.payment_status='Ödendi';
  persist();showToast('Sipariş teslim edildi ✓');renderOrders();
}
function cancelOrder(idx){
  const o=D.orders[idx];if(!o)return;
  if(!confirm('Siparişi iptal etmek istediğinize emin misiniz?'))return;
  o.status='İptal';persist();renderOrders();
}
// Hayvan formunda "Son Okumayı Getir" — çiftlik kantarına en son çıkan hayvanın
// RFID kart UID'sini çekip forma yazar. Böylece küpe no ile RFID kart no bir kez
// eşleştirilip hayvana kalıcı olarak bağlanır (rfid_uid alanı).
async function sonRfidOkumasiniGetir(){
  const url=D.settings.kantar_db_url;
  if(!url){showToast('Önce Tartım Takibi sayfasından Kantar Bağlantısı ayarlarını kaydedin','yl');return;}
  try{
    const res=await fetch(url+'/kantar_okumalari.json?orderBy="zaman"&limitToLast=1');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data){showToast('Henüz kantar okuması yok. Hayvanı önce kantara çıkarın.','yl');return;}
    const son=Object.values(data)[0];
    if(!son||!son.rfid){showToast('Son okumada RFID bilgisi yok','yl');return;}
    const el=document.getElementById('f-rfid');
    if(el)el.value=son.rfid;
    showToast(`RFID getirildi: ${son.rfid} (${son.kilo||'-'} kg) — kaydetmeyi unutmayın`);
  }catch(e){
    showToast('Kantar okuma hatası: '+e.message,'rd');
  }
}

// ===================== BULUT YEDEKLEME (aynı Firebase adresini kullanır) =====================
let _yedekInterval=null;
function yedekAyarlariniKaydet(){
  const yc=document.getElementById('f-yedek-auto');
  D.settings.yedekleme_auto=yc?yc.checked:false;
  persist();
  showToast('Yedekleme ayarları kaydedildi ✓');
  setupYedekAutoInterval();
}
function setupYedekAutoInterval(){
  if(_yedekInterval){clearInterval(_yedekInterval);_yedekInterval=null;}
  if(D.settings.yedekleme_auto&&D.settings.kantar_db_url){
    _yedekInterval=setInterval(()=>yedekAl(false),10*60*1000); // 10 dakikada bir
  }
}
async function yedekAl(manual){
  const url=D.settings.kantar_db_url;
  if(!url){if(manual)showToast('Önce Firebase adresini kaydedin (Tartım Takibi > Kantar Bağlantısı)','yl');return;}
  try{
    const gövde=JSON.stringify({tarih:new Date().toISOString(),veri:D});
    // Her zaman "son" yedeği güncelle + son 7 günü ayrı sakla (basit versiyon geçmişi)
    await fetch(url+'/yedekler/son.json',{method:'PUT',body:gövde});
    await fetch(url+'/yedekler/gunluk/'+today()+'.json',{method:'PUT',body:gövde});
    const lblEl=document.getElementById('yedek-last');
    if(lblEl)lblEl.textContent='Son yedek: '+new Date().toLocaleTimeString('tr-TR');
    if(manual)showToast('Yedekleme tamamlandı ✓');
  }catch(e){
    if(manual)showToast('Yedekleme hatası: '+e.message,'rd');
    console.warn('Yedekleme hatası',e);
  }
}
async function yedekGeriYukle(){
  const url=D.settings.kantar_db_url;
  if(!url){showToast('Önce Firebase adresini kaydedin (Tartım Takibi > Kantar Bağlantısı)','yl');return;}
  if(!confirm('DİKKAT: Bu işlem, bu cihazdaki TÜM mevcut veriyi buluttaki son yedekle değiştirecek. Geri alınamaz. Devam edilsin mi?'))return;
  try{
    const res=await fetch(url+'/yedekler/son.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||!data.veri){showToast('Bulutta henüz bir yedek bulunamadı','yl');return;}
    Object.keys(D).forEach(k=>delete D[k]);
    Object.assign(D,data.veri);
    persist();
    showToast(`Yedek geri yüklendi ✓ (Yedek tarihi: ${new Date(data.tarih).toLocaleString('tr-TR')})`);
    location.reload();
  }catch(e){
    showToast('Geri yükleme hatası: '+e.message,'rd');
  }
}
// Sekme kapanırken/yenilenirken son bir yedekleme denemesi (best-effort)
window.addEventListener('beforeunload',()=>{
  try{
    if(D.settings.yedekleme_auto&&D.settings.kantar_db_url){
      const gövde=JSON.stringify({tarih:new Date().toISOString(),veri:D});
      fetch(D.settings.kantar_db_url+'/yedekler/son.json',{method:'PUT',body:gövde,keepalive:true});
    }
  }catch(e){}
});

// ===================== KANTAR ENTEGRASYONU (ESP32 → Firebase RTDB → PWA) =====================
// ESP32 cihazları kilo/RFID okumalarını Firebase Realtime Database'e "kantar_okumalari" altına yazar.
// Bu PWA, belirlenen aralıklarla o veriyi çekip eşleşen hayvana otomatik tartım kaydı olarak işler.
let _kantarInterval=null;
function setupKantarAutoPoll(){
  if(_kantarInterval){clearInterval(_kantarInterval);_kantarInterval=null;}
  if(D.settings.kantar_auto&&D.settings.kantar_db_url){
    _kantarInterval=setInterval(()=>pollKantarVerisi(false),60000);
    pollKantarVerisi(false);
  }
}
function saveKantarSettings(){
  D.settings.kantar_db_url=(gv('f-kantar-url')||'').trim().replace(/\/$/,'');
  const cb=document.getElementById('f-kantar-auto');
  D.settings.kantar_auto=cb?cb.checked:false;
  D.settings.kantar_ciftlik_id=(gv('f-kantar-ciftlik')||'').trim();
  D.settings.kantar_kesim_id=(gv('f-kantar-kesim')||'').trim();
  D.settings.kantar_kasap_id=(gv('f-kantar-kasap')||'').trim();
  persist();
  showToast('Kantar ayarları kaydedildi ✓');
  setupKantarAutoPoll();
}
// Kesim ve Kasap kantarları — o anki (canlı) okumayı Firebase'den çekip forma yazar.
// rol: 'kesim_canli' | 'kesim_karkas' | 'kasap'
async function kantardanOku(rol,inputId,sonraCagir){
  const url=D.settings.kantar_db_url;
  if(!url){showToast('Önce Kantar Bağlantısı ayarlarını kaydedin (Tartım Takibi sayfası)','yl');return;}
  let cihazId,dugum;
  if(rol==='kesim_canli'){cihazId=D.settings.kantar_kesim_id;dugum='kantar_anlik/'+cihazId+'_canli';}
  else if(rol==='kesim_karkas'){cihazId=D.settings.kantar_kesim_id;dugum='kantar_anlik/'+cihazId+'_karkas';}
  else{cihazId=D.settings.kantar_kasap_id;dugum='kantar_anlik/'+cihazId;}
  if(!cihazId){showToast('Bu kantar için cihaz_id tanımlı değil (Tartım Takibi > Kantar Bağlantısı)','yl');return;}
  try{
    const res=await fetch(url+'/'+dugum+'.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||data.kilo==null){showToast('Kantardan henüz veri gelmemiş','yl');return;}
    const el=document.getElementById(inputId);
    if(el){el.value=parseFloat(data.kilo).toFixed(1);if(sonraCagir)sonraCagir();}
    showToast(`Kantar okundu: ${parseFloat(data.kilo).toFixed(1)} kg ✓`);
  }catch(e){
    showToast('Kantar okuma hatası: '+e.message,'rd');
  }
}
async function pollKantarVerisi(manual){
  const url=D.settings.kantar_db_url;
  if(!url){if(manual)showToast('Önce kantar bağlantı adresini kaydedin','yl');return;}
  try{
    const res=await fetch(url+'/kantar_okumalari.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const lblEl=document.getElementById('kantar-last-sync');
    if(lblEl)lblEl.textContent=new Date().toLocaleTimeString('tr-TR');
    if(!data){if(manual)showToast('Yeni veri yok');return;}
    const lastTs=D.settings.kantar_last_ts||'';
    const entries=Object.values(data).filter(r=>r&&r.zaman&&r.zaman>lastTs).sort((a,b)=>(a.zaman||'').localeCompare(b.zaman||''));
    let count=0,unmatched=0;
    entries.forEach(r=>{
      const tag=r.rfid||r.kupe||r.animal_tag;
      const kilo=parseFloat(r.kilo);
      if(D.settings.kantar_last_ts===undefined||r.zaman>(D.settings.kantar_last_ts||''))D.settings.kantar_last_ts=r.zaman;
      if(!tag||isNaN(kilo))return;
      const animal=D.animals.find(a=>a.rfid_uid&&a.rfid_uid===tag)||D.animals.find(a=>a.tag_number===tag);
      if(!animal){unmatched++;return;}
      if(!D.weights)D.weights=[];
      D.weights.push({tag:animal.tag_number,date:(r.zaman||'').slice(0,10)||today(),weight:kilo,note:`Kantar: ${r.cihaz_id||r.kantar_tipi||'-'}`});
      animal.weight=kilo;
      count++;
    });
    if(count>0){persist();showToast(`${count} yeni tartım otomatik eklendi ✓${unmatched?' ('+unmatched+' eşleşmeyen RFID)':''}`);renderPage(curPage);}
    else{persist();if(manual)showToast(unmatched?`${unmatched} okuma var ama eşleşen hayvan bulunamadı`:'Yeni tartım verisi yok','yl');}
  }catch(e){
    if(manual)showToast('Kantar bağlantı hatası: '+e.message,'rd');
    console.warn('Kantar poll error',e);
  }
}
function calcYield(){const el=document.getElementById('f-yl');if(el){const lw=gnv('f-lw'),cw=gnv('f-cw');const y=lw?(cw/lw*100):NaN;el.value=isNaN(y)?'':y.toFixed(2)+' %';}}

function previewFormPhotos(input){
  const files=Array.from(input.files);
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      formPhotos.push(e.target.result);
      const prev=document.getElementById('f-photo-preview');
      if(prev){
        const idx=formPhotos.length-1;
        const div=document.createElement('div');div.className='photo-preview-item';
        div.innerHTML=`<img src="${e.target.result}" alt=""/><button class="rm" onclick="removeFormPhoto(${idx},this.parentElement)">✕</button>`;
        prev.appendChild(div);
      }
    };
    reader.readAsDataURL(file);
  });
  input.value='';
}
function removeFormPhoto(idx,el){formPhotos.splice(idx,1);el?.remove();}

// ── HAYVAN KAMERA SİSTEMİ ────────────────────────────────────
let _animalCamStream = null;
let _animalCamFacing = 'environment'; // arka kamera

async function openAnimalCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Kamera bu cihazda desteklenmiyor', 'yl');
    return;
  }
  const wrap = document.getElementById('animal-cam-wrap');
  const video = document.getElementById('animal-cam-video');
  if (!wrap || !video) return;

  try {
    // Varolan stream'i kapat
    if (_animalCamStream) {
      _animalCamStream.getTracks().forEach(t => t.stop());
    }
    _animalCamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: _animalCamFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = _animalCamStream;
    wrap.style.display = 'block';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    showToast('Kamera açılamadı: ' + e.message, 'rd');
  }
}

async function switchAnimalCamera() {
  _animalCamFacing = _animalCamFacing === 'environment' ? 'user' : 'environment';
  await openAnimalCamera();
}

function captureAnimalPhoto() {
  const video = document.getElementById('animal-cam-video');
  const canvas = document.getElementById('animal-cam-canvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  // Ön kamerada ayna görüntüsü düzelt
  if (_animalCamFacing === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  formPhotos.push(dataUrl);

  // Preview'e ekle
  const prev = document.getElementById('f-photo-preview');
  if (prev) {
    const idx = formPhotos.length - 1;
    const div = document.createElement('div');
    div.className = 'photo-preview-item';
    div.style.cssText = 'position:relative;animation:fadeIn .3s';
    div.innerHTML = `<img src="${dataUrl}" alt="" style="border:2px solid var(--accent)"/>
      <button class="rm" onclick="removeFormPhoto(${idx},this.parentElement)" style="background:#ef4444">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div style="position:absolute;bottom:4px;left:4px;background:var(--accent);color:#fff;border-radius:4px;font-size:9px;padding:1px 5px;font-weight:700">Kamera</div>`;
    prev.appendChild(div);
  }

  // Kısa flash efekti
  const wrap = document.getElementById('animal-cam-wrap');
  if (wrap) {
    wrap.style.opacity = '0.3';
    setTimeout(() => wrap.style.opacity = '1', 150);
  }
  showToast('Fotoğraf çekildi ✓');
}

function closeAnimalCamera() {
  if (_animalCamStream) {
    _animalCamStream.getTracks().forEach(t => t.stop());
    _animalCamStream = null;
  }
  const wrap = document.getElementById('animal-cam-wrap');
  const video = document.getElementById('animal-cam-video');
  if (wrap) wrap.style.display = 'none';
  if (video) video.srcObject = null;
}

// Modal kapanınca kamera closeModal içinde kapatılıyor


let editKey=null,editIdx=-1;
function openForm(type){
  const fd=FD[type];if(!fd)return;
  editKey=type;editIdx=-1;formPhotos=[];
  document.getElementById('md-title').textContent=fd.title;
  document.getElementById('md-body').innerHTML=fd.html+`<div class="modal-act"><button class="btn btn-sec" onclick="closeModal()">İptal</button><button class="btn btn-pr" onclick="submitForm('${type}')">Kaydet</button></div>`;
  document.getElementById('ov').style.display='block';document.getElementById('md').style.display='block';
  const t=today();document.querySelectorAll('#md-body input[type=date]').forEach(el=>{if(!el.value)el.value=t;});
}
function editRecord(type,idx){
  const fd=FD[type];if(!fd||idx<0||idx>=D[fd.key].length)return;
  openForm(type);editIdx=idx;
  const r=D[fd.key][idx];if(r&&fd.fill)fd.fill(r);
}
function submitForm(type){
  const fd=FD[type];if(!fd)return;
  if(fd.validate&&!fd.validate())return;
  const rec=fd.save();
  if(type==='animal'){
    // Handle photos
    const ph=rec._photos||[];delete rec._photos;
    const tagKey=rec.tag_number;
    if(editIdx>=0&&editIdx<D.animals.length){
      const oldTag=D.animals[editIdx].tag_number;
      D.animals[editIdx]=rec;
      // migrate photos if tag changed
      if(oldTag!==tagKey&&D.photos[oldTag]){D.photos[tagKey]=[...(D.photos[tagKey]||[]),...D.photos[oldTag]];delete D.photos[oldTag];}
    } else {D.animals.push(rec);}
    if(ph.length){if(!D.photos[tagKey])D.photos[tagKey]=[];D.photos[tagKey].push(...ph);}
    showToast(editIdx>=0?'Hayvan güncellendi ✓':'Hayvan eklendi ✓');
  } else {
    if(editIdx>=0)D[fd.key][editIdx]=rec;
    else{D[fd.key].push(rec);if(fd.afterSave)fd.afterSave(rec);}
    showToast(editIdx>=0?'Güncellendi ✓':'Eklendi ✓');
  }
  persist();closeModal();
  if(curPage==='AnimalDetail')renderAnimalDetail(detailAnimalIdx);
  else renderPage(curPage);
}
function closeModal(){
  // Kamera açıksa kapat
  if(typeof closeAnimalCamera==='function')closeAnimalCamera();
  // FAB menü açıksa kapat
  if(typeof closeFabMenu==='function')closeFabMenu();
  document.getElementById('ov').style.display='none';
  document.getElementById('md').style.display='none';
  editKey=null;editIdx=-1;formPhotos=[];
}

// ===================== SETTINGS =====================
function saveSettings(){
  const gv2=id=>{const e=document.getElementById(id);return e?(e.type==='checkbox'?e.checked:e.value)||'':''};
  const gcb=id=>{const e=document.getElementById(id);return e?e.checked:false};
  D.settings={
    ...D.settings,
    // Çiftlik
    farm_name:gv2('s-farm'),owner:gv2('s-owner'),location:gv2('s-loc'),phone:gv2('s-ph'),
    email:gv2('s-email'),district:gv2('s-district'),taxno:gv2('s-taxno'),
    address:gv2('s-address'),desc:gv2('s-desc'),type:gv2('s-type'),
    regno:gv2('s-regno'),turkvet:gv2('s-turkvet'),iban:gv2('s-iban'),web:gv2('s-web'),
    // Kapasite
    land:gv2('s-land'),pasture:gv2('s-pasture'),crop:gv2('s-crop'),storage:gv2('s-storage'),
    staff:gv2('s-staff'),fulltime:gv2('s-fulltime'),parttime:gv2('s-parttime'),daily:gv2('s-daily'),
    // Görünüm
    anim:gcb('s-anim'),blur:gcb('s-blur'),shadows:gcb('s-shadows'),
    compact:gcb('s-compact'),sb_always:gcb('s-sb-always'),zebra:gcb('s-zebra'),sticky_hdr:gcb('s-sticky-hdr'),
    homepage:gv2('s-homepage'),
    // Ölçü
    currency:gv2('s-currency'),cursym:gv2('s-cursym'),
    weight_unit:gv2('s-weight-unit'),area_unit:gv2('s-area-unit'),
    vol_unit:gv2('s-vol-unit'),temp_unit:gv2('s-temp-unit'),
    datefmt:gv2('s-datefmt'),weekstart:gv2('s-weekstart'),timefmt:gv2('s-timefmt'),numfmt:gv2('s-numfmt'),
    // AI
    aimodel:gv2('s-aimodel'),ailang:gv2('s-ailang'),ailen:gv2('s-ailen'),aifocus:gv2('s-aifocus'),groq_key:gv2('s-groq-key')||D.settings.groq_key||'',
    gemini_key:gv2('s-gemini-key')||D.settings.gemini_key||'',gemini_model:gv2('s-gemini-model')||D.settings.gemini_model||'gemini-1.5-flash',
    roboflow_key:gv2('s-roboflow-key')||D.settings.roboflow_key||'',roboflow_model:gv2('s-roboflow-model')||D.settings.roboflow_model||'',
    agro_key:gv2('s-agro-key')||D.settings.agro_key||'',agro_freq:gv2('s-agro-freq')||D.settings.agro_freq||'weekly',
    gmaps_key:gv2('s-gmaps-key')||D.settings.gmaps_key||'',gmaps_type:gv2('s-gmaps-type')||D.settings.gmaps_type||'terrain',
    use_gemini:gcb('ai-use-gemini'),use_roboflow:gcb('ai-use-roboflow'),use_agro:gcb('ai-use-agro'),use_gmaps:gcb('ai-use-gmaps'),
    ai_ctx:gcb('ai-ctx'),ai_pro:gcb('ai-pro'),ai_list:gcb('ai-list'),ai_ref:gcb('ai-ref'),ai_auto_brief:gcb('ai-auto-brief'),
    ai_custom:gv2('ai-custom'),
    // Veri
    autobak:gcb('s-autobak'),bakfreq:gv2('s-bakfreq'),
  };
  if(D.settings.autobak)D.settings.last_backup=new Date().toISOString();
  persist();showToast('Ayarlar kaydedildi ✓');
  applyAllPrefs();
}

const CAT_DEFAULTS={"species": ["Sığır", "Manda", "Koyun", "Keçi", "At", "Eşek", "Tavuk", "Hindi", "Kaz", "Ördek", "Bıldırcın", "Arı Kovanı", "Diğer"], "income": ["Süt Geliri", "Et Satışı", "Canlı Hayvan", "Yün Satışı", "Yumurta Satışı", "Gübre Satışı", "Damızlık", "Hibe / Destek", "Diğer Gelir"], "expense": ["Yem & Kaba Yem", "Veteriner", "İlaç & Aşı", "İşçilik & Maaş", "Yakıt & Enerji", "Ekipman & Bakım", "Kira", "Sigorta", "Ulaşım", "Diğer Gider"], "inventory_cat": ["Kesif Yem", "Kaba Yem", "İlaç", "Aşı", "Dezenfektan", "Yakıt", "Tohumluk", "Gübre", "Ekipman", "Sarf Malzeme", "Diğer"], "task_cat": ["Veteriner", "Yem & Sulama", "Temizlik", "İdari", "Hasat", "Tamir", "Eğitim", "Diğer"], "locations": ["Ahır A", "Ahır B", "Padok 1", "Padok 2", "Mera", "Kümes", "Arı Bahçesi", "Depo", "Karantina", "Diğer"], "diseases": ["Mastit", "Şap", "Brucella", "Tüberküloz", "Mavi Dil", "Koksidia", "Solunum Yolu", "İshal", "Topallık", "Diğer"]};

function getCats(key){return (D.settings.cats&&D.settings.cats[key])||CAT_DEFAULTS[key]||[];}
function saveCats(key,arr){if(!D.settings.cats)D.settings.cats={};D.settings.cats[key]=[...arr];persist();}
function resetCats(key){if(!confirm('Varsayılana sıfırlansın?'))return;if(!D.settings.cats)D.settings.cats={};delete D.settings.cats[key];persist();renderCatSection(key);showToast('Sıfırlandı');}

function renderCatSection(key){
  const el=document.getElementById('cats-'+key);if(!el)return;
  const items=getCats(key);
  el.innerHTML=items.map((item,i)=>`<span class="cat-tag">${item}<button class="cat-del" onclick="delCat('${key}',${i})" title="Sil">✕</button></span>`).join('');
}
function addCat(key){
  const v=prompt('Yeni kategori adı:');
  if(!v||!v.trim())return;
  const arr=getCats(key);
  if(arr.map(x=>x.toLowerCase()).includes(v.trim().toLowerCase())){showToast('Bu kategori zaten var','yl');return;}
  arr.push(v.trim());saveCats(key,arr);renderCatSection(key);showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Eklendi');
}
function delCat(key,idx){
  const arr=getCats(key);arr.splice(idx,1);saveCats(key,arr);renderCatSection(key);showToast('Silindi');
}

function showStab(id,btn){
  document.querySelectorAll('.stab').forEach(e=>e.classList.remove('on'));
  document.querySelectorAll('.snav-item').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('stab-'+id);if(el)el.classList.add('on');
  if(btn)btn.classList.add('active');
  // Sekmeye özel init
  if(id==='kategoriler')['species','income','expense','inventory_cat','task_cat','locations','diseases'].forEach(k=>renderCatSection(k));
  if(id==='veri'){renderDataStats2();const yc=document.getElementById('f-yedek-auto');if(yc)yc.checked=!!D.settings.yedekleme_auto;}
  if(id==='hakkinda')renderSysInfo2();
  if(id==='kapasite')renderBarnList();
  if(id==='roller')renderRollerSettings();
  if(id==='auditlog')renderAuditLog();
}

function renderSettings(){
  const s=D.settings||{};
  const sv2=(id,v)=>{const e=document.getElementById(id);if(!e||v==null||v===undefined)return;if(e.tagName==='SELECT'){const o=Array.from(e.options).find(x=>x.value===String(v));if(o){o.selected=true;return;}}e.value=v||''};
  const scb=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v!==false};
  // Çiftlik
  sv2('s-farm',s.farm_name);sv2('s-owner',s.owner);sv2('s-loc',s.location);sv2('s-ph',s.phone);
  sv2('s-email',s.email);sv2('s-district',s.district);sv2('s-taxno',s.taxno);
  sv2('s-address',s.address);sv2('s-desc',s.desc);sv2('s-type',s.type);
  sv2('s-regno',s.regno);sv2('s-turkvet',s.turkvet);sv2('s-iban',s.iban);sv2('s-web',s.web);
  // Kapasite
  sv2('s-land',s.land);sv2('s-pasture',s.pasture);sv2('s-crop',s.crop);sv2('s-storage',s.storage);
  sv2('s-staff',s.staff);sv2('s-fulltime',s.fulltime);sv2('s-parttime',s.parttime);sv2('s-daily',s.daily);
  // Görünüm
  scb('s-anim',s.anim!==false);scb('s-blur',s.blur);scb('s-shadows',s.shadows!==false);
  scb('s-compact',s.compact);scb('s-sb-always',s.sb_always);
  scb('s-zebra',s.zebra!==false);scb('s-sticky-hdr',s.sticky_hdr!==false);
  sv2('s-homepage',s.homepage||'Dashboard');
  // Ölçü
  sv2('s-currency',s.currency||'TRY');sv2('s-cursym',s.cursym||'before');
  sv2('s-weight-unit',s.weight_unit||'kg');sv2('s-area-unit',s.area_unit||'dekar');
  sv2('s-vol-unit',s.vol_unit||'lt');sv2('s-temp-unit',s.temp_unit||'C');
  sv2('s-datefmt',s.datefmt||'DD.MM.YYYY');sv2('s-weekstart',s.weekstart||'1');
  sv2('s-timefmt',s.timefmt||'24');sv2('s-numfmt',s.numfmt||'tr');
  // AI
  sv2('s-aimodel',s.aimodel||'llama-3.3-70b-versatile');sv2('s-ailang',s.ailang||'tr');
  const gkEl=document.getElementById('s-groq-key');
  const storedKey=s.groq_key||localStorage.getItem('_groq_key')||'';
  if(gkEl)gkEl.value=storedKey;
  updateGroqKeyStatus(storedKey);
  sv2('s-ailen',s.ailen||'medium');sv2('s-aifocus',s.aifocus||'general');
  // Yeni API anahtarları
  const gmk=document.getElementById('s-gemini-key');if(gmk)gmk.value=s.gemini_key||'';
  sv2('s-gemini-model',s.gemini_model||'gemini-1.5-flash');
  const rfk=document.getElementById('s-roboflow-key');if(rfk)rfk.value=s.roboflow_key||'';
  const rfm=document.getElementById('s-roboflow-model');if(rfm)rfm.value=s.roboflow_model||'';
  const agk=document.getElementById('s-agro-key');if(agk)agk.value=s.agro_key||'';
  sv2('s-agro-freq',s.agro_freq||'weekly');
  const gmapsk=document.getElementById('s-gmaps-key');if(gmapsk)gmapsk.value=s.gmaps_key||'';
  sv2('s-gmaps-type',s.gmaps_type||'terrain');
  scb('ai-use-gemini',s.use_gemini!==false);
  scb('ai-use-roboflow',s.use_roboflow||false);
  scb('ai-use-agro',s.use_agro||false);
  scb('ai-use-gmaps',s.use_gmaps||false);
  scb('ai-ctx',s.ai_ctx!==false);scb('ai-pro',s.ai_pro);scb('ai-list',s.ai_list);scb('ai-ref',s.ai_ref);scb('ai-auto-brief',s.ai_auto_brief!==false);
  sv2('ai-custom',s.ai_custom);
  // Bildirimler
  const nn=s.notifs||{};
  ['sick','stock','task','today','expiry','birth','vac','cashflow'].forEach(k=>{const e=document.getElementById('n-'+k);if(e)e.checked=nn[k]!==false;});
  sv2('n-sound',s.notif_sound||'off');sv2('n-threshold',s.notif_threshold||'all');scb('n-dashboard',s.notif_dashboard!==false);
  // Veri
  scb('s-autobak',s.autobak!==false);sv2('s-bakfreq',s.bakfreq||'change');
  if(s.last_backup){const el=document.getElementById('last-backup-info');if(el)el.textContent='Son yedek: '+new Date(s.last_backup).toLocaleString('tr-TR');}
  // Tema
  applyAllPrefs();
  // Font boyutu aktif buton
  const fsMap={12:'xs',13:'s',14:'m',15:'l',16:'xl'};
  const fsCur=fsMap[s.font_size||14]||'m';
  document.querySelectorAll('.fs-btn').forEach(b=>b.classList.remove('active'));
  const fsBtn=document.querySelector(`.fs-btn[onclick*="'${fsCur}'"]`);
  if(fsBtn)fsBtn.classList.add('active');
  // Renk aktif
  const curG2=s.accent_g2||'#2d6a4f';
  document.querySelectorAll('.accent-sw').forEach(sw=>{sw.classList.toggle('active',sw.dataset.g2===curG2);});
  const cc=document.getElementById('s-custom-color');if(cc)cc.value=curG2;
}

function saveNotifPrefs(){
  if(!D.settings.notifs)D.settings.notifs={};
  ['sick','stock','task','today','expiry','birth','vac','cashflow'].forEach(k=>{
    const e=document.getElementById('n-'+k);if(e)D.settings.notifs[k]=e.checked;
  });
  const snd=document.getElementById('n-sound');if(snd)D.settings.notif_sound=snd.value;
  const thr=document.getElementById('n-threshold');if(thr)D.settings.notif_threshold=thr.value;
  const dsh=document.getElementById('n-dashboard');if(dsh)D.settings.notif_dashboard=dsh.checked;
  persist();showToast(' Bildirim ayarları kaydedildi');
}

function setTheme(t){
  document.body.dataset.theme=t==='dark'?'dark':'';
  D.settings.theme=t;persist();
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('active'));
  const el=document.getElementById('tc-'+t);if(el)el.classList.add('active');
  showToast(t==='dark'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></span> Koyu tema aktif':' Açık tema aktif');
}

function setAccent(el){
  const g2=el.dataset.g2,g=el.dataset.g;
  document.documentElement.style.setProperty('--g2',g2);
  document.documentElement.style.setProperty('--g',g);
  D.settings.accent_g2=g2;D.settings.accent_g=g;persist();
  document.querySelectorAll('.accent-sw').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  const cc=document.getElementById('s-custom-color');if(cc)cc.value=g2;
  showToast(' Renk güncellendi');
}
function setCustomAccent(hex){
  document.documentElement.style.setProperty('--g2',hex);
  // Koyu versiyonunu hesapla
  const darken=h=>{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return '#'+[Math.max(0,r-40),Math.max(0,g-40),Math.max(0,b-40)].map(x=>x.toString(16).padStart(2,'0')).join('');};
  const dark=darken(hex);
  document.documentElement.style.setProperty('--g',dark);
  D.settings.accent_g2=hex;D.settings.accent_g=dark;persist();
  document.querySelectorAll('.accent-sw').forEach(s=>s.classList.remove('active'));
}

function setFontSize(sz,key){
  document.body.style.fontSize=sz+'px';
  D.settings.font_size=sz;persist();
  document.querySelectorAll('.fs-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.fs-btn').forEach(b=>{if(b.onclick&&b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+key+"'"))b.classList.add('active');});
  const prev=document.getElementById('fs-preview');
  if(prev)prev.style.fontSize=sz+'px';
}

function applyLayoutPrefs(){
  const gcb=id=>{const e=document.getElementById(id);return e?e.checked:undefined};
  const compact=gcb('s-compact');const anim=gcb('s-anim');const shadows=gcb('s-shadows');
  const zebra=gcb('s-zebra');const blur=gcb('s-blur');
  if(compact!==undefined)document.body.classList.toggle('compact',compact);
  if(anim!==undefined)document.documentElement.style.setProperty('--trans',anim?'.15s':'0s');
  if(shadows!==undefined)document.body.classList.toggle('no-shadows',!shadows);
  if(zebra!==undefined)document.body.classList.toggle('zebra',zebra);
  D.settings={...D.settings,compact,anim,shadows,zebra,blur};persist();
}

function applyAllPrefs(){
  const s=D.settings||{};
  if(s.theme==='dark')document.body.dataset.theme='dark';
  else document.body.removeAttribute('data-theme');
  if(s.accent_g2)document.documentElement.style.setProperty('--g2',s.accent_g2);
  if(s.accent_g)document.documentElement.style.setProperty('--g',s.accent_g);
  if(s.font_size)document.body.style.fontSize=s.font_size+'px';
  document.body.classList.toggle('compact',!!s.compact);
  document.body.classList.toggle('no-shadows',!s.shadows&&s.shadows!==undefined?true:false);
  document.body.classList.toggle('zebra',s.zebra!==false);
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('active'));
  const tc=document.getElementById('tc-'+(s.theme||'light'));if(tc)tc.classList.add('active');
}

function renderDataStats2(){
  const el=document.getElementById('ds-grid');if(!el)return;
  const items=[
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span>',v:D.animals.length,l:'Hayvan'},
    {ico:'',v:D.health.length,l:'Sağlık Kaydı'},
    {ico:'',v:D.finance.length,l:'Finans Kaydı'},
    {ico:'',v:D.inventory.length,l:'Envanter'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 17l4-4 4 4 4-8 4 4"/></svg></span>',v:D.production.length,l:'Üretim'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span>',v:D.tasks.length,l:'Görev'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>',v:D.sales.length,l:'Satış'},
    {ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>',v:D.employees.length,l:'Çalışan'},
  ];
  el.innerHTML=items.map(i=>`<div class="ds-card"><div class="ds-ico">${i.ico}</div><div class="ds-val">${i.v}</div><div class="ds-lbl">${i.l}</div></div>`).join('');
  const bak=document.getElementById('last-backup-info');
  if(bak&&D.settings.last_backup)bak.textContent='Son yedek: '+new Date(D.settings.last_backup).toLocaleString('tr-TR');
}

function renderSysInfo2(){
  const el=document.getElementById('sysinfo-rows');if(!el)return;
  const total=Object.keys(D).filter(k=>Array.isArray(D[k])).reduce((s,k)=>s+D[k].length,0);
  const size=()=>{try{return(new Blob([JSON.stringify(D)]).size/1024).toFixed(1)+' KB';}catch{return'--';}};
  const rows=[
    {l:'Uygulama',v:'Bizim Çiftlik v3.2'},
    {l:'Toplam Kayıt',v:total+' adet'},
    {l:'Veri Boyutu',v:size()},
    {l:'Çiftlik',v:D.settings.farm_name||'-'},
    {l:'Tarayıcı',v:navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0]||'Bilinmiyor'},
    {l:'Platform',v:navigator.platform||'-'},
    {l:'Dil',v:navigator.language||'-'},
    {l:'Tarih',v:new Date().toLocaleString('tr-TR')},
  ];
  el.innerHTML=rows.map(r=>`<div class="sysinfo-row"><span class="sir-label">${r.l}</span><span class="sir-val">${r.v}</span></div>`).join('');
}

function addBarn(){
  const name=prompt('Ahır / Bölüm adı:');if(!name||!name.trim())return;
  const cap=prompt('Kapasite (baş):');
  if(!D.settings.barns)D.settings.barns=[];
  D.settings.barns.push({name:name.trim(),capacity:parseInt(cap)||0,type:'Ahır'});
  persist();renderBarnList();showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Ahır eklendi');
}
function delBarn(i){
  D.settings.barns.splice(i,1);persist();renderBarnList();showToast('Silindi');
}
function renderBarnList(){
  const el=document.getElementById('barn-list');if(!el)return;
  const barns=D.settings.barns||[];
  if(!barns.length){el.innerHTML='<p style="color:var(--sub);font-size:12px">Henüz ahır tanımlanmadı</p>';return;}
  el.innerHTML=barns.map((b,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg);border-radius:8px;margin-bottom:5px">
    <span style="font-size:18px"></span>
    <span style="font-weight:600;flex:1">${b.name}</span>
    <span style="font-size:12px;color:var(--sub)">${b.capacity||'-'} baş</span>
    <button class="btn btn-danger btn-sm" onclick="delBarn(${i})">🗑️</button>
  </div>`).join('');
}

function clearSectionUI(){
  const opts=KEYS.map((k,i)=>`${i+1}. ${k}`).join('\n');
  const inp=prompt('Hangi bölümü silmek istiyorsunuz?\n\n'+opts+'\n\nNumara girin:');
  if(!inp)return;
  const idx=parseInt(inp)-1;
  if(idx<0||idx>=KEYS.length){showToast('Geçersiz seçim','rd');return;}
  if(confirm(KEYS[idx]+' verilerini SİLMEK istediğinizden emin misiniz?')){
    D[KEYS[idx]]=[];persist();showToast(KEYS[idx]+' silindi');renderDataStats2();
  }
}

function exportCSV(key,fields){
  const data=D[key];if(!data||!data.length){showToast('Veri yok','yl');return;}
  const cols=fields||Object.keys(data[0]);
  const rows=[cols.join(','),...data.map(r=>cols.map(h=>{const v=r[h]||'';return String(v).includes(',')?`"${v}"`:v;}).join(','))];
  const b=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${key}-${today()}.csv`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast(' CSV indiriliyor...');
}

function exportData(){const b=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`ciftlik-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const p=JSON.parse(ev.target.result);if(confirm('Mevcut veriler silinecek. Devam?')){KEYS.forEach(k=>{if(Array.isArray(p[k]))D[k]=p[k];});if(p.settings)D.settings={...D.settings,...p.settings};if(p.photos)D.photos=p.photos;persist();renderPage(curPage);showToast('İçe aktarıldı ✓');};}catch(e){showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Geçersiz dosya','rd');}};r.readAsText(f);e.target.value='';}
function clearData(){if(confirm('TÜM VERİLER SİLİNECEK!')){KEYS.forEach(k=>D[k]=[]);D.photos={};persist();renderPage(curPage);showToast('Silindi');}}

// ===================== DEMO DATA =====================
function loadDemoData(){
  if(!confirm('Demo verisi yüklensin mi? Mevcut veriler silinecek.\n\n8 koyun (5 yaşında) + 1 koç (4 yaşında)'))return;
  const doff=o=>{const dt=new Date();dt.setDate(dt.getDate()+o);return dt.toISOString().split('T')[0];};

  // ── Çiftlik Ayarları ──
  D.settings={...D.settings,
    farm_name:'Bizim Çiftlik',owner:'',location:'',
    lat:null,lon:null,phone:'',
    type:'Küçükbaş'
  };

  // ── Hayvanlar (8 koyun 5 yaş + 1 koç 4 yaş) ──
  D.animals=[
    {tag_number:'KY001',name:'Sarı',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:65,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY002',name:'Kara',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:63,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY003',name:'Benli',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:67,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY004',name:'Alaca',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:64,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY005',name:'Dölek',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:66,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY006',name:'Pamuk',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:62,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY007',name:'Boncuk',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:68,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KY008',name:'Yıldız',species:'Koyun',breed:'Merinos',gender:'Dişi',status:'Aktif',birth_date:doff(-1825),weight:61,location:'Ağıl',notes:'5 yaşında ana koyun'},
    {tag_number:'KO001',name:'Karabaş',species:'Koyun',breed:'Merinos',gender:'Erkek',status:'Aktif',birth_date:doff(-1460),weight:90,location:'Ağıl',notes:'4 yaşında damızlık koç'}
  ];

  // ── Sağlık Kayıtları ──
  D.health=[
    {animal_tag:'KY001',record_type:'Aşılama',date:doff(-45),diagnosis:'Enterotoksemi Aşısı',medication:'Covexin',vet_name:'Dr. Yılmaz',cost:180,next_date:doff(135)},
    {animal_tag:'KY002',record_type:'Aşılama',date:doff(-45),diagnosis:'Enterotoksemi Aşısı',medication:'Covexin',vet_name:'Dr. Yılmaz',cost:180,next_date:doff(135)},
    {animal_tag:'KZ001',record_type:'Muayene',date:doff(-10),diagnosis:'Genel Kontrol — Sağlıklı',vet_name:'Dr. Yılmaz',cost:50},
    {animal_tag:'KY015',record_type:'Tedavi',date:doff(-7),diagnosis:'Hafif İshal',medication:'Elektrolit + Antibiyotik',vet_name:'Dr. Yılmaz',cost:120,next_date:doff(3)},
    {animal_tag:'TV01',record_type:'Aşılama',date:doff(-30),diagnosis:'Newcastle Aşısı',medication:'Newcastle Vaksin',vet_name:'Dr. Yılmaz',cost:80,next_date:doff(150)},
    {animal_tag:'KP01',record_type:'Aşılama',date:doff(-60),diagnosis:'Kuduz Aşısı',medication:'Rabisin',vet_name:'Dr. Yılmaz',cost:90,next_date:doff(305)}
  ];

  // ── Üretim ──
  D.production=[
    {animal_tag:'TV01',production_type:'Yumurta',date:doff(-1),quantity:16,unit:'adet',quality_grade:'A'},
    {animal_tag:'TV01',production_type:'Yumurta',date:doff(-2),quantity:15,unit:'adet',quality_grade:'A'},
    {animal_tag:'TV01',production_type:'Yumurta',date:doff(-3),quantity:17,unit:'adet',quality_grade:'A'},
    {animal_tag:'KAZ01',production_type:'Yumurta',date:doff(-1),quantity:8,unit:'adet',quality_grade:'A'},
    {animal_tag:'KY001',production_type:'Yün',date:doff(-90),quantity:2.8,unit:'kg',quality_grade:'A'},
    {animal_tag:'KY002',production_type:'Yün',date:doff(-90),quantity:3.1,unit:'kg',quality_grade:'A'}
  ];

  // ── Finansal İşlemler ──
  D.finance=[
    {type:'Gelir',category:'Satış',amount:18500,date:doff(-20),description:'Kuzu satışı (5 adet)',payment_method:'Nakit'},
    {type:'Gelir',category:'Yumurta Satışı',amount:1200,date:doff(-7),description:'Yumurta satışı',payment_method:'Nakit'},
    {type:'Gelir',category:'Yün Satışı',amount:3400,date:doff(-60),description:'Koyun yünü satışı',payment_method:'Banka'},
    {type:'Gider',category:'Yem & Kaba Yem',amount:8500,date:doff(-5),description:'Yonca + kesif yem alımı',payment_method:'EFT'},
    {type:'Gider',category:'Veteriner',amount:720,date:doff(-7),description:'Genel aşılama + tedavi',payment_method:'Nakit'},
    {type:'Gider',category:'Yakıt & Enerji',amount:1200,date:doff(-10),description:'Traktör yakıtı + elektrik',payment_method:'Nakit'},
    {type:'Gider',category:'İşçilik & Maaş',amount:20000,date:doff(-1),description:'Aylık maaş ödemeleri',payment_method:'Banka'},
    {type:'Gelir',category:'Satış',amount:9200,date:doff(-45),description:'Toklu satışı (4 adet)',payment_method:'Nakit'},
    {type:'Gider',category:'Yem & Kaba Yem',amount:7800,date:doff(-35),description:'Geçen ay yem',payment_method:'EFT'}
  ];

  // ── Envanter ──
  D.inventory=[
    {name:'Yonca Otu',category:'Yem',current_stock:1200,minimum_stock:400,unit:'kg',unit_cost:2.8,supplier:'Akhisar Kooperatifi'},
    {name:'Kesif Yem (Koyun)',category:'Yem',current_stock:350,minimum_stock:200,unit:'kg',unit_cost:9.5,supplier:'Purina TR'},
    {name:'Kuzucu Mama',category:'Yem',current_stock:80,minimum_stock:50,unit:'kg',unit_cost:18,supplier:'Tavsan'},
    {name:'Tavuk Yemi',category:'Yem',current_stock:120,minimum_stock:80,unit:'kg',unit_cost:7,supplier:'Akhisar Kooperatifi'},
    {name:'Kaz Yemi',category:'Yem',current_stock:60,minimum_stock:40,unit:'kg',unit_cost:6.5,supplier:'Akhisar Kooperatifi'},
    {name:'Enterotoksemi Aşısı',category:'Aşı',current_stock:30,minimum_stock:20,unit:'doz',unit_cost:35,expiry_date:doff(270)},
    {name:'Newcastle Aşısı',category:'Aşı',current_stock:50,minimum_stock:30,unit:'doz',unit_cost:12,expiry_date:doff(180)},
    {name:'Antibiyotik (Amoksisilin)',category:'İlaç',current_stock:8,minimum_stock:10,unit:'kutu',unit_cost:95,expiry_date:doff(400)},
    {name:'Elektrolit Tozu',category:'İlaç',current_stock:15,minimum_stock:10,unit:'paket',unit_cost:45},
    {name:'Mazot',category:'Yakıt',current_stock:350,minimum_stock:150,unit:'litre',unit_cost:42},
    {name:'Talaş (Altlık)',category:'Sarf Malzeme',current_stock:20,minimum_stock:10,unit:'balya',unit_cost:85}
  ];

  // ── Görevler ──
  D.tasks=[
    {title:'Kuzuların kulak küpesi takılması',category:'İdari',priority:'Yüksek',status:'Bekliyor',due_date:doff(3),assigned_to:'Ali Usta',description:'45 kuzu + 25 toklu kuzusu küpe bekliyor'},
    {title:'Antibiyotik yenilemesi',category:'Veteriner',priority:'Kritik',status:'Bekliyor',due_date:doff(1),assigned_to:'Dr. Yılmaz',description:'Stok kritik seviyede'},
    {title:'Ağıl temizliği ve dezenfeksiyon',category:'Temizlik',priority:'Orta',status:'Bekliyor',due_date:doff(5),assigned_to:'Mehmet'},
    {title:'Kümes Newcastle tekrar aşısı',category:'Veteriner',priority:'Yüksek',status:'Bekliyor',due_date:doff(10),assigned_to:'Dr. Yılmaz'},
    {title:'Yonca siparişi ver',category:'Yem',priority:'Orta',status:'Bekliyor',due_date:doff(7),assigned_to:'Ali Usta'},
    {title:'Koyun kırkımı planlaması',category:'İdari',priority:'Orta',status:'Bekliyor',due_date:doff(30),description:'Yaz kırkımı zamanı geliyor'},
    {title:'Köpek kuduz aşısı yenileme',category:'Veteriner',priority:'Düşük',status:'Bekliyor',due_date:doff(45),assigned_to:'Dr. Yılmaz'}
  ];

  // ── Çalışanlar ──
  D.employees=[
    {name:'Ali Demir',role:'Çiftlik Müdürü',phone:'0532 100 0001',start_date:'2019-03-01',salary:22000,status:'Aktif'},
    {name:'Mehmet Kaya',role:'Çoban',phone:'0541 200 0002',start_date:'2021-06-15',salary:14000,status:'Aktif'},
    {name:'Hasan Çelik',role:'Kümes Sorumlusu',phone:'0533 300 0003',start_date:'2022-09-01',salary:12000,status:'Aktif'}
  ];

  // ── Arazi ──
  D.lands=[
    {name:'Ana Mera',type:'Mera',area:80,location:'Kuzey — Akhisar',capacity:80,status:'Aktif'},
    {name:'Koyun Ağılı',type:'Ahır',area:8,location:'Çiftlik Merkezi',capacity:120,status:'Aktif'},
    {name:'Kuzu Bölmesi',type:'Ahır',area:3,location:'Ağıl İçi',capacity:80,status:'Aktif'},
    {name:'Kümes',type:'Ahır',area:2,location:'Çiftlik Doğusu',capacity:60,status:'Aktif'},
    {name:'Kaz Göleti',type:'Mera',area:5,location:'Çiftlik Batısı',capacity:30,status:'Aktif'}
  ];

  // ── Tedarikçiler ──
  D.suppliers=[
    {name:'Akhisar Tarım Kooperatifi',category:'Yem',contact_person:'Hasan Bey',phone:'0236 411 0001',rating:5},
    {name:'Purina TR Bayii',category:'Yem',contact_person:'Kemal Bey',phone:'0532 500 0002',rating:4},
    {name:'Dr. Yılmaz Veteriner',category:'Veteriner',contact_person:'Dr. Yılmaz',phone:'0532 600 0003',rating:5},
    {name:'Manisa Yem Fabrikası',category:'Yem',rating:4}
  ];

  // ── Üreme kayıtları ──
  D.repro=[
    {animal_tag:'KY001',male_tag:'KY-E001',event_type:'Çiftleşme',date:doff(-210),expected_birth_date:doff(-60),offspring_count:1,outcome:'Başarılı'},
    {animal_tag:'KY007',male_tag:'KY-E001',event_type:'Çiftleşme',date:doff(-205),expected_birth_date:doff(-55),offspring_count:2,outcome:'Başarılı'},
    {animal_tag:'TK01',male_tag:'KY-E002',event_type:'Çiftleşme',date:doff(-200),expected_birth_date:doff(-50),offspring_count:1,outcome:'Başarılı'}
  ];

  persist();
  renderPage(curPage);
  showToast('✅ Demo verisi yüklendi! 8 koyun + 1 koç (toplam 9 hayvan)');
}

// ===================== ARAZİ HARİTASI =====================
// ===================== GELİŞMİŞ İNTERAKTİF HARİTA =====================
let _leafletMap=null;
const _mapLayers={parcels:L&&L.layerGroup?L.layerGroup():null, animals:null, tasks:null, home:null};
const _mapLayerEnabled={parcels:true,animals:true,tasks:true};

const LAND_COLORS={Mera:'#2d6a4f',Ahır:'#3b82f6',Tarla:'#f59e0b',Depo:'#8b5cf6',Padok:'#ec4899',Bahçe:'#f97316',Diğer:'#94a3b8'};
const LAND_OFFSETS=[[-0.003,-0.005],[0.004,-0.003],[-0.002,0.005],[0.005,0.004],[-0.005,0.002],[0.003,0.006],[-0.004,-0.002],[0.002,-0.006],[0.006,-0.001],[-0.001,0.007]];

function showLandView(v){
  const mv=document.getElementById('land-map-view');
  const tv=document.getElementById('land-table-view');
  const mb=document.getElementById('lview-map-btn');
  const tb=document.getElementById('lview-table-btn');
  const lb=document.getElementById('map-layer-btns');
  mv.style.display=v==='map'?'block':'none';
  tv.style.display=v==='table'?'block':'none';
  if(lb)lb.style.display=v==='map'?'flex':'none';
  if(mb){mb.style.background=v==='map'?'var(--accent)':'transparent';mb.style.color=v==='map'?'#fff':'var(--sub)';}
  if(tb){tb.style.background=v==='table'?'var(--accent)':'transparent';tb.style.color=v==='table'?'#fff':'var(--sub)';}
  if(v==='map')setTimeout(initLandMap,120);
}

function mapToggleLayer(key,btn){
  _mapLayerEnabled[key]=!_mapLayerEnabled[key];
  btn.classList.toggle('active',_mapLayerEnabled[key]);
  if(!_leafletMap)return;
  const lg=_mapLayers[key];
  if(!lg)return;
  if(_mapLayerEnabled[key]){if(!_leafletMap.hasLayer(lg))_leafletMap.addLayer(lg);}
  else{if(_leafletMap.hasLayer(lg))_leafletMap.removeLayer(lg);}
}

function mapShowDetail(title,html){
  const panel=document.getElementById('map-detail-panel');
  document.getElementById('mdp-title').textContent=title;
  document.getElementById('mdp-content').innerHTML=html;
  panel.style.display='block';
}

function mapLocateMe(){
  if(!navigator.geolocation){showToast('GPS desteklenmiyor','rd');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    document.getElementById('map-lat').value=lat.toFixed(5);
    document.getElementById('map-lon').value=lon.toFixed(5);
    if(_leafletMap)_leafletMap.setView([lat,lon],14);
    showToast('Konum güncellendi ✓');
  },()=>showToast('Konum alınamadı','rd'));
}

function renderLands(){
  const total=D.lands.length;
  const mera=D.lands.filter(l=>l.type==='Mera').length;
  const ahir=D.lands.filter(l=>l.type==='Ahır'||l.type==='Yapı').length;
  const alan=D.lands.reduce((s,l)=>s+nv(l.area),0);
  const kapasiteDolu=D.lands.reduce((s,l)=>s+nv(l.current_animals),0);

  const stEl=document.getElementById('land-stats');
  if(stEl)stEl.innerHTML=`
    <div class="sc sc-v2" style="--sc-stripe:#16a34a"><div class="sc-val">${total}</div><div class="sc-lbl">Toplam Parsel</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#3b82f6"><div class="sc-val">${alan}</div><div class="sc-lbl">Toplam Alan (da)</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#f59e0b"><div class="sc-val">${mera}</div><div class="sc-lbl">Mera Parseli</div></div>
    <div class="sc sc-v2" style="--sc-stripe:#ec4899"><div class="sc-val">${kapasiteDolu}</div><div class="sc-lbl">Hayvan (Sahada)</div></div>`;

  const tbody=document.getElementById('tbl-lands');
  if(tbody)tbody.innerHTML=D.lands.length?D.lands.map((l,i)=>`
    <tr>
      <td><b>${l.name}</b></td>
      <td><span class="tag t-bl">${l.type}</span></td>
      <td>${l.area||'-'} da</td>
      <td style="font-size:11px;color:var(--sub)">${l.location||'-'}</td>
      <td>${l.capacity||'-'}</td>
      <td>${l.current_animals||0}</td>
      <td>${stag(l.status)}</td>
      <td>
        <button class="btn btn-sec btn-sm" onclick="editRecord('land',${i})">Düzenle</button>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('Sil?'))delR('lands',${i})">Sil</button>
      </td>
    </tr>`).join(''):empty(8);

  showLandView('map');
}

function initLandMap(){
  const latIn=document.getElementById('map-lat'),lonIn=document.getElementById('map-lon');
  const lat=parseFloat(latIn?.value)||parseFloat(D.settings.lat)||38.42;
  const lon=parseFloat(lonIn?.value)||parseFloat(D.settings.lon)||27.14;
  if(latIn)latIn.value=lat.toFixed(5);
  if(lonIn)lonIn.value=lon.toFixed(5);
  if(typeof L==='undefined')return;

  // Haritayı başlat veya resetle
  if(_leafletMap){
    Object.values(_mapLayers).forEach(lg=>{if(lg&&_leafletMap.hasLayer(lg))_leafletMap.removeLayer(lg);});
    _leafletMap.setView([lat,lon],13);
  } else {
    const mapEl=document.getElementById('land-map');if(!mapEl)return;
    _leafletMap=L.map('land-map',{zoomControl:false}).setView([lat,lon],13);
    L.control.zoom({position:'bottomright'}).addTo(_leafletMap);
    // Tile katmanları — Uydu / Cadde geçişi
    const street=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19});
    const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:19});
    street.addTo(_leafletMap);
    L.control.layers({'Cadde':street,'Uydu':sat},{},{position:'topright'}).addTo(_leafletMap);
  }

  // Layer group'ları (yeniden) oluştur
  ['parcels','animals','tasks','home'].forEach(k=>{
    if(_mapLayers[k])_mapLayers[k].clearLayers();
    else _mapLayers[k]=L.layerGroup();
  });

  // ── Çiftlik Merkezi ──
  const homeIcon=L.divIcon({
    html:`<div style="background:#1a3c2e;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><path d="M9 22V12h6v10"/></svg></span></div>`,
    className:'',iconSize:[36,36],iconAnchor:[18,18]
  });
  L.marker([lat,lon],{icon:homeIcon})
    .bindPopup(`<div class="map-popup-title"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><path d="M9 22V12h6v10"/></svg></span> ${D.settings.farm_name||'Çiftlik Merkezi'}</div><div class="map-popup-row"><span class="map-popup-label">Konum</span><span class="map-popup-val">${lat.toFixed(4)}, ${lon.toFixed(4)}</span></div>`)
    .addTo(_mapLayers.home);

  // ── Arazi Parselleri ──
  D.lands.forEach((land,i)=>{
    const off=LAND_OFFSETS[i%LAND_OFFSETS.length];
    const lLat=lat+off[0], lLon=lon+off[1];
    const color=LAND_COLORS[land.type]||LAND_COLORS['Diğer'];
    const animalCount=nv(land.current_animals);
    const fillPct=land.capacity?Math.min(100,Math.round(animalCount/nv(land.capacity)*100)):0;

    // Polygon (alan gösterimi) — daire yerine polygon simülasyonu
    const r=Math.max(0.0006, nv(land.area)*0.00005);
    const poly=L.polygon([
      [lLat+r,   lLon-r*1.5],
      [lLat+r,   lLon+r*1.5],
      [lLat-r,   lLon+r*1.5],
      [lLat-r,   lLon-r*1.5]
    ],{color,fillColor:color,fillOpacity:0.2,weight:2,dashArray:land.status==='Aktif'?null:'6,4'})
    .bindPopup(`
      <div class="map-popup-title" style="color:${color}">${land.name}</div>
      <div class="map-popup-row"><span class="map-popup-label">Tip</span><span class="map-popup-val">${land.type}</span></div>
      <div class="map-popup-row"><span class="map-popup-label">Alan</span><span class="map-popup-val">${land.area||'?'} da</span></div>
      <div class="map-popup-row"><span class="map-popup-label">Kapasite</span><span class="map-popup-val">${land.capacity||'?'}</span></div>
      <div class="map-popup-row"><span class="map-popup-label">Hayvan</span><span class="map-popup-val">${animalCount} (${fillPct}%)</span></div>
      <button class="map-popup-btn" onclick="mapShowDetail('${land.name}','${buildLandDetailHTML(land,fillPct)}');this.closest('.leaflet-popup').querySelector('.leaflet-popup-close-button').click()">Detayları Aç</button>
    `)
    .on('click',()=>{});
    poly.addTo(_mapLayers.parcels);

    // Etiket marker
    const lblIcon=L.divIcon({
      html:`<div style="background:${color};color:#fff;border-radius:6px;padding:3px 8px;font-size:10.5px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);border:1.5px solid rgba(255,255,255,.7)">${land.name}<br><span style="font-weight:400;font-size:9px;opacity:.9">${land.area||'?'} da · ${animalCount} hayvan</span></div>`,
      className:'',iconAnchor:[0,0]
    });
    L.marker([lLat,lLon],{icon:lblIcon,zIndexOffset:100}).addTo(_mapLayers.parcels).bindPopup(poly._popup);
  });

  // ── Hayvan Grupları (türe göre kümeleme) ──
  const speciesGroups={};
  D.animals.forEach(a=>{
    const sp=a.species||'Diğer';
    if(!speciesGroups[sp])speciesGroups[sp]={count:0,sick:0};
    speciesGroups[sp].count++;
    if(a.health_status==='Hasta')speciesGroups[sp].sick++;
  });
  const spOffsets=[[0.002,0.003],[0.003,-0.002],[-0.002,0.002],[-0.001,-0.003],[0.004,0.001],[-0.003,0.004]];
  const spList=Object.entries(speciesGroups);
  const spIcons={Sığır:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span>',Koyun:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="11" rx="7" ry="5"/><path d="M7 11v4a2 2 0 0 0 4 0v-1m2 1v-4m2 0v4a2 2 0 0 0 4 0"/><circle cx="8" cy="8" r="2"/></svg></span>',Keçi:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 15c0 3 2 4 4 4s4-1 4-4V9a4 4 0 0 0-8 0v6z"/><path d="M13 10h3l2-3"/><path d="M7 7l-2-3m2 3l2-3"/></svg></span>',At:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 20V10c0-4 3-7 7-7s7 3 7 7v2l2 2-2 1v5"/><path d="M8 20v-3m8 3v-3"/></svg></span>',Tavuk:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 3c-2 0-4 1.5-4 4v2H6l-2 3h4v8h8v-8h4l-2-3h-2V7c0-2.5-2-4-4-4z"/></svg></span>',Hindi:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 3c-2 0-4 1.5-4 4v2H6l-2 3h4v8h8v-8h4l-2-3h-2V7c0-2.5-2-4-4-4z"/></svg></span>',Gaz:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="10" rx="5" ry="4"/><path d="M12 14v6m-4 0h8M7 10c-2 0-4 1-4 3s2 3 4 3"/></svg></span>'};
  spList.forEach(([sp,info],i)=>{
    const off=spOffsets[i%spOffsets.length];
    const aLat=lat+off[0]*0.6+0.001, aLon=lon+off[1]*0.6;
    const hasSick=info.sick>0;
    const bgColor=hasSick?'#ef4444':'#16a34a';
    const ico=spIcons[sp]||'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="14" r="2"/><circle cx="19" cy="14" r="2"/><ellipse cx="12" cy="17" rx="4" ry="3"/></svg></span>';
    const aIcon=L.divIcon({
      html:`<div style="background:${bgColor};color:#fff;border-radius:50%;width:40px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:14px;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.25);line-height:1.1">${ico}<span style="font-size:9px;font-weight:700">${info.count}</span></div>`,
      className:'',iconSize:[40,40],iconAnchor:[20,20]
    });
    L.marker([aLat,aLon],{icon:aIcon})
      .bindPopup(`<div class="map-popup-title">${ico} ${sp}</div>
        <div class="map-popup-row"><span class="map-popup-label">Toplam</span><span class="map-popup-val">${info.count} baş</span></div>
        <div class="map-popup-row"><span class="map-popup-label">Hasta</span><span class="map-popup-val" style="color:${hasSick?'#ef4444':'#16a34a'}">${info.sick}</span></div>
        <button class="map-popup-btn" onclick="showPage('Animals',null)">Hayvanları Gör</button>`)
      .addTo(_mapLayers.animals);
  });

  // ── Acil Görevler ──
  const urgentTasks=D.tasks.filter(t=>t.status!=='Tamamlandı'&&(t.priority==='Acil'||t.priority==='Yüksek'));
  urgentTasks.slice(0,5).forEach((task,i)=>{
    const off=LAND_OFFSETS[(i+5)%LAND_OFFSETS.length];
    const tLat=lat+off[0]*0.4+0.002, tLon=lon+off[1]*0.4-0.002;
    const tColor=task.priority==='Acil'?'#ef4444':'#f59e0b';
    const tIcon=L.divIcon({
      html:`<div style="background:${tColor};color:#fff;border-radius:8px;padding:4px 8px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);border:1.5px solid rgba(255,255,255,.8);max-width:140px;overflow:hidden;text-overflow:ellipsis"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> ${task.title||'Görev'}</div>`,
      className:'',iconAnchor:[0,0]
    });
    L.marker([tLat,tLon],{icon:tIcon,zIndexOffset:200})
      .bindPopup(`<div class="map-popup-title" style="color:${tColor}"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> ${task.title}</div>
        <div class="map-popup-row"><span class="map-popup-label">Öncelik</span><span class="map-popup-val" style="color:${tColor}">${task.priority}</span></div>
        <div class="map-popup-row"><span class="map-popup-label">Atanan</span><span class="map-popup-val">${task.assigned||'-'}</span></div>
        <div class="map-popup-row"><span class="map-popup-label">Son Tarih</span><span class="map-popup-val">${task.due_date||'-'}</span></div>
        <button class="map-popup-btn" style="background:${tColor}" onclick="showPage('Tasks',null)">Göreve Git</button>`)
      .addTo(_mapLayers.tasks);
  });

  // Katmanları haritaya ekle
  Object.entries(_mapLayers).forEach(([k,lg])=>{
    if(!lg)return;
    if(_mapLayerEnabled[k]===false)return;
    lg.addTo(_leafletMap);
  });

  // Home her zaman görünür
  if(_mapLayers.home)_mapLayers.home.addTo(_leafletMap);
}

function buildLandDetailHTML(land,fillPct){
  const color=LAND_COLORS[land.type]||'#94a3b8';
  return `
    <div class="mdp-field"><div class="mdp-label">Tip</div><div class="mdp-value"><span class="mdp-tag" style="background:${color}22;color:${color}">${land.type}</span></div></div>
    <div class="mdp-field"><div class="mdp-label">Alan</div><div class="mdp-value">${land.area||'-'} dekar</div></div>
    <div class="mdp-field"><div class="mdp-label">Konum</div><div class="mdp-value" style="font-size:12px">${land.location||'-'}</div></div>
    <hr class="mdp-divider">
    <div class="mdp-field"><div class="mdp-label">Kapasite</div><div class="mdp-value">${land.capacity||'-'} baş</div></div>
    <div class="mdp-field"><div class="mdp-label">Mevcut Hayvan</div><div class="mdp-value">${land.current_animals||0}</div></div>
    <div style="background:var(--bg);border-radius:6px;overflow:hidden;height:6px;margin:4px 0 8px">
      <div style="height:100%;width:${fillPct}%;background:${fillPct>85?'#ef4444':fillPct>60?'#f59e0b':'#16a34a'};transition:width .5s"></div>
    </div>
    <div class="mdp-field"><div class="mdp-label">Durum</div><div class="mdp-value">${land.status||'-'}</div></div>
    ${land.notes?`<div class="mdp-field"><div class="mdp-label">Notlar</div><div class="mdp-value" style="font-size:11.5px;font-weight:400">${land.notes}</div></div>`:''}
  `.replace(/`/g,"'").replace(/\n/g,' ');
}

// ===================== QR & BARKOD =====================
let _qrStream=null,_qrScanInterval=null,_qrHistory=[];
function renderQRScan(){
  // QR grid oluştur
  const grid=document.getElementById('qr-grid');if(!grid)return;
  grid.innerHTML=D.animals.map(a=>`
    <div style="text-align:center;padding:10px;border:1px solid var(--brd);border-radius:10px;background:var(--card)">
      <div id="qrbox-${a.tag_number}" style="margin:0 auto 6px"></div>
      <div style="font-size:11px;font-weight:600;margin-bottom:4px">${a.tag_number}</div>
      <div style="font-size:10px;color:var(--sub);margin-bottom:6px">${a.name||a.species||''}</div>
      <div style="display:flex;gap:4px;justify-content:center">
        <button class="btn btn-sec btn-sm" onclick="downloadQRNew('${a.tag_number}')">⬇️ İndir</button>
        <button class="btn btn-sec btn-sm" onclick="printQRNew('${a.tag_number}')">🖨️ Yazdır</button>
      </div>
    </div>`).join('');
  // QRCode.js ile gerçek QR kodları oluştur
  if(typeof QRCode!=='undefined'){
    D.animals.forEach(a=>{
      const el=document.getElementById('qrbox-'+a.tag_number);
      if(el&&!el.hasChildNodes()){
        try{new QRCode(el,{text:`ANIMAL:${a.tag_number}`,width:100,height:100,colorDark:'#1e293b',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}catch(e){}
      }
    });
  }
  renderQRHistory();
}
