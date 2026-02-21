import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface PatientCostData {
  patientName: string;
  initialCost: number;
  finalCost: number | null;
  savings: number | null;
}

interface PatientCostChartProps {
  data: PatientCostData[];
  title?: string;
  description?: string;
  maxPatients?: number;
}

export function PatientCostChart({ 
  data, 
  title = "Comparación de Costos por Paciente",
  description = "Costo inicial proyectado vs costo final proyectado",
  maxPatients = 10
}: PatientCostChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const sortedData = [...data]
    .sort((a, b) => (b.initialCost - (b.finalCost || b.initialCost)) - (a.initialCost - (a.finalCost || a.initialCost)))
    .slice(0, maxPatients);

  const chartData = sortedData.map(item => ({
    name: item.patientName.length > 15 
      ? item.patientName.substring(0, 15) + '...' 
      : item.patientName,
    fullName: item.patientName,
    costoInicial: item.initialCost,
    costoFinal: item.finalCost || item.initialCost,
    ahorro: item.savings || 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.name === label);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{item?.fullName || label}</p>
          <p className="text-sm text-red-500">
            Costo Inicial: {formatCurrency(payload[0]?.value || 0)}
          </p>
          <p className="text-sm text-green-500">
            Costo Final: {formatCurrency(payload[1]?.value || 0)}
          </p>
          <p className="text-sm text-primary font-medium mt-1 pt-1 border-t">
            Ahorro: {formatCurrency(item?.ahorro || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos disponibles para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              tickFormatter={formatCurrency}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => {
                if (value === 'costoInicial') return 'Costo Inicial';
                if (value === 'costoFinal') return 'Costo Final';
                return value;
              }}
            />
            <Bar 
              dataKey="costoInicial" 
              fill="#ef4444" 
              name="costoInicial"
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
            <Bar 
              dataKey="costoFinal" 
              fill="#22c55e" 
              name="costoFinal"
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-muted-foreground">Costo Inicial Proyectado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-muted-foreground">Costo Final Proyectado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
