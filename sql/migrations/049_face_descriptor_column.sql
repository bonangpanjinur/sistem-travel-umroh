-- Migration 049: Tambah kolom face_descriptor di tabel employees
-- Dibutuhkan oleh F2: face-api.js verify-face endpoint di hr.ts
-- Kolom ini menyimpan 128-dimensional face descriptor array (JSON string) dari face-api.js

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'face_descriptor'
  ) THEN
    ALTER TABLE employees ADD COLUMN face_descriptor TEXT;
    COMMENT ON COLUMN employees.face_descriptor IS
      'Face descriptor 128-dim array dari face-api.js (JSON string). Digunakan untuk verifikasi absensi wajah.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'face_registered_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN face_registered_at TIMESTAMPTZ;
    COMMENT ON COLUMN employees.face_registered_at IS
      'Timestamp terakhir kali face descriptor didaftarkan/diperbarui.';
  END IF;
END $$;

SELECT 'Migration 049 completed — face_descriptor column added to employees' AS result;
