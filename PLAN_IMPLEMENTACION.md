# Plan de Implementación Recomendado

## Estrategia: Dependencias → Impacto Visual → Funcionalidad → Exportaciones

---

## FASE 1: Semáforos en Tabla ✅ COMPLETADO

**Completado:** 18/02/2026

**Por qué primero:**
- No requiere cambios en BD
- Usa datos que YA EXISTEN (`savings_percentage`)
- Impacto visual inmediato
- Esfuerzo: ~1 hora

### Tarea
Modificar `CostSavingsCases.tsx` para agregar indicadores de color según % de ahorro.

### Lógica implementada
```
Verde:  ahorro > 30%
Amarillo: ahorro 1% - 29%
Rojo:   ahorro <= 0% o sin ahorro
```

### Archivo modificado
- `src/pages/CostSavingsCases.tsx`

### Cambios realizados
1. Agregado type `SavingsLevel` ('high' | 'medium' | 'none')
2. Agregada función `getSavingsLevel()` para clasificar según %
3. Agregado objeto `savingsColors` con estilos para cada nivel
4. Borde izquierdo de color en cada tarjeta según nivel
5. Badge con indicador circular + label + porcentaje
6. Color dinámico en la sección de ahorros

---

## FASE 2: Gauge Chart de Eficiencia ✅ COMPLETADO

**Completado:** 18/02/2026

**Por qué segundo:**
- No requiere cambios en BD
- Muy visual, agrega valor al dashboard
- Librería `recharts` ya instalada
- Esfuerzo: ~2 horas

### Tarea
Crear componente Gauge Chart que muestre eficiencia 0-100%.

### Archivos creados/modificados
- `src/components/reports/charts/EfficiencyGauge.tsx` (nuevo)
- `src/pages/CostSavingsCaseDetail.tsx` (agregado import + integración)

### Diseño implementado
- Gauge semicircular de 0% a 100%
- Colores: rojo (0-30%), amarillo (30-60%), verde (60-100%)
- Muestra % de ahorro del caso en el centro
- Labels de eficiencia: "Alta Eficiencia", "Media Eficiencia", "Baja Eficiencia", "Sin Ahorro"
- Leyenda de colores al pie

---

## FASE 3: Bar Chart Agrupado por Paciente ✅ COMPLETADO

**Completado:** 18/02/2026

**Por qué tercero:**
- No requiere cambios en BD
- Cumple requerimiento específico de especificación
- Esfuerzo: ~2 horas

### Tarea
Crear gráfico de barras agrupadas: Costo Inicial (rojo) vs Costo Final (verde) por paciente.

### Archivos creados/modificados
- `src/components/reports/charts/PatientCostChart.tsx` (nuevo)
- `src/pages/ExecutiveReports.tsx` (agregado import + datos + componente)

### Características implementadas
- Gráfico horizontal con barras agrupadas
- Rojo: Costo Inicial Proyectado
- Verde: Costo Final Proyectado
- Top 10 pacientes ordenados por ahorro
- Tooltip personalizado con nombre completo y ahorro
- Leyenda de colores

---

## FASE 4: Campos de BD - Honorarios ✅ COMPLETADO

**Completado:** 18/02/2026

**Por qué cuarto:**
- Habilita funcionalidad de facturación
- Requiere migración BD
- Esfuerzo: ~3 horas

### Tareas realizadas
1. ✅ Crear migración con nuevos campos:
   - `porcentaje_honorarios` DECIMAL(5,2) DEFAULT 0
   - `honorarios_calculados` (generated column: ahorro * % / 100)

2. ✅ Actualizar tipos TypeScript
3. ✅ Modificar wizard para incluir campo de honorarios
4. ✅ Mostrar honorarios en detalle de caso (KPI card color púrpura)

### Archivos creados/modificados
- `supabase/migrations/20260219000000_add_honorarios_fields.sql` (nuevo)
- `src/integrations/supabase/types.ts`
- `src/components/cost-savings/wizard/Step3InterventionResult.tsx`
- `src/components/cost-savings/wizard/CostSavingsWizard.tsx`
- `src/pages/CostSavingsCaseDetail.tsx`

### ⚠️ IMPORTANTE - Aplicar migración
Para que funcione en Supabase, ejecutar la migración:
```sql
ALTER TABLE public.cost_savings_cases 
ADD COLUMN porcentaje_honorarios NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.cost_savings_cases 
ADD COLUMN honorarios_calculados NUMERIC(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN projected_savings IS NOT NULL AND porcentaje_honorarios IS NOT NULL AND porcentaje_honorarios > 0
    THEN projected_savings * (porcentaje_honorarios / 100)
    ELSE 0
  END
) STORED;
```

---

## FASE 5: KPI de Honorarios ✅ COMPLETADO

**Completado:** 18/02/2026

**Por qué quinto:**

- Depende de FASE 4
- Completa dashboard ejecutivo
- Esfuerzo: ~30 min

### Tareas realizadas
- ✅ KPI "Honorarios Totales" en Reportes Ejecutivos
- ✅ KPI individual por caso en detalle

### Archivos modificados
- `src/pages/ExecutiveReports.tsx`
- `src/pages/CostSavingsCaseDetail.tsx`

---

## FASE 6: Multimoneda (ARS/USD)

**Por qué sexto:**
- Requiere migración BD
- Requiere lógica de conversión en UI
- Esfuerzo: ~4 horas

### Tareas
1. Crear migración:
   - `tipo_moneda` ENUM('ARS', 'USD')
   - `cotizacion_dolar` DECIMAL(10,2)

2. Actualizar tipos y formularios
3. Implementar conversión en visualización

### Archivos a modificar
- Nueva migración SQL
- `src/integrations/supabase/types.ts`
- `src/components/cost-savings/wizard/Step1ClinicalData.tsx`
- Todas las vistas que muestran montos

---

## FASE 7: Exportación Excel

**Por qué séptimo:**
- Independiente de otras fases
- Valor agregado para reportes
- Esfuerzo: ~2 horas

### Tarea
Implementar exportación real a Excel usando librería `xlsx`.

### Pasos
1. Instalar librería: `npm install xlsx`
2. Modificar `ExportButtons.tsx`
3. Generar archivo Excel con formato

### Archivos a modificar
- `package.json`
- `src/components/reports/ExportButtons.tsx`

---

## FASE 8: Exportación PDF

**Por qué octavo:**
- Similar a Excel
- Esfuerzo: ~3 horas

### Tarea
Implementar exportación a PDF.

### Pasos
1. Instalar librería: `npm install @react-pdf/renderer`
2. Crear template de reporte
3. Modificar `ExportButtons.tsx`

---

## Resumen de Tiempos Estimados

| Fase | Tarea | Tiempo | Depende de |
|---|---|---|---|
| 1 | Semáforos | 1 hora | - |
| 2 | Gauge Chart | 2 horas | - |
| 3 | Bar Chart agrupado | 2 horas | - |
| 4 | Campos honorarios (BD) | 3 horas | - |
| 5 | KPI Honorarios | 30 min | Fase 4 |
| 6 | Multimoneda | 4 horas | - |
| 7 | Export Excel | 2 horas | - |
| 8 | Export PDF | 3 horas | - |

**Total estimado: ~17-18 horas**

---

## Recomendación Final

**EMPEZAR HOY:**
1. FASE 1 (Semáforos) - 1 hora
2. FASE 2 (Gauge Chart) - 2 horas

**Resultado al final del día:** Dashboard notablemente mejorado sin tocar la BD.

**MAÑANA:**
3. FASE 3 (Bar Chart agrupado)
4. FASE 4 (Honorarios en BD)

---

## Próximos Pasos

¿Querés que implemente **FASE 1 (Semáforos)** ahora? Solo necesito modificar un archivo y tendrás feedback visual inmediato.
