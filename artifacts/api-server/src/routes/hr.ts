import { Router } from 'express';
import { pool } from '../lib/db.js';
import { createUser } from '../lib/auth.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * POST /api/hr/employees
 * Create a new employee + auth user using native Postgres.
 */
router.post('/employees', async (req, res) => {
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await createUser(email, password, fullName, phone, { full_name: fullName });

    const year = new Date().getFullYear();
    const empCode = `EMP${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await client.query(
      `INSERT INTO employees (
        user_id, employee_code, full_name, email, phone, position, department,
        gender, salary, hire_date, is_active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW())`,
      [
        user.id, empCode, fullName, email, phone ?? null,
        position ?? null, department ?? null, gender ?? null,
        salary ?? null, hireDate ?? null,
      ]
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'operational') ON CONFLICT DO NOTHING`,
      [user.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, employeeCode: empCode, userId: user.id });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'hr/employees create error');
    if (err.code === '23505') {
      res.status(422).json({ success: false, error: 'Email sudah terdaftar.' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/hr/employees/:id
 */
router.delete('/employees/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, user_id FROM employees WHERE id = $1 LIMIT 1`,
      [id]
    );
    const employee = rows[0];
    if (!employee) {
      res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan.' });
      return;
    }

    await client.query(`DELETE FROM employees WHERE id = $1`, [id]);

    if (employee.user_id) {
      await client.query(`UPDATE auth.users SET deleted_at = NOW() WHERE id = $1`, [employee.user_id]).catch(() => {});
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'hr/employees delete error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/hr/verify-face
 */
router.post('/verify-face', async (req, res) => {
  const { employee_id, live_descriptor, reference_descriptor } = req.body as {
    employee_id?: string;
    live_descriptor?: number[];
    reference_descriptor?: number[];
  };

  if (!live_descriptor || !Array.isArray(live_descriptor) || live_descriptor.length === 0) {
    res.status(400).json({
      verified: false,
      confidence: 0,
      reason: 'live_descriptor wajib diisi',
    });
    return;
  }

  if (reference_descriptor && Array.isArray(reference_descriptor) && reference_descriptor.length > 0) {
    res.json(compareFaceDescriptors(live_descriptor, reference_descriptor));
    return;
  }

  if (employee_id) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, face_descriptor FROM employees WHERE id = $1 LIMIT 1`,
        [employee_id]
      );
      const emp = rows[0];
      if (!emp?.face_descriptor) {
        res.json({ verified: true, confidence: 50, reason: 'Foto referensi belum didaftarkan.', bypass: true });
        return;
      }
      let refDesc: number[];
      try {
        refDesc = typeof emp.face_descriptor === 'string'
          ? JSON.parse(emp.face_descriptor)
          : emp.face_descriptor as number[];
      } catch {
        res.json({ verified: true, confidence: 50, reason: 'Format descriptor tidak valid.', bypass: true });
        return;
      }
      res.json(compareFaceDescriptors(live_descriptor, refDesc));
    } catch (err: any) {
      res.json({ verified: true, confidence: 60, reason: 'Gagal verifikasi dari database.', bypass: true });
    } finally {
      client.release();
    }
    return;
  }

  res.json({ verified: true, confidence: 0, reason: 'Tidak ada data verifikasi.', bypass: true });
});

/**
 * POST /api/hr/register-face
 */
router.post('/register-face', async (req, res) => {
  const { employee_id, face_descriptor } = req.body as {
    employee_id?: string;
    face_descriptor?: number[];
  };

  if (!employee_id || !face_descriptor || !Array.isArray(face_descriptor)) {
    res.status(400).json({ success: false, error: 'employee_id dan face_descriptor wajib diisi.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE employees SET face_descriptor = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(face_descriptor), employee_id]
    );
    res.json({ success: true, message: 'Foto wajah referensi berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

function compareFaceDescriptors(live: number[], reference: number[]) {
  const distance = euclideanDistance(live, reference);
  const THRESHOLD = 0.6;
  const verified = distance < THRESHOLD;
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
