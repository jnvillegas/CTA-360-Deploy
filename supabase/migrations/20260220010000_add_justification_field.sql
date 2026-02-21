-- Add justification_for_increase column to cost_savings_cases
ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS justification_for_increase TEXT;
