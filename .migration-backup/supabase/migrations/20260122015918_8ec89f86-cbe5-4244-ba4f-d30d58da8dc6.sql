-- Create table for WhatsApp configuration
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'fonnte',
    api_key TEXT,
    sender_number TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for WhatsApp message templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for WhatsApp message logs
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.whatsapp_templates(id),
    recipient_phone TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_config (admin only)
CREATE POLICY "Admins can manage whatsapp config"
ON public.whatsapp_config FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for whatsapp_templates (admin only)
CREATE POLICY "Admins can manage whatsapp templates"
ON public.whatsapp_templates FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for whatsapp_logs (admin only)
CREATE POLICY "Admins can view whatsapp logs"
ON public.whatsapp_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert whatsapp logs"
ON public.whatsapp_logs FOR INSERT
WITH CHECK (true);

-- Insert default templates
INSERT INTO public.whatsapp_templates (code, name, message_template, variables) VALUES
('BOOKING_CONFIRM', 'Konfirmasi Booking', 'Assalamu''alaikum {nama}, booking Anda dengan kode {kode_booking} telah berhasil. Paket: {nama_paket}. Total: {total_harga}. Terima kasih telah memilih layanan kami.', ARRAY['nama', 'kode_booking', 'nama_paket', 'total_harga']),
('PAYMENT_REMIND', 'Pengingat Pembayaran', 'Assalamu''alaikum {nama}, ini pengingat pembayaran untuk booking {kode_booking}. Sisa pembayaran: {sisa_bayar}. Jatuh tempo: {tanggal_jatuh_tempo}.', ARRAY['nama', 'kode_booking', 'sisa_bayar', 'tanggal_jatuh_tempo']),
('PAYMENT_CONFIRM', 'Konfirmasi Pembayaran', 'Alhamdulillah, pembayaran Anda sebesar {jumlah} untuk booking {kode_booking} telah kami terima. Terima kasih {nama}.', ARRAY['nama', 'kode_booking', 'jumlah']),
('DEPARTURE_REMIND', 'Pengingat Keberangkatan', 'Assalamu''alaikum {nama}, keberangkatan Anda tinggal {hari_lagi} hari lagi pada {tanggal_berangkat}. Mohon siapkan dokumen perjalanan.', ARRAY['nama', 'hari_lagi', 'tanggal_berangkat']),
('DOCUMENT_VERIFIED', 'Dokumen Terverifikasi', 'Alhamdulillah {nama}, dokumen {jenis_dokumen} Anda telah diverifikasi dan dinyatakan lengkap.', ARRAY['nama', 'jenis_dokumen']),
('WELCOME_JAMAAH', 'Selamat Datang Jamaah', 'Assalamu''alaikum {nama}, selamat bergabung sebagai jamaah kami. Semoga perjalanan ibadah Anda diberkahi Allah SWT.', ARRAY['nama'])
ON CONFLICT (code) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();