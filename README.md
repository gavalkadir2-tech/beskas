# Beskas (BizimCiftlik)

Besi çiftliği + kasap işletmesi yönetim uygulaması. Tek sayfa PWA — build adımı gerekmez, doğrudan GitHub Pages'te çalışır.

## Modüller
- Hayvan Yönetimi (kart, sağlık, üreme, yemleme)
- Besi Hedefi Takibi (GDA / günlük kilo artışı)
- Kesim & Randıman
- Parça Bazlı Stok & Satış
- Müşteri / Sipariş
- Kantar Entegrasyonu (ESP32 + WiFi — çiftlik / kesim / kasap kantarları)
- Finans, Envanter, Personel, Görevler
- AI Asistan (Groq API — sohbet + bas-konuş sesli komut)
- WhatsApp bildirimleri, Etiket/Fiş yazdırma (RawBT destekli)
- Otomatik bulut yedekleme (Firebase)

## Kurulum
Ek bir kurulum gerekmez. `index.html` dosyasını açman yeterli. Kantar/AI/WhatsApp gibi özellikler için Ayarlar sayfasından ilgili API anahtarlarını (Groq) ve Firebase adresini girmen gerekir.

## Dosya Yapısı
```
index.html          — Ana uygulama (yapı + CSS + script yüklemeleri)
js/                  — Uygulama mantığı, 10 parçaya bölünmüş
```

## GitHub Pages
Repo ayarlarından Settings → Pages → Branch: main / (root) seçilince otomatik yayınlanır.
