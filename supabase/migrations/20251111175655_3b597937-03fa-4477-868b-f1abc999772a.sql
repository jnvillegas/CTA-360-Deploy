-- Crear tabla de recetas electrónicas
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  diagnosis TEXT,
  medications JSONB NOT NULL,
  instructions TEXT,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Habilitar RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Los usuarios autenticados pueden ver recetas"
  ON public.prescriptions
  FOR SELECT
  USING (true);

CREATE POLICY "Los médicos pueden crear recetas"
  ON public.prescriptions
  FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Los médicos pueden actualizar sus propias recetas"
  ON public.prescriptions
  FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Trigger para updated_at
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();