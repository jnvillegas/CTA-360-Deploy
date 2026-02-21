import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle, AlertTriangle, XCircle, Package } from "lucide-react";

interface AdherenceStatsProps {
  stats: {
    total: number;
    sufficient: number;
    warning: number;
    critical: number;
    depleted: number;
  };
}

export function AdherenceStats({ stats }: AdherenceStatsProps) {
  const statCards = [
    {
      label: 'Total registros',
      value: stats.total,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Stock suficiente',
      value: stats.sufficient,
      icon: CheckCircle,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      label: 'Stock bajo',
      value: stats.warning,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Stock crítico',
      value: stats.critical,
      icon: Activity,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Sin stock',
      value: stats.depleted,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
