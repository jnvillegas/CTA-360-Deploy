# WORKFLOW DEFINITION: SISTEMA DE GESTIÓN DE AHORRATIVIDAD

## 1. VISIÓN GENERAL DEL FLUJO
Este documento describe el ciclo de vida completo de un caso de auditoría farmacoeconomica, desde la solicitud inicial hasta la liquidación de honorarios. El sistema debe orquestar el movimiento de datos entre roles y ejecutar cálculos automáticos en cada transición de estado.

**Ciclo de Vida:**
`Ingreso (Draft)` -> `En Auditoría (Review)` -> `Resolución (Optimized)` -> `Cierre (Closed)`

---

## 2. DETALLE DE PASOS Y ACCIONES (STEP-BY-STEP)

### PASO 1: ADMISIÓN Y ESCENARIO BASE
**Actor:** Administrativo de Carga / Admisión.
**Estado Inicial:** `New / Draft`

**Acciones de Usuario:**
1.  Ingresa datos demográficos del Paciente (DNI, Nombre).
2.  Ingresa Diagnóstico (Texto o CIE-10).
3.  Ingresa **Solicitud Original**:
    *   Medicación/Droga.
    *   Cantidad de Unidades Mensuales.
    *   Costo Unitario de Mercado (Input manual o catálogo).
    *   **Duración Estimada Tratamiento** (Input: 1, 3, 6, 12 meses).

**Acciones del Sistema (Automático):**
1.  Calcula `Costo_Mensual_Inicial = Costo_Unitario * Cantidad`.
2.  Calcula `Costo_Proyectado_Inicial = Costo_Mensual_Inicial * Duracion`.
3.  Si la moneda es USD, congela la cotización del día.
4.  Transiciona el estado a `En Auditoría`.

---

### PASO 2: GOBERNANZA CLÍNICA E INTERVENCIÓN
**Actor:** Auditor Médico / Farmacéutico.
**Estado:** `En Auditoría`

**Acciones de Usuario:**
1.  Revisa el caso en su bandeja de entrada.
2.  Realiza la gestión externa (contactar médico tratante, negociar, revisar evidencia).
3.  Registra el **Tipo de Intervención** (Ej: "Cambio de Esquema", "Desescalamiento", "Auditoría Terreno").
4.  Ingresa **Notas de Observación** (Texto narrativo justificando la acción).
5.  Ingresa **Costo Operativo de Intervención** (Si aplica: viáticos, interconsultas externas).

**Acciones del Sistema:**
*   Valida que los campos de justificación no estén vacíos.
*   Permite guardar borradores de la intervención antes de confirmar.

---

### PASO 3: CARGA DE RESULTADOS (ESCENARIO FINAL)
**Actor:** Auditor Médico / Supervisor.
**Estado:** `Resolución`

**Acciones de Usuario:**
1.  Ingresa la **Resolución Lograda**:
    *   Nueva Medicación/Dosis (si cambió).
    *   **Nuevo Costo Mensual** (Post-negociación).
    *   Nueva Duración (si se logró reducir el tiempo de tratamiento).

**Acciones del Sistema (Automático - Motor de Cálculo):**
1.  Calcula `Costo_Proyectado_Final = (Nuevo_Costo_Mensual * Nueva_Duracion) + Costo_Operativo_Intervencion`.
2.  Ejecuta Algoritmo de Ahorratividad:
    *   `Ahorro_Neto = Costo_Proyectado_Inicial - Costo_Proyectado_Final`.
    *   `Porcentaje_Eficiencia = (Ahorro_Neto / Costo_Proyectado_Inicial) * 100`.
3.  Asigna **Semáforo de KPI**:
    *   `IF Porcentaje > 30%` -> GREEN.
    *   `IF Porcentaje > 0% AND < 30%` -> YELLOW.
    *   `IF Porcentaje <= 0%` -> RED.

---

### PASO 4: REPORTING Y LIQUIDACIÓN DE HONORARIOS
**Actor:** Gerente de Proyecto / Finanzas.
**Estado:** `Cierre / Facturación`

**Acciones de Usuario:**
1.  Define/Verifica el `% Honorario Variable` (Default: 5% o 10%, editable).
2.  Confirma el cierre del periodo (Ej: "Cerrar Febrero 2025").

**Acciones del Sistema:**
1.  Calcula `Honorarios_A_Facturar = Ahorro_Neto * %_Honorario`.
2.  Genera Reporte Final (PDF/Excel) con:
    *   Paciente.
    *   Estrategia Aplicada.
    *   Ahorro Total Generado.
    *   Honorario Resultante.
3.  Bloquea el registro para ediciones futuras (Read-only).

---

## 3. DEFINICIÓN DE ROLES Y PERMISOS (RBAC)

| Rol | Permisos | Acceso a Vistas |
| :--- | :--- | :--- |
| **Admin/Carga** | `Create`, `Read` | Formulario de Ingreso, Lista de Pacientes. |
| **Auditor Médico** | `Read`, `Update` (Solo Fase 2 y 3) | Bandeja de Tareas, Formulario de Intervención. |
| **Supervisor/PM** | `Read`, `Update` (Configuración), `Export` | Dashboard de KPIs, Reportes Financieros, Configuración de %. |
| **Viewer (Cliente)** | `Read Only` | Dashboard Simplificado (Solo Gráficos de Ahorro). |

---

## 4. REGLAS DE NEGOCIO Y VALIDACIONES

1.  **Validación de Moneda:** El sistema debe manejar entradas en USD y ARS, normalizando todo a ARS para el reporte final usando una tabla de cotización centralizada.
2.  **Consistencia Temporal:** La `Duración del Tratamiento` por defecto es 12 meses para crónicos, a menos que se especifique lo contrario.
3.  **Integridad de Datos:** No se permite cerrar un caso (Pasar a paso 4) si el `Costo_Proyectado_Final` no ha sido calculado.
4.  **Alerta de Pérdida:** Si el `Ahorro_Neto` es negativo (el costo subió), el sistema debe exigir un campo obligatorio de "Justificación de Incremento" antes de guardar.