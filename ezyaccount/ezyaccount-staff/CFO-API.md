# Miss CFO — Handover Pack (EzyAccount CFO API)

Miss CFO memproses resit yang staff upload: **tarik resit → baca gambar → tentukan company/akaun →
sahkan kiraan → rekod supplier → masukkan items (SKU)**. Dia **tidak** approve staff (itu owner urus).

- **Base URL:** `https://ezyaccount-staff.keyrooll.workers.dev`
- **Auth:** header `Authorization: Bearer <CFO_API_KEY>` pada setiap panggilan `/cfo/*`.
  (Untuk render gambar ikut URL sahaja, boleh guna `...?key=<CFO_API_KEY>` — tapi header lebih selamat.)
- Owner set kunci: `wrangler secret put CFO_API_KEY` (jana rentetan rawak panjang).

---

## Aliran kerja (ulang untuk setiap resit)

1. `GET /cfo/inbox` → senarai resit `pending`. Setiap satu dah ada **company** + **branch** (staff dah pilih masa upload) + `image_url`.
2. `GET` `image_url` (dengan Bearer key) → baca gambar resit.
3. Fikir: vendor, tarikh, jumlah, kategori perbelanjaan, dan senarai **items** (nama, SKU/kod, qty, harga).
4. `POST /cfo/file` dengan data lengkap → worker tulis ke sheet `resit` + `resit_items` company itu (as owner) **dan** naikkan gambar ke Google Drive (folder `company/bulan/`), kemudian tandakan resit itu selesai.

> Jangan ulang `POST /cfo/file` untuk `id` yang sama — ia akan pulang `409` kalau dah diproses.

---

## Endpoints

### 1) `GET /cfo/inbox?company=<optional>`
Pulang resit `pending`. Tapis ikut `company` jika mahu (cth `?company=ezysupplier`).
```json
{
  "count": 1,
  "uploads": [
    {
      "id": "d62c2ae2-7243-4be8-b36f-2b66a2794425",
      "email": "keyroolltest@test.com",
      "company": "ezysupplier",
      "branch": "Batu Caves",
      "amount": null,
      "note": "",
      "content_type": "image/jpeg",
      "created_at": "2026-11-19T07:27:32.132Z",
      "image_url": "https://ezyaccount-staff.keyrooll.workers.dev/cfo/image/d62c2ae2-7243-4be8-b36f-2b66a2794425"
    }
  ]
}
```

### 2) `GET /cfo/image/<id>`
Pulang bait gambar (JPEG/PNG). Guna untuk baca resit secara visual.

### 3) `POST /cfo/file`
Fail resit siap. `id` = id dari inbox. `company`/`branch` diambil dari resit pending (boleh override `branch`).
```json
{
  "id": "d62c2ae2-7243-4be8-b36f-2b66a2794425",
  "date": "2026-11-19",
  "vendor": "Kedai Runcit ABC Sdn Bhd",
  "amount": 128.50,
  "account": "108",
  "category": "COGS",
  "branch": "Batu Caves",
  "note": "Bekalan bahan mentah",
  "status": "Pending",
  "items": [
    { "name": "Gula Halus 1kg", "code": "GUL-001", "qty": 10, "price": 3.20, "unit": "kg", "category": "COGS" },
    { "name": "Tepung Gandum 25kg", "code": "TEP-025", "qty": 2, "price": 48.25, "unit": "bag", "category": "COGS" }
  ]
}
```
Respon:
```json
{ "ok": true, "id": "...", "resitId": "r17...", "company": "ezysupplier", "branch": "Batu Caves", "driveLink": "https://drive.google.com/...", "items": 2 }
```

**Nota medan:**
- `category` guna salah satu: `COGS, UTILITIES, RENTAL, RENOVATION, MARKETING, TRANSPORTATION, GAS, MANAGEMENT, OTHERS`.
- `account` = kod akaun (default `108` jika tak pasti — owner boleh beri carta akaun penuh kemudian).
- `code` setiap item = SKU (untuk trace harga ikut item). Kalau item tiada SKU, bagi kod ringkas yang konsisten (cth 3 huruf nama + nombor).
- `status` default `Pending` (owner semak akhir). Kalau Miss CFO yakin penuh, boleh set `Selesai`.
- Gambar auto masuk Drive: `EzyGroup/<company>/<bulan Melayu>/DDMMYY-Vendor-RMxx.xx.jpg`.

---

## OpenAPI (untuk Custom GPT "Actions" — tampal ke Actions schema)

```yaml
openapi: 3.1.0
info: { title: EzyAccount CFO API, version: "1.0.0" }
servers: [{ url: https://ezyaccount-staff.keyrooll.workers.dev }]
paths:
  /cfo/inbox:
    get:
      operationId: listPendingReceipts
      summary: Senarai resit pending untuk diproses
      parameters:
        - { name: company, in: query, required: false, schema: { type: string } }
      responses: { "200": { description: OK } }
  /cfo/file:
    post:
      operationId: fileReceipt
      summary: Fail resit siap (resit + items) dan tandakan selesai
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string }
                date: { type: string }
                vendor: { type: string }
                amount: { type: number }
                account: { type: string }
                category: { type: string }
                branch: { type: string }
                note: { type: string }
                status: { type: string }
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      name: { type: string }
                      code: { type: string }
                      qty: { type: number }
                      price: { type: number }
                      unit: { type: string }
                      category: { type: string }
      responses: { "200": { description: OK } }
```
Auth di GPT Actions: **Authentication → API Key → Bearer**, tampal `CFO_API_KEY`.
(Untuk GPT membaca gambar, `image_url` mungkin perlu dihantar sebagai pautan yang GPT boleh buka; kalau Actions GPT tak dapat "lih" gambar dari respons, beritahu owner — worker boleh ditambah OCR sisi-server.)

---

## Arahan persona (tampal ke "Instructions" Miss CFO)

> Kau ialah **Miss CFO**, akauntan AI EzyGroup. Tugas: proses resit `pending` dari `GET /cfo/inbox`.
> Untuk setiap resit: buka `image_url`, baca dengan teliti. Keluarkan **vendor, tarikh, jumlah**, dan
> **setiap item** (nama, kuantiti, harga seunit, SKU). Sahkan jumlah = hasil tambah item (toleransi
> sedikit untuk cukai/bulatan). Tentukan **kategori** perbelanjaan dari senarai yang dibenarkan.
> `company` dan `branch` ikut yang ada pada resit (jangan ubah melainkan jelas silap). Kemudian panggil
> `POST /cfo/file` dengan data lengkap. Jangan proses `id` yang sama dua kali. Kalau resit kabur atau
> jumlah tak padan, set `status: "Pending"` dan tulis sebab dalam `note` untuk owner semak.

---

## Keselamatan
- `CFO_API_KEY` = kuasa menulis ke sheet kewangan + Drive. **Jangan** kongsi di tempat awam.
- Skop ketat: kunci ni hanya untuk `/cfo/*` — **tak boleh** approve staff atau urus akaun lain.
- Batal / tukar bila-bila: `wrangler secret put CFO_API_KEY` (set nilai baru) — kunci lama terus mati.
