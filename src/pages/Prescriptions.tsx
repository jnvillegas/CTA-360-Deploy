import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, FileText, Send, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";

interface Prescription {
  id: string;
  patient_id: string;
  diagnosis: string | null;
  medications: any;
  instructions: string | null;
  valid_until: string;
  status: string;
  created_at: string;
  patients: {
    first_name: string;
    last_name: string;
    document_number: string;
    email: string | null;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  email: string | null;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function Prescriptions() {
  const { canCreatePrescription } = usePermissions();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patient_id: "",
    diagnosis: "",
    instructions: "",
    valid_until: "",
  });
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);

  useEffect(() => {
    loadPrescriptions();
    loadPatients();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients (
            first_name,
            last_name,
            document_number,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast.error("Error al cargar recetas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, document_number, email")
        .order("first_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updatedMedications = [...medications];
    updatedMedications[index][field] = value;
    setMedications(updatedMedications);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Validar que al menos un medicamento esté completo
      const validMedications = medications.filter(m => m.name && m.dosage);
      if (validMedications.length === 0) {
        throw new Error("Debe agregar al menos un medicamento");
      }

      const { error } = await supabase.from("prescriptions").insert([{
        patient_id: formData.patient_id,
        doctor_id: user.id,
        diagnosis: formData.diagnosis,
        medications: validMedications as any,
        instructions: formData.instructions,
        valid_until: formData.valid_until,
        status: "active",
      }]);

      if (error) throw error;

      toast.success("Receta creada exitosamente");
      setDialogOpen(false);
      resetForm();
      loadPrescriptions();
    } catch (error: any) {
      toast.error(error.message || "Error al crear receta");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      diagnosis: "",
      instructions: "",
      valid_until: "",
    });
    setMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleSendEmail = async (prescription: Prescription) => {
    if (!prescription.patients.email) {
      toast.error("El paciente no tiene email registrado");
      return;
    }

    setSendingEmail(prescription.id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-prescription-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prescriptionId: prescription.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Error al enviar email");

      toast.success(`Receta enviada a ${prescription.patients.email}`);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email");
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-secondary text-secondary-foreground">Activa</Badge>;
      case "expired":
        return <Badge variant="secondary">Vencida</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.patients.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patients.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patients.document_number.includes(searchTerm) ||
      p.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Recetas Electrónicas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las recetas médicas de tus pacientes
            </p>
          </div>
          {canCreatePrescription && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Receta
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Receta Electrónica</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="patient_id">Paciente *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un paciente" />
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

                <div>
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <Input
                    id="diagnosis"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="Ej: Hipertensión arterial"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Medicamentos *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar medicamento
                    </Button>
                  </div>
                  {medications.map((med, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`med-name-${index}`}>Medicamento</Label>
                          <Input
                            id={`med-name-${index}`}
                            value={med.name}
                            onChange={(e) => handleMedicationChange(index, "name", e.target.value)}
                            placeholder="Nombre del medicamento"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`med-dosage-${index}`}>Dosis</Label>
                          <Input
                            id={`med-dosage-${index}`}
                            value={med.dosage}
                            onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                            placeholder="Ej: 500mg"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`med-frequency-${index}`}>Frecuencia</Label>
                          <Input
                            id={`med-frequency-${index}`}
                            value={med.frequency}
                            onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                            placeholder="Ej: Cada 8 horas"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`med-duration-${index}`}>Duración</Label>
                          <Input
                            id={`med-duration-${index}`}
                            value={med.duration}
                            onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                            placeholder="Ej: 7 días"
                          />
                        </div>
                      </div>
                      {medications.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMedication(index)}
                          className="mt-2 text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>

                <div>
                  <Label htmlFor="instructions">Instrucciones adicionales</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Indicaciones especiales para el paciente"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="valid_until">Válida hasta *</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creando..." : "Crear Receta"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, DNI o diagnóstico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Cargando recetas...</p>
            ) : filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay recetas registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Medicamentos</TableHead>
                      <TableHead>Válida hasta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell className="font-medium">
                          {prescription.patients.first_name} {prescription.patients.last_name}
                        </TableCell>
                        <TableCell>{prescription.patients.document_number}</TableCell>
                        <TableCell>{prescription.diagnosis || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {Array.isArray(prescription.medications) &&
                              prescription.medications.slice(0, 2).map((med: any, idx: number) => (
                                <div key={idx} className="text-muted-foreground">
                                  {med.name} - {med.dosage}
                                </div>
                              ))}
                            {Array.isArray(prescription.medications) &&
                              prescription.medications.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{prescription.medications.length - 2} más
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(prescription.valid_until).toLocaleDateString("es-ES")}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(prescription)}
                            disabled={
                              !prescription.patients.email || sendingEmail === prescription.id
                            }
                          >
                            <Send className="w-4 h-4 mr-1" />
                            {sendingEmail === prescription.id ? "Enviando..." : "Enviar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
    );
  }
