# ESPECIFICACIÓN DEL SISTEMA: GESTIÓN DE AHORRATIVIDAD FARMACOECONÓMICA Y AUDITORÍA MÉDICA

## 1. VISIÓN GENERAL DEL PROYECTO
Desarrollo de una plataforma de gestión (Dashboard + Motor de Cálculo) para optimizar el proceso de auditoría médica y farmacoeconomía. El sistema debe permitir la carga de pacientes, calcular proyecciones de costos automáticas, comparar escenarios (Pre vs. Post Intervención) y generar reportes de honorarios basados en el éxito (ahorro generado).

**Objetivo Principal:** Inmediatez en el reporte, eliminación de errores de cálculo manual y visualización gráfica del impacto económico.

---

## 2. ARQUITECTURA DE DATOS (DATA MODEL)

El sistema debe estructurarse sobre una base de datos relacional o documental con las siguientes entidades y tipos de datos:

### Entidad: Registro_Paciente
| Campo | Tipo de Dato | Descripción |
| :--- | :--- | :--- |
| `id_caso` | UUID | Identificador único del caso. |
| `fecha_ingreso` | Date | Fecha de carga del caso. |
| `dni_paciente` | String | Identificador del paciente. |
| `nombre_completo` | String | Nombre y Apellido. |
| `diagnostico` | String | Patología (CIE-10 o texto libre). |
| `medicacion_solicitada` | String | Droga/Tratamiento original solicitado. |
| `cantidad_mensual` | Integer | Unidades por mes. |
| `costo_unitario_inicial` | Decimal (15,2) | Costo unitario de la droga original. |
| `costo_mensual_inicial` | Decimal (15,2) | Cálculo: `costo_unitario * cantidad`. |
| `duracion_tratamiento` | Integer | Meses proyectados (ej. 3, 6, 12). |
| `tipo_moneda` | Enum | [ARS, USD]. |
| `cotizacion_dolar` | Decimal (10,2) | Valor del dólar al momento de la carga. |

### Entidad: Intervencion_Auditoria
| Campo | Tipo de Dato | Descripción |
| :--- | :--- | :--- |
| `tipo_intervencion` | Enum | [Cambio Esquema, Desescalamiento, Negociación, Auditoría Terreno]. |
| `detalle_intervencion` | Text | Descripción narrativa de la gestión (Gobernanza Clínica). |
| `costo_operativo_intervencion`| Decimal (15,2) | Costo fijo de la auditoría (si aplica). |
| `costo_mensual_final` | Decimal (15,2) | Nuevo costo mensual logrado tras la intervención. |
| `observaciones` | Text | Notas adicionales o justificación médica. |
| `estado` | Enum | [En Proceso, Cerrado, Facturado]. |
| `porcentaje_honorarios` | Decimal (5,2) | % pactado sobre el ahorro (ej. 5.00, 10.00). |

---

## 3. MÓDULOS FUNCIONALES Y LÓGICA DE NEGOCIO

### Módulo 1: Motor de Cálculo (Backend Logic)
El sistema debe ejecutar las siguientes fórmulas automáticamente al guardar o actualizar un registro:

1.  **Costo Inicial Proyectado (CIP):**
    ```
    CIP = costo_mensual_inicial * duracion_tratamiento
    ```

2.  **Costo Final Proyectado (CFP):**
    ```
    CFP = (costo_mensual_final * duracion_tratamiento) + costo_operativo_intervencion
    ```

3.  **Ahorratividad Neta (Savings):**
    ```
    Ahorro_Total = CIP - CFP
    ```
    *(Si el resultado es negativo, no hubo ahorro).*

4.  **Porcentaje de Ahorratividad (Eficiencia):**
    ```
    %_Ahorro = (Ahorro_Total / CIP) * 100
    ```

5.  **Cálculo de Honorarios (Fees):**
    ```
    Honorarios = Ahorro_Total * (porcentaje_honorarios / 100)
    ```

6.  **Conversión Multimoneda:**
    Si `tipo_moneda` = USD, todos los valores en Pesos se calculan multiplicando por `cotizacion_dolar`.

### Módulo 2: Interfaz de Usuario (Dashboard & UI)

**Requerimientos de Visualización:**

1.  **Tarjetas de KPI (Top Level):**
    *   Total Ahorrado Acumulado (YTD).
    *   % Promedio de Ahorratividad (ROI de la gestión).
    *   Total Honorarios Generados.

2.  **Gráficos Comparativos:**
    *   **Bar Chart (Agrupado):** Eje X = Paciente. Serie 1 = Costo Inicial Proyectado (Rojo). Serie 2 = Costo Final Proyectado (Verde).
    *   **Gauge Chart:** Indicador de eficiencia por caso (0% a 100%).

3.  **Tabla de Gestión:**
    *   Vista tabular con semáforos condicionales:
        *   Verde: Ahorro > 30%.
        *   Amarillo: Ahorro entre 1% y 29%.
        *   Rojo: Sin ahorro o costo incrementado.

---

## 4. REQUERIMIENTOS NO FUNCIONALES

1.  **Validación de Datos:** Los campos de moneda no deben aceptar texto ni símbolos manuales (ej: "$"). El sistema debe formatear la salida visualmente pero guardar `float/decimal` en la BD.
2.  **Exportabilidad:** Capacidad de exportar la tabla procesada a Excel/CSV respetando los formatos numéricos.
3.  **Inmediatez:** Los cálculos deben realizarse en el navegador (Client-side) o mediante API rápida para feedback instantáneo al usuario.

---

## 5. EJEMPLO DE FLUJO (USER STORY)

> "Como Auditor, ingreso el caso del paciente 'Gerez'. El sistema calcula que su tratamiento inicial costaría $10M. Registro mi intervención (cambio de esquema) que baja el costo mensual. El sistema recalcula instantáneamente que el costo final proyectado es $180k, mostrando un ahorro del 98% y calculando mi honorario automáticamente."