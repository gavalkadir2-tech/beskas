function renderQRHistory(){
  const el=document.getElementById('qr-history');if(!el)return;
  el.innerHTML=_qrHistory.length
    ?_qrHistory.slice(-5).reverse().map(h=>`<div style="padding:6px 0;border-bottom:1px solid var(--brd);font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px"></span><div><div style="font-weight:600">${h.tag}</div><div style="font-size:10px;color:var(--sub)">${h.time}</div></div><button class="btn btn-pr btn-sm" style="margin-left:auto" onclick="qrOpenAnimal('${h.tag}')">Aç →</button></div>`).join('')
    :'<p style="font-size:12px;color:var(--sub)">Henüz tarama yapılmadı</p>';
}
async function startQRScan(){
  if(!navigator.mediaDevices?.getUserMedia){showToast('Kamera desteklenmiyor','rd');return;}
  try{
    _qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video=document.getElementById('qr-video');video.srcObject=_qrStream;
    document.getElementById('btn-start-scan').style.display='none';
    document.getElementById('btn-stop-scan').style.display='inline-flex';
    // Canvas ile periyodik tarama
    _qrScanInterval=setInterval(()=>processQRFrame(),500);
    showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Kamera başlatıldı — QR kodu çerçeveye tutun');
  }catch(e){showToast('Kamera erişimi reddedildi: '+e.message,'rd');}
}
function stopQRScan(){
  if(_qrStream)_qrStream.getTracks().forEach(t=>t.stop());_qrStream=null;
  clearInterval(_qrScanInterval);_qrScanInterval=null;
  document.getElementById('btn-start-scan').style.display='inline-flex';
  document.getElementById('btn-stop-scan').style.display='none';
}
function processQRFrame(){
  const video=document.getElementById('qr-video');
  const canvas=document.getElementById('qr-canvas-scan');if(!video||!canvas||video.readyState<2)return;
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  // BarcodeDetector API (modern browsers)
  if('BarcodeDetector' in window){
    const bd=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13']});
    const imageData=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    bd.detect(canvas).then(barcodes=>{
      if(barcodes.length>0){
        const raw=barcodes[0].rawValue;
        const tag=raw.startsWith('ANIMAL:')?raw.replace('ANIMAL:',''):raw;
        handleQRResult(tag);
      }
    }).catch(()=>{});
  }
}
function handleQRResult(tag){
  stopQRScan();
  const animal=D.animals.find(a=>a.tag_number===tag||a.name===tag);
  const resultEl=document.getElementById('qr-scan-result');
  if(animal){
    const idx=D.animals.indexOf(animal);
    if(resultEl)resultEl.innerHTML=`<div style="padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;display:flex;align-items:center;gap:10px"><span style="font-size:24px"></span><div><div style="font-weight:700;color:#16a34a">Hayvan bulundu!</div><div style="font-size:13px">${animal.tag_number} — ${animal.name||animal.species}</div></div><button class="btn btn-pr btn-sm" style="margin-left:auto" onclick="showPage('AnimalDetail',null);renderAnimalDetail(${idx})">Aç →</button></div>`;
    _qrHistory.push({tag,time:new Date().toLocaleTimeString('tr-TR')});
    renderQRHistory();showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> '+tag+' bulundu!');
  } else {
    if(resultEl)resultEl.innerHTML=`<div style="padding:12px;background:#fff0f0;border:1px solid #fca5a5;border-radius:8px"><div style="font-weight:700;color:#dc2626">Hayvan bulunamadı</div><div style="font-size:12px;color:var(--sub)">Okunan: ${tag}</div></div>`;
    showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> '+tag+' sistemde bulunamadı','yl');
  }
}
function qrManualSearch(val){
  if(!val||val.length<2)return;
  const tag=val.trim();
  const animal=D.animals.find(a=>a.tag_number.toLowerCase().includes(tag.toLowerCase())||( a.name&&a.name.toLowerCase().includes(tag.toLowerCase())));
  const el=document.getElementById('qr-manual-result');if(!el)return;
  if(animal){
    const idx=D.animals.indexOf(animal);
    el.innerHTML=`<div style="padding:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;display:flex;align-items:center;gap:8px;margin-top:6px"><span style="font-size:20px">${animal.species==='Sığır'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span>':animal.species==='Koyun'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><ellipse cx="12" cy="11" rx="7" ry="5"/><path d="M7 11v4a2 2 0 0 0 4 0v-1m2 1v-4m2 0v4a2 2 0 0 0 4 0"/><circle cx="8" cy="8" r="2"/></svg></span>':animal.species==='Keçi'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 15c0 3 2 4 4 4s4-1 4-4V9a4 4 0 0 0-8 0v6z"/><path d="M13 10h3l2-3"/><path d="M7 7l-2-3m2 3l2-3"/></svg></span>':animal.species==='At'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M5 20V10c0-4 3-7 7-7s7 3 7 7v2l2 2-2 1v5"/><path d="M8 20v-3m8 3v-3"/></svg></span>':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="14" r="2"/><circle cx="19" cy="14" r="2"/><ellipse cx="12" cy="17" rx="4" ry="3"/></svg></span>'}</span><div style="flex:1"><div style="font-weight:600">${animal.tag_number}${animal.name?' — '+animal.name:''}</div><div style="font-size:11px;color:var(--sub)">${animal.species} | ${animal.status} | ${animal.weight||'-'} kg</div></div><button class="btn btn-pr btn-sm" onclick="showPage('AnimalDetail',null);renderAnimalDetail(${idx})">Detay →</button></div>`;
  } else {
    el.innerHTML=`<div style="font-size:12px;color:var(--sub);margin-top:6px">Sonuç bulunamadı</div>`;
  }
}
function qrOpenAnimal(tag){const a=D.animals.find(x=>x.tag_number===tag);if(a){const i=D.animals.indexOf(a);showPage('AnimalDetail',null);renderAnimalDetail(i);}}
function downloadQRNew(tag){
  const el=document.getElementById('qrbox-'+tag);if(!el)return;
  const canvas=el.querySelector('canvas');if(!canvas)return;
  const a=document.createElement('a');a.download='QR-'+tag+'.png';a.href=canvas.toDataURL('image/png');a.click();
}
function printQRNew(tag){
  const el=document.getElementById('qrbox-'+tag);if(!el)return;
  const canvas=el.querySelector('canvas');if(!canvas)return;
  const img=canvas.toDataURL('image/png');
  const w=window.open('','_blank','width=300,height=400');
  w.document.write(`<html><head><title>QR - ${tag}</title></head><body style="text-align:center;font-family:sans-serif;padding:20px"><img src="${img}" style="width:180px;height:180px"><br><b style="font-size:16px">${tag}</b><br><span style="font-size:12px;color:#666">${D.settings.farm_name||'Bizim Çiftlik'}</span><script>window.onload=function(){window.print();window.close()}<\/script>
</div>
</body></html>`);
  w.document.close();
}
function printAllQRs(){
  if(!D.animals.length){showToast('Hayvan yok','yl');return;}
  const items=D.animals.map(a=>{const el=document.getElementById('qrbox-'+a.tag_number);const canvas=el?.querySelector('canvas');return canvas?`<div style="display:inline-block;text-align:center;margin:10px;padding:10px;border:1px solid #ddd;border-radius:8px"><img src="${canvas.toDataURL()}" style="width:120px;height:120px"><br><b>${a.tag_number}</b><br><span style="font-size:11px;color:#666">${a.name||a.species}</span></div>`:''}).join('');
  const w=window.open('','_blank');w.document.write(`<html><head><title>QR Kodları</title></head><body><h2 style="font-family:sans-serif;text-align:center">${D.settings.farm_name||'Bizim Çiftlik'} — QR Kodları</h2>${items}<script>window.onload=function(){window.print()}<\/script></body></html>`);w.document.close();
}

// ===================== PDF FATURA & RAPOR =====================
function renderPDFPage(){
  const sel=document.getElementById('pdf-sale-sel');
  if(sel)sel.innerHTML='<option value="">-- Satış Seçin --</option>'+D.sales.map((s,i)=>`<option value="${i}">${s.date||'Tarihsiz'} — ${s.buyer_name||'Alıcısız'} — ₺${fmt(s.total_amount)}</option>`).join('');
  const invNo=document.getElementById('pdf-inv-no');
  if(invNo&&!invNo.value)invNo.value='FTR-'+new Date().getFullYear()+'-'+String(D.sales.length+1).padStart(3,'0');
}
function generateSalesPDF(){
  const idx=document.getElementById('pdf-sale-sel')?.value;
  if(idx===''){showToast('Satış seçin!','yl');return;}
  const sale=D.sales[parseInt(idx)];if(!sale)return;
  const invNo=document.getElementById('pdf-inv-no')?.value||'FTR-001';
  const farm=D.settings;
  const {jsPDF}=window.jspdf||{};
  if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF();
  // Başlık
  doc.setFillColor(26,60,46);doc.rect(0,0,210,40,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(20);doc.setFont('helvetica','bold');
  doc.text(farm.farm_name||'Bizim Çiftlik',20,18);
  doc.setFontSize(10);doc.setFont('helvetica','normal');
  doc.text('FATURA',20,28);doc.text(`No: ${invNo}`,20,35);
  doc.text(`Tarih: ${sale.date||today()}`,150,28);
  // Çiftlik bilgileri
  doc.setTextColor(50,50,50);doc.setFontSize(9);
  doc.text(farm.address||'Adres bilgisi girilmemiş',130,35);
  // Alıcı
  doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(26,60,46);
  doc.text('ALICI',20,55);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(50,50,50);
  doc.text(sale.buyer_name||'—',20,62);doc.text(sale.buyer_phone||'',20,68);doc.text(sale.buyer_address||'',20,74);
  // Tablo başlığı
  doc.setFillColor(240,244,240);doc.rect(15,85,180,8,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(50,50,50);
  doc.text('Ürün/Hizmet',20,91);doc.text('Miktar',90,91);doc.text('Birim Fiyat',120,91);doc.text('Tutar',165,91);
  // Satır
  doc.setFont('helvetica','normal');
  const desc=`${sale.sale_type||'Satış'}${sale.animal_tag?' ('+sale.animal_tag+')':''}`;
  doc.text(desc,20,102);doc.text(`${sale.quantity||1} ${sale.unit||'adet'}`,90,102);
  doc.text('₺'+fmt(sale.unit_price||0),120,102);doc.text('₺'+fmt(sale.total_amount||0),165,102);
  doc.line(15,107,195,107);
  // Toplam
  doc.setFont('helvetica','bold');doc.setFontSize(11);
  doc.text('TOPLAM:',130,117);doc.text('₺'+fmt(sale.total_amount||0),165,117);
  doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
  doc.text(`Ödeme Yöntemi: ${sale.payment_method||'—'}`,20,117);
  doc.text(`Durum: ${sale.payment_status||'—'}`,20,124);
  // Alt bilgi
  doc.setFontSize(8);doc.setTextColor(150,150,150);
  doc.line(15,270,195,270);doc.text(farm.phone||'',20,275);doc.text(farm.email||'',80,275);doc.text('Bu belge elektronik ortamda oluşturulmuştur.',130,275);
  doc.save(`Fatura-${invNo}-${today()}.pdf`);
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/></svg></span> Fatura PDF indirildi ✓');
}
function generateMonthlyPDF(){
  const {jsPDF}=window.jspdf||{};if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF();const farm=D.settings;
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  doc.setFillColor(26,60,46);doc.rect(0,0,210,30,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(16);doc.setFont('helvetica','bold');
  doc.text(farm.farm_name||'Bizim Çiftlik',20,14);
  doc.setFontSize(10);doc.setFont('helvetica','normal');
  doc.text(`Aylık Performans Raporu — ${new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}`,20,23);
  doc.setTextColor(50,50,50);let y=45;
  const section=(title)=>{doc.setFillColor(240,244,240);doc.rect(15,y-5,180,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(26,60,46);doc.text(title,20,y);y+=10;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(50,50,50);};
  const row=(label,val)=>{doc.text(label,25,y);doc.text(String(val),130,y);y+=7;};
  section('HAYVAN VARLIKLARI');
  row('Toplam Hayvan',D.animals.length);row('Aktif',D.animals.filter(a=>a.status==='Aktif').length);row('Hasta',D.animals.filter(a=>a.status==='Hasta').length);row('Gebe',D.animals.filter(a=>a.status==='Gebe').length);y+=4;
  section('FİNANSAL ÖZET');
  row('Toplam Gelir','₺'+fmt(gelir));row('Toplam Gider','₺'+fmt(gider));doc.setFont('helvetica','bold');row('Net Kâr/Zarar','₺'+fmt(gelir-gider));doc.setFont('helvetica','normal');y+=4;
  section('SAĞLIK & OPERASYON');
  row('Sağlık Kaydı',D.health.length);row('Bekleyen Görev',D.tasks.filter(t=>t.status==='Bekliyor').length);row('Kritik Stok',D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock)).length);y+=4;
  section('ÜRETİM');
  row('Üretim Kaydı',D.production.length);row('Toplam Üretim Miktarı',D.production.reduce((s,p)=>s+nv(p.quantity),0)+' birim');
  doc.setFontSize(8);doc.setTextColor(150,150,150);doc.text(`Oluşturma: ${new Date().toLocaleString('tr-TR')} — Bizim Çiftlik Yönetim Sistemi`,20,280);
  doc.save(`Aylik-Rapor-${today()}.pdf`);showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></span> Aylık rapor indirildi ✓');
}
function generateHealthPDF(){
  const {jsPDF}=window.jspdf||{};if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF('landscape');doc.setFillColor(26,60,46);doc.rect(0,0,297,25,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text((D.settings.farm_name||'Bizim Çiftlik')+' — Sağlık & Veteriner Raporu',15,16);
  doc.setFontSize(9);doc.text(today(),255,16);
  doc.setTextColor(50,50,50);let y=35;
  doc.setFont('helvetica','bold');doc.setFontSize(9);
  ['Hayvan','Tip','Tarih','Teşhis','İlaç','Veteriner','Maliyet','Sonraki'].forEach((h,i)=>{doc.text(h,[10,40,70,110,155,190,230,255][i],y);});
  doc.line(10,y+2,285,y+2);y+=8;
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  D.health.slice(0,25).forEach(h=>{
    if(y>185){doc.addPage('landscape');y=20;}
    doc.text((h.animal_tag||'').substring(0,8),10,y);doc.text((h.record_type||'').substring(0,8),40,y);doc.text(h.date||'',70,y);
    doc.text((h.diagnosis||'').substring(0,18),110,y);doc.text((h.medication||'').substring(0,15),155,y);
    doc.text((h.vet_name||'').substring(0,12),190,y);doc.text(h.cost?'₺'+fmt(h.cost):'',230,y);doc.text(h.next_date||'',255,y);
    y+=6;
  });
  doc.save(`Saglik-Raporu-${today()}.pdf`);showToast(' Sağlık raporu indirildi ✓');
}
function generateFinancePDF(){
  const {jsPDF}=window.jspdf||{};if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF('landscape');doc.setFillColor(26,60,46);doc.rect(0,0,297,25,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text((D.settings.farm_name||'Bizim Çiftlik')+' — Finansal Özet Raporu',15,16);doc.text(today(),255,16);
  const gelir=D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0);
  const gider=D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0);
  doc.setTextColor(50,50,50);doc.setFont('helvetica','normal');doc.setFontSize(10);
  doc.text(`Toplam Gelir: ₺${fmt(gelir)}`,15,35);doc.text(`Toplam Gider: ₺${fmt(gider)}`,100,35);doc.text(`Net: ₺${fmt(gelir-gider)}`,185,35);
  let y=45;doc.setFont('helvetica','bold');doc.setFontSize(9);
  ['Tarih','Tip','Kategori','Açıklama','Ödeme','Tutar'].forEach((h,i)=>{doc.text(h,[10,35,60,100,180,240][i],y);});
  doc.line(10,y+2,285,y+2);y+=8;doc.setFont('helvetica','normal');doc.setFontSize(8);
  [...D.finance].reverse().slice(0,30).forEach(f=>{
    if(y>185){doc.addPage('landscape');y=20;}
    doc.text(f.date||'',10,y);doc.text(f.type||'',35,y);doc.text((f.category||'').substring(0,14),60,y);
    doc.text((f.description||'').substring(0,26),100,y);doc.text((f.payment_method||'').substring(0,12),180,y);
    doc.setTextColor(f.type==='Gelir'?[22,163,74]:[220,38,38]);doc.text('₺'+fmt(f.amount),240,y);doc.setTextColor(50,50,50);y+=6;
  });
  doc.save(`Finans-Raporu-${today()}.pdf`);showToast(' Finans raporu indirildi ✓');
}
function generateInventoryPDF(){
  const {jsPDF}=window.jspdf||{};if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF();doc.setFillColor(26,60,46);doc.rect(0,0,210,25,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text((D.settings.farm_name||'Bizim Çiftlik')+' — Stok Durum Raporu',15,16);
  doc.setTextColor(50,50,50);let y=35;doc.setFont('helvetica','bold');doc.setFontSize(9);
  ['Ürün','Kategori','Stok','Min','Birim','Birim F.','SKT','Durum'].forEach((h,i)=>{doc.text(h,[10,45,85,105,120,140,160,185][i],y);});
  doc.line(10,y+2,200,y+2);y+=8;doc.setFont('helvetica','normal');doc.setFontSize(8);
  D.inventory.forEach(item=>{
    if(y>270){doc.addPage();y=20;}
    const isLow=nv(item.current_stock)<nv(item.minimum_stock);
    doc.text((item.name||'').substring(0,14),10,y);doc.text((item.category||'').substring(0,10),45,y);
    doc.text(String(item.current_stock||0),85,y);doc.text(String(item.minimum_stock||0),105,y);
    doc.text(item.unit||'',120,y);doc.text(item.unit_cost?'₺'+item.unit_cost:'',140,y);doc.text(item.expiry_date||'',160,y);
    doc.setTextColor(isLow?[220,38,38]:[22,163,74]);doc.text(isLow?'KRİTİK':'Yeterli',185,y);doc.setTextColor(50,50,50);y+=6;
  });
  doc.save(`Stok-Raporu-${today()}.pdf`);showToast(' Stok raporu indirildi ✓');
}
function generateAnimalListPDF(){
  const {jsPDF}=window.jspdf||{};if(!jsPDF){showToast('PDF kütüphanesi yükleniyor...','yl');return;}
  const doc=new jsPDF('landscape');doc.setFillColor(26,60,46);doc.rect(0,0,297,25,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text((D.settings.farm_name||'Bizim Çiftlik')+' — Sürü Listesi',15,16);doc.text(today(),255,16);
  doc.setTextColor(50,50,50);let y=35;doc.setFont('helvetica','bold');doc.setFontSize(9);
  ['Küpe No','İsim','Tür','Irk','Cinsiyet','Yaş','Ağırlık','Konum','Durum'].forEach((h,i)=>{doc.text(h,[10,35,65,95,130,155,175,200,240][i],y);});
  doc.line(10,y+2,285,y+2);y+=8;doc.setFont('helvetica','normal');doc.setFontSize(8);
  D.animals.forEach(a=>{
    if(y>185){doc.addPage('landscape');y=20;}
    const age=a.birth_date?Math.floor((new Date()-new Date(a.birth_date))/31536000000)+'y':'';
    doc.text((a.tag_number||'').substring(0,8),10,y);doc.text((a.name||'').substring(0,10),35,y);doc.text((a.species||'').substring(0,10),65,y);
    doc.text((a.breed||'').substring(0,10),95,y);doc.text(a.gender||'',130,y);doc.text(age,155,y);doc.text(a.weight?a.weight+'kg':'',175,y);
    doc.text((a.location||'').substring(0,12),200,y);doc.text(a.status||'',240,y);y+=6;
  });
  doc.save(`Suru-Listesi-${today()}.pdf`);showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> Sürü listesi indirildi ✓');
}

// ===================== EXCEL DIŞA/İÇE AKTARMA =====================
function exportExcel(key){
  const data=D[key];if(!data||!data.length){showToast('Veri yok','yl');return;}
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,key);
  XLSX.writeFile(wb,`${key}-${today()}.xlsx`);showToast(` ${key}.xlsx indiriliyor...`);
}
function exportAllExcel(){
  const wb=XLSX.utils.book_new();
  ['animals','health','finance','inventory','sales','repro','production','tasks','employees'].forEach(key=>{
    if(D[key]&&D[key].length){const ws=XLSX.utils.json_to_sheet(D[key]);XLSX.utils.book_append_sheet(wb,ws,key);}
  });
  XLSX.writeFile(wb,`BizimCiftlik-TumVeriler-${today()}.xlsx`);showToast(' Tüm veriler Excel olarak indirildi ✓');
}
function importExcel(key,input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws);
      if(!data.length){showToast('Excel boş veya hatalı','rd');return;}
      if(confirm(`${data.length} satır '${key}' verisine eklensin mi? (Mevcut veriler korunur)`)){
        D[key]=[...D[key],...data];persist();renderPage(curPage);
        const el=document.getElementById('excel-import-result');
        if(el)el.innerHTML=`<div style="padding:8px;background:#f0fdf4;border-radius:6px;font-size:12px;color:#16a34a;margin-top:4px">✓ ${data.length} satır ${key} verisine aktarıldı</div>`;
        showToast(`✓ ${data.length} satır içe aktarıldı`);
      }
    }catch(err){showToast('Excel okunamadı: '+err.message,'rd');}
    input.value='';
  };reader.readAsBinaryString(file);
}

// ===================== WHATSAPP & BİLDİRİMLER =====================
function getWAPhone(){return(document.getElementById('wa-phone')?.value||D.settings.wa_phone||'').replace(/\D/g,'');}
function buildWAMessage(type){
  const farm=D.settings.farm_name||'Çiftlik';const todayStr=today();
  if(type==='daily'){
    const hasta=D.animals.filter(a=>a.status==='Hasta');const kritik=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock));const gorev=D.tasks.filter(t=>t.due_date===todayStr&&t.status!=='Tamamlandı');
    return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 3v4m-4.5 2-2-2m13 2 2-2"/></svg></span> *${farm} — Günlük Durum (${todayStr})*\n\n<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> Hayvan: ${D.animals.length} (${hasta.length} hasta)\n Net: ₺${fmt(D.finance.filter(f=>f.type==='Gelir').reduce((s,f)=>s+nv(f.amount),0)-D.finance.filter(f=>f.type==='Gider').reduce((s,f)=>s+nv(f.amount),0))}\n Bugün ${gorev.length} görev\n ${kritik.length} kritik stok${hasta.length?'\n\n<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Hasta: '+hasta.map(a=>a.tag_number).join(', '):''}${kritik.length?'\n Kritik: '+kritik.map(i=>i.name).join(', '):''}`;
  }else if(type==='sick'){
    const hasta=D.animals.filter(a=>a.status==='Hasta');
    if(!hasta.length)return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> *${farm}* — Şu an hasta hayvan yok.`;
    return` *${farm} — Hasta Hayvan Bildirimi*\n\n${hasta.map(a=>`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> ${a.tag_number}${a.name?' ('+a.name+')':''} — ${a.species}`).join('\n')}\n\n_Veteriner kontrolü gerekebilir._`;
  }else if(type==='stock'){
    const kritik=D.inventory.filter(i=>nv(i.current_stock)<nv(i.minimum_stock));
    if(!kritik.length)return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> *${farm}* — Stok durumu normal.`;
    return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> *${farm} — Kritik Stok Bildirimi*\n\n${kritik.map(i=>` ${i.name}: ${i.current_stock}/${i.minimum_stock} ${i.unit}`).join('\n')}`;
  }else if(type==='tasks'){
    const gorev=D.tasks.filter(t=>t.due_date===todayStr&&t.status!=='Tamamlandı');
    if(!gorev.length)return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> *${farm}* — Bugün için bekleyen görev yok.`;
    return`<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></svg></span> *${farm} — Bugünkü Görevler (${todayStr})*\n\n${gorev.map(t=>`${t.priority==='Kritik'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#dc2626" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>':t.priority==='Yüksek'?'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#d97706" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>':'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#16a34a" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>'} ${t.title}${t.assigned_to?' → '+t.assigned_to:''}`).join('\n')}`;
  }return '';
}
function waSendReport(type){
  const phone=getWAPhone();
  if(!phone){showToast('WhatsApp numarası girin!','yl');return;}
  const msg=buildWAMessage(type);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,`_blank`);
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></span> WhatsApp açılıyor...');
}
function waSendCustom(){
  const phone=getWAPhone();const msg=document.getElementById('wa-custom')?.value;
  if(!phone){showToast('WhatsApp numarası girin!','yl');return;}
  if(!msg){showToast('Mesaj yazın!','yl');return;}
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
}

// ===================== TÜRKVET / e-DEVLET =====================
function exportTurkvet(type){
  const code=document.getElementById('tv-code')?.value||D.settings.turkvet||'TR00000000';
  const vet=document.getElementById('tv-vet')?.value||'';
  if(type==='surü'){
    const rows=[['Kulak_No','Dogum_Tarihi','Tur','Irk','Cinsiyet','Durum','Lokasyon','Agirlik','Isletme_Kodu'],...D.animals.map(a=>[a.tag_number,a.birth_date||'',a.species||'',a.breed||'',a.gender||'',a.status||'',a.location||'',a.weight||'',code])];
    downloadCSV(rows,`TurkVet-Suru-${today()}.csv`);
  }else if(type==='hareket'){
    const rows=[['Kulak_No','Islem_Tarihi','Islem_Tipi','Kaynak','Hedef','Isletme_Kodu'],...D.animals.map(a=>[a.tag_number,a.purchase_date||a.birth_date||today(),'Kayit','',a.location||'',code]),...D.sales.filter(s=>s.sale_type==='Canlı Hayvan').map(s=>[s.animal_tag||'',s.date||'','Satis','',s.buyer_name||'',code])];
    downloadCSV(rows,`TurkVet-Hareket-${today()}.csv`);
  }else if(type==='saglik'){
    const rows=[['Kulak_No','Tarih','Kayit_Tipi','Teshis','Ilac','Doz','Veteriner_No','Maliyet','Isletme_Kodu'],...D.health.map(h=>[h.animal_tag||'',h.date||'',h.record_type||'',h.diagnosis||'',h.medication||'',h.dose||'',vet,h.cost||'',code])];
    downloadCSV(rows,`TurkVet-Saglik-${today()}.csv`);
  }else if(type==='asi'){
    const rows=[['Kulak_No','Asi_Tarihi','Asi_Turu','Veteriner_No','Sonraki_Tarih','Isletme_Kodu'],...D.health.filter(h=>h.record_type==='Aşılama').map(h=>[h.animal_tag||'',h.date||'',h.diagnosis||'',vet,h.next_date||'',code])];
    downloadCSV(rows,`TurkVet-Asi-${today()}.csv`);
  }else if(type==='xml'){
    const xml=`<?xml version="1.0" encoding="UTF-8"?>
<Isletme kod="${code}" olusturma="${new Date().toISOString()}">
  <Genel>
    <Ad>${D.settings.farm_name||'Bizim Çiftlik'}</Ad>
    <Sahip>${D.settings.owner||''}</Sahip>
    <Konum>${D.settings.location||''}</Konum>
    <Telefon>${D.settings.phone||''}</Telefon>
  </Genel>
  <Hayvanlar toplam="${D.animals.length}">
    ${D.animals.map(a=>`<Hayvan><KulakNo>${a.tag_number}</KulakNo><Tur>${a.species||''}</Tur><Irk>${a.breed||''}</Irk><Cinsiyet>${a.gender||''}</Cinsiyet><Durum>${a.status||''}</Durum><Agirlik>${a.weight||''}</Agirlik></Hayvan>`).join('\n    ')}
  </Hayvanlar>
</Isletme>`;
    const b=new Blob([xml],{type:'application/xml;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`eDevlet-${code}-${today()}.xml`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/></svg></span> Dışa aktarıldı ✓');
}
function downloadCSV(rows,filename){
  const content=rows.map(r=>r.map(v=>String(v).includes(',')?`"${v}"`:v).join(',')).join('\n');
  const b=new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// ===================== AI SOHBET HAFIZASI =====================
function renderIntegrations(){
  const el=document.getElementById('ai-memory-text');const phoneEl=document.getElementById('wa-phone');
  if(el)el.value=D.ai_memory||'';
  if(phoneEl)phoneEl.value=D.settings.wa_phone||'';
  const tvCode=document.getElementById('tv-code');const tvVet=document.getElementById('tv-vet');
  if(tvCode)tvCode.value=D.settings.turkvet||'';if(tvVet)tvVet.value=D.settings.vet_no||'';
  const lastDate=document.getElementById('ai-mem-last-date');const count=document.getElementById('ai-mem-count');
  if(lastDate)lastDate.textContent=D.ai_mem_date||'—';if(count)count.textContent=chatHistory.length;
}
function saveAIMemory(){
  const val=document.getElementById('ai-memory-text')?.value||'';
  D.ai_memory=val;D.ai_mem_date=today();
  const phone=document.getElementById('wa-phone')?.value;if(phone)D.settings.wa_phone=phone;
  const tvCode=document.getElementById('tv-code')?.value;if(tvCode)D.settings.turkvet=tvCode;
  persist();showToast('<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M9 3a5 5 0 0 0-2 9.5V18a3 3 0 0 0 6 0v-5.5A5 5 0 0 0 9 3z"/><path d="M15 3a5 5 0 0 1 2 9.5V18a3 3 0 0 1-6 0"/></svg></span> AI hafızası kaydedildi ✓');
}
function clearAIMemory(){
  if(confirm('AI hafızasını sıfırla?')){D.ai_memory='';D.ai_mem_date=null;chatHistory=[];persist();renderIntegrations();showToast('Hafıza temizlendi');}}
// AI Chat hafıza entegrasyonu — farmCtx'e memory eklendi (v4 merge)
// NOT: farmCtx wrap kaldırıldı, orijinal farmCtx zaten aşağıda override edildi
// ===================== AUDIT LOG (DEĞİŞİKLİK GEÇMİŞİ) =====================
if(!D.auditLog)D.auditLog=[];
if(!D.users)D.users=[{id:1,name:'Müdür',role:'mudur',pin:'1234',active:true}];
if(!D.currentUser)D.currentUser=D.users[0];

function auditRecord(action,module,desc,oldVal){
  if(!D.auditLog)D.auditLog=[];
  D.auditLog.push({ts:new Date().toISOString(),user:(D.currentUser||{}).name||'Sistem',role:(D.currentUser||{}).role||'mudur',action,module,desc,old:oldVal?JSON.stringify(oldVal).substring(0,120):null});
  if(D.auditLog.length>500)D.auditLog=D.auditLog.slice(-400);
}

// delR audit entegrasyonu orijinal tanımda yapıldı (yukarıda)

function renderAuditLog(){
  const modF=(document.getElementById('audit-filter-module')||{}).value||'';
  const actF=(document.getElementById('audit-filter-action')||{}).value||'';
  let logs=[...(D.auditLog||[])].reverse();
  if(modF)logs=logs.filter(l=>l.module===modF);
  if(actF)logs=logs.filter(l=>l.action===actF);
  const colors={add:'#2d6a4f',edit:'#3b82f6',delete:'#ef4444'};
  const icons={add:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>',edit:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></span>',delete:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg></span>'};
  const el=document.getElementById('audit-log-list');if(!el)return;
  el.innerHTML=logs.length
    ?`<div style="max-height:500px;overflow-y:auto">${logs.slice(0,100).map(l=>`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--brd)">
        <div style="width:28px;height:28px;border-radius:7px;background:${colors[l.action]||'#94a3b8'}18;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icons[l.action]||'•'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:600">${l.desc||'—'}</span>
            <span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${colors[l.action]||'#94a3b8'}20;color:${colors[l.action]||'#94a3b8'}">${l.action}</span>
            <span class="tag t-gy" style="font-size:10px">${l.module}</span>
          </div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px"> ${l.user} • ${new Date(l.ts).toLocaleString('tr-TR')}</div>
          ${l.old?`<div style="font-size:10px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Önceki: ${l.old}</div>`:''}
        </div>
      </div>`).join('')}</div>`
    :'<div style="text-align:center;padding:30px;color:var(--sub)">Henüz kayıt yok</div>';
}
function clearAuditLog(){if(confirm('Tüm geçmiş silinsin?')){D.auditLog=[];persist();renderAuditLog();showToast('Geçmiş temizlendi');}}

// ===================== KULLANICI & ROL YÖNETİMİ =====================
const ROLES={
  mudur:   {label:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M2 18l4-8 6 4 6-4 4 8H2z"/><circle cx="12" cy="6" r="2"/></svg></span> Müdür',     color:'#8b5cf6', pages:null},
  veteriner:{label:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>‍<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2v20M2 12h20m-3.5-6.5-2 2m-9 9-2 2m13 0-2-2m-9-9-2 2"/></svg></span> Veteriner',color:'#ef4444', pages:['Dashboard','Animals','Health','Disease','Reproduction','VacSchedule','VetBook','AnimalDetail','WeightTrack']},
  coban:   {label:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M4 9h16M8 9V5a4 4 0 0 1 8 0v4"/><path d="M3 12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v1z"/><path d="M8 22v-7m8 7v-7M5 22h14"/></svg></span> Çoban',     color:'#f59e0b', pages:['Dashboard','Animals','Health','Tasks','Feeding','Production','WeightTrack','AnimalDetail','Calendar']},
  muhasebe:{label:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m0 5h8"/></svg></span> Muhasebe',  color:'#3b82f6', pages:['Dashboard','Finance','Sales','Inventory','Suppliers','Reports','Analytics']}
};
const ROLE_MODULES=['Dashboard','Animals','Health','Finance','Sales','Inventory','Reproduction','Tasks','Employees','Analytics','PDF','QRScan','Integrations','Settings'];

function renderRollerSettings(){
  const u=D.currentUser||D.users[0];
  const el=document.getElementById('active-user-info');if(!el)return;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:var(--bg)">
    <div style="width:40px;height:40px;border-radius:50%;background:${(ROLES[u.role]||{}).color||'#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff"></div>
    <div><div style="font-weight:700">${u.name}</div><div style="font-size:11px;color:var(--sub)">${(ROLES[u.role]||{}).label||u.role}</div></div>
    <span style="margin-left:auto;padding:3px 10px;border-radius:10px;background:${(ROLES[u.role]||{}).color||'#94a3b8'}20;color:${(ROLES[u.role]||{}).color||'#94a3b8'};font-size:11px;font-weight:600">Aktif</span>
  </div>`;
  const listEl=document.getElementById('user-list-settings');
  if(listEl)listEl.innerHTML=D.users.map((usr,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:9px;border:1px solid var(--brd);border-radius:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:50%;background:${(ROLES[usr.role]||{}).color||'#94a3b8'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px"></div>
      <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${usr.name}</div><div style="font-size:11px;color:var(--sub)">${(ROLES[usr.role]||{}).label||usr.role}</div></div>
      <button class="btn btn-pr btn-sm" onclick="switchUser(${i})">Geç</button>
      ${i>0?`<button class="btn btn-danger btn-sm" onclick="deleteUser(${i})">🗑️</button>`:''}
    </div>`).join('');
  const tbody=document.getElementById('role-perms-table');
  if(tbody)tbody.innerHTML=ROLE_MODULES.map(m=>`<tr>
    <td style="padding:6px 8px;border:1px solid var(--brd);font-size:12px">${m}</td>
    ${['mudur','veteriner','coban','muhasebe'].map(r=>`<td style="padding:6px;text-align:center;border:1px solid var(--brd)">${!ROLES[r].pages||ROLES[r].pages.includes(m)?'<span style="color:#40916c;font-size:14px">✓</span>':'<span style="color:#ef4444;font-size:12px">—</span>'}</td>`).join('')}
  </tr>`).join('');
}
function showUserSwitch(){
  const html=`<div style="padding:4px">
    <p style="font-size:12.5px;color:var(--sub);margin-bottom:14px">PIN girerek kullanıcı değiştirin:</p>
    ${D.users.map((u,i)=>`<div style="padding:10px;border:1px solid var(--brd);border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div style="flex:1"><div style="font-weight:600">${u.name}</div><div style="font-size:11px;color:var(--sub)">${(ROLES[u.role]||{}).label||u.role}</div></div>
      <input id="pin-${i}" type="password" maxlength="6" placeholder="PIN" style="width:80px;padding:6px;border:1px solid var(--brd);border-radius:6px;font-size:13px;text-align:center;background:var(--card);color:var(--txt)"/>
      <button class="btn btn-pr btn-sm" onclick="switchUserWithPin(${i})">Gir</button>
    </div>`).join('')}
  </div>`;
  openGenericModal(' Kullanıcı Değiştir',html);
}
function switchUserWithPin(idx){
  const u=D.users[idx];const entered=(document.getElementById('pin-'+idx)||{}).value;
  if(!u.pin||entered===u.pin){switchUser(idx);}else{showToast('Yanlış PIN!','rd');}
}
function switchUser(idx){
  D.currentUser=D.users[idx];persist();
  showToast(` ${D.users[idx].name} olarak giriş yapıldı`);
  renderRollerSettings();applyRoleFilter();closeModal();
}
function showAddUser(){
  const html=`<div style="padding:4px">
    <div class="fg"><label>Ad Soyad</label><input id="new-user-name" placeholder="Ahmet Yılmaz" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:13px;background:var(--card);color:var(--txt)"/></div>
    <div class="fg"><label>Rol</label>
      <select id="new-user-role" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:13px;background:var(--card);color:var(--txt)">
        ${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>PIN (4-6 haneli)</label><input id="new-user-pin" type="password" maxlength="6" placeholder="••••" style="width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:7px;font-size:13px;background:var(--card);color:var(--txt)"/></div>
    <button class="btn btn-pr" onclick="addUserFromForm()">Kullanıcı Ekle</button>
  </div>`;
  openGenericModal('+ Yeni Kullanıcı',html);
}
function addUserFromForm(){
  const name=(document.getElementById('new-user-name')||{}).value?.trim();
  const role=(document.getElementById('new-user-role')||{}).value;
  const pin=(document.getElementById('new-user-pin')||{}).value;
  if(!name){showToast('İsim girin!','yl');return;}
  D.users.push({id:Date.now(),name,role,pin,active:false});persist();closeModal();renderRollerSettings();
  auditRecord('add','users',`Yeni kullanıcı: ${name} (${role})`);showToast('✓ Kullanıcı eklendi');
}
function deleteUser(idx){
  if(!confirm(`'${D.users[idx].name}' silinsin?`))return;
  auditRecord('delete','users',`Kullanıcı silindi: ${D.users[idx].name}`);
  D.users.splice(idx,1);persist();renderRollerSettings();showToast('Silindi');
}
function applyRoleFilter(){
  const role=(D.currentUser||{}).role||'mudur';
  const allowedPages=ROLES[role]?.pages;
  if(!allowedPages)return;
  document.querySelectorAll('.ni').forEach(ni=>{
    const p=ni.dataset.p;ni.style.display=(!p||allowedPages.includes(p))?'':'none';
  });
}
function openGenericModal(title,html){
  document.getElementById('md-title').textContent=title;
  document.getElementById('md-body').innerHTML=html;
  document.getElementById('ov').classList.add('on');
  document.getElementById('md').classList.add('on');
}

// ===================== TAHMİNSEL AI UYARILARI =====================
async function runPredictiveAlerts(){
  const alerts=[];
  if(D.weights&&D.weights.length>0){
    const tg={};D.weights.forEach(w=>{if(!tg[w.tag])tg[w.tag]=[];tg[w.tag].push(w);});
    Object.entries(tg).forEach(([tag,ws])=>{
      if(ws.length<2)return;
      ws.sort((a,b)=>a.date.localeCompare(b.date));
      const days=(new Date(ws[ws.length-1].date)-new Date(ws[0].date))/86400000;
      const gain=(nv(ws[ws.length-1].weight)-nv(ws[0].weight))/Math.max(1,days);
      if(gain<0.2&&days>14)alerts.push({sev:'yl',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2v20M3 9l4 7H3m14 0 4-7h-4M7 16h10M5 20h14"/></svg></span>',title:`${tag} yavaş büyüyor`,desc:`${gain.toFixed(2)} kg/gün`,action:'WeightTrack'});
    });
  }
  const soon14=new Date();soon14.setDate(soon14.getDate()+14);
  D.health.filter(h=>h.next_date&&new Date(h.next_date)<=soon14&&new Date(h.next_date)>=new Date()).forEach(h=>
    alerts.push({sev:'yl',ico:'',title:`${h.animal_tag} aşı yaklaşıyor`,desc:`${h.record_type} — ${h.next_date}`,action:'VacSchedule'})
  );
  const last30=D.feeding.filter(f=>{const d=new Date(f.date||'');return(new Date()-d)/86400000<=30;});
  D.inventory.filter(i=>i.category==='Yem').forEach(inv=>{
    const used=last30.filter(f=>(f.feed_name||'').includes(inv.name)).reduce((s,f)=>s+nv(f.quantity),0);
    const daily=used/30;
    if(daily>0&&nv(inv.current_stock)/daily<14)alerts.push({sev:'rd',ico:'',title:`${inv.name} 2 hafta içinde tükenir`,desc:`~${daily.toFixed(1)} ${inv.unit}/gün`,action:'Inventory'});
  });
  D.repro.filter(r=>r.expected_birth_date&&r.outcome==='Beklemede').forEach(r=>{
    const days=Math.round((new Date(r.expected_birth_date)-new Date())/86400000);
    if(days>=0&&days<=21)alerts.push({sev:days<=7?'rd':'yl',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="7"/><path d="M9 12c0-1.7 1.3-3 3-3s3 1.3 3 3m-3-3V6"/></svg></span>',title:`${r.animal_tag} ${days} günde doğum`,desc:`Beklenen: ${r.expected_birth_date}`,action:'Reproduction'});
  });
  D.animals.filter(a=>a.status==='Hasta').forEach(a=>{
    const lastCheck=D.health.filter(h=>h.animal_tag===a.tag_number).sort((x,y)=>(y.date||'').localeCompare(x.date||''))[0];
    if(!lastCheck)alerts.push({sev:'rd',ico:'',title:`${a.tag_number} hasta — sağlık kaydı yok`,desc:'Acil kontrol',action:'Health'});
    else{const d=Math.round((new Date()-new Date(lastCheck.date))/86400000);if(d>3)alerts.push({sev:'rd',ico:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><path d="M9 15h6m-3-3v6"/></svg></span>',title:`${a.tag_number} ${d} gündür hasta`,desc:`Son kayıt: ${lastCheck.date}`,action:'Health'});}
  });
  return alerts;
}
async function showPredictiveAlertsPanel(){
  const el=document.getElementById('predictive-alerts');if(!el)return;
  el.innerHTML='<div style="text-align:center;padding:12px;color:var(--sub);font-size:12px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg></span> Analiz ediliyor...</div>';
  const local=await runPredictiveAlerts();
  if(local.length>0){
    el.innerHTML=local.map(a=>`<div onclick="showPage('${a.action}',null)" style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-left:3px solid ${a.sev==='rd'?'#ef4444':'#f59e0b'};background:${a.sev==='rd'?'#fff0f0':'#fffbeb'};border-radius:0 8px 8px 0;margin-bottom:6px;cursor:pointer">
      <span style="font-size:20px">${a.ico}</span>
      <div><div style="font-size:12.5px;font-weight:600">${a.title}</div><div style="font-size:11px;color:var(--sub)">${a.desc}</div></div>
      <span style="margin-left:auto;font-size:12px">→</span>
    </div>`).join('');return;
  }
  if(D.animals.length<3){el.innerHTML='<div style="text-align:center;padding:16px;color:var(--sub);font-size:12px">Kritik uyarı yok</div>';return;}
  try{
    if(!getGroqKey())return;
    const res=await groqCall([{role:'user',content:'Çiftlik verilerini analiz et, önümüzdeki 30 gün için 3-5 spesifik risk uyarısı ver. Format: <span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="#dc2626" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg></span>/[Başlık] — [Neden ve öneri]. Kısa ol.'}],farmCtx(),500);
    const data=res;
    const text=data.content?.map(c=>c.text||'').join('')||'';
    el.innerHTML=text?`<div style="font-size:12.5px;line-height:1.7;white-space:pre-wrap">${text}</div>`:'<div style="text-align:center;padding:16px;color:var(--sub)">Risk tespit edilmedi</div>';
  }catch(e){el.innerHTML='<div style="font-size:12px;color:var(--sub);padding:8px">(AI bağlantısı yok)</div>';}
}

// ===================== OTOMATİK FORM DOLDURMA =====================
async function autoFillFromText(text){
  if(!text||text.length<5)return;
  const el=document.getElementById('auto-fill-result');if(!el)return;
  el.innerHTML='<div style="color:var(--sub);font-size:12px"><span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg></span> Analiz ediliyor...</div>';
  const prompt=`Türkçe metni analiz et, çiftlik yönetim kaydı için JSON döndür.
Format: {"type":"health|animal|task|finance|production|feeding","data":{...}}
Sağlık: animal_tag,record_type,date,diagnosis,medication,dose,vet_name,cost,next_date
Hayvan: tag_number,name,species,breed,gender,weight,birth_date,status
Görev: title,priority,due_date,assigned_to,category
Finans: type(Gelir/Gider),category,amount,date,description
Üretim: animal_tag,production_type,quantity,unit,date
Yemleme: animal_tag,feed_name,feed_type,quantity,unit,date
Sadece JSON döndür.
Metin: "${text}"`;
  try{
    const res=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,system:'Türkçe çiftlik verisini JSON formatına çevir.',messages:[{role:'user',content:prompt}]})});
    if(!res.ok)throw new Error('API hatası');
    const data=await res.json();
    const raw=(data.content?.map(c=>c.text||'').join('')||'{}').replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(raw);
    if(parsed.type&&parsed.data){
      const typeLabels={health:' Sağlık Kaydı',animal:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9c0-1.1.9-2 2-2h2l1-3h8l1 3h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2m6-2v2"/></svg></span> Hayvan',task:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg></span> Görev',finance:' Finans',production:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 17l4-4 4 4 4-8 4 4"/></svg></span> Üretim',feeding:'<span class="ico" style="display:inline-flex;align-items:center;vertical-align:middle;line-height:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M12 22V12M12 12C12 7 8 4 4 4c0 4 3 8 8 8zm0 0c0-5 4-8 8-8-1 4-4 8-8 8z"/></svg></span> Yemleme'};
      el.innerHTML=`<div style="background:var(--bg);border-radius:10px;padding:12px;border:1px solid var(--brd)">
        <div style="font-size:12px;font-weight:700;color:var(--g2);margin-bottom:10px">${typeLabels[parsed.type]||parsed.type} algılandı</div>
        <div style="font-size:12px;line-height:1.8">${Object.entries(parsed.data).filter(([,v])=>v).map(([k,v])=>`<div style="display:flex;gap:8px"><span style="color:var(--sub);min-width:130px">${k}:</span><span style="font-weight:600">${v}</span></div>`).join('')}</div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-pr btn-sm" onclick='applyAutoFill(${JSON.stringify(JSON.stringify(parsed))})'>Kaydet</button>
        </div>
      </div>`;
      el._parsed=parsed;
    }else{el.innerHTML='<div style="color:var(--sub);font-size:12px">Kayıt türü belirlenemedi.</div>';}
  }catch(e){el.innerHTML=`<div style="color:#ef4444;font-size:12px">Hata: ${e.message}</div>`;}
}
function applyAutoFill(parsedStr){
  try{
    const parsed=typeof parsedStr==='string'?JSON.parse(parsedStr):parsedStr;
    const typeMap={health:'health',animal:'animals',task:'tasks',finance:'finance',production:'production',feeding:'feeding'};
    const key=typeMap[parsed.type];if(!key)return;
    const record={...parsed.data};if(!record.date)record.date=today();
    D[key].push(record);
    auditRecord('add',key,`AI otodoldur: ${record.animal_tag||record.tag_number||record.title||record.description||''}`,null);
    persist();showToast('✓ Kayıt eklendi');
    const el=document.getElementById('auto-fill-result');
    if(el)el.innerHTML='<div style="padding:8px;background:#f0fdf4;border-radius:6px;font-size:12px;color:#16a34a">✓ Kayıt eklendi!</div>';
    const inp=document.getElementById('auto-fill-input');if(inp)inp.value='';
  }catch(e){showToast('Kayıt eklenemedi: '+e.message,'rd');}
}

function fabAction(){const map={Animals:'animal',Health:'health',Reproduction:'repro',Production:'production',Feeding:'feeding',Finance:'finance',Inventory:'inventory',Sales:'sale',Suppliers:'supplier',Employees:'employee',Tasks:'task',Lands:'land'};if(map[curPage])openForm(map[curPage]);}


function switchAITab(tab) {
  ['chat','quick','auto','tools'].forEach(t => {
    const p = document.getElementById('ait-panel-' + t);
    const b = document.getElementById('ait-' + t);
    if (p) p.style.display = t === tab ? (t === 'chat' ? 'flex' : 'block') : 'none';
    if (b) b.classList.toggle('active', t === tab);
  });
  // Hızlı analizlerde placeholder/result görünürlüğü
  if (tab === 'quick') {
    const res = document.getElementById('ai-quick-result');
    const ph  = document.getElementById('ai-quick-placeholder');
    if (res && !res.innerHTML.trim()) { if(res) res.style.display='none'; if(ph) ph.style.display=''; }
  }
  if (tab === 'auto') {
    setTimeout(() => renderAnomalyPanel('anomaly-panel-ai'), 100);
  }
}



// Dashboard autofill sync
function syncDashAutofill() {
  const src = document.getElementById('auto-fill-result');
  const dst = document.getElementById('dash-autofill-result');
  if (src && dst) dst.innerHTML = src.innerHTML;
}
setInterval(syncDashAutofill, 500);


// ══════════════════════════════════════════════════════════
//  FAB MENÜSÜ
// ══════════════════════════════════════════════════════════
let _fabOpen = false;
function toggleFabMenu() {
  _fabOpen ? closeFabMenu() : openFabMenu();
}
function openFabMenu() {
  _fabOpen = true;
  const menu = document.getElementById('fab-menu');
  const btn  = document.getElementById('fab-btn');
  const ov   = document.getElementById('fab-overlay');
  const p    = document.getElementById('fab-icon-plus');
  const x    = document.getElementById('fab-icon-x');
  if (menu) { menu.classList.add('open'); menu.classList.remove('closing'); }
  if (btn)  btn.classList.add('active');
  if (ov)   ov.style.display = 'block';
  if (p)    p.style.display = 'none';
  if (x)    x.style.display = '';
}
function closeFabMenu() {
  if (!_fabOpen) return;
  _fabOpen = false;
  const menu = document.getElementById('fab-menu');
  const btn  = document.getElementById('fab-btn');
  const ov   = document.getElementById('fab-overlay');
  const p    = document.getElementById('fab-icon-plus');
  const x    = document.getElementById('fab-icon-x');
  if (menu) {
    menu.classList.add('closing');
    setTimeout(() => { menu.classList.remove('open','closing'); }, 150);
  }
  if (btn)  btn.classList.remove('active');
  if (ov)   ov.style.display = 'none';
  if (p)    p.style.display = '';
  if (x)    x.style.display = 'none';
}
// FAB: modalı kapayınca menüyü de kapat
// closeModal FAB + kamera zaten closeModal içinde

// ══════════════════════════════════════════════════════════
//  SÜRÜKLENEBİLİR MİKROFON FAB — bas-konuş (Groq Whisper)
//  Kısa dokunuş+sürükleme = konumu taşı. Basılı tutma = ses kaydı başlar, bırakınca gönderilir.
// ══════════════════════════════════════════════════════════
let _micDragStart=null,_micDragging=false,_micPressStarted=false,_micPressTimer=null,_micBtnStartPos=null;
const MIC_DRAG_ESIK=10;   // px — bu kadar hareket edilirse sürükleme sayılır
const MIC_BASILI_GECIKME=140; // ms — bu süre boyunca hareket yoksa kayıt başlar

function micFabPointerDown(e){
  e.preventDefault();
  const btn=document.getElementById('mic-fab-btn');
  if(!btn)return;
  try{btn.setPointerCapture(e.pointerId);}catch(err){}
  _micDragStart={x:e.clientX,y:e.clientY};
  const rect=btn.getBoundingClientRect();
  _micBtnStartPos={right:window.innerWidth-rect.right,bottom:window.innerHeight-rect.bottom};
  _micDragging=false;
  _micPressStarted=false;
  clearTimeout(_micPressTimer);
  _micPressTimer=setTimeout(()=>{
    if(!_micDragging){ _micPressStarted=true; sesliKayitBaslat(); }
  },MIC_BASILI_GECIKME);
  btn.onpointermove=(ev)=>micFabPointerMove(ev);
}
function micFabPointerMove(e){
  if(!_micDragStart)return;
  const dx=e.clientX-_micDragStart.x, dy=e.clientY-_micDragStart.y;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(!_micDragging && !_micPressStarted && dist>MIC_DRAG_ESIK){
    _micDragging=true;
    clearTimeout(_micPressTimer);
  }
  if(_micDragging){
    const btn=document.getElementById('mic-fab-btn');
    if(!btn)return;
    let newRight=_micBtnStartPos.right-dx;
    let newBottom=_micBtnStartPos.bottom-dy;
    newRight=Math.max(8,Math.min(window.innerWidth-64,newRight));
    newBottom=Math.max(8,Math.min(window.innerHeight-64,newBottom));
    btn.style.right=newRight+'px';
    btn.style.bottom=newBottom+'px';
  }
}
function micFabPointerUp(e){
  clearTimeout(_micPressTimer);
  const btn=document.getElementById('mic-fab-btn');
  if(btn){
    try{btn.releasePointerCapture(e.pointerId);}catch(err){}
    btn.onpointermove=null;
  }
  if(_micDragging){
    if(btn){D.settings.mic_fab_pos={right:btn.style.right,bottom:btn.style.bottom};persist();}
  } else if(_micPressStarted){
    sesliKayitBitir();
  }
  _micDragStart=null;_micDragging=false;_micPressStarted=false;
}
// FAB menüsündeki "Basılı Tut, Konuş" öğesi için: kayıt bitince menüyü de kapat
function sesliKayitBitirVeMenuKapat(){
  sesliKayitBitir();
  if(typeof _fabOpen!=='undefined' && _fabOpen) closeFabMenu();
}
// Kaydedilmiş mikrofon konumunu geri yükle (varsa)
function restoreMicFabPos(){
  const btn=document.getElementById('mic-fab-btn');
  const pos=D.settings.mic_fab_pos;
  if(btn && pos && pos.right && pos.bottom){
    btn.style.right=pos.right;
    btn.style.bottom=pos.bottom;
  }
}

// ══════════════════════════════════════════════════════════
//  GLOBAL ARAMA
// ══════════════════════════════════════════════════════════
let _gsrTimer = null;
function globalSearch(q) {
  clearTimeout(_gsrTimer);
  const dropdown = document.getElementById('global-search-results');
  if (!dropdown) return;
  if (!q || q.trim().length < 2) {
    dropdown.innerHTML = '';
    dropdown.classList.remove('open');
    return;
  }
  _gsrTimer = setTimeout(() => showGlobalSearchResults(q), 180);
}

function showGlobalSearchResults(q) {
  const dropdown = document.getElementById('global-search-results');
  if (!dropdown) return;
  const term = q.toLowerCase().trim();
  let html = '';
  let total = 0;

  // ── Hayvanlar ──
  const animals = D.animals.filter(a =>
    (a.tag_number||'').toLowerCase().includes(term) ||
    (a.name||'').toLowerCase().includes(term) ||
    (a.species||'').toLowerCase().includes(term) ||
    (a.breed||'').toLowerCase().includes(term)
  ).slice(0, 5);
  if (animals.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">🐄 Hayvanlar</div>`;
    animals.forEach(a => {
      const idx = D.animals.indexOf(a);
      const hl = (t) => t.replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi'), '<span class="gsr-highlight">$1</span>');
      html += `<div class="gsr-item" onclick="closeGlobalSearch();openAnimalDetail(${idx})">
        <div class="gsr-ico" style="background:#dcfce7;color:#16a34a">${getSpeciesIcon(a.species)}</div>
        <div class="gsr-main">
          <div class="gsr-title">${hl(a.tag_number)}${a.name ? ' · ' + hl(a.name) : ''}</div>
          <div class="gsr-sub">${a.species||''} ${a.breed?'· '+a.breed:''}</div>
        </div>
        <span class="gsr-tag ${a.status==='Hasta'?'t-rd':a.status==='Aktif'?'t-gr':'t-gy'}">${a.status||'-'}</span>
      </div>`;
    });
    html += `</div>`;
    total += animals.length;
  }

  // ── Sağlık Kayıtları ──
  const health = D.health.filter(h =>
    (h.animal_tag||'').toLowerCase().includes(term) ||
    (h.diagnosis||'').toLowerCase().includes(term) ||
    (h.medication||'').toLowerCase().includes(term)
  ).slice(0, 3);
  if (health.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">🏥 Sağlık Kayıtları</div>`;
    health.forEach(h => {
      html += `<div class="gsr-item" onclick="closeGlobalSearch();showPage('Health',null)">
        <div class="gsr-ico" style="background:#fee2e2;color:#dc2626">💊</div>
        <div class="gsr-main">
          <div class="gsr-title">${h.animal_tag} — ${h.diagnosis||h.record_type||'Kayıt'}</div>
          <div class="gsr-sub">${h.date||''} ${h.medication?'· '+h.medication:''}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
    total += health.length;
  }

  // ── Görevler ──
  const tasks = D.tasks.filter(t =>
    (t.title||'').toLowerCase().includes(term) ||
    (t.description||'').toLowerCase().includes(term) ||
    (t.assigned_to||'').toLowerCase().includes(term)
  ).slice(0, 3);
  if (tasks.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">✅ Görevler</div>`;
    tasks.forEach(t => {
      const i = D.tasks.indexOf(t);
      html += `<div class="gsr-item" onclick="closeGlobalSearch();showPage('Tasks',null)">
        <div class="gsr-ico" style="background:#fef3c7;color:#d97706">📋</div>
        <div class="gsr-main">
          <div class="gsr-title">${t.title||'Görev'}</div>
          <div class="gsr-sub">${t.due_date||''} ${t.assigned_to?'· '+t.assigned_to:''}</div>
        </div>
        <span class="gsr-tag">${t.priority||''}</span>
      </div>`;
    });
    html += `</div>`;
    total += tasks.length;
  }

  // ── Finans ──
  const finance = D.finance.filter(f =>
    (f.description||'').toLowerCase().includes(term) ||
    (f.category||'').toLowerCase().includes(term)
  ).slice(0, 3);
  if (finance.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">💰 Finans</div>`;
    finance.forEach(f => {
      html += `<div class="gsr-item" onclick="closeGlobalSearch();showPage('Finance',null)">
        <div class="gsr-ico" style="background:#eff6ff;color:#3b82f6">${f.type==='Gelir'?'📈':'📉'}</div>
        <div class="gsr-main">
          <div class="gsr-title">${f.description||f.category||'Kayıt'}</div>
          <div class="gsr-sub">${f.date||''} · ₺${(f.amount||0).toLocaleString('tr-TR')}</div>
        </div>
        <span class="gsr-tag ${f.type==='Gelir'?'t-gr':'t-rd'}">${f.type}</span>
      </div>`;
    });
    html += `</div>`;
    total += finance.length;
  }

  // ── Envanter ──
  const inv = D.inventory.filter(i =>
    (i.name||'').toLowerCase().includes(term) ||
    (i.category||'').toLowerCase().includes(term)
  ).slice(0, 3);
  if (inv.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">📦 Envanter</div>`;
    inv.forEach(i => {
      const low = (i.current_stock||0) < (i.minimum_stock||0);
      html += `<div class="gsr-item" onclick="closeGlobalSearch();showPage('Inventory',null)">
        <div class="gsr-ico" style="background:#fff7ed;color:#f97316">📦</div>
        <div class="gsr-main">
          <div class="gsr-title">${i.name}</div>
          <div class="gsr-sub">${i.category||''} · ${i.current_stock} ${i.unit||''}</div>
        </div>
        ${low ? '<span class="gsr-tag t-rd">Kritik</span>' : ''}
      </div>`;
    });
    html += `</div>`;
    total += inv.length;
  }

  // ── Sayfalar ──
  const pages = [
    {n:'Dashboard',lbl:'Genel Bakış',ico:'🏠'},{n:'Animals',lbl:'Hayvanlar',ico:'🐄'},
    {n:'Health',lbl:'Sağlık',ico:'🏥'},{n:'Finance',lbl:'Finans',ico:'💰'},
    {n:'Tasks',lbl:'Görevler',ico:'✅'},{n:'Inventory',lbl:'Envanter',ico:'📦'},
    {n:'Production',lbl:'Üretim',ico:'🥛'},{n:'Sales',lbl:'Satışlar',ico:'🛒'},
    {n:'Analytics',lbl:'Analitik',ico:'📊'},{n:'Weather',lbl:'Hava Durumu',ico:'🌤️'},
    {n:'AIChat',lbl:'AI Asistanı',ico:'🤖'},{n:'Calendar',lbl:'Takvim',ico:'📅'},
    {n:'Settings',lbl:'Ayarlar',ico:'⚙️'},{n:'Lands',lbl:'Arazi & Tarla',ico:'🗺️'},
    {n:'WeightTrack',lbl:'Tartım Takibi',ico:'⚖️'},{n:'Reproduction',lbl:'Üreme',ico:'🔄'},
    {n:'Feeding',lbl:'Yemleme',ico:'🌾'},{n:'QRScan',lbl:'QR & PDF',ico:'📱'},
  ].filter(p => p.lbl.toLowerCase().includes(term) || p.n.toLowerCase().includes(term)).slice(0,3);

  if (pages.length) {
    html += `<div class="gsr-section"><div class="gsr-section-title">🧭 Sayfalar</div>`;
    pages.forEach(p => {
      html += `<div class="gsr-item" onclick="closeGlobalSearch();showPage('${p.n}',null)">
        <div class="gsr-ico" style="background:var(--bg)">${p.ico}</div>
        <div class="gsr-main"><div class="gsr-title">${p.lbl}</div></div>
        <span class="gsr-tag">Sayfa</span>
      </div>`;
    });
    html += `</div>`;
    total += pages.length;
  }

  if (total === 0) {
    html = `<div class="gsr-empty">🔍 "${q}" için sonuç bulunamadı</div>`;
  }

  dropdown.innerHTML = html;
  dropdown.classList.add('open');
}

