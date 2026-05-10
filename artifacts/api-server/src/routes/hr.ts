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
 * Face verification endpoint. Currently returns a graceful bypass since
 * face recognition requires a dedicated ML service (e.g. AWS Rekognition).
 * Returns verified: true so attendance can proceed — upgrade later.
 */
router.post('/verify-face', async (_req, res) => {
  res.json({
    verified: true,
    confidence: 0,
    reason: 'Verifikasi wajah otomatis tidak tersedia. Absensi diizinkan.',
    bypass: true,
  });
});

export default router;
