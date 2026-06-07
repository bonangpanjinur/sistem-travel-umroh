import { Router } from 'express';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { createUser, hashPassword } from '../lib/auth.js';
import { sendWA, credentialMessage } from '../lib/whatsapp.js';

const router = Router();

/**
 * POST /api/branches/create
 * Buat cabang baru beserta akun user untuk branch manager.
 * Jika managerEmail tidak diisi, hanya buat record cabang saja.
 */
router.post('/create', async (req, res) => {
  const {
    name, code, address, city, province, phone, email, slug, isActive,
    managerName, managerEmail, managerPhone,
  } = req.body as {
    name: string;
    code: string;
    address?: string;
    city?: string;
    province?: string;
    phone?: string;
    email?: string;
    slug?: string;
    isActive?: boolean;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  };

  if (!name || !code) {
    res.status(400).json({ success: false, error: 'Nama dan kode cabang wajib diisi.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let managerUserId: string | null = null;
    let tempPassword: string | null = null;

    if (managerEmail && managerName) {
      tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
      const user = await createUser(managerEmail, tempPassword, managerName, managerPhone);
      managerUserId = user.id;

      await client.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'branch_manager') ON CONFLICT DO NOTHING`,
        [managerUserId]
      );
      await client.query(
        `UPDATE profiles SET role = 'branch_manager' WHERE id = $1`,
        [managerUserId]
      );
    }

    const branchResult = await client.query(
      `INSERT INTO branches (
        name, code, address, city, province, phone, email, slug,
        manager_user_id, is_active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      RETURNING id, code`,
      [
        name, code,
        address ?? null, city ?? null, province ?? null,
        phone ?? null, email ?? null, slug ?? null,
        managerUserId,
        isActive ?? true,
      ]
    );

    const branchId = branchResult.rows[0]?.id as string;
    const branchCode = branchResult.rows[0]?.code as string;

    if (managerUserId && branchId) {
      await client.query(
        `UPDATE user_roles SET branch_id = $1 WHERE user_id = $2 AND role = 'branch_manager'`,
        [branchId, managerUserId]
      );
    }

    await client.query('COMMIT');

    let waResult = null;
    if (managerUserId && managerPhone && tempPassword && managerName && managerEmail) {
      const msg = credentialMessage({
        recipientName: managerName,
        role: `Branch Manager Cabang ${name}`,
        email: managerEmail,
        password: tempPassword,
      });
      waResult = await sendWA(managerPhone, msg);
      if (!waResult.success) {
        logger.warn({ waResult, managerPhone }, 'Gagal kirim WA kredensial branch manager');
      }
    }

    res.json({
      success: true,
      branchId,
      branchCode,
      managerUserId,
      ...(tempPassword ? { tempPassword, managerEmail } : {}),
      waSent: waResult?.success ?? false,
      waError: waResult?.error ?? null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'branches/create error');
    if (err.code === '23505') {
      const detail = (err.detail as string) || '';
      if (detail.includes('code')) {
        res.status(422).json({ success: false, error: 'Kode cabang sudah digunakan.' });
      } else if (detail.includes('slug')) {
        res.status(422).json({ success: false, error: 'Subdomain sudah digunakan.' });
      } else if (detail.includes('email') || detail.includes('users')) {
        res.status(422).json({ success: false, error: 'Email manager sudah terdaftar.' });
      } else {
        res.status(422).json({ success: false, error: 'Data duplikat terdeteksi.' });
      }
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/branches/:id/staff
 * Tambah anggota staff ke cabang dan buat akun user-nya.
 */
router.post('/:id/staff', async (req, res) => {
  const { id: branchId } = req.params;
  const {
    fullName, email, phone, jabatan,
  } = req.body as {
    fullName: string;
    email: string;
    phone?: string;
    jabatan?: string;
  };

  const VALID_JABATAN = ['operational', 'sales', 'finance', 'hr', 'marketing'];
  if (!fullName || !email || !jabatan) {
    res.status(400).json({ success: false, error: 'Nama, email, dan jabatan wajib diisi.' });
    return;
  }
  if (!VALID_JABATAN.includes(jabatan)) {
    res.status(400).json({ success: false, error: `Jabatan tidak valid. Pilih: ${VALID_JABATAN.join(', ')}` });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
    const user = await createUser(email, tempPassword, fullName, phone);
    const userId = user.id;

    await client.query(
      `INSERT INTO user_roles (user_id, role, branch_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, jabatan, branchId]
    );
    await client.query(
      `UPDATE profiles SET role = $1 WHERE id = $2`,
      [jabatan, userId]
    );

    await client.query('COMMIT');

    const waResult = phone
      ? await sendWA(phone, credentialMessage({
          recipientName: fullName,
          role: jabatan.charAt(0).toUpperCase() + jabatan.slice(1),
          email,
          password: tempPassword,
        }))
      : null;

    if (waResult && !waResult.success) {
      logger.warn({ waResult }, 'Gagal kirim WA kredensial staff');
    }

    res.json({
      success: true,
      userId,
      email,
      tempPassword,
      jabatan,
      branchId,
      waSent: waResult?.success ?? false,
      waError: waResult?.error ?? null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'branches/staff create error');
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
 * POST /api/branches/reset-password
 * Admin reset password user (branch manager, agent, staff).
 * Body: { userId, newPassword? }
 */
router.post('/reset-password', async (req, res) => {
  const { userId, newPassword } = req.body as { userId: string; newPassword?: string };
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId wajib diisi.' });
    return;
  }

  const tempPassword = newPassword || (Math.random().toString(36).slice(-10) + 'Aa1!');
  const hash = await hashPassword(tempPassword);

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, userId]
    );
    if (!rowCount) {
      res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      return;
    }
    res.json({ success: true, tempPassword });
  } catch (err: any) {
    logger.error({ err }, 'branches/reset-password error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

export default router;
