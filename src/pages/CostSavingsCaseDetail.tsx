import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Calendar, DollarSign, TrendingDown, User, Activity, FileText, AlertTriangle, Scale } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { CaseTimeline, TimelineEvent } from "@/components/cost-savings/CaseTimeline";
import { DocumentUploader } from "@/components/cost-savings/DocumentUploader";
import { DocumentList } from "@/components/cost-savings/DocumentList";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { EfficiencyGauge } from "@/components/reports/charts/EfficiencyGauge";
import { 
  CaseStatus, 
  STATUS_LABELS, 
  STATUS_COLORS, 
  getAvailableTransitions, 
  validateTransition,
  TRANSITION_LABELS
} from "@/lib/status-transitions";

interface CostSavingsCase {
  id: string;
  patient_id: string;
  diagnosis: string;
  initial_medication: any;
  current_medication: any;
  initial_monthly_cost: number;
  current_monthly_cost: number | null;
  projected_period_months: number;
  current_projected_period_months: number | null;
  intervention_type: string;
  intervention_description: string | null;
  intervention_cost: number;
  intervention_date: string | null;
  status: CaseStatus;
  monthly_savings: number | null;
  projected_savings: number | null;
  savings_percentage: number | null;
  initial_projected_cost: number | null;
  current_projected_cost: number | null;
  observations: string | null;
  porcentaje_honorarios: number;
  honorarios_calculados: number;
  currency_type: 'ARS' | 'USD';
  exchange_rate: number;
  projected_savings_ars: number | null;
  honorarios_calculados_ars: number | null;
  justification_for_increase?: string | null;
  created_at: string;
  updated_at: string;
  patients?: {
    first_name: string;
    last_name: string;
    document_number: string;
    insurance_provider: string | null;
    is_judicial_case: boolean | null;
    judicial_file_number: string | null;
    judicial_court: string | null;
    judicial_lawyer_name: string | null;
  };
  profiles?: {
    full_name: string;
  };
}

const statusColors = {
  en_evaluacion: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  intervenido: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  completado: "bg-green-500/10 text-green-600 border-green-500/20",
  sin_optimizacion: "bg-gray-500/10 text-gray-600 border-gray-500/20"
};

export default function CostSavingsCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CostSavingsCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<CaseStatus | "">("");
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justification, setJustification] = useState("");
  const [pendingStatus, setPendingStatus] = useState<CaseStatus | null>(null);
  const [isEditingResults, setIsEditingResults] = useState(false);
  const [editedResults, setEditedResults] = useState({
    current_monthly_cost: 0,
    current_medication: [] as any[],
  });
  const { isMedico, isMedicoEvaluador, isAdmin } = useUserRole();
  const permissions = usePermissions();

  useEffect(() => {
    if (id) {
      loadCaseData();
      loadTimelineEvents();
    }
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, [id]);

  const loadCaseData = async () => {
    try {
      const { data, error } = await supabase
        .from("cost_savings_cases")
        .select(`
          *,
          patients (first_name, last_name, document_number, insurance_provider, is_judicial_case, judicial_file_number, judicial_court, judicial_lawyer_name),
          profiles:evaluating_doctor_id (full_name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setCaseData(data);
    } catch (error: any) {
      toast.error("Error al cargar el caso");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = () => {
    return caseData?.currency_type === 'USD' ? 'US$' : '$';
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `${getCurrencySymbol()}${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyARS = (value: number | null) => {
    if (value === null) return "-";
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('es-AR');
  };

  const loadTimelineEvents = async () => {
    if (!id) return;
    
    setLoadingTimeline(true);
    try {
      const { data, error } = await supabase
        .from("cost_savings_timeline")
        .select(`
          id,
          event_type,
          event_date,
          user_id,
          description,
          metadata,
          profiles:user_id (full_name)
        `)
        .eq("case_id", id)
        .order("event_date", { ascending: false });

      if (error) throw error;

      const mappedEvents: TimelineEvent[] = (data || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        date: event.event_date,
        userId: event.user_id,
        userName: event.profiles?.full_name || "Sistema",
        title: getEventTitle(event.event_type),
        description: event.description,
        status: event.metadata?.new_status,
      }));

      setTimelineEvents(mappedEvents);
    } catch (error: any) {
      console.error("Error loading timeline:", error);
      toast.error("Error al cargar el historial");
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getEventTitle = (eventType: string): string => {
    const titles: Record<string, string> = {
      created: "Caso Creado",
      status_change: "Cambio de Estado",
      intervention: "Intervención Registrada",
      note: "Nota Agregada",
      completed: "Caso Completado",
    };
    return titles[eventType] || eventType;
  };

  const handleStatusChange = async () => {
    if (!caseData || !newStatus || !id) return;

    const targetStatus = newStatus as CaseStatus;
    
    const validation = validateTransition(caseData.status, targetStatus, {
      current_monthly_cost: caseData.current_monthly_cost,
      initial_monthly_cost: caseData.initial_monthly_cost,
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    if (validation.warning) {
      if (!confirm(validation.warning + "¿Desea continuar?")) {
        return;
      }
      setPendingStatus(targetStatus);
      setShowJustificationDialog(true);
      return;
    }

    await updateCaseStatus(targetStatus);
  };

  const updateCaseStatus = async (status: CaseStatus, justificationText?: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("cost_savings_cases")
        .update({ 
          status,
          justification_for_increase: justificationText || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Estado actualizado a "${STATUS_LABELS[status]}"`);
      setCaseData(prev => prev ? { ...prev, status, justification_for_increase: justificationText || null } : null);
      setNewStatus("");
      setJustification("");
      setShowJustificationDialog(false);
      setPendingStatus(null);
      loadTimelineEvents();
    } catch (error: any) {
      toast.error("Error al actualizar el estado");
      console.error(error);
    }
  };

  const handleConfirmWithJustification = () => {
    if (!justification.trim()) {
      toast.error("Debe ingresar una justificación");
      return;
    }
    if (pendingStatus) {
      updateCaseStatus(pendingStatus, justification);
    }
  };

  const startEditingResults = () => {
    if (!caseData) return;
    setEditedResults({
      current_monthly_cost: caseData.current_monthly_cost || 0,
      current_medication: caseData.current_medication || [],
    });
    setIsEditingResults(true);
  };

  const calculateAutoStatus = (currentCost: number, initialCost: number): CaseStatus => {
    if (currentCost <= 0) return 'en_evaluacion';
    if (currentCost < initialCost) return 'completado';
    if (currentCost >= initialCost) return 'intervenido';
    return 'intervenido';
  };

  const handleSaveResults = async () => {
    if (!id || !caseData) return;

    try {
      const newStatus = calculateAutoStatus(
        editedResults.current_monthly_cost,
        caseData.initial_monthly_cost
      );

      const { error } = await supabase
        .from("cost_savings_cases")
        .update({
          current_monthly_cost: editedResults.current_monthly_cost,
          current_medication: editedResults.current_medication,
          status: newStatus,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Resultados actualizados. Estado cambiado automáticamente.");
      setIsEditingResults(false);
      loadCaseData();
      loadTimelineEvents();
    } catch (error: any) {
      toast.error("Error al guardar los resultados");
      console.error(error);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("cost_savings_timeline")
        .insert({
          case_id: id,
          event_type: "note",
          user_id: user.id,
          description: note,
        });

      if (error) throw error;

      toast.success("Nota agregada exitosamente");
      loadTimelineEvents();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Error al agregar la nota");
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground">Caso no encontrado</div>
        <Button onClick={() => navigate("/cost-savings")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  // Prepare chart data
  const costEvolutionData = [
    {
      phase: "Inicial",
      costoMensual: caseData.initial_monthly_cost,
      costoProyectado: caseData.initial_projected_cost || 0
    },
    ...(caseData.current_monthly_cost ? [{
      phase: "Actual",
      costoMensual: caseData.current_monthly_cost,
      costoProyectado: caseData.current_projected_cost || 0
    }] : [])
  ];

  const savingsData = caseData.monthly_savings ? [
    {
      concepto: "Ahorro Mensual",
      monto: caseData.monthly_savings
    },
    {
      concepto: "Ahorro Proyectado",
      monto: caseData.projected_savings || 0
    },
    {
      concepto: "Costo Intervención",
      monto: -(caseData.intervention_cost || 0)
    }
  ] : [];


  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/cost-savings")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Detalle del Caso
              </h1>
              <p className="text-muted-foreground mt-1">
                Caso #{caseData.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {caseData.currency_type === 'USD' && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                USD (cotización: {caseData.exchange_rate})
              </Badge>
            )}
            {caseData.status !== 'completado' && (isMedicoEvaluador || isAdmin) ? (
              <div className="flex items-center gap-2">
                <Select 
                  value={newStatus} 
                  onValueChange={(value) => {
                    if (value) setNewStatus(value as CaseStatus);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Cambiar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTransitions(caseData.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {TRANSITION_LABELS[`${caseData.status}->${status}`] || STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newStatus && (
                  <Button size="sm" onClick={handleStatusChange}>
                    Confirmar
                  </Button>
                )}
              </div>
            ) : (
              <Badge className={STATUS_COLORS[caseData.status]}>
                {STATUS_LABELS[caseData.status]}
              </Badge>
            )}
          </div>
        </div>

        {/* Justification Dialog */}
        {showJustificationDialog && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Justificación requerida</AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <p>El costo actual es mayor o igual al inicial. Por favor, ingrese una justificación:</p>
              <textarea
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
                placeholder="Explique por qué el costo aumentó..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirmWithJustification}>
                  Confirmar con justificación
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowJustificationDialog(false);
                  setJustification("");
                  setPendingStatus(null);
                  setNewStatus("");
                }}>
                  Cancelar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Paciente
              {caseData.patients?.is_judicial_case && (
                <Badge variant="destructive" className="flex items-center gap-1 ml-2">
                  <Scale className="w-3 h-3" />
                  Caso Judicializado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.patients?.is_judicial_case && (
              <Alert variant="destructive" className="border-l-4 border-red-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Paciente con Caso Judicial</AlertTitle>
                <AlertDescription className="mt-2 space-y-1">
                  <div><strong>Expediente:</strong> {caseData.patients.judicial_file_number || "N/A"}</div>
                  {caseData.patients.judicial_court && (
                    <div><strong>Juzgado:</strong> {caseData.patients.judicial_court}</div>
                  )}
                  {caseData.patients.judicial_lawyer_name && (
                    <div><strong>Abogado:</strong> {caseData.patients.judicial_lawyer_name}</div>
                  )}
                  <div className="mt-2 text-xs">Este caso requiere especial atención debido al amparo judicial del paciente.</div>
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Paciente</div>
                <div className="font-medium">
                  {caseData.patients?.first_name} {caseData.patients?.last_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Documento</div>
                <div className="font-medium">{caseData.patients?.document_number}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Obra Social</div>
                <div className="font-medium">{caseData.patients?.insurance_provider || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ahorro Mensual</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(caseData.monthly_savings)}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ahorro Proyectado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(caseData.projected_savings)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">% de Ahorro</p>
                  <p className="text-2xl font-bold">
                    {caseData.savings_percentage?.toFixed(1)}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Costo Intervención</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(caseData.intervention_cost)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Honorarios ({caseData.porcentaje_honorarios}%)</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(caseData.honorarios_calculados)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {caseData.currency_type === 'USD' && caseData.exchange_rate > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Ahorro Proyectado (ARS)</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrencyARS(caseData.projected_savings_ars)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Honorarios (ARS)</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrencyARS(caseData.honorarios_calculados_ars)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo Inicial Total (ARS)</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrencyARS(caseData.initial_projected_cost ? caseData.initial_projected_cost * caseData.exchange_rate : null)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo Final Total (ARS)</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrencyARS(caseData.current_projected_cost ? caseData.current_projected_cost * caseData.exchange_rate : null)}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Efficiency Gauge */}
          <EfficiencyGauge 
            percentage={caseData.savings_percentage} 
            title="Eficiencia del Caso"
          />

          {/* Cost Evolution Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Evolución de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="costoMensual" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Costo Mensual"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="costoProyectado" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="Costo Proyectado"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Savings Breakdown */}
        {savingsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Ahorros</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="concepto" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar 
                    dataKey="monto" 
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <CaseTimeline
          events={timelineEvents}
          onAddNote={(isMedico || isMedicoEvaluador || isAdmin) ? handleAddNote : undefined}
          isLoading={loadingTimeline}
        />

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Adjuntos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(permissions.canCreateCase || isAdmin) && id && (
              <DocumentUploader
                caseId={id}
                onUploadComplete={() => {
                  // Trigger reload of document list
                  const event = new CustomEvent("documentsUpdated");
                  window.dispatchEvent(event);
                }}
              />
            )}
            {id && (
              <DocumentList
                caseId={id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            )}
          </CardContent>
        </Card>

        {/* Medications Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Medicación Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(caseData.initial_medication) && caseData.initial_medication.map((med: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">{med.medication}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Costo Mensual</span>
                  <span className="font-semibold">{formatCurrency(caseData.initial_monthly_cost)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">Periodo Proyectado</span>
                  <span className="font-semibold">{caseData.projected_period_months} meses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isEditingResults ? (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-yellow-600">Editar Resultados de Intervención</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nuevo Costo Mensual</label>
                  <Input
                    type="number"
                    value={editedResults.current_monthly_cost}
                    onChange={(e) => setEditedResults(prev => ({ ...prev, current_monthly_cost: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveResults}>
                    Guardar Cambios
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingResults(false)}>
                    Cancelar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Al guardar, el estado cambiará automáticamente según el resultado:
                  <br />• Si nuevo costo &lt; costo inicial → Completado
                  <br />• Si nuevo costo ≥ costo inicial → Intervenido
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medicación Actual</CardTitle>
                {caseData.status !== 'completado' && (isMedicoEvaluador || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={startEditingResults}>
                    Editar Resultados
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {caseData.current_medication ? (
                  <>
                    <div className="space-y-2">
                      {Array.isArray(caseData.current_medication) && caseData.current_medication.map((med: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-500/5 border border-green-500/20 rounded">
                          <div className="w-2 h-2 rounded-full bg-green-600" />
                          <span className="text-sm">{med.medication}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Costo Mensual</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(caseData.current_monthly_cost)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-muted-foreground">Periodo Proyectado</span>
                        <span className="font-semibold">
                          {caseData.current_projected_period_months} meses
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hay resultados de intervención registrados.</p>
                    {(isMedicoEvaluador || isAdmin) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={startEditingResults}
                      >
                        Registrar Resultados
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Diagnóstico</div>
              <p>{caseData.diagnosis}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Tipo de Intervención</div>
              <p>{caseData.intervention_type}</p>
            </div>
            {caseData.intervention_description && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Descripción de Intervención</div>
                <p>{caseData.intervention_description}</p>
              </div>
            )}
            {caseData.profiles && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Médico Evaluador</div>
                <p>{caseData.profiles.full_name}</p>
              </div>
            )}
            {caseData.observations && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Observaciones</div>
                <p>{caseData.observations}</p>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
    );
  }
