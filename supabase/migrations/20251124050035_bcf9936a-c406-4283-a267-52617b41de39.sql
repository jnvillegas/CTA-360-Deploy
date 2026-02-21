-- Create doctors table
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

-- Enable Row Level Security
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create policies for doctors table
CREATE POLICY "Los usuarios autenticados pueden ver médicos"
  ON public.doctors
  FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios autenticados pueden crear médicos"
  ON public.doctors
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Los usuarios autenticados pueden actualizar médicos"
  ON public.doctors
  FOR UPDATE
  USING (true);

CREATE POLICY "Los usuarios autenticados pueden eliminar médicos"
  ON public.doctors
  FOR DELETE
  USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert test doctors
INSERT INTO public.doctors (full_name, specialty, email, phone, license_number) VALUES
  ('Dr. Delgado', 'Oncología', 'delgado@medicloud.com', '+54 9 11 4567-8901', 'MN 12345'),
  ('Dr. Lucas Martin Romano', 'Neurología', 'romano@medicloud.com', '+54 9 11 4567-8902', 'MN 12346'),
  ('Dr. Miguel Linarez', 'Reumatología', 'linarez@medicloud.com', '+54 9 11 4567-8903', 'MN 12347'),
  ('Dra. Kirmair', 'Reumatología', 'kirmair@medicloud.com', '+54 9 11 4567-8904', 'MN 12348'),
  ('Dr. Caprarello', 'Neurología', 'caprarello@medicloud.com', '+54 9 11 4567-8905', 'MN 12349'),
  ('Dra. Orellana Luciana', 'Hepatología', 'orellana@medicloud.com', '+54 9 11 4567-8906', 'MN 12350'),
  ('Dra. Russo', 'Oncología', 'russo@medicloud.com', '+54 9 11 4567-8907', 'MN 12351'),
  ('Dr. Centro Fleischer', 'Oncología', 'fleischer@medicloud.com', '+54 9 11 4567-8908', 'MN 12352');