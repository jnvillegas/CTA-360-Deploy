-- ============================================================================
-- HEAL PATH CLOUD - MIGRACIÓN COMPLETA
-- Ejecutar este script en el SQL Editor de Supabase
-- Fecha: 2026-02-20
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

-- Enum para tipos de notificación
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'appointment_reminder',
    'prescription_expiring',
    'case_assigned',
    'case_status_changed',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para eventos de timeline
DO $$ BEGIN
  CREATE TYPE timeline_event_type AS ENUM (
    'created',
    'status_change',
    'intervention',
    'note',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para estado de casos de ahorro
DO $$ BEGIN
  CREATE TYPE cost_savings_status AS ENUM ('en_evaluacion', 'intervenido', 'completado', 'sin_optimizacion');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para adherencia
DO $$ BEGIN
  CREATE TYPE treatment_type AS ENUM ('prolonged', 'finish');
  CREATE TYPE authorization_profile AS ENUM ('fast', 'medium', 'slow');
  CREATE TYPE adherence_status AS ENUM ('sufficient', 'warning', 'critical', 'depleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para moneda
DO $$ BEGIN
  CREATE TYPE currency_type AS ENUM ('ARS', 'USD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ----------------------------------------------------------------------------

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'medico')
  );
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. TABLAS BASE
-- ----------------------------------------------------------------------------

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'medico',
  specialty TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de pacientes
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL,
  blood_type TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  insurance_plan TEXT,
  insurance_status TEXT DEFAULT 'activo',
  insurance_authorization_required BOOLEAN DEFAULT false,
  copayment_percentage NUMERIC(5,2),
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  notes TEXT,
  is_judicial_case BOOLEAN DEFAULT false,
  judicial_file_number TEXT,
  judicial_court TEXT,
  judicial_lawyer_name TEXT,
  judicial_lawyer_contact TEXT,
  judicial_status TEXT,
  judicial_notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de turnos/citas
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  appointment_type TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_appointment_status CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'))
);

-- Tabla de historias clínicas
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  visit_date DATE NOT NULL,
  chief_complaint TEXT,
  present_illness TEXT,
  physical_exam TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  prescriptions TEXT,
  lab_orders TEXT,
  follow_up TEXT,
  attachments JSONB,
  monthly_quantity NUMERIC,
  monthly_cost NUMERIC,
  initial_projected_period INTEGER,
  initial_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de recetas
CREATE TABLE IF NOT EXISTS public.prescriptions (
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
  CONSTRAINT valid_prescription_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Tabla de médicos
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. TABLAS DE CASOS DE AHORRO
-- ----------------------------------------------------------------------------

-- Tabla de casos de ahorro de costos
CREATE TABLE IF NOT EXISTS public.cost_savings_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL,
  initial_medication JSONB NOT NULL,
  initial_monthly_cost NUMERIC(10, 2) NOT NULL CHECK (initial_monthly_cost >= 0),
  projected_period_months INTEGER NOT NULL CHECK (projected_period_months > 0),
  intervention_description TEXT,
  intervention_type TEXT NOT NULL,
  intervention_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (intervention_cost >= 0),
  intervention_date DATE,
  evaluating_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observations TEXT,
  current_medication JSONB,
  current_monthly_cost NUMERIC(10, 2) CHECK (current_monthly_cost >= 0),
  current_projected_period_months INTEGER CHECK (current_projected_period_months > 0),
  status public.cost_savings_status NOT NULL DEFAULT 'en_evaluacion',
  currency_type public.currency_type DEFAULT 'ARS',
  exchange_rate NUMERIC(10,2) DEFAULT 1,
  honorarios_calculados NUMERIC(12,2) GENERATED ALWAYS AS (
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
  ) STORED,
  initial_monthly_cost_ars NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE 
      WHEN initial_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
      THEN initial_monthly_cost * exchange_rate
      ELSE initial_monthly_cost
    END
  ) STORED,
  current_monthly_cost_ars NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE 
      WHEN current_monthly_cost IS NOT NULL AND exchange_rate IS NOT NULL
      THEN current_monthly_cost * exchange_rate
      ELSE current_monthly_cost
    END
  ) STORED,
  projected_savings_ars NUMERIC(12,2) GENERATED ALWAYS AS (
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
  ) STORED,
  honorarios_calculados_ars NUMERIC(12,2) GENERATED ALWAYS AS (
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
  ) STORED,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  justification_for_increase TEXT
);

-- Tabla de timeline de casos
CREATE TABLE IF NOT EXISTS public.cost_savings_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cost_savings_cases(id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de documentos de casos
CREATE TABLE IF NOT EXISTS public.cost_savings_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cost_savings_cases(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT CHECK (document_type IN ('receta', 'estudio', 'informe', 'consenso', 'cotizacion', 'otro')) NOT NULL,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. TABLAS DE ADHERENCIA Y NOTIFICACIONES
-- ----------------------------------------------------------------------------

-- Tabla de adherencia al tratamiento
CREATE TABLE IF NOT EXISTS public.treatment_adherence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  payer_type TEXT NOT NULL,
  payer_file_number TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  daily_dose NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'mg',
  cycles_per_month NUMERIC NOT NULL DEFAULT 30,
  units_per_box NUMERIC NOT NULL,
  managed_quantity NUMERIC NOT NULL,
  treatment_type treatment_type NOT NULL DEFAULT 'prolonged',
  authorization_profile authorization_profile NOT NULL DEFAULT 'medium',
  authorization_days NUMERIC NOT NULL DEFAULT 15,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_depletion_date DATE,
  next_checkup_date DATE,
  next_authorization_start_date DATE,
  checkup_margin_days NUMERIC NOT NULL DEFAULT 7,
  status adherence_status NOT NULL DEFAULT 'sufficient',
  days_remaining NUMERIC,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  related_id UUID,
  related_table TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  priority notification_priority DEFAULT 'medium' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_patients_judicial_case ON public.patients(is_judicial_case) WHERE is_judicial_case = true;
CREATE INDEX IF NOT EXISTS idx_cost_savings_cases_patient_id ON public.cost_savings_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cost_savings_cases_status ON public.cost_savings_cases(status);
CREATE INDEX IF NOT EXISTS idx_cost_savings_cases_evaluating_doctor_id ON public.cost_savings_cases(evaluating_doctor_id);
CREATE INDEX IF NOT EXISTS idx_cost_savings_timeline_case_id ON public.cost_savings_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_cost_savings_timeline_event_date ON public.cost_savings_timeline(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_cost_savings_documents_case ON public.cost_savings_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_treatment_adherence_patient ON public.treatment_adherence(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_adherence_prescription ON public.treatment_adherence(prescription_id);
CREATE INDEX IF NOT EXISTS idx_treatment_adherence_status ON public.treatment_adherence(status);
CREATE INDEX IF NOT EXISTS idx_treatment_adherence_depletion ON public.treatment_adherence(estimated_depletion_date);
CREATE INDEX IF NOT EXISTS idx_treatment_adherence_active ON public.treatment_adherence(is_active);

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS
-- ----------------------------------------------------------------------------

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_patients ON public.patients;
CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_appointments ON public.appointments;
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_medical_records ON public.medical_records;
CREATE TRIGGER set_updated_at_medical_records
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_prescriptions ON public.prescriptions;
CREATE TRIGGER set_updated_at_prescriptions
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_doctors ON public.doctors;
CREATE TRIGGER set_updated_at_doctors
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cost_savings_cases ON public.cost_savings_cases;
CREATE TRIGGER set_updated_at_cost_savings_cases
  BEFORE UPDATE ON public.cost_savings_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. FUNCIONES DE NEGOCIO
-- ----------------------------------------------------------------------------

-- Función para calcular fechas de adherencia
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
  IF NEW.daily_dose > 0 AND NEW.cycles_per_month > 0 THEN
    days_covered := NEW.managed_quantity / (NEW.daily_dose * (NEW.cycles_per_month / 30.0));
  ELSE
    days_covered := 0;
  END IF;
  
  depletion_date := NEW.start_date + INTERVAL '1 day' * days_covered;
  NEW.estimated_depletion_date := depletion_date;
  NEW.next_checkup_date := depletion_date - INTERVAL '1 day' * NEW.checkup_margin_days;
  NEW.next_authorization_start_date := depletion_date - INTERVAL '1 day' * NEW.authorization_days;
  
  days_left := depletion_date - CURRENT_DATE;
  NEW.days_remaining := GREATEST(0, days_left);
  
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

DROP TRIGGER IF EXISTS calculate_adherence_dates_trigger ON public.treatment_adherence;
CREATE TRIGGER calculate_adherence_dates_trigger
BEFORE INSERT OR UPDATE ON public.treatment_adherence
FOR EACH ROW
EXECUTE FUNCTION public.calculate_adherence_dates();

-- Función para crear notificaciones de adherencia
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
  SELECT first_name || ' ' || last_name INTO patient_name
  FROM patients WHERE id = NEW.patient_id;
  
  SELECT COALESCE(p.doctor_id, NEW.created_by) INTO doctor_id
  FROM prescriptions p WHERE p.id = NEW.prescription_id;
  
  IF doctor_id IS NULL THEN
    doctor_id := NEW.created_by;
  END IF;
  
  days_left := NEW.days_remaining;
  
  IF (TG_OP = 'INSERT' AND NEW.status IN ('warning', 'critical', 'depleted')) OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    
    IF NEW.status = 'critical' OR NEW.status = 'depleted' THEN
      IF doctor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
        VALUES (
          doctor_id,
          'Alerta de adherencia: Stock crítico',
          'El paciente ' || patient_name || ' se quedarán sin medicación de ' || NEW.medication_name || ' en ' || GREATEST(0, days_left)::INTEGER || ' días.',
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

DROP TRIGGER IF EXISTS create_adherence_notifications_trigger ON public.treatment_adherence;
CREATE TRIGGER create_adherence_notifications_trigger
AFTER INSERT OR UPDATE ON public.treatment_adherence
FOR EACH ROW
EXECUTE FUNCTION public.create_adherence_notifications();

-- Función para actualizar read_at en notificaciones
CREATE OR REPLACE FUNCTION public.update_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := NOW();
  ELSIF NEW.is_read = false THEN
    NEW.read_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_read_at_trigger ON public.notifications;
CREATE TRIGGER update_notification_read_at_trigger
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_read_at();

-- Función para timeline de casos
CREATE OR REPLACE FUNCTION public.create_case_timeline_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.cost_savings_timeline (case_id, event_type, user_id, description)
    VALUES (NEW.id, 'created', NEW.created_by, 'Caso de ahorro de costos creado');
  END IF;
  
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.cost_savings_timeline (case_id, event_type, user_id, description, metadata)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'completado' THEN 'completed'::timeline_event_type
        ELSE 'status_change'::timeline_event_type
      END,
      auth.uid(),
      'Estado cambiado de ' || OLD.status || ' a ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  IF (TG_OP = 'UPDATE' AND (
    OLD.intervention_description IS DISTINCT FROM NEW.intervention_description OR
    OLD.intervention_date IS DISTINCT FROM NEW.intervention_date
  ) AND NEW.intervention_description IS NOT NULL) THEN
    INSERT INTO public.cost_savings_timeline (case_id, event_type, user_id, description)
    VALUES (
      NEW.id,
      'intervention',
      auth.uid(),
      'Intervención agregada o actualizada'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_savings_timeline_trigger ON public.cost_savings_cases;
CREATE TRIGGER cost_savings_timeline_trigger
AFTER INSERT OR UPDATE ON public.cost_savings_cases
FOR EACH ROW
EXECUTE FUNCTION public.create_case_timeline_event();

-- Función para notificar cambio de estado de caso
CREATE OR REPLACE FUNCTION public.notify_case_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT first_name || ' ' || last_name INTO patient_name
    FROM patients
    WHERE id = NEW.patient_id;
    
    IF NEW.evaluating_doctor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
      VALUES (
        NEW.evaluating_doctor_id,
        'Cambio de estado en caso',
        'El caso de ' || patient_name || ' cambió de estado: ' || OLD.status || ' → ' || NEW.status,
        'case_status_changed',
        NEW.id,
        'cost_savings_cases',
        'medium'
      );
    END IF;
    
    IF NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM NEW.evaluating_doctor_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
      VALUES (
        NEW.created_by,
        'Cambio de estado en caso',
        'El caso de ' || patient_name || ' que creaste cambió de estado: ' || OLD.status || ' → ' || NEW.status,
        'case_status_changed',
        NEW.id,
        'cost_savings_cases',
        'medium'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_case_status_change_trigger ON public.cost_savings_cases;
CREATE TRIGGER notify_case_status_change_trigger
AFTER UPDATE ON public.cost_savings_cases
FOR EACH ROW
EXECUTE FUNCTION public.notify_case_status_change();

-- Función para notificar caso asignado
CREATE OR REPLACE FUNCTION public.notify_case_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_name TEXT;
BEGIN
  IF NEW.evaluating_doctor_id IS NOT NULL AND (OLD.evaluating_doctor_id IS NULL OR OLD.evaluating_doctor_id IS DISTINCT FROM NEW.evaluating_doctor_id) THEN
    SELECT first_name || ' ' || last_name INTO patient_name
    FROM patients
    WHERE id = NEW.patient_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, related_id, related_table, priority)
    VALUES (
      NEW.evaluating_doctor_id,
      'Nuevo caso asignado',
      'Se te asignó el caso de ahorro de costos para ' || patient_name || ' - ' || NEW.diagnosis,
      'case_assigned',
      NEW.id,
      'cost_savings_cases',
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_case_assigned_trigger ON public.cost_savings_cases;
CREATE TRIGGER notify_case_assigned_trigger
AFTER INSERT OR UPDATE ON public.cost_savings_cases
FOR EACH ROW
EXECUTE FUNCTION public.notify_case_assigned();

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

CREATE POLICY "Los usuarios pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS para patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pacientes pueden ver su propia info, otros roles ven todos" ON public.patients;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden crear pacientes" ON public.patients;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden actualizar pacientes" ON public.patients;

CREATE POLICY "Pacientes pueden ver su propia info, otros roles ven todos"
  ON public.patients FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'paciente' 
      THEN user_id = auth.uid()
      ELSE true
    END
  );

CREATE POLICY "Médicos, evaluadores y admins pueden crear pacientes"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y admins pueden actualizar pacientes"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

-- RLS para appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven turnos según su rol" ON public.appointments;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden crear turnos" ON public.appointments;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden actualizar turnos" ON public.appointments;

CREATE POLICY "Usuarios ven turnos según su rol"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'paciente' 
      THEN patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Médicos, evaluadores y admins pueden crear turnos"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y admins pueden actualizar turnos"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

-- RLS para medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven historias clínicas según su rol" ON public.medical_records;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden crear historias clínicas" ON public.medical_records;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden actualizar historias clínicas" ON public.medical_records;

CREATE POLICY "Usuarios ven historias clínicas según su rol"
  ON public.medical_records FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'paciente' 
      THEN patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Médicos y evaluadores pueden crear historias clínicas"
  ON public.medical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador')
    )
  );

CREATE POLICY "Médicos y evaluadores pueden actualizar historias clínicas"
  ON public.medical_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador')
    )
  );

-- RLS para prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven recetas según su rol" ON public.prescriptions;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden crear recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden actualizar recetas" ON public.prescriptions;

CREATE POLICY "Usuarios ven recetas según su rol"
  ON public.prescriptions FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'paciente' 
      THEN patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Médicos y evaluadores pueden crear recetas"
  ON public.prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador')
    )
  );

CREATE POLICY "Médicos y evaluadores pueden actualizar recetas"
  ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador')
    )
  );

-- RLS para doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver médicos" ON public.doctors;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear médicos" ON public.doctors;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar médicos" ON public.doctors;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden eliminar médicos" ON public.doctors;

CREATE POLICY "Los usuarios autenticados pueden ver médicos"
  ON public.doctors FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios autenticados pueden crear médicos"
  ON public.doctors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Los usuarios autenticados pueden actualizar médicos"
  ON public.doctors FOR UPDATE
  USING (true);

CREATE POLICY "Los usuarios autenticados pueden eliminar médicos"
  ON public.doctors FOR DELETE
  USING (true);

-- RLS para cost_savings_cases
ALTER TABLE public.cost_savings_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven casos según su rol" ON public.cost_savings_cases;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden crear casos" ON public.cost_savings_cases;
DROP POLICY IF EXISTS "Evaluadores y admins pueden actualizar casos" ON public.cost_savings_cases;

CREATE POLICY "Usuarios ven casos según su rol"
  ON public.cost_savings_cases FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'paciente' 
      THEN patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Médicos, evaluadores y admins pueden crear casos"
  ON public.cost_savings_cases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Evaluadores y admins pueden actualizar casos"
  ON public.cost_savings_cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico_evaluador', 'administrador')
    )
  );

-- RLS para cost_savings_timeline
ALTER TABLE public.cost_savings_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver timeline" ON public.cost_savings_timeline;
DROP POLICY IF EXISTS "Usuarios autenticados pueden agregar eventos" ON public.cost_savings_timeline;

CREATE POLICY "Usuarios autenticados pueden ver timeline"
  ON public.cost_savings_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden agregar eventos"
  ON public.cost_savings_timeline FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS para cost_savings_documents
ALTER TABLE public.cost_savings_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON public.cost_savings_documents;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden subir documentos" ON public.cost_savings_documents;
DROP POLICY IF EXISTS "Usuario que subió o admin puede eliminar documentos" ON public.cost_savings_documents;

CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON public.cost_savings_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Médicos y evaluadores pueden subir documentos"
  ON public.cost_savings_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Usuario que subió o admin puede eliminar documentos"
  ON public.cost_savings_documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- RLS para treatment_adherence
ALTER TABLE public.treatment_adherence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven adherencia según su rol" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden crear adherencia" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden actualizar adherencia" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden eliminar adherencia" ON public.treatment_adherence;

CREATE POLICY "Usuarios ven adherencia según su rol"
  ON public.treatment_adherence FOR SELECT
  USING (
    CASE
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'paciente' 
      THEN patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      ELSE true
    END
  );

CREATE POLICY "Médicos, evaluadores y admins pueden crear adherencia"
  ON public.treatment_adherence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
    )
  );

CREATE POLICY "Médicos, evaluadores y admins pueden actualizar adherencia"
  ON public.treatment_adherence FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
    )
  );

CREATE POLICY "Médicos, evaluadores y admins pueden eliminar adherencia"
  ON public.treatment_adherence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = ANY (ARRAY['medico', 'medico_evaluador', 'administrador'])
    )
  );

-- RLS para notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications for any user" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for any user"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable Realtime para notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. STORAGE BUCKET PARA DOCUMENTOS
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cost-savings-documents',
  'cost-savings-documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos" ON storage.objects;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden subir archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuario que subió o admin puede eliminar archivos" ON storage.objects;

CREATE POLICY "Usuarios autenticados pueden ver archivos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cost-savings-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Médicos y evaluadores pueden subir archivos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cost-savings-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Usuario que subió o admin puede eliminar archivos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cost-savings-documents'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrador'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 11. DATOS DE PRUEBA - MÉDICOS
-- ----------------------------------------------------------------------------

INSERT INTO public.doctors (full_name, specialty, email, phone, license_number) VALUES
  ('Dr. Delgado', 'Oncología', 'delgado@medicloud.com', '+54 9 11 4567-8901', 'MN 12345'),
  ('Dr. Lucas Martin Romano', 'Neurología', 'romano@medicloud.com', '+54 9 11 4567-8902', 'MN 12346'),
  ('Dr. Miguel Linarez', 'Reumatología', 'linarez@medicloud.com', '+54 9 11 4567-8903', 'MN 12347'),
  ('Dra. Kirmair', 'Reumatología', 'kirmair@medicloud.com', '+54 9 11 4567-8904', 'MN 12348'),
  ('Dr. Caprarello', 'Neurología', 'caprarello@medicloud.com', '+54 9 11 4567-8905', 'MN 12349'),
  ('Dra. Orellana Luciana', 'Hepatología', 'orellana@medicloud.com', '+54 9 11 4567-8906', 'MN 12350'),
  ('Dra. Russo', 'Oncología', 'russo@medicloud.com', '+54 9 11 4567-8907', 'MN 12351'),
  ('Dr. Centro Fleischer', 'Oncología', 'fleischer@medicloud.com', '+54 9 11 4567-8908', 'MN 12352')
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. ACTUALIZAR DATOS EXISTENTES DE PROFILES
-- ----------------------------------------------------------------------------

-- Agregar constraint para validar valores de role
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_valid_role;
ALTER TABLE public.profiles
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador'));

-- Agregar constraint para validar valores de status
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE public.profiles
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('active', 'inactive'));

-- Actualizar registros existentes
UPDATE public.profiles
SET role = CASE 
  WHEN role = 'administracion' THEN 'administrador'
  WHEN role = 'enfermeria' THEN 'medico'
  WHEN role = 'direccion' THEN 'gestor'
  WHEN role NOT IN ('paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador') THEN 'medico'
  ELSE role
END;

UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

-- ----------------------------------------------------------------------------
-- FIN DE MIGRACIÓN
-- ----------------------------------------------------------------------------
