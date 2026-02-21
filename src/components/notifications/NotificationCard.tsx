import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Calendar, Pill, FileText, AlertCircle, Trash2, CheckCircle, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'appointment_reminder':
      return Calendar;
    case 'prescription_expiring':
      return Pill;
    case 'case_assigned':
    case 'case_status_changed':
      return FileText;
    case 'system_alert':
      return AlertCircle;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getNotificationRoute = (notification: Notification) => {
  if (!notification.related_table || !notification.related_id) return null;

  switch (notification.related_table) {
    case 'appointments':
      return `/appointments`;
    case 'prescriptions':
      return `/prescriptions`;
    case 'cost_savings_cases':
      return `/cost-savings-cases/${notification.related_id}`;
    default:
      return null;
  }
};

export const NotificationCard = ({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationCardProps) => {
  const navigate = useNavigate();
  const Icon = getNotificationIcon(notification.type);
  const route = getNotificationRoute(notification);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (route) {
      navigate(route);
    }
  };

  return (
    <Card
      className={`p-4 transition-all ${
        !notification.is_read ? 'bg-accent/50 border-primary/20' : 'bg-card'
      } ${route ? 'cursor-pointer hover:shadow-md' : ''} ${compact ? 'p-3' : ''}`}
      onClick={route ? handleClick : undefined}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${notification.priority === 'urgent' || notification.priority === 'high' ? 'text-destructive' : 'text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </h4>
            {!compact && (
              <Badge variant={getPriorityColor(notification.priority)} className="flex-shrink-0">
                {notification.priority}
              </Badge>
            )}
          </div>

          <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} line-clamp-2`}>
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>

            {!compact && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  title={notification.is_read ? "Marcar como no leída" : "Marcar como leída"}
                >
                  {notification.is_read ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
