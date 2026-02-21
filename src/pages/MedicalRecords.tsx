import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, User, Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  diagnosis: string | null;
  monthly_quantity: number | null;
  monthly_cost: number | null;
  initial_projected_period: number | null;
  initial_cost: number | null;
  patients: {
    first_name: string;
    last_name: string;
    document_number: string;
  };
  profiles: {
    full_name: string;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
}

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    visit_date: new Date().toISOString().split('T')[0],
    diagnosis: "",
    monthly_quantity: "",
    monthly_cost: "",
    initial_projected_period: "",
    initial_cost: "",
    lab_orders: "",
    follow_up: "",
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedication, setNewMedication] = useState<Medication>({ name: "", dose: "", frequency: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const addMedication = () => {
    if (!newMedication.name.trim()) {
      toast.error("Ingrese el nombre del medicamento");
      return;
    }
    setMedications([...medications, newMedication]);
    setNewMedication({ name: "", dose: "", frequency: "" });
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  useEffect(() => {
    loadRecords();
    loadPatients();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          patients(first_name, last_name, document_number)
        `)
        .order("visit_date", { ascending: false });

      if (error) throw error;

      // Get doctor names separately
      const recordsWithDoctors = await Promise.all(
        (data || []).map(async (rec) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", rec.doctor_id)
            .single();
          return { ...rec, profiles: profile || { full_name: "Desconocido" } };
        })
      );

      setRecords(recordsWithDoctors);
    } catch (error: any) {
      toast.error("Error al cargar historias clínicas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, document_number")
        .order("first_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const recordData = {
        patient_id: formData.patient_id,
        visit_date: formData.visit_date,
        diagnosis: formData.diagnosis || null,
        monthly_quantity: formData.monthly_quantity ? parseFloat(formData.monthly_quantity) : null,
        monthly_cost: formData.monthly_cost ? parseFloat(formData.monthly_cost) : null,
        initial_projected_period: formData.initial_projected_period ? parseInt(formData.initial_projected_period) : null,
        initial_cost: formData.initial_cost ? parseFloat(formData.initial_cost) : null,
        lab_orders: formData.lab_orders || null,
        follow_up: formData.follow_up || null,
        doctor_id: user.id,
        attachments: medications.length > 0 ? { medications: medications as unknown as Json[] } as Json : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("medical_records")
          .update(recordData)
          .eq("id", editingId);
        if (error) throw error;

        // Sync with cost_savings_cases if it exists
        const { error: syncError } = await supabase
          .from("cost_savings_cases")
          .update({
            diagnosis: recordData.diagnosis,
            initial_medication: recordData.attachments ? (recordData.attachments as any).medications : null,
            initial_monthly_cost: recordData.monthly_cost,
            projected_period_months: recordData.initial_projected_period,
          })
          .eq("medical_record_id", editingId);

        if (syncError) {
          console.error("Error syncing with cost_savings_cases:", syncError);
          toast.warning("Historia actualizada, pero hubo un error sincronizando con el caso de ahorro.");
        } else {
          toast.success("Historia clínica y caso de ahorro actualizados exitosamente");
        }
      } else {
        const { error } = await supabase
          .from("medical_records")
          .insert([recordData]);
        if (error) throw error;
        toast.success("Historia clínica creada exitosamente");
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData({
        patient_id: "",
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: "",
        monthly_quantity: "",
        monthly_cost: "",
        initial_projected_period: "",
        initial_cost: "",
        lab_orders: "",
        follow_up: "",
      });
      setMedications([]);
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || "Error al procesar historia clínica");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({
      patient_id: record.patient_id,
      visit_date: record.visit_date,
      diagnosis: record.diagnosis || "",
      monthly_quantity: record.monthly_quantity?.toString() || "",
      monthly_cost: record.monthly_cost?.toString() || "",
      initial_projected_period: record.initial_projected_period?.toString() || "",
      initial_cost: record.initial_cost?.toString() || "",
      lab_orders: record.lab_orders || "",
      follow_up: record.follow_up || "",
    });
    const meds = (record.attachments as any)?.medications || [];
    setMedications(meds);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta historia clínica? Esta acción no se puede deshacer.")) return;

    try {
      const { error } = await supabase.from("medical_records").delete().eq("id", id);
      if (error) throw error;
      toast.success("Historia clínica eliminada");
      loadRecords();
    } catch (error: any) {
      toast.error("Error al eliminar la historia clínica");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Historias Clínicas
          </h1>
          <p className="text-muted-foreground mt-1">
            Registros médicos de los pacientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setFormData({
              patient_id: "",
              visit_date: new Date().toISOString().split('T')[0],
              diagnosis: "",
              monthly_quantity: "",
              monthly_cost: "",
              initial_projected_period: "",
              initial_cost: "",
              lab_orders: "",
              follow_up: "",
            });
            setMedications([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingId(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Historia Clínica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Crear"} Historia Clínica</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Paciente</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(val) => setFormData({ ...formData, patient_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name} - {patient.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Consulta</Label>
                  <Input
                    type="date"
                    value={formData.visit_date}
                    onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Diagnóstico</Label>
                <Textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Diagnóstico médico..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad Mensual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_quantity}
                    onChange={(e) => setFormData({ ...formData, monthly_quantity: e.target.value })}
                    placeholder="Ej: 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Mensual ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_cost}
                    onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
                    placeholder="Ej: 15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período Inicial Proyectado (meses)</Label>
                  <Input
                    type="number"
                    value={formData.initial_projected_period}
                    onChange={(e) => setFormData({ ...formData, initial_projected_period: e.target.value })}
                    placeholder="Ej: 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Inicial ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.initial_cost}
                    onChange={(e) => setFormData({ ...formData, initial_cost: e.target.value })}
                    placeholder="Ej: 180000"
                  />
                </div>
              </div>

              {/* Medications Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary" />
                    <Label className="text-base font-semibold">Medicamentos Actuales</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addMedication}
                    className="text-primary hover:text-primary/80"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir Medicamento
                  </Button>
                </div>

                {/* Add new medication form */}
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Nombre del medicamento"
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  />
                  <Input
                    placeholder="Dosis (ej: 2.5 mg)"
                    value={newMedication.dose}
                    onChange={(e) => setNewMedication({ ...newMedication, dose: e.target.value })}
                  />
                  <Input
                    placeholder="Frecuencia (ej: 1 tableta diaria)"
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                  />
                </div>

                {/* List of medications */}
                {medications.length > 0 && (
                  <div className="space-y-2">
                    {medications.map((med, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Pill className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {med.dose}{med.dose && med.frequency && " - "}{med.frequency}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMedication(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  Guardar Historia Clínica
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando historias clínicas...</div>
      ) : records.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay historias clínicas registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id} className="shadow-card hover:shadow-medium transition-all">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {record.patients.first_name} {record.patients.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Documento: {record.patients.document_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr/a. {record.profiles.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(record.visit_date).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)} className="text-destructive">
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                  {record.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Diagnóstico:</p>
                      <p className="text-sm mt-1">{record.diagnosis}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Cantidad Mensual</p>
                      <p className="text-sm font-semibold">{record.monthly_quantity ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Costo Mensual</p>
                      <p className="text-sm font-semibold">{record.monthly_cost ? `$${record.monthly_cost.toLocaleString()}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Período Proyectado</p>
                      <p className="text-sm font-semibold">{record.initial_projected_period ? `${record.initial_projected_period} meses` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Costo Inicial</p>
                      <p className="text-sm font-semibold">{record.initial_cost ? `$${record.initial_cost.toLocaleString()}` : '-'}</p>
                    </div>
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
