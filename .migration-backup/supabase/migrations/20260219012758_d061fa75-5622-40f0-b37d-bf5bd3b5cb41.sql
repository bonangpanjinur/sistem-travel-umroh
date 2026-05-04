
-- Create cash_transactions table for general cash management
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type VARCHAR NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category VARCHAR NOT NULL DEFAULT 'operational',
  description TEXT,
  amount NUMERIC NOT NULL,
  reference_id UUID,
  reference_type VARCHAR,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary_payments table
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  overtime_pay NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  total_pay NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for cash_transactions
CREATE POLICY "Finance staff can manage cash transactions"
  ON public.cash_transactions FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Branch managers can view branch cash transactions"
  ON public.cash_transactions FOR SELECT
  USING (has_role(auth.uid(), 'branch_manager'::app_role));

-- RLS policies for salary_payments
CREATE POLICY "Finance/admin can manage salary payments"
  ON public.salary_payments FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Employees can view own salary"
  ON public.salary_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = salary_payments.employee_id AND e.user_id = auth.uid()
  ));

-- Add indexes
CREATE INDEX idx_cash_transactions_date ON public.cash_transactions(transaction_date);
CREATE INDEX idx_cash_transactions_type ON public.cash_transactions(transaction_type);
CREATE INDEX idx_cash_transactions_category ON public.cash_transactions(category);
CREATE INDEX idx_salary_payments_period ON public.salary_payments(period_year, period_month);
CREATE INDEX idx_salary_payments_employee ON public.salary_payments(employee_id);
