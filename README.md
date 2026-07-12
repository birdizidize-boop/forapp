# FORAGRAMM CMP

FORAGRAMM CMP, Telegram botlarini, aboneleri, kampanyalari, akis kurgularini ve sponsor kanal iceriklerini tek panelden yonetmek icin hazirlanan Conversation Management Platform projesidir.

## Su An Neredeyiz?

Frontend ve ilk backend motoru hazir. GitHub reposu:

```txt
https://github.com/birdizidize-boop/forapp
```

Son push edilen commit:

```txt
05a084d Fix local AWS CLI wrapper
```

Amplify frontend yayini icin repo hazir. Backend icin Elastic Beanstalk deploy scripti de hazir, fakat AWS CLI credentials henuz bu bilgisayara girilmedigi icin backend deploy baslatilamadi.

Bloklayan nokta:

```txt
Unable to locate credentials
```

Yani AWS Access Key / Secret Key ya da SSO login olmadan AWS hesabinda kaynak olusturamiyoruz.

## Tamamlananlar

- React + Vite + TypeScript panel kuruldu.
- FORAGRAMM logosu panel genelinde kullanildi.
- Dashboard, CRM, Live Chat, Broadcast, Bot Manager, Telegram Panel, Icerik Havuzu, Analytics, Logs ve Permissions ekranlari eklendi.
- Telegram odakli panel eklendi.
- Bot ekleme formu gercek API'ye baglandi.
- `/start` test aksiyonu gercek backend endpointine baglandi.
- CRM artik backend `/api/users` endpointinden kullanici okuyor.
- Icerik Havuzu icin kanal klasoru olusturma, demo post alma, link/sticker filtreleme ve duplicate temizleme API'leri eklendi.
- Backend SQLite ile lokal calisacak, PostgreSQL ile production'a tasinacak sekilde duzenlendi.
- AWS Amplify build sorunu icin `amplify.yml` duzeltildi.
- AWS Elastic Beanstalk backend deploy scripti eklendi.

## Su An Gercek Calisan Islevler

### Bot Manager

Bot adi, username, kategori ve BotFather token girilince:

```txt
POST /api/bots
```

ile backend DB'ye bot kaydi atar. Token duz metin saklanmaz, hashlenir.

### Telegram Panel

Canli test butonu:

```txt
POST /api/telegram/test-update/<bot_id>
```

ile `/start` simule eder ve su tablolara kayit atar:

```txt
users
subscriptions
telegram_action_events
```

### CRM

Kullanicilar:

```txt
GET /api/users
```

uzerinden gelir.

### Icerik Havuzu

Kanal klasoru olusturma:

```txt
POST /api/content-pool/channels
```

Demo post alma:

```txt
POST /api/content-pool/simulate
```

Duplicate temizleme:

```txt
DELETE /api/content-pool/duplicates/<group_id>
```

## Lokal Calistirma

### 1. Frontend

```powershell
cd "C:\Users\NOKTA\Documents\Codex\2026-07-12\files-mentioned-by-the-user-proje\outputs\fora-cmp"
pnpm install
pnpm dev
```

Varsayilan adres:

```txt
http://localhost:5173
```

### 2. Backend

Backend icin venv bu makinede kuruldu:

```powershell
cd "C:\Users\NOKTA\Documents\Codex\2026-07-12\files-mentioned-by-the-user-proje\outputs\fora-cmp"
.\backend\.venv\Scripts\python.exe backend\run.py
```

Varsayilan API:

```txt
http://127.0.0.1:8000/api
```

Frontend lokal default olarak bu API'ye bakar:

```txt
VITE_API_URL=http://127.0.0.1:8000/api
```

## AWS Durumu

### Frontend

AWS Amplify frontend icin kullaniliyor.

Mevcut Amplify domain:

```txt
https://main.d2vde1biowsl7i.amplifyapp.com
```

Frontend GitHub `main` branch'inden build alacak sekilde hazir.

### Backend

Backend icin Elastic Beanstalk deploy scripti hazir:

```powershell
.\scripts\deploy-backend-eb.ps1 -Region us-east-1
```

Script sunlari yapar:

- backend klasorunu zipler
- S3 bucket olusturur
- Elastic Beanstalk application/version/environment olusturur veya gunceller
- backend env degiskenlerini set eder
- Amplify branch icin `VITE_API_URL` gunceller
- Amplify release job baslatir

Default backend app adi:

```txt
fora-cmp-api
```

Default environment adi:

```txt
fora-cmp-api-prod
```

Region su an ARN'e gore:

```txt
us-east-1
```

Gelen ARN:

```txt
arn:aws:resource-groups:us-east-1:443407534262:group/fora-cmp-api/0e75vxlf0godql3x0hfzazm8ub
```

Bu ARN deploy yetkisi degil, sadece AWS tarafinda bir resource group olustugunu gosterir. Deploy icin AWS CLI credentials gerekiyor.

## AWS Devam Etmek Icin Gereken

Bu bilgisayarda su dosyalar henuz yok:

```txt
C:\Users\NOKTA\.aws\credentials
C:\Users\NOKTA\.aws\config
```

Bu yuzden AWS CLI su hatayi veriyor:

```txt
Unable to locate credentials
```

Giris icin:

```powershell
cd "C:\Users\NOKTA\Documents\Codex\2026-07-12\files-mentioned-by-the-user-proje\outputs\fora-cmp"
.\.tools\awscli\Scripts\python.exe -m awscli configure
```

Sorular:

```txt
AWS Access Key ID:
AWS Secret Access Key:
Default region name: us-east-1
Default output format: json
```

Giris bittikten sonra:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-backend-eb.ps1 -Region us-east-1
```

## Production Icin Not

Script ilk hizli deploy icin SQLite kullanabilir:

```txt
sqlite:////tmp/fora_cmp.db
```

Bu sadece canli panel butonlarini kanitlamak icin uygundur. Gercek aboneler ve kampanya verisi icin RDS PostgreSQL'e gecilecek.

Production DB ornegi:

```txt
postgresql+psycopg://USER:PASSWORD@RDS_HOST:5432/fora_cmp
```

## Siradaki Isler

1. AWS CLI credentials girilecek.
2. `deploy-backend-eb.ps1` calistirilacak.
3. Backend URL alinacak.
4. Amplify `VITE_API_URL` backend URL ile guncellenecek.
5. Gercek BotFather tokenleri girilecek.
6. Telegram webhooklari backend URL'ye baglanacak.
7. Sponsor kanallari icin botlar kanallara admin yapilacak.
8. RDS PostgreSQL acilip SQLite yerine production DB baglanacak.

## Kisa Ozet

Panel artik sadece goruntu degil. Ilk gercek backend API katmani baglandi. Lokal calisiyor ve GitHub'da duruyor. AWS tarafinda durdugumuz tek nokta credentials eksikligi.
