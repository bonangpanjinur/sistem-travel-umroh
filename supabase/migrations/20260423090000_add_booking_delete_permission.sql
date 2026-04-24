-- Add booking.delete permission for role management

-- Insert permission for deleting bookings
INSERT INTO public.permissions_list (key, label, group_name, description)
VALUES (
  'booking.delete',
  'Hapus Booking',
  'Penjualan',
  'Menghapus data booking dan semua data terkait'
)
ON CONFLICT (key) DO NOTHING;

-- Also add other useful booking permissions that might be missing
INSERT INTO public.permissions_list (key, label, group_name, description)
VALUES 
  ('booking.view', 'Lihat Booking', 'Penjualan', 'Melihat daftar dan detail booking'),
  ('booking.create', 'Buat Booking', 'Penjualan', 'Membuat booking baru'),
  ('booking.edit', 'Edit Booking', 'Penjualan', 'Mengubah data booking'),
  ('booking.move_package', 'Pindah Paket', 'Penjualan', 'Memindahkan booking ke paket lain')
ON CONFLICT (key) DO NOTHING;

-- Verify insertions
SELECT key, label, group_name FROM public.permissions_list 
WHERE key LIKE 'booking.%'
ORDER BY key;