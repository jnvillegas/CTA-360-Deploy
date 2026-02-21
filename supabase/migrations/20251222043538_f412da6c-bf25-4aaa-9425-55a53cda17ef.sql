-- Create enums for treatment adherence
CREATE TYPE public.treatment_type AS ENUM ('prolonged', 'finish');
CREATE TYPE public.authorization_profile AS ENUM ('fast', 'medium', 'slow');
CREATE TYPE public.adherence_status AS ENUM ('sufficient', 'warning', 'critical', 'depleted');

-- Create treatment_adherence table
CREATE TABLE public.treatment_adherence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Payer/Coverage information
  payer_type TEXT NOT NULL,
  payer_file_number TEXT NOT NULL,
  
  -- Medication details
  medication_name TEXT NOT NULL,
  daily_dose NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'mg',
  cycles_per_month NUMERIC NOT NULL DEFAULT 30,
  units_per_box NUMERIC NOT NULL,
  managed_quantity NUMERIC NOT NULL,
  
  -- Treatment classification
  treatment_type treatment_type NOT NULL DEFAULT 'prolonged',
  authorization_profile authorization_profile NOT NULL DEFAULT 'medium',
  authorization_days NUMERIC NOT NULL DEFAULT 15,
  
  -- Calculated dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_depletion_date DATE,
  next_checkup_date DATE,
  next_authorization_start_date DATE,
  checkup_margin_days NUMERIC NOT NULL DEFAULT 7,
  
  -- Status tracking
  status adherence_status NOT NULL DEFAULT 'sufficient',
  days_remaining NUMERIC,
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treatment_adherence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios ven adherencia según su rol"
ON public.treatment_adherence
FOR SELECT
USING (
  CASE
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'paciente' 
    THEN patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    ELSE true
  END
);

CREATE POLICY "Médicos, evaluadores y admins pueden crear adherencia"
ON public.treatment_adherence
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
  )
);

CREATE POLICY "Médicos, evaluadores y admins pueden actualizar adherencia"
ON public.treatment_adherence
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
  )
);

CREATE POLICY "Médicos, evaluadores y admins pueden eliminar adherencia"
ON public.treatment_adherence
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
  )
);

-- Function to calculate adherence dates
CREATE OR REPLACE FUNCTION public.calculate_adherence_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_covered NUMERIC;
  depletion_date DATE;
  days_left NUMERIC;
  current_status adherence_status;
BEGIN
  -- Calculate days covered by managed quantity
  -- Formula: managed_quantity / (daily_dose * (cycles_per_month / 30))
  IF NEW.daily_dose > 0 AND NEW.cycles_per_month > 0 THEN
    days_covered := NEW.managed_quantity / (NEW.daily_dose * (NEW.cycles_per_month / 30.0));
  ELSE
    days_covered := 0;
  END IF;
  
  -- Calculate estimated depletion date
  depletion_date := NEW.start_date + INTERVAL '1 day' * days_covered;
  NEW.estimated_depletion_date := depletion_date;
  
  -- Calculate next checkup date (depletion - margin)
  NEW.next_checkup_date := depletion_date - INTERVAL '1 day' * NEW.checkup_margin_days;
  
  -- Calculate next authorization start date (depletion - authorization days)
  NEW.next_authorization_start_date := depletion_date - INTERVAL '1 day' * NEW.authorization_days;
  
  -- Calculate days remaining from today
  days_left := depletion_date - CURRENT_DATE;
  NEW.days_remaining := GREATEST(0, days_left);
  
  -- Determine status based on days remaining
  IF days_left <= 0 THEN
    current_status := 'depleted';
  ELSIF days_left < 7 THEN
    current_status := 'critical';
  ELSIF days_left < 30 THEN
    current_status := 'warning';
  ELSE
    current_status := 'sufficient';
  END IF;
  
  NEW.status := current_status;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Trigger to calculate dates on insert/update
CREATE TRIGGER calculate_adherence_dates_trigger
BEFORE INSERT OR UPDATE ON public.treatment_adherence
FOR EACH ROW
EXECUTE FUNCTION public.calculate_adherence_dates();

-- Function to create adherence notifications
CREATE OR REPLACE FUNCTION public.create_adherence_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_name TEXT;
  doctor_id UUID;
  days_left NUMERIC;
BEGIN
  -- Get patient name
  SELECT first_name || ' ' || last_name INTO patient_name
  FROM patients WHERE id = NEW.patient_id;
  
  -- Get primary doctor from prescription or created_by
  SELECT COALESCE(p.doctor_id, NEW.created_by) INTO doctor_id
  FROM prescriptions p WHERE p.id = NEW.prescription_id;
  
  IF doctor_id IS NULL THEN
    doctor_id := NEW.created_by;
  END IF;
  
  days_left := NEW.days_remaining;
  
  -- Only create notifications on status change or for new critical records
  IF (TG_OP = 'INSERT' AND NEW.status IN ('warning', 'critical', 'depleted')) OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Notify about medication depletion
    IF NEW.status = 'critical' OR NEW.status = 'depleted' THEN
      IF doctor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
        VALUES (
          doctor_id,
          'Alerta de adherencia: Stock crítico',
          'El paciente ' || patient_name || ' se quedará sin medicación de ' || NEW.medication_name || ' en ' || GREATEST(0, days_left)::INTEGER || ' días.',
          'system',
          NEW.id,
          'treatment_adherence',
          'urgent'
        );
      END IF;
    ELSIF NEW.status = 'warning' THEN
      IF doctor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
        VALUES (
          doctor_id,
          'Alerta de adherencia: Stock bajo',
          'El paciente ' || patient_name || ' tendrá medicación de ' || NEW.medication_name || ' para ' || days_left::INTEGER || ' días más.',
          'system',
          NEW.id,
          'treatment_adherence',
          'medium'
        );
      END IF;
    END IF;
    
    -- Notify about authorization start date
    IF CURRENT_DATE >= NEW.next_authorization_start_date AND NEW.status != 'depleted' THEN
      IF doctor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
        VALUES (
          doctor_id,
          'Iniciar gestión de autorización',
          'Debe iniciar la gestión de receta/autorización para ' || NEW.medication_name || ' del paciente ' || patient_name || '.',
          'system',
          NEW.id,
          'treatment_adherence',
          'high'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for notifications
CREATE TRIGGER create_adherence_notifications_trigger
AFTER INSERT OR UPDATE ON public.treatment_adherence
FOR EACH ROW
EXECUTE FUNCTION public.create_adherence_notifications();

-- Create indexes for performance
CREATE INDEX idx_treatment_adherence_patient ON public.treatment_adherence(patient_id);
CREATE INDEX idx_treatment_adherence_prescription ON public.treatment_adherence(prescription_id);
CREATE INDEX idx_treatment_adherence_status ON public.treatment_adherence(status);
CREATE INDEX idx_treatment_adherence_depletion ON public.treatment_adherence(estimated_depletion_date);
CREATE INDEX idx_treatment_adherence_active ON public.treatment_adherence(is_active);