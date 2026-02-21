-- Add insurance coverage fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS insurance_plan TEXT,
ADD COLUMN IF NOT EXISTS insurance_status TEXT DEFAULT 'activo',
ADD COLUMN IF NOT EXISTS insurance_authorization_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS copayment_percentage NUMERIC(5,2) CHECK (copayment_percentage >= 0 AND copayment_percentage <= 100);

-- Add judicial case fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS is_judicial_case BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS judicial_file_number TEXT,
ADD COLUMN IF NOT EXISTS judicial_court TEXT,
ADD COLUMN IF NOT EXISTS judicial_lawyer_name TEXT,
ADD COLUMN IF NOT EXISTS judicial_lawyer_contact TEXT,
ADD COLUMN IF NOT EXISTS judicial_status TEXT,
ADD COLUMN IF NOT EXISTS judicial_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.patients.insurance_plan IS 'Insurance coverage plan name (e.g., Plan 210, Executive Plan)';
COMMENT ON COLUMN public.patients.insurance_status IS 'Insurance affiliation status: activo, suspendido, baja, pendiente';
COMMENT ON COLUMN public.patients.insurance_authorization_required IS 'Whether patient requires prior authorization for procedures';
COMMENT ON COLUMN public.patients.copayment_percentage IS 'Patient copayment percentage (0-100)';
COMMENT ON COLUMN public.patients.is_judicial_case IS 'Whether patient has an active judicial case';
COMMENT ON COLUMN public.patients.judicial_file_number IS 'Court case/file number';
COMMENT ON COLUMN public.patients.judicial_court IS 'Court or tribunal name';
COMMENT ON COLUMN public.patients.judicial_lawyer_name IS 'Patient lawyer name';
COMMENT ON COLUMN public.patients.judicial_lawyer_contact IS 'Patient lawyer contact (email or phone)';
COMMENT ON COLUMN public.patients.judicial_status IS 'Judicial case status: activo, en_proceso, finalizado';
COMMENT ON COLUMN public.patients.judicial_notes IS 'Additional judicial case notes';

-- Create index for judicial cases filtering
CREATE INDEX IF NOT EXISTS idx_patients_judicial_case ON public.patients(is_judicial_case) WHERE is_judicial_case = true;