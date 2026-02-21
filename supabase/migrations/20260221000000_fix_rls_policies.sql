-- ============================================================================
-- FIX RLS POLICIES FOR ADMINISTRATORS
-- ============================================================================

-- Medical Records
DROP POLICY IF EXISTS "Médicos y evaluadores pueden crear historias clínicas" ON public.medical_records;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden actualizar historias clínicas" ON public.medical_records;

CREATE POLICY "Médicos, evaluadores y administradores pueden crear historias clínicas"
  ON public.medical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y administradores pueden actualizar historias clínicas"
  ON public.medical_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

-- Prescriptions
DROP POLICY IF EXISTS "Médicos y evaluadores pueden crear recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Médicos y evaluadores pueden actualizar recetas" ON public.prescriptions;

CREATE POLICY "Médicos, evaluadores y administradores pueden crear recetas"
  ON public.prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y administradores pueden actualizar recetas"
  ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

-- Cost Savings Cases (Update might need more roles)
DROP POLICY IF EXISTS "Evaluadores y admins pueden actualizar casos" ON public.cost_savings_cases;

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
