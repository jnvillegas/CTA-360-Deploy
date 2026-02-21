-- Create currency type enum
CREATE TYPE public.currency_type AS ENUM ('ARS', 'USD');

-- Add currency fields to cost_savings_cases
ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS currency_type public.currency_type DEFAULT 'ARS';

ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,2) DEFAULT 1;

-- Add generated column for costs in ARS (for unified reporting)
ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS initial_monthly_cost_ars NUMERIC(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN initial_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
    THEN initial_monthly_cost * exchange_rate
    ELSE initial_monthly_cost
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS current_monthly_cost_ars NUMERIC(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
    THEN current_monthly_cost * exchange_rate
    ELSE current_monthly_cost
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS projected_savings_ars NUMERIC(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN initial_monthly_cost IS NOT NULL 
    AND projected_period_months IS NOT NULL
    AND current_monthly_cost IS NOT NULL 
    AND current_projected_period_months IS NOT NULL 
    AND exchange_rate IS NOT NULL
    THEN ((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) * exchange_rate
    WHEN initial_monthly_cost IS NOT NULL 
    AND projected_period_months IS NOT NULL
    AND current_monthly_cost IS NOT NULL 
    AND current_projected_period_months IS NOT NULL
    THEN (initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)
    ELSE 0
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS honorarios_calculados_ars NUMERIC(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN initial_monthly_cost IS NOT NULL 
    AND projected_period_months IS NOT NULL
    AND current_monthly_cost IS NOT NULL 
    AND current_projected_period_months IS NOT NULL 
    AND porcentaje_honorarios IS NOT NULL
    AND exchange_rate IS NOT NULL
    THEN ((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) * (porcentaje_honorarios / 100) * exchange_rate
    WHEN initial_monthly_cost IS NOT NULL 
    AND projected_period_months IS NOT NULL
    AND current_monthly_cost IS NOT NULL 
    AND current_projected_period_months IS NOT NULL 
    AND porcentaje_honorarios IS NOT NULL
    THEN ((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) * (porcentaje_honorarios / 100)
    ELSE 0
  END
) STORED;
