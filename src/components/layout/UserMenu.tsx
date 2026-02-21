import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";

export function UserMenu() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const getRoleName = () => {
    switch (role) {
      case 'administrador': return 'Administrador';
      case 'medico': return 'Médico';
      case 'medico_evaluador': return 'Médico Evaluador';
      case 'gestor': return 'Gestor';
      case 'paciente': return 'Paciente';
      default: return 'Usuario';
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sesión cerrada exitosamente");
      navigate("/auth");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium">{user?.user_metadata?.full_name || "Usuario"}</p>
          <p className="text-xs text-muted-foreground">{getRoleName()}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.user_metadata?.full_name || "Usuario"}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="text-xs">{getRoleName()}</Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
