import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  appointment_type: string;
  reason: string | null;
  patients: {
    first_name: string;
    last_name: string;
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

export default function Appointments() {
  const { canCreateAppointment } = usePermissions();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    appointment_date: "",
    appointment_time: "",
    appointment_type: "Consulta General",
    reason: "",
    notes: "",
  });

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients(first_name, last_name)
        `)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      
      // Get doctor names separately
      const appointmentsWithDoctors = await Promise.all(
        (data || []).map(async (apt) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", apt.doctor_id)
            .single();
          return { ...apt, profiles: profile || { full_name: "Desconocido" } };
        })
      );
      
      setAppointments(appointmentsWithDoctors);
    } catch (error: any) {
      toast.error("Error al cargar turnos");
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

      const { error } = await supabase.from("appointments").insert({
        ...formData,
        doctor_id: user.id,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Turno creado exitosamente");
      setDialogOpen(false);
      setFormData({
        patient_id: "",
        appointment_date: "",
        appointment_time: "",
        appointment_type: "Consulta General",
        reason: "",
        notes: "",
      });
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Error al crear turno");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast.success("Estado actualizado");
      loadAppointments();
    } catch (error: any) {
      toast.error("Error al actualizar estado");
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      no_show: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: "Programado",
      confirmed: "Confirmado",
      completed: "Completado",
      cancelled: "Cancelado",
      no_show: "No asistió",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Agenda Médica
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los turnos y citas médicas
            </p>
          </div>
          {canCreateAppointment && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Turno
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Agendar Nuevo Turno</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Consulta</Label>
                  <Select
                    value={formData.appointment_type}
                    onValueChange={(val) => setFormData({ ...formData, appointment_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta General">Consulta General</SelectItem>
                      <SelectItem value="Control">Control</SelectItem>
                      <SelectItem value="Urgencia">Urgencia</SelectItem>
                      <SelectItem value="Especialidad">Especialidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Motivo de Consulta</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Breve descripción del motivo..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Agendar Turno
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando agenda...</div>
        ) : appointments.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay turnos agendados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="shadow-card hover:shadow-medium transition-all">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {appointment.patients.first_name} {appointment.patients.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Dr/a. {appointment.profiles.full_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(appointment.appointment_date).toLocaleDateString('es-AR')}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {appointment.appointment_time}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                          {appointment.appointment_type}
                        </span>
                      </div>
                      {appointment.reason && (
                        <p className="text-sm text-muted-foreground italic">"{appointment.reason}"</p>
                      )}
                    </div>
                    <div className="flex md:flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(appointment.id, "completed")}
                        disabled={appointment.status === "completed"}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(appointment.id, "cancelled")}
                        disabled={appointment.status === "cancelled"}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelar
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
