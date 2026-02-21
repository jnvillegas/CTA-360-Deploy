# Análisis de Brechas - Sistema de Auditoría Médica

## Comparativa: Especificación vs Implementación Actual

**Fecha de análisis:** 18/02/2026  
**Archivo de referencia:** `Especificacion_Sistema_Auditoria.md`

---

## 1. MODELO DE DATOS

### 1.1 Entidad: Registro_Paciente (Especificación)

| Campo | Tipo | Estado | Observación |
|---|---|---|---|
| `id_caso` | UUID | ✅ OK | Existe como `id` |
| `fecha_ingreso` | Date | ✅ OK | Existe como `created_at` |
| `dni_paciente` | String | ✅ OK | Se relaciona con `patients.document_number` |
| `nombre_completo` | String | ✅ OK | Se obtiene de `patients.first_name + last_name` |
| `diagnostico` | String | ✅ OK | Existe como `diagnosis` |
| `medicacion_solicitada` | String | ✅ OK | Existe como `initial_medication` (JSON) |
| `cantidad_mensual` | Integer | ❌ **FALTA** | No existe campo específico |
| `costo_unitario_inicial` | Decimal | ❌ **FALTA** | Solo existe `initial_monthly_cost` |
| `costo_mensual_inicial` | Decimal | ✅ OK | Existe |
| `duracion_tratamiento` | Integer | ✅ OK | Existe como `projected_period_months` |
| `tipo_moneda` | Enum [ARS, USD] | ❌ **FALTA** | No existe |
| `cotizacion_dolar` | Decimal | ❌ **FALTA** | No existe |

### 1.2 Entidad: Intervencion_Auditoria (Especificación)

| Campo | Tipo | Estado | Observación |
|---|---|---|---|
| `tipo_intervencion` | Enum | ⚠️ Parcial | Existe como `intervention_type` pero es texto libre, no enum definido |
| `detalle_intervencion` | Text | ✅ OK | Existe como `intervention_description` |
| `costo_operativo_intervencion` | Decimal | ✅ OK | Existe como `intervention_cost` |
| `costo_mensual_final` | Decimal | ✅ OK | Existe como `current_monthly_cost` |
| `observaciones` | Text | ✅ OK | Existe |
| `estado` | Enum | ⚠️ Diferente | Ver sección 1.3 |
| `porcentaje_honorarios` | Decimal | ❌ **FALTA** | No existe - crítico para facturación |

### 1.3 Estados - Discrepancia

| Especificación | Implementación Actual |
|---|---|
| En Proceso | `en_evaluacion` |
| Cerrado | `completado` |
| Facturado | ❌ No existe |
| - | `intervenido` (no estaba especificado) |
| - | `sin_optimizacion` (no estaba especificado) |

**Recomendación:** Agregar estado `facturado` para el flujo completo de honorarios.

---

## 2. MOTOR DE CÁLCULO

### 2.1 Fórmulas Implementadas

| Fórmula | Estado | Ubicación |
|---|---|---|
| **CIP** (Costo Inicial Proyectado) | ✅ OK | `initial_projected_cost` (generated column en BD) |
| **CFP** (Costo Final Proyectado) | ✅ OK | `current_projected_cost` (generated column) |
| **Ahorro Total** | ✅ OK | `projected_savings` (generated column) |
| **% Ahorro** | ✅ OK | `savings_percentage` (generated column) |

### 2.2 Fórmulas FALTANTES

| Fórmula | Estado | Descripción |
|---|---|---|
| **Cálculo de Honorarios** | ❌ **FALTA** | `Honorarios = Ahorro_Total * (porcentaje_honorarios / 100)` |
| **Conversión Multimoneda** | ❌ **FALTA** | Si `tipo_moneda = USD`, valores ARS = valor * `cotizacion_dolar` |

### 2.3 Código de Referencia (BD actual)

```sql
-- Migración: 20251122195222_ebd06db9-1eda-4f88-9808-b13a79995029.sql
initial_projected_cost NUMERIC(10, 2) GENERATED ALWAYS AS 
  (initial_monthly_cost * projected_period_months) STORED,

current_projected_cost NUMERIC(10, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
    THEN current_monthly_cost * current_projected_period_months 
    ELSE NULL 
  END
) STORED,

projected_savings NUMERIC(10, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN current_monthly_cost IS NOT NULL AND current_projected_period_months IS NOT NULL 
    THEN (initial_monthly_cost * projected_period_months) - 
         (current_monthly_cost * current_projected_period_months)
    ELSE NULL 
  END
) STORED,
```

---

## 3. DASHBOARD & VISUALIZACIÓN

### 3.1 Tarjetas KPI (Top Level)

| KPI Requerido | Estado | Ubicación |
|---|---|---|
| Total Ahorrado Acumulado (YTD) | ✅ OK | `ExecutiveReports.tsx` - KpiCard |
| % Promedio de Ahorratividad | ✅ OK | `ExecutiveReports.tsx` - avgSavingsPercentage |
| Total Honorarios Generados | ❌ **FALTA** | No existe - requiere campo `porcentaje_honorarios` |

### 3.2 Gráficos Requeridos

| Gráfico | Estado | Observación |
|---|---|---|
| **Bar Chart AGRUPADO** por paciente | ❌ **FALTA** | Especificado: Eje X = Paciente, Serie 1 = Costo Inicial (Rojo), Serie 2 = Costo Final (Verde). Actualmente existen gráficos de líneas y barras pero NO agrupados por paciente individual |
| **Gauge Chart** (0% a 100%) | ❌ **FALTA** | Indicador de eficiencia por caso. No existe implementación |

### 3.3 Tabla de Gestión con Semáforos

| Requerimiento | Estado | Observación |
|---|---|---|
| Verde: Ahorro > 30% | ❌ **FALTA** | Existen badges de estado pero NO semáforos basados en % de ahorro |
| Amarillo: Ahorro 1% - 29% | ❌ **FALTA** | No implementado |
| Rojo: Sin ahorro o costo incrementado | ❌ **FALTA** | No implementado |

**Código actual:** Los badges en `CostSavingsCases.tsx` solo muestran el estado del caso, no el % de ahorro.

---

## 4. REQUERIMIENTOS NO FUNCIONALES

### 4.1 Validación de Datos

| Requerimiento | Estado | Observación |
|---|---|---|
| Campos de moneda sin símbolos manuales | ⚠️ Parcial | Se usa `Intl.NumberFormat` para formateo visual, pero no hay validación explícita de entrada |
| Guardar como float/decimal | ✅ OK | Los campos son `NUMERIC(10,2)` en BD |

### 4.2 Exportabilidad

| Formato | Estado | Ubicación |
|---|---|---|
| **CSV** | ✅ OK | `ExportButtons.tsx` - Funcional |
| **Excel** | ❌ **FALTA** | `ExportButtons.tsx:64` - Muestra "próximamente" |
| **PDF** | ❌ **FALTA** | `ExportButtons.tsx:68` - Muestra "próximamente" |

**Nota:** La exportación Excel y PDF también aparece como "próximamente" en `ExecutiveReports.tsx`

### 4.3 Inmediatez

| Requerimiento | Estado | Observación |
|---|---|---|
| Cálculos client-side o API rápida | ✅ OK | Los cálculos están en generated columns de PostgreSQL (muy eficiente) |
| Feedback instantáneo | ✅ OK | El wizard muestra cálculos en tiempo real |

---

## 5. RESUMEN DE TAREAS PENDIENTES

### Prioridad ALTA

| # | Tarea | Archivos Afectados |
|---|---|---|
| 1 | Agregar campo `porcentaje_honorarios` en BD y UI | Migración SQL, `types.ts`, wizard steps |
| 2 | Implementar cálculo de honorarios | BD (generated column) + UI |
| 3 | Agregar campo `tipo_moneda` (ARS/USD) | Migración SQL, `types.ts`, formularios |
| 4 | Agregar campo `cotizacion_dolar` | Migración SQL, `types.ts`, formulario |
| 5 | Implementar conversión multimoneda | BD + UI |

### Prioridad MEDIA

| # | Tarea | Archivos Afectados |
|---|---|---|
| 6 | Crear Gauge Chart componente | Nuevo archivo en `components/reports/charts/` |
| 7 | Crear Bar Chart agrupado por paciente | `CostComparisonChart.tsx` o nuevo componente |
| 8 | Implementar semáforos en tabla de casos | `CostSavingsCases.tsx` |
| 9 | Agregar KPI "Total Honorarios Generados" | `ExecutiveReports.tsx`, `Reports.tsx` |
| 10 | Agregar estado `facturado` | Migración SQL + UI |

### Prioridad BAJA

| # | Tarea | Archivos Afectados |
|---|---|---|
| 11 | Completar exportación Excel | `ExportButtons.tsx` (usar librería `xlsx`) |
| 12 | Completar exportación PDF | `ExportButtons.tsx` (usar librería `jspdf` o similar) |
| 13 | Agregar campos `cantidad_mensual` y `costo_unitario_inicial` | Migración SQL + wizard |
| 14 | Definir enum para `tipo_intervencion` | Migración SQL + validación UI |

---

## 6. ARCHIVOS CLAVE PARA MODIFICACIONES

```
src/
├── integrations/supabase/types.ts          # Tipos TypeScript
├── pages/
│   ├── CostSavingsCases.tsx                # Lista de casos
│   ├── CostSavingsCaseDetail.tsx           # Detalle de caso
│   ├── ExecutiveReports.tsx                # Reportes ejecutivos
│   └── Reports.tsx                         # Reportes generales
├── components/
│   ├── cost-savings/
│   │   └── wizard/
│   │       ├── Step1ClinicalData.tsx       # Datos clínicos iniciales
│   │       ├── Step2CostAnalysis.tsx       # Análisis de costos
│   │       └── Step3InterventionResult.tsx # Resultado intervención
│   └── reports/
│       ├── ExportButtons.tsx               # Exportación
│       ├── KpiCard.tsx                     # Tarjetas KPI
│       └── charts/
│           └── CostComparisonChart.tsx     # Gráfico comparativo

supabase/migrations/
└── [nueva migración].sql                   # Campos faltantes
```

---

## 7. LIBRERÍAS SUGERIDAS

| Funcionalidad | Librería | Comando |
|---|---|---|
| Gauge Chart | `recharts` (ya instalado) | Usar `<PieChart>` con diseño de gauge |
| Exportación Excel | `xlsx` | `npm install xlsx` |
| Exportación PDF | `@react-pdf/renderer` o `jspdf` | `npm install @react-pdf/renderer` |

---

## 8. NOTAS ADICIONALES

- El sistema base está bien arquitecturado con Supabase y React
- Los cálculos automáticos en BD (generated columns) son eficientes
- Falta principalmente funcionalidades de facturación/honorarios y algunos gráficos específicos
- La exportación CSV funciona correctamente como base
