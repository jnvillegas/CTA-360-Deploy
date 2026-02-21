import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { ReportPDF } from "./ReportPDF";
import { saveAs } from "file-saver";

interface ExportButtonsProps {
  data: {
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
      currency_type?: 'ARS' | 'USD';
      exchange_rate?: number;
      intervention_type?: string;
      intervention_cost?: number;
      initial_projected_cost?: number | null;
      current_projected_cost?: number | null;
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
  };
  filename?: string;
}

export const ExportButtons = ({ data, filename = "reporte" }: ExportButtonsProps) => {
  
  const exportToCSV = () => {
    try {
      if (!data.rawCases || data.rawCases.length === 0) {
        toast.error("No hay datos para exportar");
        return;
      }

      const headers = [
        "ID Caso",
        "Paciente",
        "Documento",
        "Diagnóstico",
        "Estado",
        "Moneda",
        "Costo Inicial Mensual",
        "Costo Actual Mensual",
        "Ahorro Mensual",
        "Ahorro Proyectado",
        "% Ahorro",
        "Honorarios %",
        "Honorarios Calculados",
        "Médico Evaluador",
        "Fecha Creación"
      ];

      const rows = data.rawCases.map((c) => [
        c.id.slice(0, 8),
        c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "N/A",
        c.patient?.document_number || "N/A",
        c.diagnosis,
        c.status,
        c.currency_type || 'ARS',
        c.initial_monthly_cost || 0,
        c.current_monthly_cost || 0,
        c.monthly_savings || 0,
        c.projected_savings || 0,
        (c.savings_percentage || 0).toFixed(2),
        c.porcentaje_honorarios || 0,
        c.honorarios_calculados || 0,
        c.evaluating_doctor?.full_name || "Sin asignar",
        new Date(c.created_at).toLocaleDateString('es-AR')
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success("Exportado a CSV exitosamente");
    } catch {
      toast.error("Error al exportar a CSV");
    }
  };

  const exportToExcel = () => {
    try {
      if (!data.rawCases || data.rawCases.length === 0) {
        toast.error("No hay datos para exportar");
        return;
      }

      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ["REPORTE EJECUTIVO - COST SAVINGS"],
        ["Fecha de generación:", new Date().toLocaleDateString('es-AR')],
        ["Total de Casos:", data.kpis?.totalCases || data.rawCases.length],
        ["Ahorro Total Proyectado:", `$${(data.kpis?.totalSavings || 0).toLocaleString('es-AR')}`],
        ["% Promedio de Ahorro:", `${(data.kpis?.avgSavingsPercentage || 0).toFixed(1)}%`],
        ["ROI Promedio:", `${(data.kpis?.roi || 0).toFixed(1)}%`],
        [],
        ["DETALLE DE CASOS"],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumen");

      const casesData = data.rawCases.map((c) => ({
        "ID Caso": c.id.slice(0, 8),
        "Paciente": c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "N/A",
        "Documento": c.patient?.document_number || "N/A",
        "Diagnóstico": c.diagnosis,
        "Estado": c.status,
        "Moneda": c.currency_type || 'ARS',
        "Cotización USD": c.exchange_rate || 1,
        "Costo Inicial Mensual": c.initial_monthly_cost || 0,
        "Costo Actual Mensual": c.current_monthly_cost || 0,
        "Costo Inicial Total": c.initial_projected_cost || 0,
        "Costo Final Total": c.current_projected_cost || 0,
        "Ahorro Mensual": c.monthly_savings || 0,
        "Ahorro Proyectado": c.projected_savings || 0,
        "Ahorro ARS": c.projected_savings_ars || c.projected_savings || 0,
        "% Ahorro": (c.savings_percentage || 0).toFixed(2),
        "Tipo Intervención": c.intervention_type || "",
        "Costo Intervención": c.intervention_cost || 0,
        "Honorarios %": c.porcentaje_honorarios || 0,
        "Honorarios Calculados": c.honorarios_calculados || 0,
        "Honorarios ARS": c.honorarios_calculados_ars || c.honorarios_calculados || 0,
        "Médico Evaluador": c.evaluating_doctor?.full_name || "Sin asignar",
        "Especialidad": c.evaluating_doctor?.specialty || "N/A",
        "Fecha Creación": new Date(c.created_at).toLocaleDateString('es-AR')
      }));

      const wsCases = XLSX.utils.json_to_sheet(casesData);
      
      const colWidths = [
        { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 30 },
        { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 18 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 },
        { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 12 }
      ];
      wsCases['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, wsCases, "Casos Detalle");

      const casesByCurrency = data.rawCases.reduce((acc, c) => {
        const currency = c.currency_type || 'ARS';
        if (!acc[currency]) acc[currency] = [];
        acc[currency].push(c);
        return acc;
      }, {} as Record<string, typeof data.rawCases>);

      Object.entries(casesByCurrency).forEach(([currency, cases]) => {
        const currencyData = cases.map((c) => ({
          "ID Caso": c.id.slice(0, 8),
          "Paciente": c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "N/A",
          "Diagnóstico": c.diagnosis,
          "Costo Inicial Mensual": c.initial_monthly_cost || 0,
          "Costo Actual Mensual": c.current_monthly_cost || 0,
          "Ahorro Proyectado": c.projected_savings || 0,
          "% Ahorro": (c.savings_percentage || 0).toFixed(2),
          "Honorarios": c.honorarios_calculados || 0,
          "Médico Evaluador": c.evaluating_doctor?.full_name || "Sin asignar"
        }));

        const wsCurrency = XLSX.utils.json_to_sheet(currencyData);
        wsCurrency['!cols'] = [
          { wch: 12 }, { wch: 25 }, { wch: 30 },
          { wch: 18 }, { wch: 18 }, { wch: 15 },
          { wch: 10 }, { wch: 15 }, { wch: 25 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsCurrency, `Casos ${currency}`);
      });

      const savingsByDoctor = data.rawCases.reduce((acc, c) => {
        const doctor = c.evaluating_doctor?.full_name || "Sin asignar";
        if (!acc[doctor]) {
          acc[doctor] = { cases: 0, totalSavings: 0, totalHonorarios: 0 };
        }
        acc[doctor].cases++;
        acc[doctor].totalSavings += c.projected_savings || 0;
        acc[doctor].totalHonorarios += c.honorarios_calculados || 0;
        return acc;
      }, {} as Record<string, { cases: number; totalSavings: number; totalHonorarios: number }>);

      const doctorData = Object.entries(savingsByDoctor).map(([doctor, stats]) => ({
        "Médico Evaluador": doctor,
        "Casos Gestionados": stats.cases,
        "Ahorro Total Proyectado": stats.totalSavings,
        "Honorarios Totales": stats.totalHonorarios,
        "Ahorro Promedio por Caso": stats.cases > 0 ? stats.totalSavings / stats.cases : 0
      }));

      if (doctorData.length > 0) {
        const wsDoctors = XLSX.utils.json_to_sheet(doctorData);
        wsDoctors['!cols'] = [
          { wch: 25 }, { wch: 18 }, { wch: 20 },
          { wch: 18 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsDoctors, "Por Médico");
      }

      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success("Exportado a Excel exitosamente");
    } catch {
      toast.error("Error al exportar a Excel");
    }
  };

  const exportToPDF = async () => {
    try {
      if (!data.rawCases || data.rawCases.length === 0) {
        toast.error("No hay datos para exportar");
        return;
      }

      const blob = await pdf(<ReportPDF data={data} />).toBlob();
      saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("Exportado a PDF exitosamente");
    } catch {
      toast.error("Error al exportar a PDF");
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button onClick={exportToCSV} variant="outline" size="sm">
        <FileText className="w-4 h-4 mr-2" />
        Exportar CSV
      </Button>
      <Button onClick={exportToExcel} variant="outline" size="sm">
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Exportar Excel
      </Button>
      <Button onClick={exportToPDF} variant="outline" size="sm">
        <FileDown className="w-4 h-4 mr-2" />
        Exportar PDF
      </Button>
    </div>
  );
};
