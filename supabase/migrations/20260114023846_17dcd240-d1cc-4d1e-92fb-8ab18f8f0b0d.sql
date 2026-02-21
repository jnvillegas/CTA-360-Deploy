-- Add new columns to medical_records table
ALTER TABLE public.medical_records
ADD COLUMN IF NOT EXISTS monthly_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC,
ADD COLUMN IF NOT EXISTS initial_projected_period INTEGER,
ADD COLUMN IF NOT EXISTS initial_cost NUMERIC;