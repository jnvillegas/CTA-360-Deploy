import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = "/unauthorized" 
}: ProtectedRouteProps) => {
  const { role, isLoading, isActive, isAdmin } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role || !isActive) {
    return <Navigate to="/auth" replace />;
  }

  // Administrador tiene acceso a todas las rutas
  if (isAdmin) {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
