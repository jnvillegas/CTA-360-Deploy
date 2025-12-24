import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TreatmentTypeBadgeProps {
  type: 'prolonged' | 'finish';
  className?: string;
}

export function TreatmentTypeBadge({ type, className }: TreatmentTypeBadgeProps) {
  const config = type === 'prolonged'
    ? {
        label: 'Prolongado',
        className: 'bg-primary/10 text-primary border-primary/30',
      }
    : {
        label: 'Finalizable',
        className: 'bg-muted text-muted-foreground border-muted-foreground/30',
      };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
