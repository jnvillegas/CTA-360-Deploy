import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonsProps {
  data: any;
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
        "Diagnóstico",
        "Estado",
        "Costo Inicial",
        "Costo Actual",
        "Ahorro Mensual",
        "Ahorro Proyectado",
        "% Ahorro",
        "Médico Evaluador",
        "Fecha Creación"
      ];

      const rows = data.rawCases.map((c: any) => [
        c.id,
        c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "N/A",
        c.diagnosis,
        c.status,
        c.initial_monthly_cost || 0,
        c.current_monthly_cost || 0,
        c.monthly_savings || 0,
        c.projected_savings || 0,
        c.savings_percentage || 0,
        c.evaluating_doctor?.full_name || "Sin asignar",
        new Date(c.created_at).toLocaleDateString()
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success("Exportado a CSV exitosamente");
    } catch (error) {
      toast.error("Error al exportar a CSV");
    }
  };

  const exportToExcel = () => {
    toast.info("La exportación a Excel estará disponible próximamente");
  };

  const exportToPDF = () => {
    toast.info("La exportación a PDF estará disponible próximamente");
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
