if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initV4);
} else {
  initV4(); // DOM zaten hazır, direkt başlat
}

