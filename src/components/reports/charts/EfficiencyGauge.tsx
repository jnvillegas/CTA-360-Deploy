import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

interface EfficiencyGaugeProps {
  percentage: number | null;
  title?: string;
  size?: number;
}

export function EfficiencyGauge({ 
  percentage = 0, 
  title = "Eficiencia de Ahorro",
  size = 200 
}: EfficiencyGaugeProps) {
  const value = percentage ?? 0;
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const getColor = (pct: number): string => {
    if (pct > 60) return "#22c55e";
    if (pct > 30) return "#eab308";
    return "#ef4444";
  };

  const getLabel = (pct: number): { text: string; color: string } => {
    if (pct > 60) return { text: "Alta Eficiencia", color: "text-green-600" };
    if (pct > 30) return { text: "Media Eficiencia", color: "text-yellow-600" };
    if (pct > 0) return { text: "Baja Eficiencia", color: "text-orange-600" };
    return { text: "Sin Ahorro", color: "text-red-600" };
  };

  const color = getColor(clampedValue);
  const labelInfo = getLabel(clampedValue);

  const data = [
    { value: clampedValue, color: color },
    { value: 100 - clampedValue, color: "#e5e7eb" }
  ];

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative" style={{ width: size, height: size / 2 + 40, margin: "0 auto" }}>
          <ResponsiveContainer width="100%" height={size / 2 + 20}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={size / 3}
                outerRadius={size / 2.2}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label
                  value={`${clampedValue.toFixed(1)}%`}
                  position="center"
                  fill={color}
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    textAnchor: "middle",
                    dominantBaseline: "middle"
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        
        <div className="text-center mt-2">
          <span className={`text-sm font-medium ${labelInfo.color}`}>
            {labelInfo.text}
          </span>
        </div>

        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>&gt;60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>30-60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>&lt;30%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
