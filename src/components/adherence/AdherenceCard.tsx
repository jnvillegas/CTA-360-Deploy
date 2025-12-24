import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdherenceStatusBadge } from "./AdherenceStatusBadge";
import { TreatmentTypeBadge } from "./TreatmentTypeBadge";
import { TreatmentAdherence } from "@/hooks/useAdherence";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Pill, 
  Calendar, 
  Clock, 
  Building, 
  FileText, 
  Edit, 
  Trash2,
  AlertCircle
} from "lucide-react";

interface AdherenceCardProps {
  adherence: TreatmentAdherence;
  onEdit?: (adherence: TreatmentAdherence) => void;
  onDelete?: (id: string) => void;
  showPatientInfo?: boolean;
}

export function AdherenceCard({ adherence, onEdit, onDelete, showPatientInfo = false }: AdherenceCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'No calculado';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const getAuthorizationLabel = (profile: string) => {
    switch (profile) {
      case 'fast': return 'Rápida (Prepaga)';
      case 'medium': return 'Media (Obra Social)';
      case 'slow': return 'Lenta (Ministerio)';
      default: return profile;
    }
  };

  const shouldShowAuthAlert = adherence.next_authorization_start_date && 
    new Date(adherence.next_authorization_start_date) <= new Date();

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      adherence.status === 'critical' || adherence.status === 'depleted' 
        ? 'border-destructive/50 bg-destructive/5' 
        : adherence.status === 'warning'
        ? 'border-warning/50 bg-warning/5'
        : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {adherence.medication_name}
            </CardTitle>
            {showPatientInfo && adherence.patients && (
              <p className="text-sm text-muted-foreground">
                {adherence.patients.first_name} {adherence.patients.last_name} - 
                DNI: {adherence.patients.document_number}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TreatmentTypeBadge type={adherence.treatment_type} />
            <AdherenceStatusBadge 
              status={adherence.status} 
              daysRemaining={adherence.days_remaining} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Info */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cobertura</p>
              <p className="text-sm font-medium">{adherence.payer_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">N° Afiliado</p>
              <p className="text-sm font-medium">{adherence.payer_file_number}</p>
            </div>
          </div>
        </div>

        {/* Medication Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Dosis diaria</p>
            <p className="text-sm font-medium">{adherence.daily_dose} {adherence.dose_unit}/día</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ciclos/mes</p>
            <p className="text-sm font-medium">{adherence.cycles_per_month}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unidades/caja</p>
            <p className="text-sm font-medium">{adherence.units_per_box}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad gestionada</p>
            <p className="text-sm font-medium">{adherence.managed_quantity} unidades</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha agotamiento</p>
              <p className="text-sm font-medium">{formatDate(adherence.estimated_depletion_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Próxima consulta</p>
              <p className="text-sm font-medium">{formatDate(adherence.next_checkup_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Iniciar autorización</p>
              <p className="text-sm font-medium">{formatDate(adherence.next_authorization_start_date)}</p>
            </div>
          </div>
        </div>

        {/* Authorization Alert */}
        {shouldShowAuthAlert && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm text-warning font-medium">
              Debe iniciar la gestión de autorización ({getAuthorizationLabel(adherence.authorization_profile)} - {adherence.authorization_days} días)
            </p>
          </div>
        )}

        {/* Notes */}
        {adherence.notes && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Notas:</span> {adherence.notes}
          </div>
        )}

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(adherence)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(adherence.id)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
