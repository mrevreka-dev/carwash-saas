# Oto Yıkama Yönetim Sistemi (Car Wash Management SaaS)

Çok kiracılı (multi-tenant) oto yıkama yönetim paneli. Sistem sahibi işletmeler
oluşturur, her işletme kendi personelini ve müşterilerini yönetir; online +
manuel randevu, gelir/gider, personel maaşları ve banka kayıtları tek panelde.

Türkçe · English · Español (çoklu dil, URL öneki ile: `/tr`, `/en`, `/es`).

## Teknolojiler

- **Next.js 15** (App Router, TypeScript) — Server Components + Server Actions
- **PostgreSQL + Prisma** — veri katmanı
- **next-intl** — çoklu dil (tr/en/es)
- **jose + bcryptjs** — JWT tabanlı oturum ve şifreleme
- **Tailwind CSS v4** — arayüz

Mimari detay için [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Roller

| Rol | Yetki |
| --- | --- |
| `SUPER_ADMIN` | Platform sahibi. İşletme oluşturur, sahibini atar, tüm işletmeleri görür. |
| `OWNER` | İşletme sahibi. Kendi işletmesinin tüm modüllerini yönetir. |
| `STAFF` | Personel. Müşteri/randevu işlemleri; banka ve maaş göremez. |

## Yerel geliştirme

```bash
npm install
cp .env.example .env        # DATABASE_URL ve AUTH_SECRET doldurun
npx prisma db push          # şemayı veritabanına uygula
npm run db:seed             # demo verisi + hesaplar
npm run dev
```

Demo hesaplar (seed):

- Sistem sahibi: `admin@carwash.app` / `admin1234`
- İşletme sahibi: `owner@demo-oto.app` / `owner1234`
- Online randevu sayfası: `/tr/book/demo-oto`

## Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantısı (Railway otomatik sağlar) |
| `AUTH_SECRET` | Oturum JWT imza anahtarı — `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Uygulamanın genel adresi (randevu bağlantıları için) |
| `SEED_KEY` | `/api/setup` ucunu korur (opsiyonel) |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | İlk sistem sahibi hesabı |

## Railway'e dağıtım

1. Railway'de proje + **PostgreSQL** ekleyin (otomatik `DATABASE_URL`).
2. Web servisi bu repoya bağlanır. Build: `npm run build`.
   Başlangıç: `npx prisma db push && npm run start` (bkz. `railway.json`).
3. Değişkenleri ekleyin: `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`,
   `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`.
4. İlk açılıştan sonra sistem sahibi hesabını oluşturmak için bir kez:
   `GET https://<uygulama-adresi>/api/setup?key=<SEED_KEY>` çağırın.

## Modüller

Panel · İşletmeler · Randevular (online + manuel) · Müşteriler · Araçlar ·
Hizmetler · Personel (maaş/gider) · Finans (nakit/kart gelir + gider) · Banka.

## Sağlık kontrolü

`GET /api/health` → `{ "status": "ok" }`
