-- Create enum types for notifications
CREATE TYPE notification_type AS ENUM (
  'appointment_reminder',
  'prescription_expiring',
  'case_assigned',
  'case_status_changed',
  'system_alert'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create notifications table
CREATE TABLE public.notifications (
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

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for any user"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to automatically update read_at when is_read changes to true
CREATE OR REPLACE FUNCTION public.update_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  ELSIF NEW.is_read = false THEN
    NEW.read_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_notification_read_at_trigger
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_read_at();

-- Function to create notification for case status change
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
    
    -- Notify evaluating doctor
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
    
    -- Notify creator if different from evaluator
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

CREATE TRIGGER notify_case_status_change_trigger
  AFTER UPDATE ON public.cost_savings_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_case_status_change();

-- Function to notify when case is assigned
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

CREATE TRIGGER notify_case_assigned_trigger
  AFTER INSERT OR UPDATE ON public.cost_savings_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_case_assigned();