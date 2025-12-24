import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type TimelineEventType = 
  | "created" 
  | "status_change" 
  | "intervention" 
  | "note" 
  | "completed";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  userId?: string;
  userName?: string;
  title: string;
  description?: string;
  status?: string;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
  onAddNote?: (note: string) => Promise<void>;
  isLoading?: boolean;
}

const eventConfig = {
  created: {
    icon: PlayCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  status_change: {
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  intervention: {
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  note: {
    icon: FileText,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
};

const statusLabels: Record<string, string> = {
  en_evaluacion: "En Evaluación",
  intervenido: "Intervenido",
  completado: "Completado",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  en_evaluacion: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  intervenido: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  completado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelado: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function CaseTimeline({ events, onAddNote, isLoading = false }: CaseTimelineProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!newNote.trim() || !onAddNote) return;
    
    setIsSaving(true);
    try {
      await onAddNote(newNote);
      setNewNote("");
      setIsAddingNote(false);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Línea de Tiempo</h3>
        {onAddNote && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNote(!isAddingNote)}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nota
          </Button>
        )}
      </div>

      {isAddingNote && onAddNote && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/30">
          <label className="text-sm font-medium mb-2 block">Nueva Nota</label>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escribe una observación o nota sobre este caso..."
            className="mb-3"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={!newNote.trim() || isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar Nota"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingNote(false);
                setNewNote("");
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline events */}
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay eventos registrados
            </div>
          ) : (
            events.map((event, index) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} ${config.borderColor} border-2`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-semibold text-foreground">{event.title}</h4>
                        {event.status && (
                          <Badge 
                            variant="secondary"
                            className={statusColors[event.status] || ""}
                          >
                            {statusLabels[event.status] || event.status}
                          </Badge>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {event.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        {event.userName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{event.userName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
