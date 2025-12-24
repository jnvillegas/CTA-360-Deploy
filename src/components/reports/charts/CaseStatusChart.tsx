import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CaseStatusChartProps {
  data: any[];
}

const STATUS_COLORS: Record<string, string> = {
  'en_evaluacion': 'hsl(var(--warning))',
  'intervenido': 'hsl(var(--primary))',
  'completado': 'hsl(220, 70%, 50%)',
  'sin_optimizacion': 'hsl(var(--muted))'
};

const STATUS_LABELS: Record<string, string> = {
  'en_evaluacion': 'En Evaluación',
  'intervenido': 'Intervenido',
  'completado': 'Completado',
  'sin_optimizacion': 'Sin Optimización'
};

export const CaseStatusChart = ({ data }: CaseStatusChartProps) => {
  const formattedData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    status: item.status
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Casos por Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
