// ===================== SUPABASE BULUT SENKRON =====================
// Her kullanıcı kendi e-posta/şifresiyle giriş yapar; verisi Supabase'de
// "farm_data" tablosunda (user_id -> jsonb) tutulur ve tüm cihazlara
// Realtime ile anlık yansır.

const SB_URL = 'https://fygewfbfyhkhvwtcrgtm.supabase.co';
const SB_KEY = 'sb_publishable_qwGYezds6srKfwsRHNx3HA_J51fLJiu';

let sb = null;
let sbUser = null;
let sbChannel = null;
let _sbApplyingRemote = false; // remote'dan gelen değişikliği tekrar push etmemek için
let _sbPushTimer = null;

function sbInit() {
  try {
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  } catch (e) {
    console.error('Supabase başlatılamadı', e);
  }
}

// ── Giriş ekranı ──
function sbShowAuthGate() {
  if (document.getElementById('sb-auth-gate')) return;
  const html = `
  <div id="sb-auth-gate" style="position:fixed;inset:0;z-index:99999;background:var(--bg,#0f1115);display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="width:100%;max-width:360px;background:var(--card,#181b22);border:1px solid var(--brd,#2a2f3a);border-radius:16px;padding:28px 24px">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:26px;font-weight:800;color:var(--txt,#fff)">Beskas</div>
        <div style="font-size:12.5px;color:var(--sub,#8a93a6);margin-top:4px">Hesabınla giriş yap, verilerin tüm cihazlarında senkron olsun</div>
      </div>
      <div id="sb-auth-err" style="display:none;margin-bottom:12px;padding:8px 12px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:12.5px;text-align:center"></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <input id="sb-email" type="email" placeholder="E-posta" autocomplete="username" style="padding:11px 12px;border:1px solid var(--brd,#2a2f3a);border-radius:9px;font-size:14px;background:var(--bg,#0f1115);color:var(--txt,#fff)"/>
        <input id="sb-pass" type="password" placeholder="Şifre" autocomplete="current-password" style="padding:11px 12px;border:1px solid var(--brd,#2a2f3a);border-radius:9px;font-size:14px;background:var(--bg,#0f1115);color:var(--txt,#fff)" onkeydown="if(event.key==='Enter')sbSignIn()"/>
      </div>
      <button id="sb-btn-signin" class="btn btn-pr" style="width:100%;margin-top:14px" onclick="sbSignIn()">Giriş Yap</button>
      <button id="sb-btn-signup" class="btn btn-sec" style="width:100%;margin-top:8px" onclick="sbSignUp()">Hesap Oluştur</button>
      <div id="sb-auth-loading" style="display:none;text-align:center;margin-top:14px;font-size:12.5px;color:var(--sub,#8a93a6)">Bağlanıyor…</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function sbHideAuthGate() {
  document.getElementById('sb-auth-gate')?.remove();
}

function sbAuthErr(msg) {
  const el = document.getElementById('sb-auth-err');
  if (el) { el.textContent = msg; el.style.display = ''; }
  const l = document.getElementById('sb-auth-loading');
  if (l) l.style.display = 'none';
}

function sbAuthBusy(busy) {
  const l = document.getElementById('sb-auth-loading');
  if (l) l.style.display = busy ? '' : 'none';
  ['sb-btn-signin', 'sb-btn-signup'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = busy;
  });
}

async function sbSignIn() {
  const email = document.getElementById('sb-email')?.value?.trim();
  const password = document.getElementById('sb-pass')?.value;
  if (!email || !password) { sbAuthErr('E-posta ve şifre gerekli'); return; }
  sbAuthBusy(true);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { sbAuthBusy(false); sbAuthErr(sbFriendlyErr(error)); return; }
  await sbOnAuthed(data.user);
}

async function sbSignUp() {
  const email = document.getElementById('sb-email')?.value?.trim();
  const password = document.getElementById('sb-pass')?.value;
  if (!email || !password) { sbAuthErr('E-posta ve şifre gerekli'); return; }
  if (password.length < 6) { sbAuthErr('Şifre en az 6 karakter olmalı'); return; }
  sbAuthBusy(true);
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { sbAuthBusy(false); sbAuthErr(sbFriendlyErr(error)); return; }
  if (data.user && !data.session) {
    sbAuthBusy(false);
    sbAuthErr('Hesap oluşturuldu! E-postana gelen onay bağlantısına tıkla, sonra giriş yap.');
    return;
  }
  await sbOnAuthed(data.user);
}

function sbFriendlyErr(error) {
  const m = error.message || '';
  if (m.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı';
  if (m.includes('already registered')) return 'Bu e-posta zaten kayıtlı, giriş yapmayı dene';
  return m || 'Bir hata oluştu';
}

async function sbSignOut() {
  try { await sb.auth.signOut(); } catch (e) {}
  if (sbChannel) { try { sb.removeChannel(sbChannel); } catch (e) {} sbChannel = null; }
  sbUser = null;
  location.reload();
}

// ── Girişten sonra: bulut verisini çek, birleştir, gerçek zamanlı dinlemeyi başlat ──
async function sbOnAuthed(user) {
  sbUser = user;
  document.getElementById('sb-auth-loading').style.display = '';
  try {
    const { data, error } = await sb.from('farm_data').select('data,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (data && data.data && Object.keys(data.data).length) {
      // Buluttaki veri var → yerel veriyi buluttakiyle değiştir (tek kaynak: bulut)
      _sbApplyingRemote = true;
      const cloud = data.data;
      KEYS.forEach(k => { if (Array.isArray(cloud[k])) D[k] = cloud[k]; });
      if (cloud.settings) D.settings = { ...D.settings, ...cloud.settings };
      if (cloud.photos) D.photos = cloud.photos;
      if (Array.isArray(cloud.weights)) D.weights = cloud.weights;
      if (cloud.notif_read) D.notif_read = cloud.notif_read;
      if (Array.isArray(cloud.auditLog)) D.auditLog = cloud.auditLog;
      if (Array.isArray(cloud.users) && cloud.users.length) D.users = cloud.users;
      if (cloud.ai_memory) D.ai_memory = cloud.ai_memory;
      localStorage.setItem('bcv3', JSON.stringify(D));
      _sbApplyingRemote = false;
    } else {
      // Bulutta veri yok → yereldeki ilk veriyi buluta gönder
      await sbPushNow();
    }
  } catch (e) {
    console.error('Bulut verisi alınamadı', e);
    showToast?.('Bulut verisi alınamadı, çevrimdışı devam ediliyor', 'yl');
  }
  sbSubscribeRealtime();
  sbHideAuthGate();
  sbBoot();
}

// ── Değişiklikleri buluta gönderme (debounce'lı) ──
function sbQueuePush() {
  if (!sb || !sbUser || _sbApplyingRemote) return;
  clearTimeout(_sbPushTimer);
  _sbPushTimer = setTimeout(sbPushNow, 1200);
}

async function sbPushNow() {
  if (!sb || !sbUser) return;
  try {
    const { photos, ...rest } = D; // fotoğraflar büyük olabiliyor, ayrı taşımıyoruz şimdilik dahil edelim ama sınırı kontrol edelim
    const payload = { ...D };
    const { error } = await sb.from('farm_data').upsert({
      user_id: sbUser.id,
      data: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) console.error('Bulut senkron hatası', error);
  } catch (e) { console.error('Bulut senkron hatası', e); }
}

// ── Diğer cihazlardan gelen değişiklikleri anlık dinle ──
function sbSubscribeRealtime() {
  if (!sb || !sbUser) return;
  if (sbChannel) { try { sb.removeChannel(sbChannel); } catch (e) {} }
  sbChannel = sb.channel('farm_data_' + sbUser.id)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'farm_data', filter: 'user_id=eq.' + sbUser.id
    }, (payload) => {
      const cloud = payload.new?.data;
      if (!cloud) return;
      _sbApplyingRemote = true;
      KEYS.forEach(k => { if (Array.isArray(cloud[k])) D[k] = cloud[k]; });
      if (cloud.settings) D.settings = { ...D.settings, ...cloud.settings };
      if (cloud.photos) D.photos = cloud.photos;
      if (Array.isArray(cloud.weights)) D.weights = cloud.weights;
      if (cloud.notif_read) D.notif_read = cloud.notif_read;
      if (Array.isArray(cloud.auditLog)) D.auditLog = cloud.auditLog;
      localStorage.setItem('bcv3', JSON.stringify(D));
      _sbApplyingRemote = false;
      showToast?.('Veriler başka bir cihazdan güncellendi, yenileniyor…', 'gr');
      try { renderDashboard(); } catch (e) {}
      try { if (typeof renderPage === 'function' && window.currentPage) renderPage(window.currentPage); } catch (e) {}
    })
    .subscribe();
}

// ── persist() fonksiyonunu sarmalayarak her kayıtta buluta da gönder ──
function sbHookPersist() {
  if (typeof window._sbOrigPersist === 'function') return; // zaten sarmalanmış
  window._sbOrigPersist = persist;
  persist = function () {
    window._sbOrigPersist();
    sbQueuePush();
  };
}

// ── Başlangıç akışı ──
function sbBoot() {
  sbHookPersist();
  if (typeof window._sbAppInited === 'undefined') {
    window._sbAppInited = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initV4);
    } else {
      initV4();
    }
  }
}

(function sbStart() {
  sbInit();
  if (!sb) { sbBoot(); return; } // supabase yüklenemediyse çevrimdışı çalışmaya devam et
  sb.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) {
      sbOnAuthed(data.session.user);
    } else {
      sbShowAuthGate();
    }
  }).catch(() => { sbShowAuthGate(); });
})();
