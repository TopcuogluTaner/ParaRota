# Product

## Register

product

## Users

Türkiye'deki bireyler ve aileler; kişisel/hane bütçesini, gelir-giderini, borç ve yatırımlarını tek yerden takip etmek isteyenler. Mobil (Expo/React Native) birincil yüzey; kullanıcı genellikle günde birkaç kez, kısa oturumlarla "bu ay neredeyim?" sorusuna bakar.

## Product Purpose

ParaRota (mağaza adı: ParaRotam) bir kişisel finans uygulamasıdır: işlem kaydı, bütçe, tekrarlayan ödemeler, hedefler, borçlar, yatırım portföyü, fiş OCR ve aile (household) paylaşımı. Başarı: kullanıcının ay sonunda net durumunu saniyeler içinde, doğru ve sakin bir şekilde görmesi.

## Brand Personality

Sakin, güvenilir, hassas ("Calm Ledger"). Renk yalnızca para ve durum anlatır: emerald = pozitif akış, crimson = negatif, amber = uyarı, indigo = bilgi. Dekorasyon yok; göz tutarlara ve duruma odaklanır. Tipografi: Fraunces (editoryal başlık), Geist (gövde), Geist Mono (rakamlar/eyebrow).

## Anti-references

- Parlak/gradyan "fintech bro" estetiği, neon glow, cam efektleri (eski "Cartographic" yönü bilinçli terk edildi).
- Oyunlaştırılmış, konfetili bütçe uygulamaları.
- Yoğun bilgi bombardımanı yapan banka dashboard'ları.

## Design Principles

1. Renk = anlam: aksan renkleri yalnızca para yönü ve durum için, asla süs için.
2. Rakamlar kahramandır: mono, tabular, büyük; etiketler sessiz (mute eyebrow).
3. Hareket durumu anlatır: 150–250 ms, ease-out; günlük görülen öğelerde animasyon minimum, geri bildirim anında.
4. Tutarlı söz dağarcığı: aynı kart (RouteCard), aynı eyebrow, aynı seçim deseni (sticky seçim + reset pill) her ekranda.
5. Sakin yoğunluk: bilgi katmanlanır (özet → detay dokunuşla), tek seferde her şey gösterilmez.

## Accessibility & Inclusion

- 5 dil (TR/EN/AR/ES/DE), RTL hazırlığı (Arapça).
- WCAG AA kontrast hedefi; renk tek başına anlam taşımaz (ikon/etiket eşlik eder).
- accessibilityRole/State tüm etkileşimli öğelerde; reduced motion'a saygı (reanimated system default).
