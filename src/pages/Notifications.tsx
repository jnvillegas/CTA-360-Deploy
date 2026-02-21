import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Loader2, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type NotificationType = Tables<"notifications">["type"];
type NotificationPriority = Tables<"notifications">["priority"];

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "read" | "unread">("all");
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | "all">("all");

  // Apply filters
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || notification.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "read" && notification.is_read) ||
      (filterStatus === "unread" && !notification.is_read);
    const matchesPriority = filterPriority === "all" || notification.priority === filterPriority;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notificaciones</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? (
                <>
                  Tienes <Badge variant="destructive">{unreadCount}</Badge> notificaciones sin leer
                </>
              ) : (
                "No tienes notificaciones sin leer"
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={() => markAllAsRead()}>
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="appointment_reminder">Recordatorios de citas</SelectItem>
                <SelectItem value="prescription_expiring">Recetas por vencer</SelectItem>
                <SelectItem value="case_assigned">Casos asignados</SelectItem>
                <SelectItem value="case_status_changed">Cambios de estado</SelectItem>
                <SelectItem value="system_alert">Alertas del sistema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">No leídas</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(value: any) => setFilterPriority(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm || filterType !== "all" || filterStatus !== "all" || filterPriority !== "all"
                  ? "No se encontraron notificaciones con los filtros seleccionados"
                  : "No tienes notificaciones"}
              </p>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>

        {/* Summary */}
        {filteredNotifications.length > 0 && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Mostrando {filteredNotifications.length} de {notifications.length} notificaciones
            </p>
          </Card>
        )}
      </div>
  );
}
