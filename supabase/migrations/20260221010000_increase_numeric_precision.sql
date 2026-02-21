-- ============================================================================
-- INCREASE NUMERIC PRECISION FOR HIGH-VALUE CURRENCIES (ARS)
-- ============================================================================

-- First, drop dependent generated columns
ALTER TABLE public.cost_savings_cases 
DROP COLUMN IF EXISTS initial_projected_cost,
DROP COLUMN IF EXISTS current_projected_cost,
DROP COLUMN IF EXISTS monthly_savings,
DROP COLUMN IF EXISTS projected_savings,
DROP COLUMN IF EXISTS initial_monthly_cost_ars,
DROP COLUMN IF EXISTS current_monthly_cost_ars,
DROP COLUMN IF EXISTS projected_savings_ars,
DROP COLUMN IF EXISTS honorarios_calculados,
DROP COLUMN IF EXISTS honorarios_calculados_ars,
DROP COLUMN IF EXISTS savings_percentage;

-- Now alter the base columns to NUMERIC(20, 2)
ALTER TABLE public.cost_savings_cases 
ALTER COLUMN initial_monthly_cost TYPE NUMERIC(20, 2),
ALTER COLUMN intervention_cost TYPE NUMERIC(20, 2),
ALTER COLUMN current_monthly_cost TYPE NUMERIC(20, 2),
ALTER COLUMN exchange_rate TYPE NUMERIC(20, 2);

-- Also add porcentaje_honorarios if it was missing or had low precision
-- (It's already there but let's ensure it's sufficient)
ALTER TABLE public.cost_savings_cases 
ALTER COLUMN porcentaje_honorarios TYPE NUMERIC(10, 2);

-- Re-create generated columns with higher precision
ALTER TABLE public.cost_savings_cases 
ADD COLUMN initial_projected_cost NUMERIC(20, 2) 
GENERATED ALWAYS AS (initial_monthly_cost * projected_period_months) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN current_projected_cost NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
    THEN current_monthly_cost * current_projected_period_months 
    ELSE NULL 
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN monthly_savings NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL 
    THEN initial_monthly_cost - current_monthly_cost 
    ELSE NULL 
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN projected_savings NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
    THEN (initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)
    ELSE NULL 
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN initial_monthly_cost_ars NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN initial_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
    THEN initial_monthly_cost * exchange_rate
    ELSE initial_monthly_cost
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN current_monthly_cost_ars NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
    THEN current_monthly_cost * exchange_rate
    ELSE current_monthly_cost
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN projected_savings_ars NUMERIC(20, 2) 
GENERATED ALWAYS AS (
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
ADD COLUMN honorarios_calculados NUMERIC(20, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN initial_monthly_cost IS NOT NULL 
    AND projected_period_months IS NOT NULL
    AND current_monthly_cost IS NOT NULL 
    AND current_projected_period_months IS NOT NULL 
    AND porcentaje_honorarios IS NOT NULL 
    AND porcentaje_honorarios > 0
    THEN ((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) * (porcentaje_honorarios / 100)
    ELSE 0
  END
) STORED;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN honorarios_calculados_ars NUMERIC(20, 2) 
GENERATED ALWAYS AS (
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

ALTER TABLE public.cost_savings_cases 
ADD COLUMN savings_percentage NUMERIC(10, 2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL AND (initial_monthly_cost * projected_period_months) > 0
    THEN (((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) / (initial_monthly_cost * projected_period_months)) * 100
    ELSE NULL 
  END
) STORED;
