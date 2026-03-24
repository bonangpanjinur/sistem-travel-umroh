/**
 * Example API Endpoints dengan Permission Middleware
 * 
 * File ini menunjukkan bagaimana menggunakan permission middleware
 * pada berbagai endpoint API untuk validasi akses.
 */

import { Router, Request, Response } from 'express';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  conditionalPermission,
  auditLog,
  rateLimitSensitiveAction
} from '@/server/middleware/permissionMiddleware';
import { supabase } from '@/integrations/supabase/client';

const router = Router();

// =====================================================
// BOOKING ENDPOINTS
// =====================================================

/**
 * GET /api/bookings
 * Fetch bookings dengan permission control berdasarkan role
 * 
 * - Agent: hanya bisa lihat booking mereka sendiri (view_own)
 * - Branch Manager: hanya bisa lihat booking cabang mereka (view_branch)
 * - Finance/Operational: bisa lihat semua booking di cabang mereka
 * - Super Admin/Owner: bisa lihat semua booking
 */
router.get('/bookings',
  conditionalPermission((req) => {
    // Determine permission based on user role
    if (req.user?.roles.includes('agent')) {
      req.query.agent_id = req.user.id;
      return 'bookings.view_own';
    }
    if (req.user?.roles.includes('branch_manager')) {
      req.query.branch_id = req.user.branch_id;
      return 'bookings.view_branch';
    }
    return 'bookings.view_all';
  }),
  async (req: Request, res: Response) => {
    try {
      let query = supabase.from('bookings').select('*');

      // Apply filters based on query params
      if (req.query.agent_id) {
        query = query.eq('agent_id', req.query.agent_id);
      }
      if (req.query.branch_id) {
        query = query.eq('branch_id', req.query.branch_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data,
        count: data?.length || 0
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/bookings
 * Create new booking
 * Required permission: bookings.create
 */
router.post('/bookings',
  requirePermission('bookings.create'),
  auditLog('BOOKING_CREATED', 'bookings'),
  async (req: Request, res: Response) => {
    try {
      const { departure_id, customer_id, room_type, total_pax, ...otherData } = req.body;

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          departure_id,
          customer_id,
          room_type,
          total_pax,
          ...otherData,
          created_by: req.user?.id
        })
        .select();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/bookings/:id
 * Update booking
 * Required permission: bookings.edit
 */
router.put('/bookings/:id',
  requirePermission('bookings.edit'),
  auditLog('BOOKING_UPDATED', 'bookings'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/bookings/:id/approve
 * Approve booking
 * Required permission: bookings.approve
 */
router.post('/bookings/:id/approve',
  requirePermission('bookings.approve'),
  auditLog('BOOKING_APPROVED', 'bookings'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('bookings')
        .update({
          booking_status: 'confirmed',
          updated_at: new Date()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Booking berhasil disetujui',
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to approve booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/bookings/:id
 * Delete booking
 * Required permission: bookings.delete
 * Rate limited to prevent abuse
 */
router.delete('/bookings/:id',
  requirePermission('bookings.delete'),
  rateLimitSensitiveAction('bookings.delete', 5, 60), // 5 deletes per minute
  auditLog('BOOKING_DELETED', 'bookings'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Booking berhasil dihapus'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to delete booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================
// PAYMENT ENDPOINTS
// =====================================================

/**
 * GET /api/payments
 * Fetch payments dengan permission control
 */
router.get('/payments',
  conditionalPermission((req) => {
    if (req.user?.roles.includes('agent')) {
      return 'payments.view_own';
    }
    if (req.user?.roles.includes('branch_manager')) {
      req.query.branch_id = req.user.branch_id;
      return 'payments.view_branch';
    }
    return 'payments.view_all';
  }),
  async (req: Request, res: Response) => {
    try {
      let query = supabase.from('payments').select('*');

      if (req.query.branch_id) {
        query = query.eq('branch_id', req.query.branch_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data,
        count: data?.length || 0
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch payments',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payments/:id/verify
 * Verify payment
 * Required permission: payments.verify
 * Rate limited to prevent abuse
 */
router.post('/payments/:id/verify',
  requirePermission('payments.verify'),
  rateLimitSensitiveAction('payments.verify', 10, 60), // 10 verifications per minute
  auditLog('PAYMENT_VERIFIED', 'payments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      // Get current payment for audit
      const { data: currentPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      // Update payment status
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          verified_at: new Date(),
          verified_by: req.user?.id,
          notes
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      // Log audit with old and new values
      await logAuditWithValues(
        req.user?.id || '',
        'PAYMENT_VERIFIED',
        'payments',
        id,
        { status: currentPayment?.status },
        { status: 'paid', verified_at: new Date() }
      );

      res.json({
        success: true,
        message: 'Pembayaran berhasil diverifikasi',
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payments/:id/refund
 * Refund payment
 * Required permissions: payments.verify AND payments.refund
 */
router.post('/payments/:id/refund',
  requireAllPermissions(['payments.verify', 'payments.refund']),
  rateLimitSensitiveAction('payments.refund', 5, 60), // 5 refunds per minute
  auditLog('PAYMENT_REFUNDED', 'payments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, refund_amount } = req.body;

      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_amount,
          refund_reason: reason,
          refunded_at: new Date(),
          refunded_by: req.user?.id
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Pembayaran berhasil dikembalikan',
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to refund payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================
// CUSTOMER ENDPOINTS
// =====================================================

/**
 * PUT /api/customers/:id/sensitive-data
 * Update sensitive customer data (NIK, Passport)
 * Required permission: customers.edit_sensitive
 * Rate limited and audited
 */
router.put('/customers/:id/sensitive-data',
  requirePermission('customers.edit_sensitive'),
  rateLimitSensitiveAction('customers.edit_sensitive', 10, 60),
  auditLog('CUSTOMER_SENSITIVE_DATA_UPDATED', 'customers'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nik, passport_number, passport_expiry } = req.body;

      // Get current data for audit
      const { data: currentData } = await supabase
        .from('customers')
        .select('nik, passport_number, passport_expiry')
        .eq('id', id)
        .single();

      // Update sensitive data
      const { data, error } = await supabase
        .from('customers')
        .update({
          nik,
          passport_number,
          passport_expiry,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      // Log with masked sensitive data
      await logAuditWithValues(
        req.user?.id || '',
        'CUSTOMER_SENSITIVE_DATA_UPDATED',
        'customers',
        id,
        { nik: maskSensitiveData(currentData?.nik) },
        { nik: maskSensitiveData(nik) }
      );

      res.json({
        success: true,
        message: 'Data sensitif pelanggan berhasil diperbarui',
        data: data?.[0]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update sensitive data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Log audit action dengan old dan new values
 */
async function logAuditWithValues(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    await supabase.rpc('log_audit_action', {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId,
      _old_values: oldValues ? JSON.stringify(oldValues) : null,
      _new_values: newValues ? JSON.stringify(newValues) : null
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

/**
 * Mask sensitive data untuk logging
 */
function maskSensitiveData(data: string | null | undefined): string | null {
  if (!data) return null;
  if (data.length <= 4) return '****';
  return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
}

export default router;
