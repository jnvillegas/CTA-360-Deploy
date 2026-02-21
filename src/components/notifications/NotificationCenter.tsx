import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationCard } from "./NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          {/* This will be rendered by NotificationBell */}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notificaciones</h3>
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-2">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay notificaciones</p>
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  compact
                />
              ))
            )}
          </div>
        </ScrollArea>

        {notifications.length > 10 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/notifications')}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
