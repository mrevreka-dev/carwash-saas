# Oto Yıkama Yönetim Sistemi — Mimari

Çok kiracılı (multi-tenant) bir SaaS. Tek bir kod tabanı, birçok işletmeye
(tenant) hizmet verir. Aşağıda katmanlar, roller, veri modeli ve teknoloji
kararları açıklanır.

## Teknoloji kararları (ve neden)

| Katman | Seçim | Gerekçe |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router) + TypeScript** | Tek projede hem sunucu (Server Components + Server Actions) hem arayüz; Railway'e kolay deploy; olgun ekosistem. |
| Veritabanı | **PostgreSQL** | İlişkisel bütünlük, işlemler (transactions), çok kiracılı yapı için güçlü; Railway tek tıkla sağlar. |
| ORM | **Prisma** | Tip güvenli şema ve sorgular, migration yönetimi. |
| Kimlik doğrulama | **Kendi JWT oturumumuz** (`jose` + `bcryptjs`) | Rol/tenant mantığını tam kontrol; edge middleware ile uyumlu; harici servise bağımlılık yok. |
| Çoklu dil | **next-intl** (tr / en / es) | App Router ile birinci sınıf i18n; URL öneki ile yönlendirme (`/tr`, `/en`, `/es`). |
| Arayüz | **Tailwind CSS v4** | Hızlı, tutarlı, tema değişkenleriyle. |
| Doğrulama | **Zod** | Form ve API girdilerinin şema doğrulaması. |

## Katmanlı mimari

```
┌─────────────────────────────────────────────────────────┐
│  Sunum (Presentation)                                    │
│  src/app/[locale]/**  — Server & Client Components,       │
│  src/components/**     — yeniden kullanılabilir UI        │
└───────────────▲─────────────────────────────────────────┘
                │ çağırır
┌───────────────┴─────────────────────────────────────────┐
│  Uygulama / Aksiyon (Application)                        │
│  src/app/**/actions.ts — Server Actions (mutasyonlar),   │
│  src/app/api/**        — genel/webhook uç noktaları       │
│  Yetki kontrolü + Zod doğrulama burada uygulanır.        │
└───────────────▲─────────────────────────────────────────┘
                │ çağırır
┌───────────────┴─────────────────────────────────────────┐
│  İş mantığı / Servis (Domain services)                   │
│  src/lib/services/**  — kiracı-kapsamlı iş kuralları      │
│  (finans özeti, randevu çakışma, bakiye hesapları)       │
└───────────────▲─────────────────────────────────────────┘
                │ kullanır
┌───────────────┴─────────────────────────────────────────┐
│  Veri erişimi (Data access)                              │
│  src/lib/db.ts (Prisma Client)  +  prisma/schema.prisma  │
│  Her sorgu businessId ile kapsanır (tenant izolasyonu).  │
└───────────────▲─────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────┐
│  Altyapı: PostgreSQL (Railway)                           │
└─────────────────────────────────────────────────────────┘

Kesişen katmanlar (cross-cutting):
- Kimlik/oturum:  src/lib/auth.ts, src/lib/session.ts
- Yetkilendirme:  src/lib/rbac.ts + src/lib/tenant.ts
- i18n:           src/i18n/**, src/messages/**
- Middleware:     src/middleware.ts (locale + oturum koruması)
```

## Roller ve yetkiler (RBAC)

- **SUPER_ADMIN** — Platform sahibi. İşletme (Business) oluşturur, işletme
  sahiplerini (OWNER) atar, tüm işletmeleri görür. Bir işletmeye bağlı değildir.
- **OWNER** — Tek bir işletmenin sahibi. Kendi işletmesinin tüm modüllerini
  yönetir; personel (STAFF ve Employee) ekler, finans/banka kayıtlarını görür.
- **STAFF** — Personel. Müşteri ve randevu işlemleri yapar; sınırlı finans
  görünürlüğü (kasa/tahsilat). Banka ve maaş/gider yönetimi göremez.

Yetki matrisi `src/lib/rbac.ts` içinde tanımlıdır ve her Server Action
başında `requirePermission(...)` ile zorlanır.

## Kiracı izolasyonu (multi-tenancy)

Tek veritabanı, paylaşımlı şema, satır düzeyinde izolasyon: operasyonel her
tablo bir `businessId` taşır. Oturum, kullanıcının `businessId`'sini içerir;
tüm sorgular `getTenantId()` ile bu değere kapsanır. SUPER_ADMIN, hedef
işletmeyi açıkça seçerek işlem yapar. Bu yaklaşım basit, ölçeklenebilir ve
işletme silindiğinde `onDelete: Cascade` ile verinin temiz silinmesini sağlar.

## Modüller

1. **İşletme yönetimi** (SUPER_ADMIN) — işletme oluşturma, sahibini atama.
2. **Müşteriler (CRM)** — müşteri + araç kayıtları.
3. **Hizmetler** — yıkama paketleri (süre + fiyat).
4. **Randevular** — online (genel sayfa) + manuel; durum akışı; personel atama.
5. **Personel (HR)** — çalışan kaydı, pozisyon, maaş; isteğe bağlı login hesabı.
6. **Finans** — birleşik defter: gelir (nakit/kredi kartı) ve gider (maaş, kira…).
7. **Banka** — banka hesapları ve hareketleri; bakiye takibi.
8. **Panel (Dashboard)** — günün randevuları, gelir/gider özeti, KPI'lar.

## Veri modeli (özet)

`User`, `Business`, `Customer`, `Vehicle`, `Service`, `Employee`,
`Appointment`, `Transaction` (gelir/gider defteri), `BankAccount`,
`BankTransaction`. Ayrıntı için `prisma/schema.prisma`.

## Online randevu akışı

Genel sayfa: `/{locale}/book/{business-slug}`. Müşteri hizmet + tarih/saat
seçer, iletişim bilgisi girer → `PENDING` + `ONLINE` randevu oluşur. Personel
panelden onaylar (`CONFIRMED`), tamamlayınca (`COMPLETED`) isteğe bağlı gelir
kaydı üretilebilir.

## Dağıtım (Railway)

- **Postgres** eklentisi `DATABASE_URL` sağlar.
- Web servisi Nixpacks ile `npm install → prisma generate → next build`
  çalıştırır; başlangıçta `prisma migrate deploy` ile şema uygulanır.
- Gizli değişkenler: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.
