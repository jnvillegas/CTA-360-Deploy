import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface MedicalRecord {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
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
    chief_complaint: "",
    present_illness: "",
    physical_exam: "",
    diagnosis: "",
    treatment_plan: "",
    prescriptions: "",
    lab_orders: "",
    follow_up: "",
  });

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

      const { error } = await supabase.from("medical_records").insert({
        ...formData,
        doctor_id: user.id,
      });

      if (error) throw error;

      toast.success("Historia clínica creada exitosamente");
      setDialogOpen(false);
      setFormData({
        patient_id: "",
        visit_date: new Date().toISOString().split('T')[0],
        chief_complaint: "",
        present_illness: "",
        physical_exam: "",
        diagnosis: "",
        treatment_plan: "",
        prescriptions: "",
        lab_orders: "",
        follow_up: "",
      });
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || "Error al crear historia clínica");
    } finally {
      setLoading(false);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Historia Clínica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Historia Clínica</DialogTitle>
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
                  <Label>Motivo de Consulta</Label>
                  <Textarea
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    placeholder="Motivo principal de la consulta..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enfermedad Actual</Label>
                  <Textarea
                    value={formData.present_illness}
                    onChange={(e) => setFormData({ ...formData, present_illness: e.target.value })}
                    placeholder="Descripción detallada de la enfermedad actual..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Examen Físico</Label>
                  <Textarea
                    value={formData.physical_exam}
                    onChange={(e) => setFormData({ ...formData, physical_exam: e.target.value })}
                    placeholder="Hallazgos del examen físico..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico</Label>
                  <Textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="Diagnóstico médico..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan de Tratamiento</Label>
                  <Textarea
                    value={formData.treatment_plan}
                    onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                    placeholder="Tratamiento recomendado..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recetas/Prescripciones</Label>
                  <Textarea
                    value={formData.prescriptions}
                    onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
                    placeholder="Medicación prescrita..."
                  />
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
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(record.visit_date).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    {record.chief_complaint && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Motivo de Consulta:</p>
                        <p className="text-sm mt-1">{record.chief_complaint}</p>
                      </div>
                    )}
                    {record.diagnosis && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Diagnóstico:</p>
                        <p className="text-sm mt-1">{record.diagnosis}</p>
                      </div>
                    )}
                    {record.treatment_plan && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan de Tratamiento:</p>
                        <p className="text-sm mt-1">{record.treatment_plan}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
