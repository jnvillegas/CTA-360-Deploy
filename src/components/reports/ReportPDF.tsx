import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #3b82f6",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  kpiContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 10,
  },
  kpiCard: {
    width: "23%",
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    borderLeft: "3px solid #3b82f6",
  },
  kpiTitle: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
    backgroundColor: "#eff6ff",
    padding: 5,
  },
  table: {
    width: "100%",
    border: "1px solid #e2e8f0",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "white",
    padding: 5,
    fontSize: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e2e8f0",
    padding: 4,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1px solid #e2e8f0",
    padding: 4,
    fontSize: 8,
    backgroundColor: "#f8fafc",
  },
  col1: { width: "8%" },
  col2: { width: "18%" },
  col3: { width: "20%" },
  col4: { width: "12%" },
  col5: { width: "12%" },
  col6: { width: "12%" },
  col7: { width: "8%" },
  col8: { width: "10%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
  badge: {
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 7,
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeYellow: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  badgeBlue: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgeGray: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  currencyNote: {
    fontSize: 8,
    color: "#64748b",
    fontStyle: "italic",
    marginBottom: 10,
  },
});

interface ReportData {
  rawCases?: Array<{
    id: string;
    patient?: {
      first_name: string;
      last_name: string;
      document_number?: string;
    };
    diagnosis: string;
    status: string;
    initial_monthly_cost: number;
    current_monthly_cost: number | null;
    monthly_savings: number | null;
    projected_savings: number | null;
    projected_savings_ars?: number | null;
    savings_percentage: number | null;
    porcentaje_honorarios?: number;
    honorarios_calculados?: number;
    honorarios_calculados_ars?: number | null;
    currency_type?: "ARS" | "USD";
    exchange_rate?: number;
    intervention_type?: string;
    evaluating_doctor?: {
      full_name: string;
      specialty?: string;
    };
    created_at: string;
  }>;
  kpis?: {
    totalCases: number;
    totalSavings: number;
    avgSavingsPercentage: number;
    roi: number;
  };
}

interface ReportPDFProps {
  data: ReportData;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
};

const getStatusBadge = (status: string): { bg: string; color: string; label: string } => {
  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    completado: { bg: "#dcfce7", color: "#166534", label: "Completado" },
    intervenido: { bg: "#fef9c3", color: "#854d0e", label: "Intervenido" },
    en_evaluacion: { bg: "#dbeafe", color: "#1e40af", label: "En Evaluación" },
    sin_optimizacion: { bg: "#f1f5f9", color: "#475569", label: "Sin Optimización" },
  };
  return statusMap[status] || { bg: "#f1f5f9", color: "#475569", label: status };
};

export const ReportPDF = ({ data }: ReportPDFProps) => {
  const cases = data.rawCases || [];
  const kpis = data.kpis || {
    totalCases: cases.length,
    totalSavings: cases.reduce((sum, c) => sum + (c.projected_savings || 0), 0),
    avgSavingsPercentage: cases.length > 0
      ? cases.reduce((sum, c) => sum + (c.savings_percentage || 0), 0) / cases.length
      : 0,
    roi: 0,
  };

  const totalHonorarios = cases.reduce((sum, c) => sum + (c.honorarios_calculados || 0), 0);
  const casesUSD = cases.filter((c) => c.currency_type === "USD");
  const casesARS = cases.filter((c) => c.currency_type === "ARS" || !c.currency_type);

  const topCases = [...cases]
    .sort((a, b) => (b.projected_savings || 0) - (a.projected_savings || 0))
    .slice(0, 15);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte Ejecutivo - Cost Savings</Text>
          <Text style={styles.subtitle}>
            Generado el {new Date().toLocaleDateString("es-AR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Total Casos</Text>
            <Text style={styles.kpiValue}>{kpis.totalCases}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Ahorro Total Proyectado</Text>
            <Text style={styles.kpiValue}>{formatCurrency(kpis.totalSavings)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>% Ahorro Promedio</Text>
            <Text style={styles.kpiValue}>{kpis.avgSavingsPercentage.toFixed(1)}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Honorarios Totales</Text>
            <Text style={styles.kpiValue}>{formatCurrency(totalHonorarios)}</Text>
          </View>
        </View>

        {(casesUSD.length > 0 || casesARS.length > 0) && (
          <Text style={styles.currencyNote}>
            Casos en ARS: {casesARS.length} | Casos en USD: {casesUSD.length}
            {casesUSD.length > 0 && " (convertidos a ARS para consolidación)"}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 15 Casos por Ahorro Proyectado</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>ID</Text>
              <Text style={styles.col2}>Paciente</Text>
              <Text style={styles.col3}>Diagnóstico</Text>
              <Text style={styles.col4}>Estado</Text>
              <Text style={styles.col5}>Costo Inicial</Text>
              <Text style={styles.col6}>Ahorro Proy.</Text>
              <Text style={styles.col7}>% Ahorro</Text>
              <Text style={styles.col8}>Moneda</Text>
            </View>
            {topCases.map((c, index) => {
              const status = getStatusBadge(c.status);
              return (
                <View
                  key={c.id}
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={styles.col1}>{c.id.slice(0, 8)}</Text>
                  <Text style={styles.col2}>
                    {c.patient
                      ? `${c.patient.first_name} ${c.patient.last_name}`
                      : "N/A"}
                  </Text>
                  <Text style={styles.col3}>
                    {c.diagnosis.length > 30
                      ? `${c.diagnosis.slice(0, 30)}...`
                      : c.diagnosis}
                  </Text>
                  <Text style={styles.col4}>{status.label}</Text>
                  <Text style={styles.col5}>
                    {formatCurrency(c.initial_monthly_cost)}
                  </Text>
                  <Text style={styles.col6}>
                    {formatCurrency(c.projected_savings)}
                  </Text>
                  <Text style={styles.col7}>
                    {(c.savings_percentage || 0).toFixed(1)}%
                  </Text>
                  <Text style={styles.col8}>{c.currency_type || "ARS"}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Heal Path - Sistema de Auditoría Médica | Página 1 de 1
          </Text>
        </View>
      </Page>

      {cases.length > 15 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Reporte Ejecutivo - Detalle Completo</Text>
            <Text style={styles.subtitle}>
              Continuación - Casos adicionales ({cases.length - 15} restantes)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Casos Adicionales</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>ID</Text>
                <Text style={styles.col2}>Paciente</Text>
                <Text style={styles.col3}>Diagnóstico</Text>
                <Text style={styles.col4}>Estado</Text>
                <Text style={styles.col5}>Costo Inicial</Text>
                <Text style={styles.col6}>Ahorro Proy.</Text>
                <Text style={styles.col7}>% Ahorro</Text>
                <Text style={styles.col8}>Moneda</Text>
              </View>
              {cases.slice(15).map((c, index) => {
                const status = getStatusBadge(c.status);
                return (
                  <View
                    key={c.id}
                    style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={styles.col1}>{c.id.slice(0, 8)}</Text>
                    <Text style={styles.col2}>
                      {c.patient
                        ? `${c.patient.first_name} ${c.patient.last_name}`
                        : "N/A"}
                    </Text>
                    <Text style={styles.col3}>
                      {c.diagnosis.length > 30
                        ? `${c.diagnosis.slice(0, 30)}...`
                        : c.diagnosis}
                    </Text>
                    <Text style={styles.col4}>{status.label}</Text>
                    <Text style={styles.col5}>
                      {formatCurrency(c.initial_monthly_cost)}
                    </Text>
                    <Text style={styles.col6}>
                      {formatCurrency(c.projected_savings)}
                    </Text>
                    <Text style={styles.col7}>
                      {(c.savings_percentage || 0).toFixed(1)}%
                    </Text>
                    <Text style={styles.col8}>{c.currency_type || "ARS"}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <Text>
              Heal Path - Sistema de Auditoría Médica | Página 2 de 2
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
