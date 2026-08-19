// Not: Uygulama artık js/11-supabase-sync.js içindeki sbBoot() tarafından
// (giriş yapıldıktan / oturum doğrulandıktan sonra) başlatılıyor.
// sbBoot mevcut değilse (Supabase yüklenemedi vb.) eski davranışa geri dön.
if (typeof sbBoot !== 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4);
  } else {
    initV4();
  }
}

