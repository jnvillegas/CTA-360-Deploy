-- Create enum for case status
CREATE TYPE public.cost_savings_status AS ENUM ('en_evaluacion', 'intervenido', 'completado', 'sin_optimizacion');

-- Create cost_savings_cases table
CREATE TABLE public.cost_savings_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Initial assessment
  diagnosis TEXT NOT NULL,
  initial_medication JSONB NOT NULL,
  initial_monthly_cost NUMERIC(10, 2) NOT NULL CHECK (initial_monthly_cost >= 0),
  projected_period_months INTEGER NOT NULL CHECK (projected_period_months > 0),
  
  -- Intervention details
  intervention_description TEXT,
  intervention_type TEXT NOT NULL,
  intervention_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (intervention_cost >= 0),
  intervention_date DATE,
  evaluating_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observations TEXT,
  
  -- Post-intervention
  current_medication JSONB,
  current_monthly_cost NUMERIC(10, 2) CHECK (current_monthly_cost >= 0),
  current_projected_period_months INTEGER CHECK (current_projected_period_months > 0),
  
  -- Status
  status public.cost_savings_status NOT NULL DEFAULT 'en_evaluacion',
  
  -- Calculated fields (generated columns)
  initial_projected_cost NUMERIC(10, 2) GENERATED ALWAYS AS (initial_monthly_cost * projected_period_months) STORED,
  current_projected_cost NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
      THEN current_monthly_cost * current_projected_period_months 
      ELSE NULL 
    END
  ) STORED,
  monthly_savings NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN current_monthly_cost IS NOT NULL 
      THEN initial_monthly_cost - current_monthly_cost 
      ELSE NULL 
    END
  ) STORED,
  projected_savings NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
      THEN (initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)
      ELSE NULL 
    END
  ) STORED,
  savings_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL AND (initial_monthly_cost * projected_period_months) > 0
      THEN (((initial_monthly_cost * projected_period_months) - (current_monthly_cost * current_projected_period_months)) / (initial_monthly_cost * projected_period_months)) * 100
      ELSE NULL 
    END
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.cost_savings_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Los usuarios autenticados pueden ver casos de ahorro"
  ON public.cost_savings_cases
  FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios autenticados pueden crear casos de ahorro"
  ON public.cost_savings_cases
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Los usuarios autenticados pueden actualizar casos de ahorro"
  ON public.cost_savings_cases
  FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_cost_savings_cases_updated_at
  BEFORE UPDATE ON public.cost_savings_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better query performance
CREATE INDEX idx_cost_savings_cases_patient_id ON public.cost_savings_cases(patient_id);
CREATE INDEX idx_cost_savings_cases_status ON public.cost_savings_cases(status);
CREATE INDEX idx_cost_savings_cases_evaluating_doctor_id ON public.cost_savings_cases(evaluating_doctor_id);