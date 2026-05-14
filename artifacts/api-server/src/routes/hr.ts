import { Router } from 'express';

const router = Router();

function getSupabase() {
  return {
    url: process.env['SUPABASE_URL'] || '',
    key: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
    configured: !!(process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']),
  };
}

/**
 * POST /api/hr/employees
 * Create a new employee + auth user via Supabase Admin API.
 */
router.post('/employees', async (req, res) => {
  const sb = getSupabase();
  if (!sb.configured) {
    res.status(503).json({
      success: false,
      error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Replit Secrets.',
    });
    return;
  }

  const { fullName, email, password, phone, position, department, gender, salary, hireDate } = req.body as {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    position?: string;
    department?: string;
    gender?: string;
    salary?: number;
    hireDate?: string;
  };

  if (!fullName || !email || !password) {
    res.status(400).json({ success: false, error: 'fullName, email, dan password wajib diisi.' });
    return;
  }

  try {
    // Create auth user
    const authRes = await fetch(`${sb.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': sb.key,
        'Authorization': `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });

    const authUser = await authRes.json() as { id?: string; error?: string; msg?: string };
    if (!authRes.ok || !authUser.id) {
      throw new Error(authUser.error || authUser.msg || 'Gagal membuat user');
    }

    // Generate employee code
    const year = new Date().getFullYear();
    const empCode = `EMP${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Create employee record
    const empRes = await fetch(`${sb.url}/rest/v1/employees`, {
      method: 'POST',
      headers: {
        'apikey': sb.key,
        'Authorization': `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: authUser.id,
        employee_code: empCode,
        full_name: fullName,
        email,
        phone: phone || null,
        position: position || null,
        department: department || null,
        gender: gender || null,
        salary: salary || null,
        hire_date: hireDate || null,
        is_active: true,
      }),
    });

    const empRows = await empRes.json() as any[];
    if (!empRes.ok) {
      throw new Error('Gagal membuat record karyawan');
    }

    // Assign employee role
    await fetch(`${sb.url}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        'apikey': sb.key,
        'Authorization': `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: authUser.id, role: 'operational' }),
    });

    res.json({ success: true, employeeCode: empCode, userId: authUser.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/hr/employees/:id
 * Delete employee record. If service role key is available, also deletes auth user.
 */
router.delete('/employees/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb.configured) {
    res.status(503).json({
      success: false,
      error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Replit Secrets.',
    });
    return;
  }

  const { id } = req.params;

  try {
    // Get employee to find user_id
    const getRes = await fetch(`${sb.url}/rest/v1/employees?id=eq.${id}&select=id,user_id&limit=1`, {
      headers: { 'apikey': sb.key, 'Authorization': `Bearer ${sb.key}` },
    });
    const rows = await getRes.json() as Array<{ id: string; user_id: string | null }>;
    const employee = rows[0];

    // Delete employee record
    await fetch(`${sb.url}/rest/v1/employees?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': sb.key, 'Authorization': `Bearer ${sb.key}` },
    });

    // Delete auth user if user_id exists (non-fatal)
    if (employee?.user_id) {
      await fetch(`${sb.url}/auth/v1/admin/users/${employee.user_id}`, {
        method: 'DELETE',
        headers: { 'apikey': sb.key, 'Authorization': `Bearer ${sb.key}` },
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/hr/verify-face
 * Face verification menggunakan face-api.js (browser-side descriptor matching).
 * Server menerima face descriptor array dari browser yang sudah diproses face-api.js,
 * lalu membandingkan dengan descriptor referensi yang tersimpan di database.
 *
 * Payload:
 *   - employee_id: UUID karyawan
 *   - live_descriptor: number[] (128-dim face descriptor dari face-api.js di browser)
 *   - reference_descriptor?: number[] (jika dikirim dari browser, tidak perlu fetch DB)
 *
 * Response:
 *   - verified: boolean
 *   - confidence: number (0-100)
 *   - distance: number (euclidean distance, < 0.6 = match)
 *   - reason: string
 */
router.post('/verify-face', async (req, res) => {
  const { employee_id, live_descriptor, reference_descriptor } = req.body as {
    employee_id?: string;
    live_descriptor?: number[];
    reference_descriptor?: number[];
  };

  // Validasi: live_descriptor harus ada
  if (!live_descriptor || !Array.isArray(live_descriptor) || live_descriptor.length === 0) {
    res.status(400).json({
      verified: false,
      confidence: 0,
      reason: 'live_descriptor wajib diisi (kirim face descriptor array dari face-api.js di browser)',
    });
    return;
  }

  // Jika reference_descriptor dikirim dari browser, bandingkan langsung
  if (reference_descriptor && Array.isArray(reference_descriptor) && reference_descriptor.length > 0) {
    const result = compareFaceDescriptors(live_descriptor, reference_descriptor);
    res.json(result);
    return;
  }

  // Jika employee_id dikirim, ambil descriptor referensi dari database
  if (employee_id) {
    const sb = getSupabase();
    if (!sb.configured) {
      // Graceful bypass jika Supabase belum dikonfigurasi
      res.json({
        verified: true,
        confidence: 70,
        reason: 'Mode bypass: Supabase belum dikonfigurasi, absensi diizinkan.',
        bypass: true,
      });
      return;
    }

    try {
      const getRes = await fetch(
        `${sb.url}/rest/v1/employees?id=eq.${employee_id}&select=id,face_descriptor&limit=1`,
        { headers: { 'apikey': sb.key, 'Authorization': `Bearer ${sb.key}` } }
      );
      const rows = await getRes.json() as Array<{ id: string; face_descriptor?: string | null }>;
      const employee = rows?.[0];

      if (!employee?.face_descriptor) {
        // Belum ada foto referensi — bypass dengan catatan
        res.json({
          verified: true,
          confidence: 50,
          reason: 'Foto referensi wajah belum didaftarkan. Absensi diizinkan, daftarkan foto terlebih dahulu.',
          bypass: true,
        });
        return;
      }

      let refDescriptor: number[];
      try {
        refDescriptor = typeof employee.face_descriptor === 'string'
          ? JSON.parse(employee.face_descriptor)
          : employee.face_descriptor as unknown as number[];
      } catch {
        res.json({
          verified: true,
          confidence: 50,
          reason: 'Format descriptor referensi tidak valid. Absensi diizinkan.',
          bypass: true,
        });
        return;
      }

      const result = compareFaceDescriptors(live_descriptor, refDescriptor);
      res.json(result);
      return;
    } catch (err: any) {
      console.error('[HR verify-face] DB error:', err.message);
      // Graceful fallback
      res.json({
        verified: true,
        confidence: 60,
        reason: 'Gagal verifikasi dari database. Absensi diizinkan.',
        bypass: true,
      });
      return;
    }
  }

  // Tidak ada data cukup — bypass
  res.json({
    verified: true,
    confidence: 0,
    reason: 'Tidak ada data verifikasi. Absensi diizinkan (mode bypass).',
    bypass: true,
  });
});

/**
 * POST /api/hr/register-face
 * Simpan face descriptor karyawan sebagai referensi untuk verifikasi berikutnya.
 */
router.post('/register-face', async (req, res) => {
  const sb = getSupabase();
  if (!sb.configured) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
    return;
  }

  const { employee_id, face_descriptor } = req.body as {
    employee_id?: string;
    face_descriptor?: number[];
  };

  if (!employee_id || !face_descriptor || !Array.isArray(face_descriptor)) {
    res.status(400).json({ success: false, error: 'employee_id dan face_descriptor wajib diisi.' });
    return;
  }

  try {
    const patchRes = await fetch(`${sb.url}/rest/v1/employees?id=eq.${employee_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': sb.key,
        'Authorization': `Bearer ${sb.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ face_descriptor: JSON.stringify(face_descriptor) }),
    });

    if (!patchRes.ok) {
      throw new Error(`DB error: ${patchRes.status}`);
    }

    res.json({ success: true, message: 'Foto wajah referensi berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Euclidean distance antara dua face descriptor (128-dim array dari face-api.js). */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Bandingkan dua face descriptor.
 * Threshold face-api.js: < 0.6 = same person (default), < 0.5 = strict
 */
function compareFaceDescriptors(live: number[], reference: number[]) {
  const distance = euclideanDistance(live, reference);
  const THRESHOLD = 0.6;
  const verified = distance < THRESHOLD;

  // Konversi distance ke confidence (0-100)
  // distance=0 → confidence=100, distance=0.6 → confidence=0, distance>0.6 → negatif → clamp ke 0
  const confidence = Math.max(0, Math.round((1 - distance / THRESHOLD) * 100));

  return {
    verified,
    confidence,
    distance: parseFloat(distance.toFixed(4)),
    threshold: THRESHOLD,
    reason: verified
      ? `Wajah terverifikasi (jarak: ${distance.toFixed(3)}, kepercayaan: ${confidence}%)`
      : `Wajah tidak cocok (jarak: ${distance.toFixed(3)} melebihi threshold ${THRESHOLD})`,
  };
}

export default router;
