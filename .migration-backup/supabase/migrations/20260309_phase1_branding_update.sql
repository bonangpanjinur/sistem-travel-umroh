-- Phase 1: Update branding and contact information
-- This migration updates the website_settings table with Phase 1 improvements

UPDATE public.website_settings 
SET 
  company_name = 'Aishah Tour Travel',
  tagline = 'Perjalanan Spiritual Menuju Baitullah dengan Kepercayaan',
  footer_address = 'Jl. Masjid Agung No. 123, Jakarta Selatan 12345',
  footer_phone = '+62 21 1234567',
  footer_email = 'info@aishahtravel.com',
  footer_whatsapp = '+62 812 3456 7890',
  social_instagram = 'https://instagram.com/aishahtravel',
  social_facebook = 'https://facebook.com/aishahtravel',
  social_youtube = 'https://youtube.com/@aishahtravel',
  social_tiktok = 'https://tiktok.com/@aishahtravel',
  meta_title = 'Aishah Tour Travel - Perjalanan Umroh & Haji Terpercaya',
  meta_description = 'Layanan perjalanan Umroh dan Haji terpercaya dengan pengalaman lebih dari 15 tahun. Nikmati perjalanan ibadah yang nyaman, aman, dan penuh keberkahan.',
  hero_title = 'Wujudkan Ibadah Suci Anda',
  hero_subtitle = 'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun. Nikmati perjalanan ibadah yang nyaman, aman, dan penuh keberkahan.',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';
