function wmoToEmoji(code){
  const ic=wmoIcon(48);
  if(code===0)return{ico:ic.sun,svgSm:wmoIcon(24).sun,desc:'Açık ve Güneşli'};
  if(code<=2)return{ico:ic.cloud,svgSm:wmoIcon(24).cloud,desc:'Parçalı Bulutlu'};
  if(code<=3)return{ico:ic.overcast,svgSm:wmoIcon(24).overcast,desc:'Bulutlu'};
  if(code<=48)return{ico:ic.fog,svgSm:wmoIcon(24).fog,desc:'Sisli'};
  if(code<=57)return{ico:ic.drizzle,svgSm:wmoIcon(24).drizzle,desc:'Çisenti'};
  if(code<=65)return{ico:ic.rain,svgSm:wmoIcon(24).rain,desc:'Yağmurlu'};
  if(code<=77)return{ico:ic.snow,svgSm:wmoIcon(24).snow,desc:'Karlı'};
  if(code<=82)return{ico:ic.rain,svgSm:wmoIcon(24).rain,desc:'Sağanak'};
  if(code<=99)return{ico:ic.thunder,svgSm:wmoIcon(24).thunder,desc:'Fırtına'};
  return{ico:ic.overcast,svgSm:wmoIcon(24).overcast,desc:'Değişken'};
}
async function renderWeather(){
  const now=new Date();
  const days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  // Tarih göster
  const dateEl=document.getElementById('w-date');
  if(dateEl)dateEl.textContent=`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const locEl=document.getElementById('wm-loc');
  if(locEl)locEl.innerHTML='<span style="opacity:.7">📍 Konum alınıyor...</span>';

  // Hava verisini çek (fetchWeather içinde GPS otomatik alınır)
  const data=await fetchWeather();

  // Konum güncelle (GPS veya settings'ten)
  if(locEl){
    const cityName=D.settings.location||'';
    const hasGPS=D.settings.lat&&D.settings.lon;
    if(cityName) locEl.textContent=(hasGPS?'📍 ':'')+cityName;
    else if(hasGPS) locEl.textContent=`📍 ${D.settings.lat.toFixed(2)}°N, ${D.settings.lon.toFixed(2)}°E`;
    else locEl.textContent='📍 İzmir, Türkiye';
  }
  if(data&&data.current){
    const c=data.current;
    const w=wmoToEmoji(c.weather_code);
    // Hero güncelle
    const iconEl=document.getElementById('w-icon');if(iconEl)iconEl.innerHTML=w.ico;
    const tempEl=document.getElementById('w-temp');if(tempEl)tempEl.textContent=`${Math.round(c.temperature_2m)}°C`;
    const descEl=document.getElementById('w-desc');if(descEl)descEl.textContent=w.desc;
    const humEl=document.getElementById('wm-hum');if(humEl)humEl.textContent=`${c.relative_humidity_2m}%`;
    const windEl=document.getElementById('wm-wind');if(windEl)windEl.textContent=`${c.wind_speed_10m} km/h`;
    // Hissedilen sıcaklık
    const feelsEl=document.getElementById('wm-feels');
    if(feelsEl&&c.apparent_temperature!==undefined)feelsEl.textContent=`${Math.round(c.apparent_temperature)}°C`;
    // Hero arka plan rengini hava durumuna göre ayarla
    const hero=document.getElementById('weather-hero');
    if(hero){
      const code=c.weather_code;
      if(code===0)hero.style.background='linear-gradient(135deg,#0ea5e9 0%,#38bdf8 50%,#7dd3fc 100%)';
      else if(code<=2)hero.style.background='linear-gradient(135deg,#0284c7 0%,#0ea5e9 50%,#bae6fd 100%)';
      else if(code<=3)hero.style.background='linear-gradient(135deg,#475569 0%,#64748b 50%,#94a3b8 100%)';
      else if(code<=48)hero.style.background='linear-gradient(135deg,#334155 0%,#64748b 100%)';
      else if(code<=65)hero.style.background='linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#60a5fa 100%)';
      else if(code<=99)hero.style.background='linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#6366f1 100%)';
      else hero.style.background='linear-gradient(135deg,#1a3c2e 0%,#2fb344 100%)';
    }
    // 7 günlük tahmin
    if(data.daily){
      const dn=data.daily;
      const dayLabels=['Bugün','Yarın'];
      document.getElementById('weather-days').innerHTML=`<div class="wdays-grid">${dn.time.slice(0,7).map((t,i)=>{
        const w2=wmoToEmoji(dn.weather_code[i]);
        const label=i<2?dayLabels[i]:new Date(t).toLocaleDateString('tr-TR',{weekday:'short'});
        const isToday=i===0;
        const rain=dn.precipitation_sum?Math.round(dn.precipitation_sum[i]):0;
        return`<div class="wd${isToday?' wd-today':''}">
          <div class="wd-label">${label}</div>
          <div class="wd-icon">${w2.svgSm||w2.ico}</div>
          <div class="wd-desc">${w2.desc.split(' ')[0]}</div>
          <div class="wd-temps">
            <span class="wd-max">${Math.round(dn.temperature_2m_max[i])}°</span>
            <span class="wd-min">${Math.round(dn.temperature_2m_min[i])}°</span>
          </div>
          ${rain>0?`<div class="wd-rain"><svg viewBox="0 0 12 12" fill="none" stroke="#60a5fa" stroke-width="1.5" width="10" height="10"><path d="M6 1C3 5 2 7 2 8.5a4 4 0 0 0 8 0C10 7 9 5 6 1z"/></svg> ${rain}mm</div>`:''}
        </div>`;
      }).join('')}</div>`;
    }
  } else {
    const iconEl=document.getElementById('w-icon');if(iconEl)iconEl.innerHTML=wmoIcon(48).overcast;
    const tempEl=document.getElementById('w-temp');if(tempEl)tempEl.textContent='--°C';
    const descEl=document.getElementById('w-desc');if(descEl)descEl.textContent='Bağlantı hatası';
    document.getElementById('weather-days').innerHTML='<div style="padding:16px;text-align:center;color:var(--sub);font-size:12px">Hava verisi alınamadı — internet bağlantınızı kontrol edin.</div>';
  }

  // Tarımsal takvim
  const agro=[
    {m:'Ocak',ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 6-8 6-8-6m16 12-8-6-8 6"/></svg>',c:'#dbeafe',cc:'#1e40af',a:['Kış bakımı','Ahır ısıtma','Doğum takibi']},
    {m:'Şubat',ic:'🌱',c:'#dbeafe',cc:'#1e40af',a:['Tohum planlaması','Aşı programı','Kuzulama']},
    {m:'Mart',ic:'🌸',c:'#dcfce7',cc:'#166534',a:['Aşılama','Mera hazırlığı','Kırkım hazırlık']},
    {m:'Nisan',ic:'🐑',c:'#dcfce7',cc:'#166534',a:['Kuzu bakımı','Mera rotasyonu','Yem kontrolü']},
    {m:'Mayıs',ic:'✂️',c:'#dcfce7',cc:'#166534',a:['Kırkım','Sürü sayımı','Ürün satışı']},
    {m:'Haziran',ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>',c:'#fef9c3',cc:'#92400e',a:['Su tüketimi artır','Gölge düzenle','Sinek kontrolü']},
    {m:'Temmuz',ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',c:'#fef9c3',cc:'#92400e',a:['Serin saatlerde yaylım','Hafif yem','Serinlik']},
    {m:'Ağustos',ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>',c:'#fef9c3',cc:'#92400e',a:['Satış dönemi','Stok planı','Kış yem siparişi']},
    {m:'Eylül',ic:'🍂',c:'#fff7ed',cc:'#9a3412',a:['Ahır onarım','Kızgınlık takibi','Gebe kontrol']},
    {m:'Ekim',ic:'🥩',c:'#fff7ed',cc:'#9a3412',a:['Yem stoklama','Kış hazırlığı','Kesim planı']},
    {m:'Kasım',ic:'💉',c:'#f3e8ff',cc:'#6b21a8',a:['Aşı tamamlama','Veteriner muayene','Ahır yalıtım']},
    {m:'Aralık',ic:'🏠',c:'#dbeafe',cc:'#1e40af',a:['Kış bakımı','Doğum hazırlığı','Yıllık değerlendirme']}
  ];
  const curMonth=now.getMonth();
  document.getElementById('agro-cal').innerHTML=`<div class="agro-grid">${agro.map((m,i)=>`
    <div class="agro-month${i===curMonth?' agro-active':''}">
      <div class="agro-m-hd">
        <span class="agro-ico">${m.ic}</span>
        <span class="agro-m-name">${m.m}</span>
        ${i===curMonth?'<span class="agro-now-badge">Şimdi</span>':''}
      </div>
      ${m.a.map(a=>`<div class="agro-task">
        <svg viewBox="0 0 8 8" fill="none" width="6" height="6"><circle cx="4" cy="4" r="3" fill="${m.cc}"/></svg>
        ${a}
      </div>`).join('')}
    </div>`).join('')}</div>`;

  // Mevsimler
  const seasonIcons={
    spring:`<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><circle cx="20" cy="12" r="5" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/><path d="M20 2v3M20 19v3M10.2 5.2l2.1 2.1M27.7 22.7l2.1 2.1M7 12h3M30 12h3M10.2 18.8l2.1-2.1M27.7 5.3l2.1-2.1" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/><path d="M20 22C14 28 10 31 10 35h20c0-4-4-7-10-13z" fill="#86efac" stroke="#16a34a" stroke-width="1"/></svg>`,
    summer:`<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><circle cx="20" cy="20" r="10" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/><g stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><line x1="20" y1="3" x2="20" y2="8"/><line x1="20" y1="32" x2="20" y2="37"/><line x1="3" y1="20" x2="8" y2="20"/><line x1="32" y1="20" x2="37" y2="20"/><line x1="7.5" y1="7.5" x2="11" y2="11"/><line x1="29" y1="29" x2="32.5" y2="32.5"/><line x1="32.5" y1="7.5" x2="29" y2="11"/><line x1="11" y1="29" x2="7.5" y2="32.5"/></g></svg>`,
    autumn:`<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><path d="M22 38C16 32 10 24 10 16a12 12 0 0 1 24 0c0 8-6 16-12 22z" fill="#fb923c" stroke="#ea580c" stroke-width="1.5"/><path d="M20 16c-4-4-8-6-12-4 2 4 5 7 10 8" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/><path d="M20 16c4-4 8-6 12-4-2 4-5 7-10 8" fill="#86efac" stroke="#16a34a" stroke-width="1"/></svg>`,
    winter:`<svg viewBox="0 0 40 40" width="36" height="36" fill="none"><line x1="20" y1="4" x2="20" y2="36" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/><line x1="4" y1="20" x2="36" y2="20" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/><line x1="8.7" y1="8.7" x2="31.3" y2="31.3" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/><line x1="31.3" y1="8.7" x2="8.7" y2="31.3" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/><g stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round"><line x1="20" y1="4" x2="16" y2="9"/><line x1="20" y1="4" x2="24" y2="9"/><line x1="20" y1="36" x2="16" y2="31"/><line x1="20" y1="36" x2="24" y2="31"/></g></svg>`
  };
  const seasons=[
    {n:'İlkbahar',i:seasonIcons.spring,c:'#f0fdf4',b:'#86efac',cc:'#166534',m:'Mart – Mayıs',t:['Aşı programı başlat','Mera rotasyonu','Kuzuları takip et','Kırkım hazırlığı']},
    {n:'Yaz',i:seasonIcons.summer,c:'#fffbeb',b:'#fde68a',cc:'#92400e',m:'Haziran – Ağustos',t:['Su tüketimini artır','Gölge alanı düzenle','Sinek ve parazit kontrolü','Serinlik saatlerinde yaylım']},
    {n:'Sonbahar',i:seasonIcons.autumn,c:'#fff7ed',b:'#fed7aa',cc:'#9a3412',m:'Eylül – Kasım',t:['Yem stoklama','Ahır onarım ve yalıtım','Kış aşıları','Sürü değerlendirmesi']},
    {n:'Kış',i:seasonIcons.winter,c:'#eff6ff',b:'#bfdbfe',cc:'#1e40af',m:'Aralık – Şubat',t:['Ahır ısıtma','Ekstra yem takviyesi','Doğum hazırlığı','Günlük sağlık kontrol']}
  ];
  const cs=curMonth<=1||curMonth===11?3:curMonth<=4?0:curMonth<=7?1:2;
  document.getElementById('season-panel').innerHTML=`<div class="seasons-grid">${seasons.map((s,i)=>`
    <div class="season-card${i===cs?' sc-active':''}">
      <div class="sc-top-row">
        <div class="sc-icon">${s.i}</div>
        <div>
          <div class="sc-name">${s.n}</div>
          <div class="sc-months">${s.m}</div>
        </div>
        ${i===cs?'<span class="sc-active-badge">Aktif</span>':''}
      </div>
      <div class="sc-tasks">${s.t.map(t=>`<div class="sc-task">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="7" stroke="${s.b}" stroke-width="1.5"/><polyline points="5 8 7 10 11 6" stroke="${i===cs?s.cc:'#94a3b8'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${t}
      </div>`).join('')}</div>
    </div>`).join('')}</div>`;
}
const SYMPTOMS=[
  {id:'fever',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg> Ateş'},
  {id:'cough',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M9 7c-.7-3 3-5 5-2m1 2h4a2 2 0 0 1 0 4H4"/><path d="M5 17H3a2 2 0 0 0 0 4h13a3 3 0 0 0 0-6H9"/></svg> Öksürük'},
  {id:'nasal',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 2C6 10 4 14 4 17a8 8 0 0 0 16 0c0-3-2-7-8-15z"/></svg> Burun Akıntısı'},
  {id:'diarrhea',label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 4v16M7 4c-2 3-3 6-3 9a4 4 0 0 0 8 0V4M17 4c2 3 3 6 3 9a4 4 0 0 1-8 0V4"/></svg> İshal'},
  {id:'limp',    label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="m9 9 2 0 0 6m4-6 0 6M9 9l-3 9m9-9 3 9"/></svg> Topallama'},
  {id:'noeat',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> İştahsızlık'},
  {id:'lethargy',label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> Halsizlik'},
  {id:'bloat',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg> Şişkinlik'},
  {id:'skin',    label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Deri Lezyonu'},
  {id:'eye',     label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Göz Sorunu'},
  {id:'birth',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="5" r="3"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> Doğum Güçlüğü'},
  {id:'udder',   label:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M8 2h8l1 6H7L8 2z"/><path d="M7 8l1 13h8l1-13"/></svg> Meme İltihabı'}
];
let selSymptoms=new Set();
function renderDisease(){const grid=document.getElementById('symptom-grid');if(!grid)return;grid.innerHTML=SYMPTOMS.map(s=>`<button class="symptom-btn${selSymptoms.has(s.id)?' selected':''}" onclick="toggleSymptom('${s.id}',this)">${s.label}</button>`).join('');}
function toggleSymptom(id,btn){selSymptoms.has(id)?(selSymptoms.delete(id),btn.classList.remove('selected')):(selSymptoms.add(id),btn.classList.add('selected'));}
function clearSymptoms(){selSymptoms.clear();renderDisease();document.getElementById('diag-result').innerHTML='';}
async function runDiagnosis(){
  const species=gv('diag-species'),tag=gv('diag-tag'),notes=gv('diag-notes');
  const syms=SYMPTOMS.filter(s=>selSymptoms.has(s.id)).map(s=>s.label.replace(/^\S+\s/,'')).join(', ');
  if(!syms&&!notes){showToast('En az bir belirti seçin!','yl');return;}
  const el=document.getElementById('diag-result');
  el.innerHTML=`<div class="diag-result"><div class="ai-result loading" style="background:transparent;border:none;color:#7c3aed">Teşhis yapılıyor...</div></div>`;
  try{
    if(!getGroqKey()){el.innerHTML='<div style="padding:12px;color:#f59e0b">API anahtarı girilmemiş. Ayarlar → AI sekmesinden Groq API key girin.</div>';return;}
    const data=await groqCall([{role:'user',content:`Hayvan: ${species||'?'}, Küpe: ${tag||'?'}\nBelirtiler: ${syms||'(not var)'}\nNot: ${notes||'-'}\n\n1. Olası 3 teşhis (% olasılık)\n2. Acil önlemler\n3. Veteriner aciliyet\n4. İlk yardım\n5. Bulaşma riski`}],farmCtx()+'\nSen aynı zamanda veteriner asistanısın.',1000);
    el.innerHTML=`<div class="diag-result"><div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px">AI Teşhis — ${species||'Hayvan'}${tag?' ('+tag+')':''}</div><div style="font-size:12.5px;line-height:1.7;white-space:pre-wrap;color:var(--txt)">${(data.content?.map(c=>c.text||'').join('')||'').replace(/</g,'&lt;')}</div><div style="margin-top:10px;font-size:11px;color:var(--sub);border-top:1px solid var(--brd);padding-top:8px"> AI tahminidir, veterinere danışın.</div></div>`;
  }catch(e){el.innerHTML=`<div class="diag-result"><div class="alert-box alert-rd"> ${e.message}</div></div>`;}
}
let _notifFilter='all';
function setNotifFilter(f,btn){_notifFilter=f;document.querySelectorAll('.notif-filter-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderNotifs();}
function markAllRead(){if(!D.notif_read)D.notif_read={};const items=buildNotifItems();items.forEach(i=>{D.notif_read[i.key]=true;});persist();renderNotifs();showToast('✓ Tümü okundu işaretlendi');}
function clearReadNotifs(){if(!D.notif_read)return;D.notif_read={};persist();renderNotifs();}
function buildNotifItems(){
  const items=[];const soon30=new Date();soon30.setDate(soon30.getDate()+30);const soon7=new Date();soon7.setDate(soon7.getDate()+7);
  D.animals.filter(a=>a.status==='Hasta').forEach(a=>items.push({t:'rd',cat:'sağlık',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span>',title:`${a.tag_number}${a.name?' · '+a.name:''} hasta`,sub:'Veteriner kontrolü gerekebilir',key:'sick_'+a.tag_number,time:null}));
  D.animals.filter(a=>a.status==='Karantina').forEach(a=>items.push({t:'rd',cat:'sağlık',ico:'',title:`${a.tag_number} karantinada`,sub:'Bulaşma riski — izole tutun',key:'qua_'+a.tag_number,time:null}));
  D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).forEach(i=>items.push({t:'rd',cat:'stok',ico:'',title:`${i.name} kritik seviyede`,sub:`Mevcut: ${i.current_stock} ${i.unit} / Min: ${i.minimum_stock} ${i.unit}`,key:'stock_'+i.name,time:null}));
  D.tasks.filter(t=>t.priority==='Kritik'&&t.status==='Bekliyor').forEach(t=>items.push({t:'rd',cat:'görev',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>',title:`Kritik Görev: ${t.title}`,sub:`Vade: ${t.due_date||'belirsiz'} | ${t.assigned_to||'Atanmamış'}`,key:'task_'+t.title,time:t.due_date}));
  D.tasks.filter(t=>t.due_date===today()&&t.status!=='Tamamlandı').forEach(t=>items.push({t:'yl',cat:'görev',ico:'',title:`Bugün vadeli: ${t.title}`,sub:`Öncelik: ${t.priority||'-'} | ${t.assigned_to||''}`,key:'today_'+t.title,time:t.due_date}));
  D.tasks.filter(t=>{if(!t.due_date||t.status==='Tamamlandı')return false;return new Date(t.due_date)<=soon7&&t.due_date!==today();}).forEach(t=>items.push({t:'yl',cat:'görev',ico:'',title:`7 gün içinde: ${t.title}`,sub:`Vade: ${t.due_date}`,key:'week_'+t.title,time:t.due_date}));
  D.inventory.filter(i=>i.expiry_date&&i.expiry_date<=soon30.toISOString().split('T')[0]).forEach(i=>items.push({t:'yl',cat:'stok',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>',title:`Son kullanma tarihi yaklaşıyor: ${i.name}`,sub:`SKT: ${i.expiry_date}`,key:'skt_'+i.name,time:i.expiry_date}));
  D.health.filter(h=>h.next_date&&h.next_date<=soon7.toISOString().split('T')[0]).forEach(h=>items.push({t:'yl',cat:'sağlık',ico:'',title:`${h.animal_tag}: ${h.record_type} yaklaşıyor`,sub:`Tarih: ${h.next_date} | Vet: ${h.vet_name||'-'}`,key:'vac_'+h.animal_tag+h.next_date,time:h.next_date}));
  D.repro.filter(r=>r.expected_birth_date&&new Date(r.expected_birth_date)<=soon30&&r.outcome==='Beklemede').forEach(r=>items.push({t:'gr',cat:'üreme',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="7"/><path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3m-3-3V6"/></svg></span>',title:`${r.animal_tag} için doğum yaklaşıyor`,sub:`Beklenen: ${r.expected_birth_date}`,key:'birth_'+r.animal_tag,time:r.expected_birth_date}));
  return items;
}
function renderNotifs(){
  if(!D.notif_read)D.notif_read={};
  let items=buildNotifItems();
  // Özet kartlar
  const sCards=document.getElementById('notif-summary-cards');
  if(sCards){const rd=items.filter(i=>i.t==='rd').length,yl=items.filter(i=>i.t==='yl').length,unread=items.filter(i=>!D.notif_read[i.key]).length;
  sCards.innerHTML=`<div class="sc" onclick="setNotifFilter('rd',document.querySelector('[data-f=rd]'))" style="cursor:pointer"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#ef4444">${rd}</div><div class="sc-lbl">Kritik</div></div><div class="sc" onclick="setNotifFilter('yl',document.querySelector('[data-f=yl]'))" style="cursor:pointer"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#f59e0b">${yl}</div><div class="sc-lbl">Uyarı</div></div><div class="sc" onclick="setNotifFilter('unread',document.querySelector('[data-f=unread]'))" style="cursor:pointer"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#3b82f6">${unread}</div><div class="sc-lbl">Okunmamış</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val" style="color:#15803d">${items.length-rd-yl}</div><div class="sc-lbl">Bilgi</div></div>`;}
  // Filtrele
  if(_notifFilter==='rd')items=items.filter(i=>i.t==='rd');
  else if(_notifFilter==='yl')items=items.filter(i=>i.t==='yl');
  else if(_notifFilter==='unread')items=items.filter(i=>!D.notif_read[i.key]);
  const colors={rd:'#ef4444',yl:'#f59e0b',gr:'#2d6a4f'};
  var _el_notif_list=document.getElementById('notif-list');if(_el_notif_list)_el_notif_list.innerHTML=items.length
    ?`<div style="padding:4px">${items.map(i=>{const isRead=D.notif_read[i.key];const c=colors[i.t]||'#94a3b8';return`<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-bottom:1px solid var(--brd);background:${isRead?'transparent':'rgba(45,106,79,.03)'};transition:.1s" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='${isRead?'transparent':'rgba(45,106,79,.03)'}'">
      <div style="width:36px;height:36px;border-radius:9px;background:${c}18;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${i.ico}</div>
      <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:12.5px;font-weight:${isRead?400:600};color:var(--txt)">${i.title}</span>${!isRead?`<span style="width:7px;height:7px;border-radius:50%;background:${c};flex-shrink:0"></span>`:''}</div><div style="font-size:11px;color:var(--sub);margin-top:2px">${i.sub}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">${i.time?`<span style="font-size:10px;color:var(--sub)">${i.time}</span>`:''}
      <button onclick="D.notif_read['${i.key}']=true;persist();renderNotifs();" style="font-size:10px;background:none;border:none;cursor:pointer;color:${isRead?'#94a3b8':'#2d6a4f'}">${isRead?'✓ okundu':'Okundu işaretle'}</button></div>
    </div>`;}).join('')}</div>`
    :'<div style="text-align:center;padding:40px;color:var(--sub)"><div style="font-size:32px;margin-bottom:8px"></div><div style="font-size:14px;font-weight:600">Bildirim yok</div><div style="font-size:12px;margin-top:4px">Her şey yolunda!</div></div>';
  const rdCount=buildNotifItems().filter(i=>!D.notif_read[i.key]&&i.t==='rd').length;
  const dot=document.getElementById('notif-dot');if(dot)dot.style.display=rdCount?'block':'none';
}

// ===================== TARTIM TAKİBİ =====================
function renderWeightTrack(){
  if(!D.weights)D.weights=[];
  // Kantar ayarlarını forma yükle
  const kUrlEl=document.getElementById('f-kantar-url');if(kUrlEl&&!kUrlEl.value)kUrlEl.value=D.settings.kantar_db_url||'';
  const kAutoEl=document.getElementById('f-kantar-auto');if(kAutoEl)kAutoEl.checked=!!D.settings.kantar_auto;
  const kCEl=document.getElementById('f-kantar-ciftlik');if(kCEl&&!kCEl.value)kCEl.value=D.settings.kantar_ciftlik_id||'';
  const kKeEl=document.getElementById('f-kantar-kesim');if(kKeEl&&!kKeEl.value)kKeEl.value=D.settings.kantar_kesim_id||'';
  const kKaEl=document.getElementById('f-kantar-kasap');if(kKaEl&&!kKaEl.value)kKaEl.value=D.settings.kantar_kasap_id||'';
  // Hayvan select dolduruluyor
  const sel=document.getElementById('wt-animal-sel'),fsel=document.getElementById('wt-form-animal');
  const opts=D.animals.map(a=>`<option value="${a.tag_number}">${a.tag_number}${a.name?' · '+a.name:''} (${a.species})</option>`).join('');
  if(sel)sel.innerHTML='<option value="">-- Hayvan Seçin --</option>'+opts;
  if(fsel)fsel.innerHTML='<option value="">-- Seçin --</option>'+opts;
  const dateEl=document.getElementById('wt-form-date');if(dateEl)dateEl.value=today();
  // İstatistik kartları
  const tags=[...new Set(D.weights.map(w=>w.tag))];
  const gdaList=tags.map(tag=>calcGDA(tag)).filter(g=>g&&isFinite(g.gda));
  const avgGDA=gdaList.length?gdaList.reduce((s,g)=>s+g.gda,0)/gdaList.length:0;
  const lastWeights=D.animals.map(a=>{const ws=D.weights.filter(w=>w.tag===a.tag_number).sort((a,b)=>b.date.localeCompare(a.date));return ws.length?nv(ws[0].weight):nv(a.weight)||0;});
  const avgWeight=lastWeights.length?Math.round(lastWeights.reduce((s,v)=>s+v,0)/lastWeights.length):0;
  const stEl=document.getElementById('wt-stats');
  if(stEl)stEl.innerHTML=`<div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${D.weights.length}</div><div class="sc-lbl">Toplam Tartım</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${avgWeight} kg</div><div class="sc-lbl">Ort. Ağırlık</div></div><div class="sc"><div class="sc-top"><div class="sc-ico"></div></div><div class="sc-val">${avgGDA>0?'+':''}${avgGDA.toFixed(2)} kg</div><div class="sc-lbl">Sürü Ort. GDA (kg/gün)</div></div>`;
  // Tablo
  const tbody=document.getElementById('tbl-weight');
  if(tbody)tbody.innerHTML=D.animals.map(a=>{
    const ws=D.weights.filter(w=>w.tag===a.tag_number).sort((a,b)=>b.date.localeCompare(a.date));
    const last=ws[0];const prev=ws[1];
    const lastW=last?nv(last.weight):nv(a.weight)||null;
    const prevW=prev?nv(prev.weight):null;
    const diff=lastW&&prevW?lastW-prevW:null;
    const target=nv(a.target_weight)||0;
    const progress=target&&lastW?Math.min(100,Math.round(lastW/target*100)):0;
    const g=calcGDA(a.tag_number);
    const est=estimateTargetInfo(a.tag_number);
    let estCell='—';
    if(est){
      if(est.reached)estCell=`<span style="color:#2d6a4f;font-weight:600">Hedefe ulaştı ✓</span>`;
      else if(est.estDate)estCell=`${est.estDate} <span style="color:var(--sub);font-size:10px">(${est.daysLeft} gün)</span>`;
      else estCell=`<span style="color:var(--sub)">Kilo artmıyor</span>`;
    }
    return`<tr>
      <td><strong>${a.tag_number}</strong></td>
      <td>${a.name||'-'}</td>
      <td>${a.species||'-'}</td>
      <td>${last?last.date:'-'}</td>
      <td>${lastW?lastW+' kg':'-'}</td>
      <td>${prevW?prevW+' kg':'-'}</td>
      <td>${diff!==null?`<span style="color:${diff>=0?'#16a34a':'#ef4444'};font-weight:600">${diff>=0?'+':''}${diff.toFixed(1)} kg</span>`:'—'}</td>
      <td>${g?`<span style="color:${g.gda>=0?'#16a34a':'#ef4444'};font-weight:600">${g.gda>=0?'+':''}${g.gda.toFixed(2)}</span>`:'—'}</td>
      <td>${target?target+' kg':'—'}</td>
      <td>${target?`<div style="background:var(--bg);border-radius:10px;height:8px;width:80px"><div style="background:${progress>=100?'#2d6a4f':progress>=70?'#f59e0b':'#ef4444'};height:8px;border-radius:10px;width:${progress}%"></div></div> <span style="font-size:10px">${progress}%</span>`:'—'}</td>
      <td>${estCell}</td>
    </tr>`;
  }).join('');
}
// ===================== BESİ HEDEFİ / GDA (Günlük Ortalama Kilo Artışı) =====================
// İlk tartım (veya doğum ağırlığı) ile son tartım arasındaki günlük ortalama kazanımı hesaplar.
function calcGDA(tag){
  if(!D.weights)return null;
  const ws=D.weights.filter(w=>w.tag===tag&&w.date&&w.weight!=null).sort((a,b)=>a.date.localeCompare(b.date));
  const animal=D.animals.find(a=>a.tag_number===tag);
  let first=ws.length?{date:ws[0].date,weight:nv(ws[0].weight)}:null;
  if(animal&&animal.birth_weight&&animal.birth_date){
    if(!first||animal.birth_date<first.date)first={date:animal.birth_date,weight:nv(animal.birth_weight)};
  }
  const last=ws.length?{date:ws[ws.length-1].date,weight:nv(ws[ws.length-1].weight)}:null;
  if(!first||!last||first.date===last.date)return null;
  const days=Math.round((new Date(last.date)-new Date(first.date))/86400000);
  if(days<=0)return null;
  const gain=last.weight-first.weight;
  return{gda:gain/days,lastWeight:last.weight,lastDate:last.date,days,gain};
}
// Hedef ağırlığa mevcut GDA ile kaç günde ulaşılacağını tahmin eder.
function estimateTargetInfo(tag){
  const animal=D.animals.find(a=>a.tag_number===tag);
  if(!animal||!nv(animal.target_weight))return null;
  const g=calcGDA(tag);
  const lastW=g?g.lastWeight:nv(animal.weight)||0;
  const target=nv(animal.target_weight);
  if(!lastW)return null;
  const remaining=target-lastW;
  if(remaining<=0)return{reached:true,gda:g?g.gda:null,lastWeight:lastW,target};
  if(!g||g.gda<=0)return{reached:false,gda:g?g.gda:0,daysLeft:null,estDate:null,lastWeight:lastW,target};
  const daysLeft=Math.ceil(remaining/g.gda);
  const base=new Date(g.lastDate||today());
  base.setDate(base.getDate()+daysLeft);
  return{reached:false,gda:g.gda,daysLeft,estDate:base.toISOString().slice(0,10),lastWeight:lastW,target};
}
function saveWeightRecord(){
  if(!D.weights)D.weights=[];
  const tag=document.getElementById('wt-form-animal')?.value;
  const date=document.getElementById('wt-form-date')?.value;
  const weight=document.getElementById('wt-form-weight')?.value;
  const note=document.getElementById('wt-form-note')?.value||'';
  if(!tag){showToast('Hayvan seçin!','yl');return;}
  if(!weight||isNaN(weight)){showToast('Geçerli ağırlık girin!','yl');return;}
  D.weights.push({tag,date:date||today(),weight:parseFloat(weight),note});
  // Hayvanın mevcut ağırlığını da güncelle
  const animal=D.animals.find(a=>a.tag_number===tag);
  if(animal)animal.weight=parseFloat(weight);
  persist();
  document.getElementById('wt-form-weight').value='';
  document.getElementById('wt-form-note').value='';
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2v20M3 9l4 7H3m14 0 4-7h-4M7 16h10M5 20h14"/></svg></span> Tartım kaydedildi ✓');
  renderWeightTrack();
  if(document.getElementById('wt-animal-sel')?.value===tag)renderWeightChart();
}

function exportWeightCSV(){
  if(!D.weights||!D.weights.length){showToast('Tartım verisi yok','yl');return;}
  const rows=[['Küpe','Tarih','Ağırlık (kg)','Not'],...D.weights.map(w=>[w.tag,w.date,w.weight,w.note||''])];
  const b=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`tartim-${today()}.csv`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast(' CSV indiriliyor...');
}

// ===================== AI ANOMALİ TESPİTİ =====================
// Veri tabanlı kural motoru + isteğe bağlı Groq derinleme analizi

const ANOMALY_RULES=[
  // Ağırlık anomalisi
  {id:'weight_loss', label:'Ağırlık Kaybı', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2v20M3 9l4 7H3m14 0 4-7h-4M7 16h10M5 20h14"/></svg></span>️', severity:'high',
    check(){
      const now=new Date();
      return D.weight_records&&D.weight_records.length?
        (()=>{
          const byAnimal={};
          D.weight_records.forEach(r=>{
            if(!byAnimal[r.tag_number])byAnimal[r.tag_number]=[];
            byAnimal[r.tag_number].push(r);
          });
          const alerts=[];
          Object.entries(byAnimal).forEach(([tag,recs])=>{
            if(recs.length<2)return;
            recs.sort((a,b)=>new Date(a.date)-new Date(b.date));
            const last=recs[recs.length-1],prev=recs[recs.length-2];
            const diff=nv(last.weight)-nv(prev.weight);
            const pct=prev.weight?diff/nv(prev.weight)*100:0;
            if(pct<=-5){
              const a=D.animals.find(x=>x.tag_number===tag);
              alerts.push({tag,name:a?.name||tag,loss:Math.abs(pct).toFixed(1),days:Math.round((new Date(last.date)-new Date(prev.date))/86400000)});
            }
          });
          return alerts;
        })()
      :[];
    },
    format(items){return items.length?items.map(i=>`${i.name||i.tag}: ${i.loss}% kayıp`).join(', '):''}
  },
  // Hasta hayvan kümesi
  {id:'disease_cluster', label:'Hastalık Kümesi', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.5-8.5-2.8 2.8m-7.4 7.4-2.8 2.8m0-13 2.8 2.8m7.4 7.4 2.8 2.8"/></svg></span>', severity:'critical',
    check(){
      const sick=D.animals.filter(a=>a.health_status==='Hasta'||a.status==='Hasta');
      if(sick.length<2)return[];
      // Aynı türden 2+ hasta = risk
      const bySpecies={};
      sick.forEach(a=>{if(!bySpecies[a.species])bySpecies[a.species]=[];bySpecies[a.species].push(a);});
      return Object.entries(bySpecies).filter(([,v])=>v.length>=2).map(([sp,v])=>({species:sp,count:v.length,tags:v.map(x=>x.tag_number).join(', ')}));
    },
    format(items){return items.map(i=>`${i.species}: ${i.count} hasta (${i.tags})`).join(' | ')}
  },
  // Aşı gecikme
  {id:'vaccine_overdue', label:'Geciken Aşı', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="m18 2 4 4-1.5 1.5-4-4L18 2zM10.5 9.5l4 4m-9 9 1.5-1.5m-3-7 9-9 3 3-9 9-3-3zm0 0-3 3 3 3"/></svg></span>', severity:'medium',
    check(){
      const today=new Date();
      return(D.vaccinations||[]).filter(v=>{
        if(!v.next_date||v.status==='Tamamlandı')return false;
        return new Date(v.next_date)<today;
      });
    },
    format(items){return items.slice(0,3).map(v=>`${v.tag_number||v.animal_tag}: ${v.vaccine||v.type}`).join(', ')+(items.length>3?` +${items.length-3} daha`:'')}
  },
  // Kritik stok
  {id:'low_stock', label:'Kritik Stok', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg></span>', severity:'medium',
    check(){
      return D.inventory.filter(i=>{
        const cur=nv(i.current_stock),min=nv(i.minimum_stock);
        return min>0&&cur<=min;
      });
    },
    format(items){return items.slice(0,3).map(i=>`${i.name}: ${i.current_stock}/${i.minimum_stock}`).join(', ')+(items.length>3?` +${items.length-3} daha`:'')}
  },
  // Doğum beklentisi (7 gün)
  {id:'birth_upcoming', label:'Yakın Doğum', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="7"/><path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3m-3-3V6"/></svg></span>', severity:'info',
    check(){
      const now=new Date();
      return(D.repro||[]).filter(r=>{
        if(!r.expected_birth_date)return false;
        const d=new Date(r.expected_birth_date);
        const diff=(d-now)/86400000;
        return diff>=0&&diff<=7;
      });
    },
    format(items){return items.map(r=>{const a=D.animals.find(x=>x.tag_number===r.tag_number);return`${a?.name||r.tag_number} (${r.expected_birth_date})`;}).join(', ')}
  },
  // Yüksek veteriner maliyeti
  {id:'high_vet_cost', label:'Yüksek Vet. Maliyet', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1m-3-5c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3"/></svg></span>', severity:'medium',
    check(){
      const m=new Date();m.setDate(1);
      const monthStart=m.toISOString().slice(0,10);
      const vetCost=D.health.filter(h=>h.date>=monthStart&&h.cost).reduce((s,h)=>s+nv(h.cost),0);
      const monthlyIncome=D.finance.filter(f=>f.date>=monthStart&&f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
      if(monthlyIncome>0&&vetCost/monthlyIncome>0.15)return[{cost:vetCost,income:monthlyIncome,pct:Math.round(vetCost/monthlyIncome*100)}];
      return[];
    },
    format(items){return items.map(i=>`Bu ay ${fmt(i.cost)}₺ (gelirin %${i.pct}'i)`).join('')}
  },
  // Doğum sonrası hayvan takibi (lohusa/buzağı)
  {id:'postpartum', label:'Doğum Sonrası Takip', icon:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M10 2v2m4-2v2M8 6h8l1 3H7L8 6z"/><path d="M7 9l1 11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-11"/></svg></span>', severity:'info',
    check(){
      const now=new Date();
      return(D.repro||[]).filter(r=>{
        if(!r.actual_birth_date)return false;
        const d=new Date(r.actual_birth_date);
        const diff=(now-d)/86400000;
        return diff>=0&&diff<=14&&!r.postpartum_checked;
      });
    },
    format(items){return items.map(r=>`${r.tag_number}: ${r.actual_birth_date}`).join(', ')}
  }
];

let _anomalyCache=null;
let _anomalyCacheTime=0;

function detectAnomalies(forceRefresh=false){
  const now=Date.now();
  if(!forceRefresh&&_anomalyCache&&(now-_anomalyCacheTime)<300000)return _anomalyCache; // 5dk cache
  const results=[];
  ANOMALY_RULES.forEach(rule=>{
    try{
      const items=rule.check();
      if(items&&items.length>0){
        results.push({
          id:rule.id,
          label:rule.label,
          icon:rule.icon,
          severity:rule.severity,
          count:items.length,
          detail:rule.format(items),
          raw:items
        });
      }
    }catch(e){}
  });
  results.sort((a,b)=>{const ord={critical:0,high:1,medium:2,info:3};return(ord[a.severity]||4)-(ord[b.severity]||4);});
  _anomalyCache=results;
  _anomalyCacheTime=now;
  return results;
}

const SEVERITY_CFG={
  critical:{color:'#dc2626',bg:'#fef2f2',darkBg:'#3d0d0d',darkColor:'#f87171',label:'KRİTİK'},
  high:    {color:'#ea580c',bg:'#fff7ed',darkBg:'#3d1200',darkColor:'#fb923c',label:'YÜKSEK'},
  medium:  {color:'#d97706',bg:'#fffbeb',darkBg:'#2d1f00',darkColor:'#fbbf24',label:'ORTA'},
  info:    {color:'#2563eb',bg:'#eff6ff',darkBg:'#0d1f3c',darkColor:'#6ba3f7',label:'BİLGİ'}
};

function renderAnomalyPanel(containerId){
  const el=document.getElementById(containerId);if(!el)return;
  const anomalies=detectAnomalies();
  if(!anomalies.length){
    el.innerHTML=`<div style="text-align:center;padding:20px;color:var(--sub)">
      <div style="font-size:28px;margin-bottom:8px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span></div>
      <div style="font-size:13px;font-weight:600">Anomali tespit edilmedi</div>
      <div style="font-size:11.5px;margin-top:4px">Tüm göstergeler normal aralıkta</div>
    </div>`;
    return;
  }
  el.innerHTML=anomalies.map(a=>{
    const cfg=SEVERITY_CFG[a.severity]||SEVERITY_CFG.info;
    return`<div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid var(--brd);align-items:flex-start" class="anomaly-row" data-id="${a.id}">
      <div style="font-size:20px;flex-shrink:0;margin-top:1px">${a.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:12px;font-weight:700;color:var(--txt)">${a.label}</span>
          <span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:20px;background:${cfg.bg};color:${cfg.color}">${cfg.label}</span>
          <span style="margin-left:auto;font-size:11px;font-weight:700;color:${cfg.color}">${a.count}</span>
        </div>
        <div style="font-size:11.5px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.detail}</div>
      </div>
    </div>`;
  }).join('')+`
    <div style="padding-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-pr btn-sm" onclick="aiDeepAnalysis('${containerId}-ai')"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 18h6"/></svg></span> AI Derinleme Analizi</button>
      <button class="btn btn-sec btn-sm" onclick="detectAnomalies(true);renderAnomalyPanel('${containerId}');showToast('Yenilendi')">↻ Yenile</button>
    </div>
    <div id="${containerId}-ai" class="ai-result" style="margin-top:10px;display:none"></div>`;
}

async function aiDeepAnalysis(elId){
  const el=document.getElementById(elId);if(!el)return;
  el.style.display='block';
  el.className='ai-result loading';el.textContent='Anomaliler analiz ediliyor...';
  const anomalies=detectAnomalies();
  if(!anomalies.length){el.style.display='none';return;}
  const summary=anomalies.map(a=>`${a.icon} ${a.label} (${a.severity}): ${a.detail}`).join('\n');
  const prompt=`Çiftlik yönetim sisteminde tespit edilen anomaliler:\n${summary}\n\nBu anomalileri detaylı analiz et ve şunları belirt:
1. En acil müdahale gerektiren sorun
2. Her sorun için somut aksiyon adımları (kısa, net)
3. Olası arka plan nedenleri
4. Önleme önerileri

Yanıtı kısa tut, emoji kullan, maddeli yaz.`;
  try{
    if(!getGroqKey()){el.className='ai-result';el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Groq API key gerekli.';return;}
    const data=await groqCall([{role:'user',content:prompt}],farmCtx(),800);
    const text=data.content?.map(c=>c.text||'').join('')||'Analiz alınamadı.';
    el.className='ai-result';el.innerHTML=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
  }catch(e){el.className='ai-result';el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Analiz hatası: '+e.message;}
}

// Anomali badge'ini topbar'a ekle
function updateAnomalyBadge(){
  const anomalies=detectAnomalies();
  const critical=anomalies.filter(a=>a.severity==='critical'||a.severity==='high');
  const dot=document.getElementById('notif-dot');
  if(dot){
    dot.style.display=critical.length?'block':'none';
    dot.title=`${critical.length} kritik uyarı`;
  }
}
async function autoDailyBriefing(){
  const lastBriefDate=localStorage.getItem('_lastBriefDate');
  const todayStr=today();
  if(lastBriefDate===todayStr)return; // Bugün zaten yapıldı
  const el=document.getElementById('ai-dash');if(!el)return;
  const hasta=D.animals.filter(a=>a.status==='Hasta');
  const kritikStok=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock));
  const bugunGorev=D.tasks.filter(t=>t.due_date===todayStr&&t.status!=='Tamamlandı');
  const yakinDogum=D.repro.filter(r=>{if(!r.expected_birth_date)return false;const d=new Date(r.expected_birth_date);const diff=(d-new Date())/86400000;return diff>=0&&diff<=7;});
  const prompt=`Bugün ${todayStr} tarihinde çiftliğimin günlük brifingini hazırla. Kısa ve aksiyona yönelik ol.
Durum: ${hasta.length} hasta hayvan (${hasta.map(a=>a.tag_number).join(', ')||'yok'}), ${kritikStok.length} kritik stok (${kritikStok.map(i=>i.name).join(', ')||'yok'}), ${bugunGorev.length} bugünkü görev, ${yakinDogum.length} yakın doğum bekleniyor.
Format: Emoji ile 4-5 madde, her madde 1 cümle. En önemli konuyu ilk sıraya koy.`;
  el.className='ai-result loading';el.textContent='Günlük brifing hazırlanıyor...';
  try{
    if(!getGroqKey()){el.className='ai-result';el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> <b>Groq API key girilmemiş.</b> <a onclick="showPage(\'Settings\',null);setTimeout(()=>showStab(\'ai\',null),300)" style="cursor:pointer;color:var(--g2)">Ayarlar → AI sekmesine git →</a>';return;}
    const data=await groqCall([{role:'user',content:prompt}],farmCtx(),600);
    const text=data.content?.map(c=>c.text||'').join('')||'Brifing alınamadı.';
    el.className='ai-result';el.innerHTML=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
    localStorage.setItem('_lastBriefDate',todayStr);
  }catch(e){el.className='ai-result';el.innerHTML='<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Brifing hatası: '+e.message;}
}
function validateRequired(fields){
  let ok=true;
  fields.forEach(([id,msg])=>{
    const el=document.getElementById(id);if(!el)return;
    el.closest('.fg')?.classList.remove('has-err');
    if(!(el.value||'').trim()){
      el.closest('.fg')?.classList.add('has-err');
      let em=el.closest('.fg')?.querySelector('.err-msg');
      if(!em){em=document.createElement('div');em.className='err-msg';el.closest('.fg')?.appendChild(em);}
      em.textContent=msg;ok=false;if(ok===false&&fields.indexOf([id,msg])===0)el.focus();
    }
  });
  return ok;
}

// ===================== FORMS =====================
// Temporary photos in form
let formPhotos=[];

let _cutEditOld=null;
const CUT_PARTS='<option>Kuşbaşı</option><option>Kıyma</option><option>Pirzola</option><option>But</option><option>Kaburga</option><option>Kelle-Paça</option><option>Sakatat</option><option>Yağ</option><option>Kemik</option><option>Diğer</option>';
const FD={
  animal:{title:'Hayvan Ekle / Düzenle',key:'animals',
  html:`
  <div class="form-section">
    <div class="form-section-title"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="14" r="2"/><circle cx="19" cy="14" r="2"/><ellipse cx="12" cy="17" rx="4" ry="3"/></svg></span> Temel Bilgiler</div>
    <div class="fr3"><div class="fg"><label>Küpe No *</label><input id="f-tag" placeholder="TR001"/><div class="err-msg"></div></div><div class="fg"><label>İsim</label><input id="f-name" placeholder="Sümbül"/></div><div class="fg"><label>Tür *</label><select id="f-sp"><option>Sığır</option><option>Koyun</option><option>Keçi</option><option>At</option><option>Tavuk</option><option>Hindi</option><option>Kaz</option><option>Bıldırcın</option><option>Arı (Kovan)</option><option>Diğer</option></select></div></div>
    <div class="fr3"><div class="fg"><label>Irk</label><input id="f-br" placeholder="Holstein"/></div><div class="fg"><label>Cinsiyet</label><select id="f-gn"><option>Dişi</option><option>Erkek</option><option>Hadım</option></select></div><div class="fg"><label>Durum</label><select id="f-st"><option>Aktif</option><option>Hasta</option><option>Gebe</option><option>Satıldı</option><option>Kesildi</option><option>Öldü</option><option>Karantina</option></select></div></div>
    <div class="fr3"><div class="fg"><label>Doğum Tarihi</label><input id="f-bd" type="date"/></div><div class="fg"><label>Renk / İşaret</label><input id="f-cl" placeholder="Siyah-beyaz"/></div><div class="fg"><label>Konum</label><input id="f-lc" placeholder="Ahır A"/></div></div>
    <div class="fr"><div class="fg"><label>RFID UID (Kantar Eşleştirme)</label><div style="display:flex;gap:6px"><input id="f-rfid" placeholder="Otomatik doldurmak için sağdaki butonu kullanın" style="flex:1"/><button type="button" class="btn btn-sec btn-sm" onclick="sonRfidOkumasiniGetir()" title="Hayvanı çiftlik kantarına çıkarıp bu butona basın">📡 Son Okumayı Getir</button></div><div style="font-size:10.5px;color:var(--sub);margin-top:3px">Küpe no ile kantar RFID kart numarası FARKLI şeylerdir. Bu alan, hayvanı bir kez kantara çıkarıp RFID kart UID'sini bu hayvana kalıcı olarak bağlamak içindir.</div></div></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg> Fiziksel Özellikler</div>
    <div class="fr3"><div class="fg"><label>Canlı Ağırlık (kg)</label><input id="f-wt" type="number" min="0" placeholder="500"/></div><div class="fg"><label>Doğumdaki Ağırlık (kg)</label><input id="f-bwt" type="number" min="0" placeholder="40"/></div><div class="fg"><label>Hedef Ağırlık (kg)</label><input id="f-twt" type="number" min="0"/></div></div>
    <div class="fr3"><div class="fg"><label>Boy (cm)</label><input id="f-ht" type="number" min="0"/></div><div class="fg"><label>Günlük Süt (lt)</label><input id="f-ml" type="number" min="0" step="0.1"/></div><div class="fg"><label>Laktasyon No</label><input id="f-lact" type="number" min="0"/></div></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M2 15c3-3 4-9 6-9s3 6 6 6 3-9 6-9"/><path d="M2 9c3 3 4 9 6 9s3-6 6-6 3 9 6 9"/></svg></span> Soy Bilgisi</div>
    <div class="fr"><div class="fg"><label>Anne Küpe No</label><input id="f-mtag" placeholder="TR010"/></div><div class="fg"><label>Baba Küpe / Damızlık No</label><input id="f-ftag" placeholder="TR020"/></div></div>
    <div class="fr"><div class="fg"><label>Doğduğu Çiftlik</label><input id="f-orig"/></div><div class="fg"><label>Irk Saflık %</label><input id="f-purity" type="number" min="0" max="100"/></div></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Finansal Bilgiler</div>
    <div class="fr3"><div class="fg"><label>Alım Fiyatı (₺)</label><input id="f-pp" type="number" min="0"/></div><div class="fg"><label>Alım Tarihi</label><input id="f-pd" type="date"/></div><div class="fg"><label>Tahmini Değer (₺)</label><input id="f-val" type="number" min="0"/></div></div>
    <div class="fr"><div class="fg"><label>Sigorta No</label><input id="f-ins"/></div><div class="fg"><label>TÜRKVET / Resmi No</label><input id="f-official"/></div></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Fotoğraflar</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <label class="photo-upload-area" style="flex:1;min-width:160px;cursor:pointer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="color:var(--sub)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size:12.5px;font-weight:600;margin-top:4px">Galeriden Seç</div>
        <div style="font-size:11px;color:var(--sub)">JPG, PNG — Çoklu seçim</div>
        <input type="file" accept="image/*" multiple style="display:none" onchange="previewFormPhotos(this)">
      </label>
      <button type="button" class="photo-upload-area" style="flex:1;min-width:160px;border:none;cursor:pointer" onclick="openAnimalCamera()" id="btn-animal-cam">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="color:var(--accent)"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <div style="font-size:12.5px;font-weight:600;margin-top:4px;color:var(--accent)">Kamera ile Çek</div>
        <div style="font-size:11px;color:var(--sub)">Anlık fotoğraf</div>
      </button>
    </div>
    <!-- Kamera önizleme alanı -->
    <div id="animal-cam-wrap" style="display:none;margin-bottom:10px">
      <div style="position:relative;background:#000;border-radius:10px;overflow:hidden;max-height:280px">
        <video id="animal-cam-video" autoplay playsinline muted style="width:100%;display:block;max-height:280px;object-fit:cover"></video>
        <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:12px">
          <button type="button" onclick="captureAnimalPhoto()" style="background:#fff;border:none;border-radius:50%;width:52px;height:52px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1a1d23" stroke-width="2.5" width="22" height="22"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <button type="button" onclick="switchAnimalCamera()" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;align-self:center" title="Kamerayı değiştir">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="18" height="18"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
          </button>
          <button type="button" onclick="closeAnimalCamera()" style="background:rgba(220,38,38,.8);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;align-self:center" title="Kapat">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <canvas id="animal-cam-canvas" style="display:none"></canvas>
    </div>
    <div class="photo-preview-row" id="f-photo-preview"></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Ek Bilgiler</div>
    <div class="fg"><label>Notlar</label><textarea id="f-nt" placeholder="Özel gözlemler, önemli notlar..."></textarea></div>
    <div class="fg"><label>Sağlık Durumu Notu</label><input id="f-hsn" placeholder="Son muayene: ..."/></div>
    <div class="fr"><div class="fg"><label>Beslenme Tercihi</label><input id="f-diet" placeholder="Kuru ot ağırlıklı..."/></div><div class="fg"><label>Özel Gereksinim</label><input id="f-special" placeholder="Vitamin takviyesi..."/></div></div>
  </div>`,
  save:()=>({
    tag_number:gv('f-tag'),name:gv('f-name'),species:gv('f-sp'),breed:gv('f-br'),gender:gv('f-gn'),status:gv('f-st'),
    birth_date:gv('f-bd'),color:gv('f-cl'),location:gv('f-lc'),rfid_uid:(gv('f-rfid')||'').trim(),
    weight:gnv('f-wt')||null,birth_weight:gnv('f-bwt')||null,target_weight:gnv('f-twt')||null,
    height:gnv('f-ht')||null,daily_milk:gnv('f-ml')||null,lactation_no:gnv('f-lact')||null,
    mother_tag:gv('f-mtag'),father_tag:gv('f-ftag'),origin_farm:gv('f-orig'),breed_purity:gnv('f-purity')||null,
    purchase_price:gnv('f-pp')||null,purchase_date:gv('f-pd'),estimated_value:gnv('f-val')||null,
    insurance_no:gv('f-ins'),official_no:gv('f-official'),
    notes:gv('f-nt'),health_note:gv('f-hsn'),diet_pref:gv('f-diet'),special_req:gv('f-special'),
    _photos:formPhotos.slice()
  }),
  validate:()=>validateRequired([['f-tag','Küpe No zorunlu'],['f-sp','Tür zorunlu']]),
  fill:(r)=>{
    sv('f-tag',r.tag_number);sv('f-name',r.name);ss('f-sp',r.species);sv('f-br',r.breed);ss('f-gn',r.gender);ss('f-st',r.status);
    sv('f-bd',r.birth_date);sv('f-cl',r.color);sv('f-lc',r.location);sv('f-rfid',r.rfid_uid);
    sv('f-wt',r.weight);sv('f-bwt',r.birth_weight);sv('f-twt',r.target_weight);
    sv('f-ht',r.height);sv('f-ml',r.daily_milk);sv('f-lact',r.lactation_no);
    sv('f-mtag',r.mother_tag);sv('f-ftag',r.father_tag);sv('f-orig',r.origin_farm);sv('f-purity',r.breed_purity);
    sv('f-pp',r.purchase_price);sv('f-pd',r.purchase_date);sv('f-val',r.estimated_value);
    sv('f-ins',r.insurance_no);sv('f-official',r.official_no);
    sv('f-nt',r.notes);sv('f-hsn',r.health_note);sv('f-diet',r.diet_pref);sv('f-special',r.special_req);
    formPhotos=[];document.getElementById('f-photo-preview').innerHTML='';
  }},
  health:{title:'Sağlık Kaydı',key:'health',html:`<div class="fr"><div class="fg"><label>Hayvan Küpe *</label><input id="f-tag"/><div class="err-msg"></div></div><div class="fg"><label>Tip</label><select id="f-rt"><option>Aşılama</option><option>Tedavi</option><option>Muayene</option><option>Ameliyat</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div><div class="fg"><label>Veteriner</label><input id="f-vt"/></div></div><div class="fr"><div class="fg"><label>Teşhis</label><input id="f-dg"/></div><div class="fg"><label>İlaç / Aşı</label><input id="f-md"/></div></div><div class="fr"><div class="fg"><label>Maliyet (₺)</label><input id="f-ct" type="number" min="0"/></div><div class="fg"><label>Sonraki Randevu</label><input id="f-nx" type="date"/></div></div><div class="fg"><label>Notlar</label><textarea id="f-hn"></textarea></div>`,
    save:()=>({animal_tag:gv('f-tag'),record_type:gv('f-rt'),date:gv('f-dt'),vet_name:gv('f-vt'),diagnosis:gv('f-dg'),medication:gv('f-md'),cost:gnv('f-ct')||null,next_date:gv('f-nx'),notes:gv('f-hn')}),
    validate:()=>validateRequired([['f-tag','Küpe zorunlu'],['f-dt','Tarih zorunlu']]),
    fill:(r)=>{sv('f-tag',r.animal_tag);ss('f-rt',r.record_type);sv('f-dt',r.date);sv('f-vt',r.vet_name);sv('f-dg',r.diagnosis);sv('f-md',r.medication);sv('f-ct',r.cost);sv('f-nx',r.next_date);sv('f-hn',r.notes);}},
  repro:{title:'Üreme Kaydı',key:'repro',html:`<div class="fr"><div class="fg"><label>Dişi Küpe *</label><input id="f-tag"/><div class="err-msg"></div></div><div class="fg"><label>Erkek Küpe</label><input id="f-ml"/></div></div><div class="fr"><div class="fg"><label>Olay</label><select id="f-et"><option>Çiftleşme</option><option>Tohumlama</option><option>Gebelik Tespiti</option><option>Doğum</option><option>Düşük</option></select></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Beklenen Doğum</label><input id="f-eb" type="date"/></div><div class="fg"><label>Yavru Sayısı</label><input id="f-oc" type="number" min="0"/></div></div><div class="fg"><label>Sonuç</label><select id="f-ou"><option>Beklemede</option><option>Başarılı</option><option>Başarısız</option></select></div>`,
    save:()=>({animal_tag:gv('f-tag'),male_tag:gv('f-ml'),event_type:gv('f-et'),date:gv('f-dt'),expected_birth_date:gv('f-eb'),offspring_count:gnv('f-oc')||null,outcome:gv('f-ou')}),
    validate:()=>validateRequired([['f-tag','Küpe zorunlu'],['f-dt','Tarih zorunlu']]),
    fill:(r)=>{sv('f-tag',r.animal_tag);sv('f-ml',r.male_tag);ss('f-et',r.event_type);sv('f-dt',r.date);sv('f-eb',r.expected_birth_date);sv('f-oc',r.offspring_count);ss('f-ou',r.outcome);}},
  production:{title:'Üretim Kaydı',key:'production',html:`<div class="fr"><div class="fg"><label>Hayvan Küpe *</label><input id="f-tag"/><div class="err-msg"></div></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr3"><div class="fg"><label>Ürün</label><select id="f-pt"><option>Süt</option><option>Yumurta</option><option>Yün</option><option>Et</option><option>Diğer</option></select></div><div class="fg"><label>Miktar *</label><input id="f-qt" type="number" min="0" step="0.1"/><div class="err-msg"></div></div><div class="fg"><label>Birim</label><select id="f-un"><option>litre</option><option>kg</option><option>adet</option></select></div></div><div class="fg"><label>Kalite</label><select id="f-ql"><option value="">-</option><option>A</option><option>B</option><option>C</option></select></div>`,
    save:()=>({animal_tag:gv('f-tag'),date:gv('f-dt'),production_type:gv('f-pt'),quantity:gnv('f-qt'),unit:gv('f-un'),quality_grade:gv('f-ql')||null}),
    validate:()=>validateRequired([['f-tag','Küpe zorunlu'],['f-dt','Tarih zorunlu'],['f-qt','Miktar zorunlu']]),
    fill:(r)=>{sv('f-tag',r.animal_tag);sv('f-dt',r.date);ss('f-pt',r.production_type);sv('f-qt',r.quantity);ss('f-un',r.unit);ss('f-ql',r.quality_grade);}},
  feeding:{title:'Yemleme',key:'feeding',html:`<div class="fr"><div class="fg"><label>Hayvan / Grup</label><input id="f-tag" placeholder="TR001 veya Tüm Sürü"/></div><div class="fg"><label>Yem Adı *</label><input id="f-fn"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Yem Tipi</label><select id="f-ft"><option>Kaba Yem</option><option>Kesif Yem</option><option>Mineral</option><option>Vitamin</option><option>Su</option><option>Karışık</option></select></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr3"><div class="fg"><label>Miktar</label><input id="f-qt" type="number" min="0" step="0.1"/></div><div class="fg"><label>Birim</label><select id="f-un"><option>kg</option><option>litre</option></select></div><div class="fg"><label>Birim Maliyet</label><input id="f-cp" type="number" min="0" oninput="calcFeedCost()"/></div></div><div class="fg"><label>Toplam Maliyet</label><input id="f-tc" readonly style="background:var(--bg)"/></div>`,
    save:()=>{const q=gnv('f-qt'),c=gnv('f-cp');return{animal_tag:gv('f-tag'),feed_name:gv('f-fn'),feed_type:gv('f-ft'),date:gv('f-dt'),quantity:q,unit:gv('f-un'),cost_per_unit:c,total_cost:parseFloat((q*c).toFixed(2))};},
    validate:()=>validateRequired([['f-fn','Yem adı zorunlu'],['f-dt','Tarih zorunlu']]),
    fill:(r)=>{sv('f-tag',r.animal_tag);sv('f-fn',r.feed_name);ss('f-ft',r.feed_type);sv('f-dt',r.date);sv('f-qt',r.quantity);ss('f-un',r.unit);sv('f-cp',r.cost_per_unit);}},
  ration:{title:'Rasyon Planı',key:'rations',html:`<div class="fr"><div class="fg"><label>Plan Adı *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Tür</label><select id="f-sp"><option>Sığır</option><option>Koyun</option><option>Keçi</option><option>At</option><option>Tavuk</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Günlük (kg)</label><input id="f-tk" type="number" min="0"/></div><div class="fg"><label>Günlük Maliyet (₺)</label><input id="f-dc" type="number" min="0"/></div></div><div class="fg"><label>Bileşenler</label><textarea id="f-ig" placeholder="Kuru ot: 5kg, Kesif: 3kg..."></textarea></div>`,
    save:()=>({name:gv('f-nm'),species:gv('f-sp'),total_daily_kg:gnv('f-tk'),daily_cost:gnv('f-dc'),ingredients:gv('f-ig')}),
    validate:()=>validateRequired([['f-nm','Plan adı zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);ss('f-sp',r.species);sv('f-tk',r.total_daily_kg);sv('f-dc',r.daily_cost);sv('f-ig',r.ingredients);}},
  finance:{title:'Finansal İşlem',key:'finance',html:`<div class="fr"><div class="fg"><label>Tip</label><select id="f-tp"><option>Gelir</option><option>Gider</option></select></div><div class="fg"><label>Kategori</label><select id="f-ct"><option>Satış</option><option>Süt Geliri</option><option>Yem</option><option>Veteriner</option><option>İlaç</option><option>İşçilik</option><option>Ekipman</option><option>Yakıt</option><option>Kira</option><option>Sigorta</option><option>Hibe</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Tutar (₺) *</label><input id="f-am" type="number" min="0" step="0.01"/><div class="err-msg"></div></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Açıklama</label><input id="f-dc"/></div><div class="fg"><label>Ödeme</label><select id="f-pm"><option value="">-</option><option>Nakit</option><option>Banka</option><option>Çek</option><option>EFT</option></select></div></div>`,
    save:()=>({type:gv('f-tp'),category:gv('f-ct'),amount:gnv('f-am'),date:gv('f-dt'),description:gv('f-dc'),payment_method:gv('f-pm')}),
    validate:()=>validateRequired([['f-am','Tutar zorunlu'],['f-dt','Tarih zorunlu']]),
    fill:(r)=>{ss('f-tp',r.type);ss('f-ct',r.category);sv('f-am',r.amount);sv('f-dt',r.date);sv('f-dc',r.description);ss('f-pm',r.payment_method);}},
  inventory:{title:'Envanter',key:'inventory',html:`<div class="fr"><div class="fg"><label>Ürün Adı *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Kategori</label><select id="f-ct"><option>Yem</option><option>İlaç</option><option>Aşı</option><option>Ekipman</option><option>Yakıt</option><option>Kimyasal</option><option>Diğer</option></select></div></div><div class="fr3"><div class="fg"><label>Mevcut Stok *</label><input id="f-sk" type="number" min="0" step="0.1"/><div class="err-msg"></div></div><div class="fg"><label>Min. Stok</label><input id="f-mn" type="number" min="0"/></div><div class="fg"><label>Birim</label><select id="f-un"><option>kg</option><option>litre</option><option>adet</option><option>kutu</option><option>torba</option><option>ton</option></select></div></div><div class="fr"><div class="fg"><label>Birim Maliyet</label><input id="f-uc" type="number" min="0"/></div><div class="fg"><label>SKT</label><input id="f-ex" type="date"/></div></div><div class="fg"><label>Tedarikçi</label><input id="f-sp"/></div>`,
    save:()=>({name:gv('f-nm'),category:gv('f-ct'),current_stock:gnv('f-sk'),minimum_stock:gnv('f-mn'),unit:gv('f-un'),unit_cost:gnv('f-uc')||null,expiry_date:gv('f-ex'),supplier:gv('f-sp')}),
    validate:()=>validateRequired([['f-nm','Ad zorunlu'],['f-sk','Stok zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);ss('f-ct',r.category);sv('f-sk',r.current_stock);sv('f-mn',r.minimum_stock);ss('f-un',r.unit);sv('f-uc',r.unit_cost);sv('f-ex',r.expiry_date);sv('f-sp',r.supplier);}},
  sale:{title:'Satış',key:'sales',html:`<div class="fr"><div class="fg"><label>Satış Tipi</label><select id="f-st"><option>Canlı Hayvan</option><option>Süt</option><option>Et</option><option>Yün</option><option>Yumurta</option><option>Diğer</option></select></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Hayvan Küpe</label><input id="f-at"/></div><div class="fg"><label>Alıcı</label><input id="f-by"/></div></div><div class="fr3"><div class="fg"><label>Miktar *</label><input id="f-qt" type="number" min="0" step="0.1" oninput="calcSaleTotal()"/><div class="err-msg"></div></div><div class="fg"><label>Birim</label><select id="f-un"><option>adet</option><option>kg</option><option>litre</option></select></div><div class="fg"><label>Birim Fiyat *</label><input id="f-up" type="number" min="0" oninput="calcSaleTotal()"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Toplam (₺)</label><input id="f-tl" readonly style="background:var(--bg)"/></div><div class="fg"><label>Ödeme</label><select id="f-ps"><option>Bekliyor</option><option>Ödendi</option><option>Kısmi</option></select></div></div>`,
    save:()=>{const t=parseFloat((gnv('f-qt')*gnv('f-up')).toFixed(2));return{sale_type:gv('f-st'),date:gv('f-dt'),animal_tag:gv('f-at'),buyer_name:gv('f-by'),quantity:gnv('f-qt'),unit:gv('f-un'),unit_price:gnv('f-up'),total_amount:t,payment_status:gv('f-ps')};},
    validate:()=>validateRequired([['f-dt','Tarih zorunlu'],['f-qt','Miktar zorunlu'],['f-up','Fiyat zorunlu']]),
    fill:(r)=>{ss('f-st',r.sale_type);sv('f-dt',r.date);sv('f-at',r.animal_tag);sv('f-by',r.buyer_name);sv('f-qt',r.quantity);ss('f-un',r.unit);sv('f-up',r.unit_price);sv('f-tl',r.total_amount);ss('f-ps',r.payment_status);},
    afterSave:(r)=>{D.finance.push({type:'Gelir',category:'Satış',amount:r.total_amount,date:r.date,description:`Satış: ${r.sale_type}${r.buyer_name?' - '+r.buyer_name:''}`,payment_method:'Nakit'});}},
  supplier:{title:'Tedarikçi',key:'suppliers',html:`<div class="fr"><div class="fg"><label>İsim *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Kategori</label><select id="f-ct"><option>Yem</option><option>İlaç</option><option>Ekipman</option><option>Veteriner</option><option>Nakliye</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>İletişim</label><input id="f-cp"/></div><div class="fg"><label>Telefon</label><input id="f-ph"/></div></div><div class="fr"><div class="fg"><label>Email</label><input id="f-em" type="email"/></div><div class="fg"><label>Puan (1-5)</label><input id="f-rt" type="number" min="1" max="5"/></div></div>`,
    save:()=>({name:gv('f-nm'),category:gv('f-ct'),contact_person:gv('f-cp'),phone:gv('f-ph'),email:gv('f-em'),rating:gnv('f-rt')||null}),
    validate:()=>validateRequired([['f-nm','İsim zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);ss('f-ct',r.category);sv('f-cp',r.contact_person);sv('f-ph',r.phone);sv('f-em',r.email);sv('f-rt',r.rating);}},
  employee:{title:'Çalışan',key:'employees',html:`<div class="fr"><div class="fg"><label>İsim *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Görev</label><select id="f-rl"><option>Çiftlik Müdürü</option><option>Çoban</option><option>Sağımcı</option><option>Veteriner Teknisyeni</option><option>Tarım İşçisi</option><option>Sürücü</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Telefon</label><input id="f-ph"/></div><div class="fg"><label>Başlangıç Tarihi</label><input id="f-sd" type="date"/></div></div><div class="fr"><div class="fg"><label>Maaş (₺)</label><input id="f-sl" type="number" min="0"/></div><div class="fg"><label>Durum</label><select id="f-st"><option>Aktif</option><option>İzinli</option><option>Ayrıldı</option></select></div></div>`,
    save:()=>({name:gv('f-nm'),role:gv('f-rl'),phone:gv('f-ph'),start_date:gv('f-sd'),salary:gnv('f-sl')||null,status:gv('f-st')}),
    validate:()=>validateRequired([['f-nm','İsim zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);ss('f-rl',r.role);sv('f-ph',r.phone);sv('f-sd',r.start_date);sv('f-sl',r.salary);ss('f-st',r.status);}},
  task:{title:'Görev',key:'tasks',html:`<div class="fr"><div class="fg"><label>Başlık *</label><input id="f-tt"/><div class="err-msg"></div></div><div class="fg"><label>Kategori</label><select id="f-ct"><option>Aşılama</option><option>Veteriner</option><option>Yem</option><option>Temizlik</option><option>Bakım</option><option>Hasat</option><option>İdari</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Öncelik</label><select id="f-pr"><option>Orta</option><option>Düşük</option><option>Yüksek</option><option>Kritik</option></select></div><div class="fg"><label>Durum</label><select id="f-st"><option>Bekliyor</option><option>Devam Ediyor</option><option>Tamamlandı</option><option>İptal</option></select></div></div><div class="fr"><div class="fg"><label>Vade *</label><input id="f-dd" type="date"/><div class="err-msg"></div></div><div class="fg"><label>Atanan</label><input id="f-as"/></div></div><div class="fg"><label>Açıklama</label><textarea id="f-dc"></textarea></div>`,
    save:()=>({title:gv('f-tt'),category:gv('f-ct'),priority:gv('f-pr'),status:gv('f-st'),due_date:gv('f-dd'),assigned_to:gv('f-as'),description:gv('f-dc')}),
    validate:()=>validateRequired([['f-tt','Başlık zorunlu'],['f-dd','Vade zorunlu']]),
    fill:(r)=>{sv('f-tt',r.title);ss('f-ct',r.category);ss('f-pr',r.priority);ss('f-st',r.status);sv('f-dd',r.due_date);sv('f-as',r.assigned_to);sv('f-dc',r.description);}},
  land:{title:'Arazi',key:'lands',html:`<div class="fr"><div class="fg"><label>İsim *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Tip</label><select id="f-tp"><option>Mera</option><option>Tarla</option><option>Ahır</option><option>Depo</option><option>Bağ/Bahçe</option><option>Diğer</option></select></div></div><div class="fr"><div class="fg"><label>Alan (dönüm)</label><input id="f-ar" type="number" min="0"/></div><div class="fg"><label>Kapasite</label><input id="f-cp" type="number" min="0"/></div></div><div class="fr"><div class="fg"><label>Konum</label><input id="f-lc"/></div><div class="fg"><label>Durum</label><select id="f-st"><option>Aktif</option><option>Pasif</option><option>Kiralık</option><option>Satılık</option></select></div></div>`,
    save:()=>({name:gv('f-nm'),type:gv('f-tp'),area:gnv('f-ar')||null,capacity:gnv('f-cp')||null,location:gv('f-lc'),status:gv('f-st')}),
    validate:()=>validateRequired([['f-nm','İsim zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);ss('f-tp',r.type);sv('f-ar',r.area);sv('f-cp',r.capacity);sv('f-lc',r.location);ss('f-st',r.status);}},
  slaughter:{title:'Kesim Kaydı',key:'slaughter',html:`<div class="fr"><div class="fg"><label>Hayvan Küpe *</label><input id="f-tag" placeholder="TR001"/><div class="err-msg"></div></div><div class="fg"><label>Kesim Tarihi *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr3"><div class="fg"><label>Canlı Ağırlık (kg) *</label><div style="display:flex;gap:6px"><input id="f-lw" type="number" min="0" step="0.1" oninput="calcYield()" style="flex:1"/><button type="button" class="btn btn-sec btn-sm" onclick="kantardanOku('kesim_canli','f-lw',calcYield)" title="Kesim kantarından canlı ağırlığı oku">⚖️</button></div><div class="err-msg"></div></div><div class="fg"><label>Karkas Ağırlığı (kg) *</label><div style="display:flex;gap:6px"><input id="f-cw" type="number" min="0" step="0.1" oninput="calcYield()" style="flex:1"/><button type="button" class="btn btn-sec btn-sm" onclick="kantardanOku('kesim_karkas','f-cw',calcYield)" title="Kesim kantarından karkas ağırlığını oku">⚖️</button></div><div class="err-msg"></div></div><div class="fg"><label>Randıman %</label><input id="f-yl" readonly style="background:var(--bg)"/></div></div><div class="fr"><div class="fg"><label>Kesim Maliyeti (₺)</label><input id="f-ct" type="number" min="0"/></div><div class="fg"><label>Kesimhane</label><input id="f-sh" placeholder="Kesimhane adı"/></div></div><div class="fg"><label>Not</label><textarea id="f-nt"></textarea></div>`,
    save:()=>{const lw=gnv('f-lw'),cw=gnv('f-cw');const yp=lw?parseFloat((cw/lw*100).toFixed(2)):null;return{animal_tag:gv('f-tag'),date:gv('f-dt'),live_weight:lw,carcass_weight:cw,yield_pct:yp,cost:gnv('f-ct')||0,slaughterhouse:gv('f-sh'),notes:gv('f-nt')};},
    validate:()=>validateRequired([['f-tag','Küpe zorunlu'],['f-dt','Tarih zorunlu'],['f-lw','Canlı ağırlık zorunlu'],['f-cw','Karkas ağırlığı zorunlu']]),
    fill:(r)=>{sv('f-tag',r.animal_tag);sv('f-dt',r.date);sv('f-lw',r.live_weight);sv('f-cw',r.carcass_weight);sv('f-yl',r.yield_pct?r.yield_pct+' %':'');sv('f-ct',r.cost);sv('f-sh',r.slaughterhouse);sv('f-nt',r.notes);},
    afterSave:(r)=>{
      const a=D.animals.find(x=>x.tag_number===r.animal_tag);
      if(a)a.status='Kesildi';
      if(r.cost)D.finance.push({type:'Gider',category:'Kesim',amount:r.cost,date:r.date,description:`Kesim maliyeti: ${r.animal_tag}${r.slaughterhouse?' - '+r.slaughterhouse:''}`,payment_method:'Nakit'});
    }},
  cut:{title:'Parça Üretim Kaydı',key:'cuts',html:`<div class="fr"><div class="fg"><label>Hayvan Küpe</label><input id="f-tag" placeholder="TR001 (opsiyonel)"/></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr3"><div class="fg"><label>Parça Tipi *</label><select id="f-pn">${CUT_PARTS}</select></div><div class="fg"><label>Üretilen Miktar (kg) *</label><input id="f-qt" type="number" min="0" step="0.1"/><div class="err-msg"></div></div><div class="fg"><label>Birim Maliyet (₺/kg)</label><input id="f-uc" type="number" min="0" step="0.1"/></div></div>`,
    save:()=>{
      const q=gnv('f-qt');
      let remaining=q;
      if(_cutEditOld){const sold=nv(_cutEditOld.quantity)-nv(_cutEditOld.remaining);remaining=Math.max(0,q-sold);}
      const rec={animal_tag:gv('f-tag'),date:gv('f-dt'),part_name:gv('f-pn'),quantity_kg:q,remaining_kg:parseFloat(remaining.toFixed(2)),unit_cost:gnv('f-uc')||null};
      _cutEditOld=null;
      return rec;
    },
    validate:()=>validateRequired([['f-dt','Tarih zorunlu'],['f-qt','Miktar zorunlu']]),
    fill:(r)=>{_cutEditOld={quantity:r.quantity_kg,remaining:r.remaining_kg};sv('f-tag',r.animal_tag);sv('f-dt',r.date);ss('f-pn',r.part_name);sv('f-qt',r.quantity_kg);sv('f-uc',r.unit_cost);}},
  cutSale:{title:'Parça Satışı',key:'cutSales',html:`<div class="fr"><div class="fg"><label>Parça Tipi *</label><select id="f-pn">${CUT_PARTS}</select></div><div class="fg"><label>Tarih *</label><input id="f-dt" type="date"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Hayvan Küpe</label><input id="f-tag" placeholder="opsiyonel"/></div><div class="fg"><label>Alıcı</label><input id="f-by"/></div></div><div class="fr3"><div class="fg"><label>Miktar (kg) *</label><div style="display:flex;gap:6px"><input id="f-qt" type="number" min="0" step="0.1" oninput="calcSaleTotal()" style="flex:1"/><button type="button" class="btn btn-sec btn-sm" onclick="kantardanOku('kasap','f-qt',calcSaleTotal)" title="Tezgah kantarından oku">⚖️</button></div><div class="err-msg"></div></div><div class="fg"><label>Birim Fiyat (₺/kg) *</label><input id="f-up" type="number" min="0" oninput="calcSaleTotal()"/><div class="err-msg"></div></div><div class="fg"><label>Toplam (₺)</label><input id="f-tl" readonly style="background:var(--bg)"/></div></div><div class="fg"><label>Ödeme</label><select id="f-ps"><option>Ödendi</option><option>Bekliyor</option><option>Kısmi</option></select></div>`,
    save:()=>{const q=gnv('f-qt'),up=gnv('f-up');const t=parseFloat((q*up).toFixed(2));return{date:gv('f-dt'),animal_tag:gv('f-tag'),part_name:gv('f-pn'),quantity_kg:q,unit_price:up,total_amount:t,buyer_name:gv('f-by'),payment_status:gv('f-ps')};},
    validate:()=>{
      if(!validateRequired([['f-dt','Tarih zorunlu'],['f-qt','Miktar zorunlu'],['f-up','Fiyat zorunlu']]))return false;
      const req=gnv('f-qt'),part=gv('f-pn');
      const avail=(D.cuts||[]).filter(c=>c.part_name===part).reduce((s,c)=>s+nv(c.remaining_kg),0);
      if(req>avail+0.001){showToast(`Yetersiz stok! ${part} kalan stok: ${avail.toFixed(1)} kg`,'yl');return false;}
      return true;
    },
    fill:(r)=>{ss('f-pn',r.part_name);sv('f-dt',r.date);sv('f-tag',r.animal_tag);sv('f-by',r.buyer_name);sv('f-qt',r.quantity_kg);sv('f-up',r.unit_price);sv('f-tl',r.total_amount);ss('f-ps',r.payment_status);},
    afterSave:(r)=>{
      let remaining=r.quantity_kg;
      const matches=(D.cuts||[]).filter(c=>c.part_name===r.part_name&&nv(c.remaining_kg)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      for(const c of matches){
        if(remaining<=0)break;
        const take=Math.min(nv(c.remaining_kg),remaining);
        c.remaining_kg=parseFloat((nv(c.remaining_kg)-take).toFixed(2));
        remaining-=take;
      }
      D.finance.push({type:'Gelir',category:'Et Satışı',amount:r.total_amount,date:r.date,description:`${r.part_name} satışı${r.buyer_name?' - '+r.buyer_name:''} (${r.quantity_kg}kg)`,payment_method:'Nakit'});
    }},
  customer:{title:'Müşteri',key:'customers',html:`<div class="fr"><div class="fg"><label>İsim *</label><input id="f-nm"/><div class="err-msg"></div></div><div class="fg"><label>Telefon</label><input id="f-ph"/></div></div><div class="fr"><div class="fg"><label>Email</label><input id="f-em" type="email"/></div><div class="fg"><label>Adres</label><input id="f-ad"/></div></div><div class="fg"><label>Not</label><textarea id="f-nt"></textarea></div>`,
    save:()=>({name:gv('f-nm'),phone:gv('f-ph'),email:gv('f-em'),address:gv('f-ad'),notes:gv('f-nt')}),
    validate:()=>validateRequired([['f-nm','İsim zorunlu']]),
    fill:(r)=>{sv('f-nm',r.name);sv('f-ph',r.phone);sv('f-em',r.email);sv('f-ad',r.address);sv('f-nt',r.notes);}},
  order:{title:'Sipariş',key:'orders',html:`<div class="fr"><div class="fg"><label>Müşteri Adı *</label><input id="f-nm" list="cust-list" placeholder="Müşteri seçin veya yazın"/><div class="err-msg"></div><datalist id="cust-list">${(D.customers||[]).map(c=>`<option value="${c.name}">`).join('')}</datalist></div><div class="fg"><label>Telefon</label><input id="f-ph"/></div></div><div class="fr3"><div class="fg"><label>Parça Tipi *</label><select id="f-pn">${CUT_PARTS}</select></div><div class="fg"><label>Miktar (kg) *</label><div style="display:flex;gap:6px"><input id="f-qt" type="number" min="0" step="0.1" oninput="calcSaleTotal()" style="flex:1"/><button type="button" class="btn btn-sec btn-sm" onclick="kantardanOku('kasap','f-qt',calcSaleTotal)" title="Tezgah kantarından oku">⚖️</button></div><div class="err-msg"></div></div><div class="fg"><label>Birim Fiyat (₺/kg)</label><input id="f-up" type="number" min="0" oninput="calcSaleTotal()"/></div></div><div class="fr"><div class="fg"><label>Toplam (₺)</label><input id="f-tl" readonly style="background:var(--bg)"/></div><div class="fg"><label>Teslim Tarihi *</label><input id="f-dd" type="date"/><div class="err-msg"></div></div></div><div class="fr"><div class="fg"><label>Durum</label><select id="f-st"><option>Bekliyor</option><option>Hazır</option><option>İptal</option></select></div><div class="fg"><label>Ödeme</label><select id="f-ps"><option>Bekliyor</option><option>Kapora</option><option>Ödendi</option></select></div></div><div class="fg"><label>Not</label><textarea id="f-nt"></textarea></div>`,
    save:()=>{const q=gnv('f-qt'),up=gnv('f-up');const t=parseFloat((q*up).toFixed(2));return{customer_name:gv('f-nm'),phone:gv('f-ph'),part_name:gv('f-pn'),quantity_kg:q,unit_price:up,total_amount:t,delivery_date:gv('f-dd'),status:gv('f-st')||'Bekliyor',payment_status:gv('f-ps'),notes:gv('f-nt'),order_date:today()};},
    validate:()=>validateRequired([['f-nm','Müşteri adı zorunlu'],['f-qt','Miktar zorunlu'],['f-dd','Teslim tarihi zorunlu']]),
    fill:(r)=>{sv('f-nm',r.customer_name);sv('f-ph',r.phone);ss('f-pn',r.part_name);sv('f-qt',r.quantity_kg);sv('f-up',r.unit_price);sv('f-tl',r.total_amount);sv('f-dd',r.delivery_date);ss('f-st',r.status);ss('f-ps',r.payment_status);sv('f-nt',r.notes);}}
};

