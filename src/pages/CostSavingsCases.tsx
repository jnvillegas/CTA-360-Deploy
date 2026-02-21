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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Casos de Ahorro de Costos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de optimización de costos médicos
          </p>
        </div>
        {canCreateCase && (
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Caso
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Casos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por diagnóstico, intervención o paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Filtrar por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                <SelectItem value="intervenido">Intervenido</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="sin_optimizacion">Sin Optimización</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
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
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map((caseItem) => {
            const savingsLevel = getSavingsLevel(caseItem.savings_percentage);
            const savingsStyle = savingsColors[savingsLevel];
            
            return (
            <Card 
              key={caseItem.id} 
              className={`shadow-card hover:shadow-medium transition-all border-l-4 ${savingsStyle.border}`}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header with Traffic Light */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold truncate">
                          {caseItem.patients ? 
                            `${caseItem.patients.first_name} ${caseItem.patients.last_name}` : 
                            'Paciente no encontrado'
                          }
                        </h3>
                        {caseItem.patients?.is_judicial_case && (
                          <Badge variant="destructive" className="flex items-center gap-1 ml-1">
                            <Scale className="w-3 h-3" />
                            Judicial
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {caseItem.diagnosis}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusColors[caseItem.status]}>
                        {statusLabels[caseItem.status]}
                      </Badge>
                      {/* Traffic Light Indicator */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${savingsStyle.badge}`}>
                        <div className={`w-2 h-2 rounded-full ${savingsStyle.bg}`} />
                        <span className="text-xs font-medium">{savingsStyle.label}</span>
                        {caseItem.savings_percentage !== null && (
                          <span className="text-xs">({caseItem.savings_percentage.toFixed(0)}%)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Intervention Type */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{caseItem.intervention_type}</span>
                    {caseItem.intervention_date && (
                      <span className="text-muted-foreground">
                        - {new Date(caseItem.intervention_date).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>

                  {/* Costs */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Costo Inicial</p>
                      <p className="font-semibold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(caseItem.initial_monthly_cost)}/mes
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Costo Actual</p>
                      <p className={`font-semibold flex items-center gap-1 ${caseItem.current_monthly_cost && caseItem.current_monthly_cost < caseItem.initial_monthly_cost ? savingsStyle.text : ''}`}>
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(caseItem.current_monthly_cost)}/mes
                      </p>
                    </div>
                  </div>

                  {/* Savings */}
                  {caseItem.monthly_savings !== null && (
                    <div className={`pt-4 border-t -mx-6 -mb-6 p-4 rounded-b-lg ${savingsLevel === 'high' ? 'bg-green-500/5' : savingsLevel === 'medium' ? 'bg-yellow-500/5' : 'bg-red-500/5'}`}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ahorro Mensual</p>
                          <p className={`font-bold flex items-center gap-1 ${savingsStyle.text}`}>
                            <TrendingDown className="w-4 h-4" />
                            {formatCurrency(caseItem.monthly_savings)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ahorro Proyectado</p>
                          <p className={`font-bold ${savingsStyle.text}`}>
                            {formatCurrency(caseItem.projected_savings)}
                            {caseItem.savings_percentage !== null && (
                              <span className="text-sm ml-1">
                                ({caseItem.savings_percentage.toFixed(1)}%)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/cost-savings/${caseItem.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>
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
