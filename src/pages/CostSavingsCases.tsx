import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, TrendingDown, DollarSign, Calendar, User, Eye, Scale } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";

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

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
}

interface Doctor {
  id: string;
  full_name: string;
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

export default function CostSavingsCases() {
  const { canCreateCase } = usePermissions();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CostSavingsCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    diagnosis: "",
    initial_medication: "",
    initial_monthly_cost: "",
    projected_period_months: "",
    intervention_description: "",
    intervention_type: "",
    intervention_cost: "0",
    intervention_date: "",
    evaluating_doctor_id: "",
    observations: "",
    current_medication: "",
    current_monthly_cost: "",
    current_projected_period_months: "",
    status: "en_evaluacion" as const,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casesResult, patientsResult, doctorsResult] = await Promise.all([
        supabase
          .from("cost_savings_cases")
          .select(`
            *,
            patients (first_name, last_name, is_judicial_case, judicial_file_number)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("patients")
          .select("id, first_name, last_name, document_number")
          .order("last_name"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name")
      ]);

      if (casesResult.error) throw casesResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (doctorsResult.error) throw doctorsResult.error;

      setCases(casesResult.data || []);
      setPatients(patientsResult.data || []);
      setDoctors(doctorsResult.data || []);
    } catch (error: any) {
      toast.error("Error al cargar datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Parse medications as JSON
      const initialMedication = formData.initial_medication.split('\n').map(line => {
        const trimmed = line.trim();
        return trimmed ? { medication: trimmed } : null;
      }).filter(Boolean);

      const currentMedication = formData.current_medication ? 
        formData.current_medication.split('\n').map(line => {
          const trimmed = line.trim();
          return trimmed ? { medication: trimmed } : null;
        }).filter(Boolean) : null;

      const caseData: any = {
        patient_id: formData.patient_id,
        diagnosis: formData.diagnosis,
        initial_medication: initialMedication,
        initial_monthly_cost: parseFloat(formData.initial_monthly_cost),
        projected_period_months: parseInt(formData.projected_period_months),
        intervention_type: formData.intervention_type,
        intervention_cost: parseFloat(formData.intervention_cost),
        intervention_description: formData.intervention_description || null,
        intervention_date: formData.intervention_date || null,
        evaluating_doctor_id: formData.evaluating_doctor_id || null,
        observations: formData.observations || null,
        status: formData.status,
        created_by: user.id,
      };

      if (formData.current_medication) {
        caseData.current_medication = currentMedication;
      }
      if (formData.current_monthly_cost) {
        caseData.current_monthly_cost = parseFloat(formData.current_monthly_cost);
      }
      if (formData.current_projected_period_months) {
        caseData.current_projected_period_months = parseInt(formData.current_projected_period_months);
      }

      const { error } = await supabase.from("cost_savings_cases").insert(caseData);

      if (error) throw error;

      toast.success("Caso de ahorro creado exitosamente");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear caso");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      diagnosis: "",
      initial_medication: "",
      initial_monthly_cost: "",
      projected_period_months: "",
      intervention_description: "",
      intervention_type: "",
      intervention_cost: "0",
      intervention_date: "",
      evaluating_doctor_id: "",
      observations: "",
      current_medication: "",
      current_monthly_cost: "",
      current_projected_period_months: "",
      status: "en_evaluacion",
    });
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Caso
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Caso de Ahorro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Patient and Diagnosis */}
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(val) => setFormData({ ...formData, patient_id: val })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.last_name}, {p.first_name} - {p.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Diagnóstico *</Label>
                  <Textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    required
                  />
                </div>

                {/* Initial Assessment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Evaluación Inicial</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Medicación Inicial * (una por línea)</Label>
                      <Textarea
                        value={formData.initial_medication}
                        onChange={(e) => setFormData({ ...formData, initial_medication: e.target.value })}
                        placeholder="Ej: Atorvastatina 40mg&#10;Losartán 50mg"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Mensual Inicial (ARS) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.initial_monthly_cost}
                          onChange={(e) => setFormData({ ...formData, initial_monthly_cost: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Periodo Proyectado (meses) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.projected_period_months}
                          onChange={(e) => setFormData({ ...formData, projected_period_months: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Intervention Details */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Detalles de Intervención</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Intervención *</Label>
                        <Input
                          value={formData.intervention_type}
                          onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                          placeholder="Ej: Cambio de medicación"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Costo de Intervención (ARS)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.intervention_cost}
                          onChange={(e) => setFormData({ ...formData, intervention_cost: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción de la Intervención</Label>
                      <Textarea
                        value={formData.intervention_description}
                        onChange={(e) => setFormData({ ...formData, intervention_description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha de Intervención</Label>
                        <Input
                          type="date"
                          value={formData.intervention_date}
                          onChange={(e) => setFormData({ ...formData, intervention_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Médico Evaluador</Label>
                        <Select
                          value={formData.evaluating_doctor_id}
                          onValueChange={(val) => setFormData({ ...formData, evaluating_doctor_id: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar médico" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-Intervention */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Post-Intervención (Opcional)</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Medicación Actual (una por línea)</Label>
                      <Textarea
                        value={formData.current_medication}
                        onChange={(e) => setFormData({ ...formData, current_medication: e.target.value })}
                        placeholder="Ej: Rosuvastatina 20mg&#10;Losartán 50mg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Mensual Actual (ARS)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.current_monthly_cost}
                          onChange={(e) => setFormData({ ...formData, current_monthly_cost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Periodo Actual Proyectado (meses)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.current_projected_period_months}
                          onChange={(e) => setFormData({ ...formData, current_projected_period_months: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status and Observations */}
                <div className="border-t pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Estado *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                          <SelectItem value="intervenido">Intervenido</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="sin_optimizacion">Sin Optimización</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea
                        value={formData.observations}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Guardar Caso
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

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
            {filteredCases.map((caseItem) => (
              <Card key={caseItem.id} className="shadow-card hover:shadow-medium transition-all">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
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
                      <Badge className={statusColors[caseItem.status]}>
                        {statusLabels[caseItem.status]}
                      </Badge>
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
                        <p className="font-semibold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(caseItem.current_monthly_cost)}/mes
                        </p>
                      </div>
                    </div>

                    {/* Savings */}
                    {caseItem.monthly_savings !== null && (
                      <div className="pt-4 border-t bg-green-500/5 -mx-6 -mb-6 p-4 rounded-b-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Ahorro Mensual</p>
                            <p className="font-bold text-green-600 flex items-center gap-1">
                              <TrendingDown className="w-4 h-4" />
                              {formatCurrency(caseItem.monthly_savings)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Ahorro Proyectado</p>
                            <p className="font-bold text-green-600">
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
            ))}
          </div>
        )}
      </div>
  );
}