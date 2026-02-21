-- Create cost_savings_documents table
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

-- Create index for faster queries by case_id
CREATE INDEX idx_cost_savings_documents_case ON cost_savings_documents(case_id);

-- Enable RLS
ALTER TABLE public.cost_savings_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Ver documentos (todos los roles con acceso al caso)
CREATE POLICY "Usuarios autenticados pueden ver documentos"
ON public.cost_savings_documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policy: Subir documentos (médicos, médicos evaluadores, administradores)
CREATE POLICY "Médicos y evaluadores pueden subir documentos"
ON public.cost_savings_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('medico', 'medico_evaluador', 'administrador')
  )
);

-- RLS Policy: Eliminar documentos (usuario que lo subió o admin)
CREATE POLICY "Usuario que subió o admin puede eliminar documentos"
ON public.cost_savings_documents
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- Create storage bucket for cost-savings-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cost-savings-documents',
  'cost-savings-documents',
  false,
  20971520, -- 20MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Storage RLS: Ver archivos (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver archivos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cost-savings-documents' AND auth.uid() IS NOT NULL);

-- Storage RLS: Subir archivos (médicos, evaluadores, admins)
CREATE POLICY "Médicos y evaluadores pueden subir archivos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cost-savings-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('medico', 'medico_evaluador', 'administrador')
  )
);

-- Storage RLS: Eliminar archivos (usuario que lo subió o admin)
CREATE POLICY "Usuario que subió o admin puede eliminar archivos"
ON storage.objects
FOR DELETE
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