import { useState } from "react";
import { KpiCard } from "@/components/reports/KpiCard";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { useReportData } from "@/hooks/useReportData";
import { TrendingDown, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { format } from "date-fns";
import { PatientCostChart } from "@/components/reports/charts/PatientCostChart";
import { ExportButtons } from "@/components/reports/ExportButtons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ExecutiveReports() {
  const [filters, setFilters] = useState({});
  const { data: reportData, isLoading } = useReportData(filters);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyUSD = (value: number, rate: number = 1200) => {
    const usd = value / rate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(usd);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Cargando reportes ejecutivos...</div>
      </div>
    );
  }

  const kpis = reportData?.kpis || {
    totalCases: 0,
    totalSavings: 0,
    avgSavingsPercentage: 0,
    roi: 0
  };

  const totalHonorarios = (reportData?.rawCases || []).reduce(
    (sum: number, c: any) => sum + (c.honorarios_calculados || 0), 
    0
  );

  const totalHonorariosARS = (reportData?.rawCases || []).reduce(
    (sum: number, c: any) => sum + (c.honorarios_calculados_ars || c.honorarios_calculados || 0), 
    0
  );

  const totalSavingsARS = (reportData?.rawCases || []).reduce(
    (sum: number, c: any) => sum + (c.projected_savings_ars || c.projected_savings || 0), 
    0
  );

  const casesUSD = (reportData?.rawCases || []).filter((c: any) => c.currency_type === 'USD');
  const casesARS = (reportData?.rawCases || []).filter((c: any) => c.currency_type === 'ARS' || !c.currency_type);

  // Preparar datos para gráfico de evolución mensual
  const evolutionData = (reportData?.monthlyData || []).map(item => ({
    ...item,
    monthLabel: format(new Date(item.month + '-01'), 'MMM yyyy')
  }));

  // Preparar datos para top 10 medicamentos
  const topMedications = (reportData?.medicationData || []).slice(0, 10);

  // Preparar datos de ahorro por especialidad
  const specialtyData = (reportData?.rawCases || []).reduce((acc: any[], c: any) => {
    const specialty = c.evaluating_doctor?.specialty || 'Sin especialidad';
    const existing = acc.find(item => item.specialty === specialty);
    if (existing) {
      existing.cases += 1;
      existing.savings += c.projected_savings || 0;
    } else {
      acc.push({
        specialty,
        cases: 1,
        savings: c.projected_savings || 0
      });
    }
    return acc;
  }, []).sort((a, b) => b.savings - a.savings);

  // Top 10 médicos por ROI
  const topDoctorsByROI = (reportData?.doctorData || [])
    .map((doc: any) => {
      const interventionCost = reportData?.rawCases
        ?.filter((c: any) => c.evaluating_doctor?.full_name === doc.name)
        .reduce((sum: number, c: any) => sum + (c.intervention_cost || 0), 0) || 0;
      
      const roi = interventionCost > 0 
        ? ((doc.savings - interventionCost) / interventionCost) * 100 
        : 0;
      
      return {
        ...doc,
        roi,
        avgSavings: doc.cases > 0 ? doc.savings / doc.cases : 0
      };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);

  // Datos para gráfico de comparación por paciente (Top 10)
  const patientCostData = (reportData?.rawCases || [])
    .filter((c: any) => c.patient)
    .map((c: any) => ({
      patientName: `${c.patient.first_name} ${c.patient.last_name}`,
      initialCost: c.initial_projected_cost || 0,
      finalCost: c.current_projected_cost,
      savings: c.projected_savings
    }))
    .sort((a: any, b: any) => (b.savings || 0) - (a.savings || 0))
    .slice(0, 10);

  // Tendencias año a año
  const yearlyTrends = (reportData?.rawCases || []).reduce((acc: any[], c: any) => {
    const year = new Date(c.created_at).getFullYear();
    const existing = acc.find(item => item.year === year);
    if (existing) {
      existing.cases += 1;
      existing.totalSavings += c.projected_savings || 0;
      existing.totalInterventionCost += c.intervention_cost || 0;
    } else {
      acc.push({
        year,
        cases: 1,
        totalSavings: c.projected_savings || 0,
        totalInterventionCost: c.intervention_cost || 0
      });
    }
    return acc;
  }, [])
  .map(item => ({
    ...item,
    avgSavings: item.cases > 0 ? item.totalSavings / item.cases : 0,
    avgPercentage: item.cases > 0 
      ? (reportData?.rawCases || [])
          .filter((c: any) => new Date(c.created_at).getFullYear() === item.year)
          .reduce((sum: number, c: any) => sum + (c.savings_percentage || 0), 0) / item.cases
      : 0,
    roi: item.totalInterventionCost > 0 
      ? ((item.totalSavings - item.totalInterventionCost) / item.totalInterventionCost) * 100 
      : 0
  }))
  .sort((a, b) => b.year - a.year)
  .slice(0, 5);

  const bestYear = yearlyTrends.reduce((max, item) => 
    item.totalSavings > (max?.totalSavings || 0) ? item : max
  , null as any);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes Ejecutivos</h1>
          <p className="text-muted-foreground mt-1">
            Análisis detallado del impacto económico y clínico de intervenciones
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={reportData} filename="reporte_ejecutivo" />
        </div>
      </div>

      {/* Filtros */}
      <ReportFilters onFilterChange={setFilters} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total de Casos Analizados"
          value={kpis.totalCases}
          subtitle={`${casesARS.length} ARS | ${casesUSD.length} USD`}
          icon={TrendingDown}
        />
        <KpiCard
          title="Ahorro Total Proyectado"
          value={formatCurrency(totalSavingsARS)}
          subtitle="Consolidado en ARS"
          icon={DollarSign}
        />
        <KpiCard
          title="% Promedio de Ahorro"
          value={`${kpis.avgSavingsPercentage.toFixed(1)}%`}
          subtitle="Eficiencia de optimización"
          icon={Percent}
        />
        <KpiCard
          title="ROI Promedio"
          value={`${kpis.roi.toFixed(1)}%`}
          subtitle="Retorno de inversión"
          icon={TrendingUp}
        />
        <KpiCard
          title="Honorarios Totales"
          value={formatCurrency(totalHonorariosARS)}
          subtitle="Consolidado en ARS"
          icon={DollarSign}
        />
      </div>

      {casesUSD.length > 0 && (
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">
              {casesUSD.length} caso(s) en USD incluidos con conversión a ARS para consolidación de reportes.
            </span>
          </div>
        </div>
      )}

      {/* Gráfico de Evolución Mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Ahorro Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="monthLabel" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Ahorro Mensual ($)"
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparación de Costos por Paciente */}
      <PatientCostChart 
        data={patientCostData}
        title="Top 10 Pacientes por Ahorro"
        description="Comparación costo inicial vs final proyectado"
        maxPatients={10}
      />

      {/* Grid de 2 columnas para gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Medicamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Medicamentos Optimizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topMedications} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={formatCurrency}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '10px' }}
                  width={120}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="savings" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Ahorro Total"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ahorro por Especialidad */}
        <Card>
          <CardHeader>
            <CardTitle>Ahorro por Especialidad Médica</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={specialtyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="specialty" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="cases" 
                  fill="hsl(var(--chart-1))" 
                  name="Casos Totales"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="savings" 
                  fill="hsl(var(--chart-2))" 
                  name="Ahorro Total ($)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROI por Médico Evaluador */}
      <Card>
        <CardHeader>
          <CardTitle>ROI por Médico Evaluador (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topDoctorsByROI} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '11px' }}
                width={150}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Ahorro Promedio') return formatCurrency(value);
                  if (name === 'ROI') return `${value.toFixed(1)}%`;
                  return value;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="cases" 
                fill="hsl(var(--chart-3))" 
                name="Casos Gestionados"
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="roi" 
                fill="hsl(var(--chart-4))" 
                name="ROI (%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de Tendencias Año a Año */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencias Año a Año</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Casos</TableHead>
                <TableHead className="text-right">Ahorro Total</TableHead>
                <TableHead className="text-right">Ahorro Promedio</TableHead>
                <TableHead className="text-right">% Ahorro</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyTrends.map((trend) => (
                <TableRow 
                  key={trend.year}
                  className={trend.year === bestYear?.year ? 'bg-primary/5 font-semibold' : ''}
                >
                  <TableCell>
                    {trend.year}
                    {trend.year === bestYear?.year && (
                      <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Mejor año
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{trend.cases}</TableCell>
                  <TableCell className="text-right">{formatCurrency(trend.totalSavings)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(trend.avgSavings)}</TableCell>
                  <TableCell className="text-right">{trend.avgPercentage.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{trend.roi.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
