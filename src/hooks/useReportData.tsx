import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  specialty?: string;
  doctorId?: string;
  status?: string;
}

export const useReportData = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['report-data', filters],
    queryFn: async () => {
      let query = supabase
        .from('cost_savings_cases')
        .select(`
          *,
          patient:patients(first_name, last_name),
          evaluating_doctor:profiles!cost_savings_cases_evaluating_doctor_id_fkey(full_name, specialty)
        `);

      // Apply filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters.doctorId) {
        query = query.eq('evaluating_doctor_id', filters.doctorId);
      }

      const { data: cases, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const totalCases = cases?.length || 0;
      const totalSavings = cases?.reduce((sum, c) => sum + (c.projected_savings || 0), 0) || 0;
      const avgSavingsPercentage = cases?.length 
        ? cases.reduce((sum, c) => sum + (c.savings_percentage || 0), 0) / cases.length 
        : 0;
      
      const totalInitialCost = cases?.reduce((sum, c) => sum + (c.initial_projected_cost || 0), 0) || 0;
      const totalInterventionCost = cases?.reduce((sum, c) => sum + (c.intervention_cost || 0), 0) || 0;
      const roi = totalInterventionCost > 0 ? ((totalSavings - totalInterventionCost) / totalInterventionCost) * 100 : 0;

      // Group by month for evolution chart
      const monthlyData = cases?.reduce((acc: any[], c) => {
        const month = format(parseISO(c.created_at), 'yyyy-MM');
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.savings += c.projected_savings || 0;
          existing.cases += 1;
        } else {
          acc.push({
            month,
            savings: c.projected_savings || 0,
            cases: 1
          });
        }
        return acc;
      }, []).sort((a, b) => a.month.localeCompare(b.month)) || [];

      // Group by status
      const statusData = cases?.reduce((acc: any[], c) => {
        const existing = acc.find(item => item.status === c.status);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({
            status: c.status,
            count: 1
          });
        }
        return acc;
      }, []) || [];

      // Top medications (from initial_medication)
      const medicationData = cases?.reduce((acc: any[], c) => {
        const medications = Array.isArray(c.initial_medication) 
          ? c.initial_medication 
          : typeof c.initial_medication === 'object' && c.initial_medication !== null
            ? Object.values(c.initial_medication)
            : [];
        
        medications.forEach((med: any) => {
          const name = med?.name || med?.medication || 'Sin nombre';
          const existing = acc.find(item => item.name === name);
          if (existing) {
            existing.cases += 1;
            existing.savings += c.projected_savings || 0;
          } else {
            acc.push({
              name,
              cases: 1,
              savings: c.projected_savings || 0
            });
          }
        });
        return acc;
      }, []).sort((a, b) => b.savings - a.savings).slice(0, 10) || [];

      // Doctor comparison
      const doctorData = cases?.reduce((acc: any[], c) => {
        const doctorName = c.evaluating_doctor?.full_name || 'Sin asignar';
        const existing = acc.find(item => item.name === doctorName);
        if (existing) {
          existing.cases += 1;
          existing.savings += c.projected_savings || 0;
        } else {
          acc.push({
            name: doctorName,
            specialty: c.evaluating_doctor?.specialty || 'N/A',
            cases: 1,
            savings: c.projected_savings || 0
          });
        }
        return acc;
      }, []).sort((a, b) => b.savings - a.savings) || [];

      // Calculate average time to intervention
      const casesWithIntervention = cases?.filter(c => c.intervention_date && c.created_at) || [];
      const avgDaysToIntervention = casesWithIntervention.length > 0
        ? casesWithIntervention.reduce((sum, c) => {
            const created = parseISO(c.created_at);
            const intervened = parseISO(c.intervention_date!);
            const days = Math.floor((intervened.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / casesWithIntervention.length
        : 0;

      // Cost comparison by month
      const costComparisonData = cases?.reduce((acc: any[], c) => {
        const month = format(parseISO(c.created_at), 'yyyy-MM');
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.initialCost += c.initial_projected_cost || 0;
          existing.currentCost += c.current_projected_cost || 0;
        } else {
          acc.push({
            month,
            initialCost: c.initial_projected_cost || 0,
            currentCost: c.current_projected_cost || 0
          });
        }
        return acc;
      }, []).sort((a, b) => a.month.localeCompare(b.month)) || [];

      return {
        kpis: {
          totalCases,
          totalSavings,
          avgSavingsPercentage,
          roi
        },
        monthlyData,
        statusData,
        medicationData,
        doctorData,
        costComparisonData,
        avgDaysToIntervention,
        rawCases: cases
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
