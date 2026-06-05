# Dokumentasi Implementasi UI Input API Key Gemini

## Ringkasan Perubahan

Implementasi ini menambahkan kemampuan untuk mengelola Gemini API Key langsung melalui Panel Admin tanpa perlu mengakses Replit Secrets. Sistem mendukung dua metode konfigurasi dengan prioritas yang jelas.

---

## 1. Perubahan Frontend

### File: `artifacts/umrah-haji/src/pages/admin/AdminGeminiAI.tsx`

#### Penambahan State
```typescript
const [apiKey, setApiKey] = useState("");
const [showApiKey, setShowApiKey] = useState(false);
const [isDatabaseKeySet, setIsDatabaseKeySet] = useState(false);
```

#### Penambahan Import
```typescript
import { Eye, EyeOff } from "lucide-react";
```

#### Perubahan pada Fungsi `save()`
- Menambahkan `geminiApiKey: apiKey || undefined` ke payload POST request
- Mengupdate state `isDatabaseKeySet` jika API Key berhasil disimpan

#### Perubahan pada `useEffect()` untuk Load Config
- Menambahkan pengecekan `cfg.isDatabaseKeySet` untuk mengetahui apakah key sudah tersimpan di database

#### Penambahan UI Komponen Baru

**1. Input Field dengan Toggle Visibility**
```tsx
<div className="space-y-2">
  <Label htmlFor="gemini-api-key">Gemini API Key (Opsional - Simpan di Database)</Label>
  <div className="flex gap-2">
    <div className="relative flex-1">
      <Input
        id="gemini-api-key"
        type={showApiKey ? "text" : "password"}
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="AIzaSy... (jika ingin menyimpan di database)"
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowApiKey(!showApiKey)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    <Button onClick={testGemini} disabled={testing || !apiKey} size="sm" className="gap-1.5 whitespace-nowrap">
      {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Test
    </Button>
  </div>
  <p className="text-xs text-muted-foreground">
    Masukkan API key Anda dan klik Test untuk memverifikasi sebelum disimpan. Jika kosong, sistem akan menggunakan environment secret (jika ada).
  </p>
</div>
```

**2. Status Info Grid**
Menampilkan status dua sumber API Key:
- Environment Secret (dari Replit Secrets)
- Database Key (dari form input)

**3. Info Banner**
Menjelaskan prioritas penggunaan: Environment Secret → Database

---

## 2. Perubahan Backend

### File: `artifacts/api-server/src/routes/v1/chatbot.ts`

#### Perubahan pada Tipe Data `cachedAdminConfig`
```typescript
let cachedAdminConfig: {
  systemPrompt: string;
  model: string;
  enableFAQContext: boolean;
  channelPrompts: Record<string, string>;
  geminiApiKey?: string;  // ← Penambahan
  ts: number;
} | null = null;
```

#### Perubahan pada Fungsi `getAdminConfig()`
- Menambahkan ekstraksi `geminiApiKey` dari JSON config di database
- Menyimpan API Key dalam cache selama 60 detik
- Return type diperluas untuk include `geminiApiKey`

#### Perubahan pada Endpoint `GET /api/v1/chatbot/config`
```typescript
router.get('/config', async (_req: any, res: any) => {
  try {
    const config = await getAdminConfig();
    const geminiKeySet = !!process.env['GEMINI_API_KEY'];
    const isDatabaseKeySet = !!config.geminiApiKey;
    // Do not send the actual API key back to the frontend
    const { geminiApiKey, ...configWithoutKey } = config;
    return res.json({ ...configWithoutKey, geminiKeySet, isDatabaseKeySet });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Keamanan**: API Key tidak dikirim kembali ke browser, hanya status `isDatabaseKeySet`.

#### Perubahan pada Endpoint `POST /api/v1/chatbot/config`
- Menambahkan parameter `geminiApiKey` dari request body
- Menyimpan ke JSON config di tabel `app_settings`
- Invalidate cache setelah update

```typescript
if (geminiApiKey !== undefined) cfg.geminiApiKey = geminiApiKey;
```

#### Perubahan pada Logic Pengambilan API Key
```typescript
// Try Gemini — env var takes priority, DB key as fallback
let geminiKey = process.env['GEMINI_API_KEY'];
if (!geminiKey && adminConfig.geminiApiKey) {
  geminiKey = adminConfig.geminiApiKey;
}
if (geminiKey) {
  try {
    answer = await callGemini(geminiKey, systemPrompt, message, conversationHistory, model);
    source = 'gemini';
  } catch { /* fall through */ }
}
```

**Prioritas**:
1. Environment Variable (`process.env['GEMINI_API_KEY']`) — Lebih aman
2. Database Key (`adminConfig.geminiApiKey`) — Fallback
3. FAQ Lokal — Jika tidak ada API Key

---

## 3. Alur Kerja

### Skenario 1: User Memasukkan API Key Melalui Form
1. User membuka Panel Admin → Gemini AI Chatbot
2. User memasukkan API Key di field input
3. User klik tombol "Test" untuk verifikasi
4. Jika berhasil, user klik "Simpan Konfigurasi"
5. API Key disimpan ke database (tabel `app_settings`)
6. Status berubah menjadi "Tersimpan" di Database Key section
7. Chatbot menggunakan key ini untuk setiap request

### Skenario 2: User Setup via Replit Secrets (Lebih Aman)
1. User membuka Tools → Secrets di Replit
2. User menambahkan secret `GEMINI_API_KEY`
3. User restart server
4. Sistem otomatis mendeteksi env var dan prioritaskan
5. Status menunjukkan "Aktif" di Environment Secret section

### Skenario 3: Dual Setup (Env + Database)
- Jika keduanya ada, Environment Secret diprioritaskan
- Database Key menjadi fallback otomatis

---

## 4. Struktur Data Database

### Tabel: `app_settings`
```sql
key: 'gemini_chatbot_config'
value: JSON string
```

**Contoh JSON Config**:
```json
{
  "model": "gemini-2.0-flash",
  "systemPrompt": "...",
  "enableFAQContext": true,
  "geminiApiKey": "AIzaSy...",
  "botName": "Asisten Vinstour",
  "greeting": "Halo!",
  "enableLeadCapture": true,
  "channelPrompts": {}
}
```

---

## 5. Fitur Keamanan

### 1. Masking Input
- Field input menggunakan `type="password"` secara default
- Toggle eye icon untuk show/hide password

### 2. Tidak Ada Exposure ke Browser
- API Key tidak dikirim kembali dalam response GET `/config`
- Hanya status boolean `isDatabaseKeySet` yang dikirim
- API Key hanya digunakan di server-side

### 3. Prioritas Environment Variable
- Env var dari Replit Secrets diprioritaskan
- Lebih aman karena tidak tersimpan di database
- Database key hanya sebagai fallback

### 4. Cache 60 Detik
- Config di-cache untuk performa
- Invalidate cache setelah update
- Tidak ada exposure API Key dalam cache

---

## 6. Testing & Validasi

### Test Koneksi
- User bisa test API Key sebelum disimpan
- Endpoint: `POST /api/v1/chatbot/test`
- Mengirim test message ke Gemini dengan key yang diinput
- Jika gagal, error message ditampilkan

### Validasi Model
- Hanya model yang diizinkan bisa digunakan
- List: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`, `gemini-1.5-pro`

---

## 7. Migrasi & Backward Compatibility

### Kompatibilitas
- Sistem tetap mendukung environment variable lama
- Database key adalah fitur tambahan (optional)
- Tidak ada breaking changes

### Migrasi dari Environment Variable ke Database
1. User bisa tetap menggunakan env var (recommended)
2. Atau pindah ke database key dengan form input
3. Atau setup keduanya (env var sebagai primary)

---

## 8. Troubleshooting

### API Key Tidak Bekerja
1. Periksa status di Panel Admin (Environment Secret vs Database Key)
2. Klik "Test" untuk verifikasi key
3. Jika test gagal, periksa format key (harus `AIzaSy...`)
4. Pastikan key memiliki akses ke Gemini API

### Cache Tidak Terupdate
- Cache otomatis refresh setiap 60 detik
- Atau restart server untuk immediate refresh

### Fallback ke FAQ
- Jika tidak ada API Key, sistem menggunakan FAQ lokal
- Pesan akan ditampilkan dengan sumber "faq"

---

## 9. Endpoint API

### GET `/api/v1/chatbot/config`
**Response**:
```json
{
  "systemPrompt": "...",
  "model": "gemini-2.0-flash",
  "enableFAQContext": true,
  "geminiKeySet": true,
  "isDatabaseKeySet": false,
  "channelPrompts": {}
}
```

### POST `/api/v1/chatbot/config`
**Request Body**:
```json
{
  "model": "gemini-2.0-flash",
  "systemPrompt": "...",
  "geminiApiKey": "AIzaSy...",
  "enableFAQContext": true,
  "botName": "Asisten Vinstour",
  "greeting": "Halo!",
  "enableLeadCapture": true
}
```

**Response**:
```json
{
  "success": true
}
```

---

## 10. Rekomendasi

### Best Practice
1. **Gunakan Environment Variable** (Replit Secrets) untuk production
   - Lebih aman, tidak tersimpan di database
   - Tidak ada risk exposure saat backup database

2. **Gunakan Database Key** untuk development/testing
   - Lebih mudah diubah tanpa restart server
   - Cocok untuk multi-tenant setup

3. **Monitor API Usage**
   - Cek quota di Google AI Studio
   - Setup alerts jika mendekati limit

4. **Rotate API Key Secara Berkala**
   - Generate key baru di Google AI Studio
   - Update di Panel Admin atau Replit Secrets
   - Delete key lama

---

## 11. Changelog

### v1.0 (Current)
- ✅ Input field untuk API Key di Panel Admin
- ✅ Toggle visibility untuk masking input
- ✅ Status indicator (Environment Secret vs Database)
- ✅ Test koneksi sebelum save
- ✅ Prioritas env var → database key
- ✅ Cache 60 detik untuk performa
- ✅ Tidak ada exposure API Key ke browser
