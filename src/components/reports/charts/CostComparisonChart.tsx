import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

interface CostComparisonChartProps {
  data: any[];
}

export const CostComparisonChart = ({ data }: CostComparisonChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formattedData = data.map(item => ({
    ...item,
    monthLabel: format(new Date(item.month + '-01'), 'MMM yyyy')
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación: Costos Iniciales vs Optimizados</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData}>
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
            <Bar 
              dataKey="initialCost" 
              fill="hsl(var(--destructive))" 
              name="Costo Inicial"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="currentCost" 
              fill="hsl(var(--primary))" 
              name="Costo Optimizado"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
