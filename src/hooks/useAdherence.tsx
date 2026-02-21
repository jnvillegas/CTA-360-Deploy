import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TreatmentAdherence {
  id: string;
  patient_id: string;
  prescription_id: string | null;
  payer_type: string;
  payer_file_number: string;
  medication_name: string;
  daily_dose: number;
  dose_unit: string;
  cycles_per_month: number;
  units_per_box: number;
  managed_quantity: number;
  treatment_type: 'prolonged' | 'finish';
  authorization_profile: 'fast' | 'medium' | 'slow';
  authorization_days: number;
  start_date: string;
  estimated_depletion_date: string | null;
  next_checkup_date: string | null;
  next_authorization_start_date: string | null;
  checkup_margin_days: number;
  status: 'sufficient' | 'warning' | 'critical' | 'depleted';
  days_remaining: number | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export interface AdherenceFormData {
  patient_id: string;
  prescription_id?: string | null;
  payer_type: string;
  payer_file_number: string;
  medication_name: string;
  daily_dose: number;
  dose_unit: string;
  cycles_per_month: number;
  units_per_box: number;
  managed_quantity: number;
  treatment_type: 'prolonged' | 'finish';
  authorization_profile: 'fast' | 'medium' | 'slow';
  authorization_days: number;
  start_date: string;
  checkup_margin_days: number;
  notes?: string | null;
}

export const useAdherence = (patientId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adherenceRecords = [], isLoading } = useQuery({
    queryKey: ['treatment_adherence', patientId],
    queryFn: async () => {
      let query = supabase
        .from('treatment_adherence')
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            document_number
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TreatmentAdherence[];
    },
  });

  const createAdherence = useMutation({
    mutationFn: async (data: AdherenceFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('treatment_adherence')
        .insert({
          ...data,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_adherence'] });
      toast({
        title: "Adherencia creada",
        description: "El registro de adherencia se creó correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el registro de adherencia",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const updateAdherence = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdherenceFormData> }) => {
      const { data: result, error } = await supabase
        .from('treatment_adherence')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_adherence'] });
      toast({
        title: "Adherencia actualizada",
        description: "El registro de adherencia se actualizó correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro de adherencia",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const deleteAdherence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('treatment_adherence')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment_adherence'] });
      toast({
        title: "Registro eliminado",
        description: "El registro de adherencia fue desactivado",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Get summary stats
  const stats = {
    total: adherenceRecords.length,
    sufficient: adherenceRecords.filter(r => r.status === 'sufficient').length,
    warning: adherenceRecords.filter(r => r.status === 'warning').length,
    critical: adherenceRecords.filter(r => r.status === 'critical').length,
    depleted: adherenceRecords.filter(r => r.status === 'depleted').length,
  };

  return {
    adherenceRecords,
    isLoading,
    stats,
    createAdherence: createAdherence.mutate,
    updateAdherence: updateAdherence.mutate,
    deleteAdherence: deleteAdherence.mutate,
    isCreating: createAdherence.isPending,
    isUpdating: updateAdherence.isPending,
    isDeleting: deleteAdherence.isPending,
  };
};
