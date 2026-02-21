-- Add user_id to patients table to link patients with authenticated users
ALTER TABLE public.patients ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for patients table
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver pacientes" ON public.patients;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear pacientes" ON public.patients;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar pacientes" ON public.patients;

-- Patients: View policy
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

-- Patients: Create policy
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

-- Patients: Update policy
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

-- Update RLS policies for cost_savings_cases
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver casos de ahorro" ON public.cost_savings_cases;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear casos de ahorro" ON public.cost_savings_cases;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar casos de ahorro" ON public.cost_savings_cases;

-- Cost savings cases: View policy
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

-- Cost savings cases: Create policy
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

-- Cost savings cases: Update policy (evaluadores pueden evaluar)
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

-- Update RLS policies for appointments
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver turnos" ON public.appointments;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear turnos" ON public.appointments;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar turnos" ON public.appointments;

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

-- Update RLS policies for medical_records
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver historias clínicas" ON public.medical_records;
DROP POLICY IF EXISTS "Los médicos pueden crear historias clínicas" ON public.medical_records;
DROP POLICY IF EXISTS "Los médicos pueden actualizar sus propias historias clínicas" ON public.medical_records;

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

-- Update RLS policies for prescriptions
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Los médicos pueden crear recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Los médicos pueden actualizar sus propias recetas" ON public.prescriptions;

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