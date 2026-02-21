-- Add porcentaje_honorarios column
ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS porcentaje_honorarios NUMERIC(5,2) DEFAULT 0;

-- Add honorarios_calculados as generated column
ALTER TABLE public.cost_savings_cases 
ADD COLUMN IF NOT EXISTS honorarios_calculados NUMERIC(12,2) 
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
