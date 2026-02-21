-- Agregar columna status si no existe
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Actualizar valores existentes de role para que coincidan con los nuevos valores permitidos
UPDATE public.profiles
SET role = CASE 
  WHEN role = 'administracion' THEN 'administrador'
  WHEN role = 'enfermeria' THEN 'medico'
  WHEN role = 'direccion' THEN 'gestor'
  WHEN role NOT IN ('paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador') THEN 'medico'
  ELSE role
END;

-- Actualizar registros existentes de status que tengan valores NULL
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

-- Hacer el campo status NOT NULL
ALTER TABLE public.profiles
ALTER COLUMN status SET NOT NULL;

-- Crear índice en la columna role para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

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

-- Comentarios para documentación
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: paciente, medico, medico_evaluador, gestor, administrador';
COMMENT ON COLUMN public.profiles.status IS 'Estado del usuario: active, inactive';