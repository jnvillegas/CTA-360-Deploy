import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, TrendingDown, DollarSign, Calendar, User, Eye, Scale } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { CostSavingsWizard } from "@/components/cost-savings/wizard/CostSavingsWizard";

interface CostSavingsCase {
  id: string;
  patient_id: string;
  diagnosis: string;
  initial_monthly_cost: number;
  current_monthly_cost: number | null;
  intervention_type: string;
  intervention_date: string | null;
  status: 'en_evaluacion' | 'intervenido' | 'completado' | 'sin_optimizacion';
  monthly_savings: number | null;
  projected_savings: number | null;
  savings_percentage: number | null;
  created_at: string;
  patients?: {
    first_name: string;
    last_name: string;
    is_judicial_case: boolean | null;
    judicial_file_number: string | null;
  };
}

const statusLabels = {
  en_evaluacion: "En Evaluación",
  intervenido: "Intervenido",
  completado: "Completado",
  sin_optimizacion: "Sin Optimización"
};

const statusColors = {
  en_evaluacion: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  intervenido: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  completado: "bg-green-500/10 text-green-600 border-green-500/20",
  sin_optimizacion: "bg-gray-500/10 text-gray-600 border-gray-500/20"
};

type SavingsLevel = 'high' | 'medium' | 'none';

const getSavingsLevel = (percentage: number | null): SavingsLevel => {
  if (percentage === null || percentage <= 0) return 'none';
  if (percentage > 30) return 'high';
  return 'medium';
};

const savingsColors = {
  high: {
    bg: "bg-green-500",
    text: "text-green-600",
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Alto"
  },
  medium: {
    bg: "bg-yellow-500",
    text: "text-yellow-600",
    border: "border-l-yellow-500",
    badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    label: "Medio"
  },
  none: {
    bg: "bg-red-500",
    text: "text-red-600",
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    label: "Sin ahorro"
  }
};

export default function CostSavingsCases() {
  const { canCreateCase } = usePermissions();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CostSavingsCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: casesResult, error } = await supabase
        .from("cost_savings_cases")
        .select(`
          *,
          patients (first_name, last_name, is_judicial_case, judicial_file_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(casesResult || []);
    } catch (error: any) {
      toast.error("Error al cargar datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.intervention_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.patients && `${c.patients.first_name} ${c.patients.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Casos de Ahorro de Costos
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitoreo y optimización financiera de consumos médicos
          </p>
        </div>
        {canCreateCase && (
          <Button
            onClick={() => setWizardOpen(true)}
            className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">Nuevo Caso</span>
          </Button>
        )}
      </div>

      {/* Wizard Dialog */}
      <CostSavingsWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={loadData}
      />

      {/* Filters */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="uupm-card p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <Search className="w-4 h-4" /> Buscar Intervenciones
            </h3>
            <Input
              placeholder="Paciente, diagnóstico o tipo de intervención..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all mt-2"
            />
          </div>
        </Card>

        <Card className="uupm-card p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Estado de Gestión
            </h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                <SelectItem value="intervenido">Intervenido</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="sin_optimizacion">Sin Optimización</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando casos...</div>
      ) : filteredCases.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="text-center py-12">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay casos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCases.map((caseItem) => {
            const savingsLevel = getSavingsLevel(caseItem.savings_percentage);
            const savingsStyle = savingsColors[savingsLevel];

            return (
              <Card
                key={caseItem.id}
                className={`uupm-card overflow-hidden group hover:scale-[1.01] transition-all border-l-[6px] ${savingsStyle.border}`}
              >
                <CardContent className="p-0">
                  <div className="p-6 space-y-5">
                    {/* Header with Traffic Light */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <User className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {caseItem.patients ?
                              `${caseItem.patients.first_name} ${caseItem.patients.last_name}` :
                              'Paciente no encontrado'
                            }
                          </h3>
                          {caseItem.patients?.is_judicial_case && (
                            <Badge className="bg-red-50 text-red-600 border-red-100 uppercase text-[9px] font-black tracking-widest px-1.5 h-5">
                              Judicial
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
                          {caseItem.diagnosis}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Badge className={`${statusColors[caseItem.status]} rounded-md font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border`}>
                          {statusLabels[caseItem.status]}
                        </Badge>
                        {/* Traffic Light Indicator */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${savingsStyle.badge} border`}>
                          <div className={`w-2 h-2 rounded-full ${savingsStyle.bg} animate-pulse`} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{savingsStyle.label}</span>
                          {caseItem.savings_percentage !== null && (
                            <span className="text-xs font-bold font-mono">({caseItem.savings_percentage.toFixed(0)}%)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Intervention Type */}
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground bg-muted/30 w-fit px-3 py-1.5 rounded-lg border border-border/40">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground/80">{caseItem.intervention_type}</span>
                      {caseItem.intervention_date && (
                        <span className="font-medium opacity-60">
                          {new Date(caseItem.intervention_date).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>

                    {/* Costs */}
                    <div className="grid grid-cols-2 gap-4 pb-1">
                      <div className="bg-muted/20 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Costo Inicial</p>
                        <p className="font-bold text-lg flex items-center gap-1 text-foreground">
                          {formatCurrency(caseItem.initial_monthly_cost)}
                          <span className="text-[10px] opacity-40 font-normal ml-0.5">/mes</span>
                        </p>
                      </div>
                      <div className="bg-muted/20 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Costo Actual</p>
                        <p className={`font-bold text-lg flex items-center gap-1 ${caseItem.current_monthly_cost && caseItem.current_monthly_cost < caseItem.initial_monthly_cost ? savingsStyle.text : 'text-foreground'}`}>
                          {formatCurrency(caseItem.current_monthly_cost)}
                          <span className="text-[10px] opacity-40 font-normal ml-0.5">/mes</span>
                        </p>
                      </div>
                    </div>

                    {/* Savings */}
                    {caseItem.monthly_savings !== null && (
                      <div className={`p-5 rounded-2xl border-2 border-dashed ${savingsLevel === 'high' ? 'bg-green-50/30 border-green-200' : savingsLevel === 'medium' ? 'bg-yellow-50/30 border-yellow-200' : 'bg-red-50/30 border-red-200'}`}>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Ahorro Mensual</p>
                            <p className={`text-2xl font-black flex items-center gap-2 ${savingsStyle.text}`}>
                              <TrendingDown className="w-6 h-6" />
                              {formatCurrency(caseItem.monthly_savings)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Proyección</p>
                            <p className={`text-2xl font-black ${savingsStyle.text}`}>
                              {formatCurrency(caseItem.projected_savings)}
                            </p>
                            {caseItem.savings_percentage !== null && (
                              <Badge className={`${savingsStyle.badge} border-none font-black text-[10px] h-5 mt-1`}>
                                {caseItem.savings_percentage.toFixed(1)}% OPTIMIZADO
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <Button
                      variant="link"
                      className="w-full text-primary font-bold hover:no-underline group/btn"
                      onClick={() => navigate(`/cost-savings/${caseItem.id}`)}
                    >
                      VER FICHA TÉCNICA DETALLADA
                      <Eye className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
