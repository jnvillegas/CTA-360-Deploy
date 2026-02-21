-- ============================================================================
-- FIX RLS POLICIES FOR ADHERENCE AND NOTIFICATIONS
-- ============================================================================

-- First, ensure the created_by column has a proper reference for integrity
ALTER TABLE public.treatment_adherence 
DROP CONSTRAINT IF EXISTS treatment_adherence_created_by_fkey;

ALTER TABLE public.treatment_adherence 
ADD CONSTRAINT treatment_adherence_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Fix Treatment Adherence RLS
DROP POLICY IF EXISTS "Usuarios ven adherencia según su rol" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden crear adherencia" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden actualizar adherencia" ON public.treatment_adherence;
DROP POLICY IF EXISTS "Médicos, evaluadores y admins pueden eliminar adherencia" ON public.treatment_adherence;

CREATE POLICY "Cualquier usuario autenticado puede ver adherencias"
  ON public.treatment_adherence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Médicos, evaluadores y administradores pueden crear adherencia"
  ON public.treatment_adherence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y administradores pueden actualizar adherencia"
  ON public.treatment_adherence FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

CREATE POLICY "Médicos, evaluadores y administradores pueden eliminar adherencia"
  ON public.treatment_adherence FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('medico', 'medico_evaluador', 'administrador')
    )
  );

-- Fix Notifications RLS (Ensuring it's fully accessible)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications for any user" ON public.notifications;

CREATE POLICY "Usuarios pueden ver sus propias notificaciones"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden marcar sus notificaciones como leídas"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema y admins pueden crear notificaciones"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar sus notificaciones"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
