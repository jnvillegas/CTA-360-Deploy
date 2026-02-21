import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export type UserRole = 'paciente' | 'medico' | 'medico_evaluador' | 'gestor' | 'administrador';

interface UserRoleData {
  role: UserRole | null;
  status: 'active' | 'inactive' | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMedico: boolean;
  isMedicoEvaluador: boolean;
  isGestor: boolean;
  isPaciente: boolean;
  isActive: boolean;
}

export const useUserRole = (): UserRoleData => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { data, isLoading: isRoleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const role = data?.role as UserRole | null;
  const status = data?.status as 'active' | 'inactive' | null;
  const combinedLoading = authLoading || isRoleLoading;

  return {
    role,
    status,
    isLoading: combinedLoading,
    isAdmin: role === 'administrador',
    isMedico: role === 'medico',
    isMedicoEvaluador: role === 'medico_evaluador',
    isGestor: role === 'gestor',
    isPaciente: role === 'paciente',
    isActive: status === 'active',
  };
};
