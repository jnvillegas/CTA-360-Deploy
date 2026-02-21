-- ============================================================================
-- SCRIPT DE DATOS DE PRUEBA - HEAL PATH CLOUD
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================================

DO $$ 
DECLARE
    v_user_id UUID;
    v_patient_1 UUID;
    v_patient_2 UUID;
    v_patient_3 UUID;
    v_record_1 UUID;
    v_record_2 UUID;
    v_record_3 UUID;
BEGIN
    -- 1. Intentar obtener el primer usuario disponible (para vincular auditorías)
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    -- Si no hay usuarios, usaremos NULL o podrías crear uno manual si fuera necesario
    -- Pero asumimos que el usuario que ejecuta esto ya tiene un perfil.

    -- 2. CREACIÓN DE PACIENTES
    -- Paciente 1: Oncología (En Evaluación)
    INSERT INTO public.patients (
        first_name, last_name, document_type, document_number, birth_date, gender, 
        insurance_provider, insurance_plan, chronic_conditions, created_by
    ) VALUES (
        'Juan', 'Pérez', 'DNI', '20.123.456', '1975-05-12', 'Masculino',
        'OSDE', '310', 'Carcinoma de Pulmón', v_user_id
    ) RETURNING id INTO v_patient_1;

    -- Paciente 2: Neurología (Intervenido)
    INSERT INTO public.patients (
        first_name, last_name, document_type, document_number, birth_date, gender, 
        insurance_provider, insurance_plan, chronic_conditions, created_by
    ) VALUES (
        'María', 'García', 'DNI', '25.987.654', '1982-10-20', 'Femenino',
        'Swiss Medical', 'SMG20', 'Migraña Crónica Refrataria', v_user_id
    ) RETURNING id INTO v_patient_2;

    -- Paciente 3: Reumatología (Completado)
    INSERT INTO public.patients (
        first_name, last_name, document_type, document_number, birth_date, gender, 
        insurance_provider, insurance_plan, chronic_conditions, created_by
    ) VALUES (
        'Roberto', 'Sánchez', 'DNI', '18.444.555', '1968-03-30', 'Masculino',
        'Galeno', 'Oro', 'Artritis Reumatoide', v_user_id
    ) RETURNING id INTO v_patient_3;

    -- 3. CREACIÓN DE HISTORIAS CLÍNICAS (Escenario Base)
    INSERT INTO public.medical_records (patient_id, doctor_id, visit_date, diagnosis, physical_exam, treatment_plan)
    VALUES (v_patient_1, v_user_id, CURRENT_DATE - INTERVAL '10 days', 'Cáncer de pulmón estadio IV', 'Paciente estable', 'Evaluar cambio a inmunoterapia')
    RETURNING id INTO v_record_1;

    INSERT INTO public.medical_records (patient_id, doctor_id, visit_date, diagnosis, physical_exam, treatment_plan)
    VALUES (v_patient_2, v_user_id, CURRENT_DATE - INTERVAL '30 days', 'Migraña crónica', 'Frecuencia de crisis elevada', 'Cambio de tratamiento preventivo')
    RETURNING id INTO v_record_2;

    INSERT INTO public.medical_records (patient_id, doctor_id, visit_date, diagnosis, physical_exam, treatment_plan)
    VALUES (v_patient_3, v_user_id, CURRENT_DATE - INTERVAL '60 days', 'Artritis Reumatoide activa', 'Dolor articular persistente', 'Optimización de dosis biológica')
    RETURNING id INTO v_record_3;

    -- 4. CREACIÓN DE CASOS DE AHORRO
    
    -- Caso 1: En Evaluación (Pérez)
    INSERT INTO public.cost_savings_cases (
        patient_id, medical_record_id, diagnosis, status,
        initial_medication, initial_monthly_cost, projected_period_months,
        currency_type, exchange_rate, created_by
    ) VALUES (
        v_patient_1, v_record_1, 'Oncología - Evaluación de cambio de línea', 'en_evaluacion',
        '[{"name": "Pembrolizumab 200mg", "dosage": "1 vial cada 21 días"}]'::jsonb, 12000, 12,
        'USD', 1000, v_user_id
    );

    -- Caso 2: Intervenido (García)
    INSERT INTO public.cost_savings_cases (
        patient_id, medical_record_id, diagnosis, status,
        initial_medication, initial_monthly_cost, projected_period_months,
        intervention_description, intervention_type, intervention_date,
        current_medication, current_monthly_cost, current_projected_period_months,
        currency_type, exchange_rate, created_by, pourcentage_honorarios
    ) VALUES (
        v_patient_2, v_record_2, 'Neurología - Optimización preventiva', 'intervenido',
        '[{"name": "Erenumab 140mg", "dosage": "1 inyección mensual"}]'::jsonb, 800, 12,
        'Se negoció descuento por volumen con droguería directa.', 'Negociación de Precio', CURRENT_DATE - INTERVAL '5 days',
        '[{"name": "Erenumab 140mg", "dosage": "1 inyección mensual"}]'::jsonb, 550, 12,
        'USD', 1000, v_user_id, 10
    );

    -- Caso 3: Completado (Sánchez)
    INSERT INTO public.cost_savings_cases (
        patient_id, medical_record_id, diagnosis, status,
        initial_medication, initial_monthly_cost, projected_period_months,
        intervention_description, intervention_type, intervention_date,
        current_medication, current_monthly_cost, current_projected_period_months,
        currency_type, exchange_rate, created_by, pourcentage_honorarios
    ) VALUES (
        v_patient_3, v_record_3, 'Reumatología - Mejora de eficiencia', 'completado',
        '[{"name": "Adalimumab 40mg", "dosage": "1 c/15 días"}]'::jsonb, 2500000, 6,
        'Cambio a biosimilar de igual eficacia con menor costo logístico.', 'Cambio Terapéutico', CURRENT_DATE - INTERVAL '15 days',
        '[{"name": "Biosimilar Adalimumab 40mg", "dosage": "1 c/15 días"}]'::jsonb, 1800000, 12,
        'ARS', 1, v_user_id, 15
    );

    RAISE NOTICE 'Datos de prueba creados exitosamente.';
END $$;
