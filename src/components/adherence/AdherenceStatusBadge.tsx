import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdherenceStatusBadgeProps {
  status: 'sufficient' | 'warning' | 'critical' | 'depleted';
  daysRemaining?: number | null;
  className?: string;
}

export function AdherenceStatusBadge({ status, daysRemaining, className }: AdherenceStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'sufficient':
        return {
          label: 'Stock suficiente',
          variant: 'default' as const,
          className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        };
      case 'warning':
        return {
          label: daysRemaining !== null ? `${daysRemaining} días restantes` : 'Stock bajo',
          variant: 'outline' as const,
          className: 'border-warning text-warning bg-warning/10 hover:bg-warning/20',
        };
      case 'critical':
        return {
          label: daysRemaining !== null ? `${daysRemaining} días restantes` : 'Stock crítico',
          variant: 'destructive' as const,
          className: 'bg-destructive text-destructive-foreground',
        };
      case 'depleted':
        return {
          label: 'Sin stock',
          variant: 'destructive' as const,
          className: 'bg-destructive/80 text-destructive-foreground animate-pulse',
        };
      default:
        return {
          label: 'Desconocido',
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
