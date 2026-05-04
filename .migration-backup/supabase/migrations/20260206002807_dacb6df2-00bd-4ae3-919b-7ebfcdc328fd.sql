-- Create company_settings table for dynamic company configuration
CREATE TABLE public.company_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'text',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify settings
CREATE POLICY "Admins can view company settings"
ON public.company_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can modify company settings"
ON public.company_settings
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', '"PT Umroh Haji Berkah"', 'text', 'Nama perusahaan'),
('company_phone', '"0800-123-4567"', 'text', 'Nomor telepon perusahaan'),
('company_email', '"info@umrohtravel.com"', 'text', 'Email perusahaan'),
('company_address', '"Jl. Masjid Raya No. 123, Jakarta"', 'text', 'Alamat perusahaan'),
('company_logo_url', 'null', 'text', 'URL logo perusahaan'),
('bank_accounts', '[{"bank_name": "Bank BCA", "account_number": "123-456-7890", "account_name": "PT Umroh Haji Berkah"}]', 'json', 'Daftar rekening bank perusahaan'),
('whatsapp_api_provider', '"fonnte"', 'text', 'Provider WhatsApp API (fonnte/wablas)'),
('whatsapp_api_key', '""', 'text', 'API key untuk WhatsApp'),
('office_start_time', '"08:00"', 'text', 'Jam mulai kantor'),
('office_late_threshold', '"09:00"', 'text', 'Batas jam terlambat'),
('default_currency', '"IDR"', 'text', 'Mata uang default');

-- Create bank_accounts table for better management
CREATE TABLE public.bank_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    branch_name TEXT,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Public can view active bank accounts (for payment info)
CREATE POLICY "Anyone can view active bank accounts"
ON public.bank_accounts
FOR SELECT
USING (is_active = true);

-- Only admins can manage bank accounts
CREATE POLICY "Admins can manage bank accounts"
ON public.bank_accounts
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default bank account
INSERT INTO public.bank_accounts (bank_name, account_number, account_name, is_primary) VALUES
('Bank BCA', '123-456-7890', 'PT Umroh Haji Berkah', true);