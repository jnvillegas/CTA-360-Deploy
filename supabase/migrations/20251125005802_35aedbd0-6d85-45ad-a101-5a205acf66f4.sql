-- Create enum for event types
CREATE TYPE public.timeline_event_type AS ENUM (
  'created',
  'status_change',
  'intervention',
  'note',
  'completed'
);

-- Create cost_savings_timeline table
CREATE TABLE public.cost_savings_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cost_savings_cases(id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_cost_savings_timeline_case_id ON public.cost_savings_timeline(case_id);
CREATE INDEX idx_cost_savings_timeline_event_date ON public.cost_savings_timeline(event_date DESC);

-- Enable RLS
ALTER TABLE public.cost_savings_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios autenticados pueden ver timeline"
  ON public.cost_savings_timeline
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden agregar eventos"
  ON public.cost_savings_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger for automatic timeline event creation when case is created
CREATE OR REPLACE FUNCTION public.create_case_timeline_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create initial timeline event when case is created
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.cost_savings_timeline (case_id, event_type, user_id, description)
    VALUES (NEW.id, 'created', NEW.created_by, 'Caso de ahorro de costos creado');
  END IF;
  
  -- Create status change event when status changes
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
  
  -- Create intervention event when intervention details change
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

-- Create trigger on cost_savings_cases
CREATE TRIGGER cost_savings_timeline_trigger
  AFTER INSERT OR UPDATE ON public.cost_savings_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.create_case_timeline_event();