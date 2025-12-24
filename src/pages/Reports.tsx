import { useState } from "react";
import { KpiCard } from "@/components/reports/KpiCard";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { SavingsEvolutionChart } from "@/components/reports/charts/SavingsEvolutionChart";
import { CostComparisonChart } from "@/components/reports/charts/CostComparisonChart";
import { CaseStatusChart } from "@/components/reports/charts/CaseStatusChart";
import { TopMedicationsChart } from "@/components/reports/charts/TopMedicationsChart";
import { DoctorsComparisonChart } from "@/components/reports/charts/DoctorsComparisonChart";
import { useReportData } from "@/hooks/useReportData";
import { TrendingDown, DollarSign, Percent, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
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
        <div className="animate-pulse text-muted-foreground">Cargando reportes...</div>
      </div>
    );
  }

  const kpis = reportData?.kpis || {
    totalCases: 0,
    totalSavings: 0,
    avgSavingsPercentage: 0,
    roi: 0
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reportes Analíticos</h1>
            <p className="text-muted-foreground mt-1">
              Panel ejecutivo de métricas e indicadores de costo-ahorratividad
            </p>
          </div>
          <ExportButtons data={reportData} filename="reporte-costos" />
        </div>

        {/* Filters */}
        <ReportFilters onFilterChange={setFilters} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Casos Totales"
            value={kpis.totalCases}
            subtitle="Casos gestionados"
            icon={TrendingDown}
          />
          <KpiCard
            title="Ahorro Total"
            value={formatCurrency(kpis.totalSavings)}
            subtitle={formatCurrencyUSD(kpis.totalSavings)}
            icon={DollarSign}
          />
          <KpiCard
            title="% Ahorro Promedio"
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
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SavingsEvolutionChart data={reportData?.monthlyData || []} />
          <CostComparisonChart data={reportData?.costComparisonData || []} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CaseStatusChart data={reportData?.statusData || []} />
          <Card>
            <CardHeader>
              <CardTitle>Tiempo Promedio de Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-4xl font-bold text-foreground">
                    {reportData?.avgDaysToIntervention.toFixed(0) || 0}
                  </p>
                  <p className="text-muted-foreground mt-2">Días promedio hasta intervención</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <TopMedicationsChart data={reportData?.medicationData || []} />
        
        <DoctorsComparisonChart data={reportData?.doctorData || []} />
      </div>
  );
}
