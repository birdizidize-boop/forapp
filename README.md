# FORAGRAMM Conversation Management Platform

Modern Telegram conversation automation paneli için React + Flask proje iskeleti.

## Kapsam

- Dark, responsive SaaS yönetim paneli
- Dashboard KPI kartları ve grafikler
- React Flow tabanlı Conversation Flow Builder
- User CRM, aktif sohbet, broadcast, bot manager, analytics, event log ve RBAC ekranları
- Telegram Only Panel: bot bağlantısı, inline buton hedefleri, mesai/gün filtreleri, fallback yanıtları, kampanya kuyruğu ve veri modeli takibi
- İçerik Havuzu: sponsor kanal postlarını klasörleme, link/çıkartma hariç tutma, günlük gelen içerik sayımı ve benzer başlık temizliği
- FORAGRAMM logo sistemi: panel, favicon, bot önizleme ve yönetici alanlarında tek logo asset'i
- Telegram kimliklendirme: `/start`, callback, mesaj ve kampanya aksiyonlarında kullanıcıya `fora_user_id`, bot aboneliğine `subscriber_uid`
- React Query mock veri katmanı
- Zustand tabanlı modül navigasyonu
- Flask backend başlangıç yapısı, SQLAlchemy, Redis, Celery ve WebSocket hazırlığı

## Frontend

```bash
pnpm install
pnpm dev
```

Varsayılan adres: `http://localhost:5173`

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask --app run.py run --debug --port 8000
```

## AWS Yayın Hazırlığı

AWS deploy dosyaları eklendi:

- `amplify.yml`: React paneli AWS Amplify Hosting'e yayınlamak için.
- `backend/application.py`: Elastic Beanstalk WSGI giriş noktası.
- `backend/Procfile`: Gunicorn production komutu.
- `backend/Dockerfile`: ECS Fargate veya container tabanlı deploy için.
- `.env.production.example` ve `backend/.env.production.example`: üretim ortam değişkenleri.
- `AWS_DEPLOY.md`: adım adım AWS yayın rehberi.

Detaylı yayın akışı için `AWS_DEPLOY.md` dosyasını takip edin.

## Mimari Notlar

- `src/App.tsx` prototip UI yüzeyini ve mock data katmanını içerir.
- `backend/app` ileride gerçek REST, webhook ve WebSocket servislerine ayrılacak modüler Flask uygulamasıdır.
- `backend/app/models/core.py` Telegram odaklı `users`, `bots`, `subscriptions`, `posts`, `notifications` ve `analytics` tablolarını da içerir.
- `users.fora_user_id` tüm botlar arasında tekil kullanıcı kimliğidir; `subscriptions.subscriber_uid` aynı kullanıcının bot bazlı abonelik kimliğidir.
- `telegram_action_events` `/start`, callback, mesaj ve kampanya aksiyonlarını kullanıcı + bot + abonelik bağıyla saklar.
- İçerik havuzu için `sponsor_channels`, `content_folders`, `content_pool_items` ve `content_duplicate_groups` modelleri hazırdır.
- PostgreSQL ana veri kaynağı, Redis ise WebSocket presence, Celery queue ve rate limit için tasarlanmıştır.
- Multi-tenant yapı için her ana tabloda `tenant_id` alanı planlanmalıdır.

## Sonraki Üretim Adımları

1. Auth ve tenant seçimi: JWT, refresh token, role claims.
2. Flow persistence: `flows`, `nodes`, `edges`, versiyonlama ve publish pipeline.
3. Telegram adapter: webhook doğrulama, inbound event normalize etme, outbound sender queue.
4. Live chat: WebSocket rooms, operator assignment ve read receipts.
5. Analytics: event stream, aggregation jobs, campaign funnel hesapları.
