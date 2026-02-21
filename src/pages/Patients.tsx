import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, User, Pencil, Trash2, Scale } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Patient {
  id: string;
  document_number: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  insurance_plan: string | null;
  insurance_status: string | null;
  insurance_authorization_required: boolean | null;
  copayment_percentage: number | null;
  is_judicial_case: boolean | null;
  judicial_file_number: string | null;
  judicial_court: string | null;
  judicial_lawyer_name: string | null;
  judicial_lawyer_contact: string | null;
  judicial_status: string | null;
  judicial_notes: string | null;
}

export default function Patients() {
  const { canCreatePatient, canUpdatePatient, canDeletePatient } = usePermissions();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [showJudicialOnly, setShowJudicialOnly] = useState(false);
  const [judicialSectionOpen, setJudicialSectionOpen] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "DNI",
    document_number: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "Masculino",
    email: "",
    phone: "",
    mobile_phone: "",
    insurance_provider: "",
    insurance_number: "",
    insurance_plan: "",
    insurance_status: "activo",
    insurance_authorization_required: false,
    copayment_percentage: "",
    is_judicial_case: false,
    judicial_file_number: "",
    judicial_court: "",
    judicial_lawyer_name: "",
    judicial_lawyer_contact: "",
    judicial_status: "activo",
    judicial_notes: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast.error("Error al cargar pacientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (formData.is_judicial_case && !formData.judicial_file_number) {
      toast.error("El número de expediente es requerido para casos judicializados");
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        copayment_percentage: formData.copayment_percentage ? parseFloat(formData.copayment_percentage) : null,
      };

      if (editingPatient) {
        // Update existing patient
        const { error } = await supabase
          .from("patients")
          .update(submitData)
          .eq("id", editingPatient.id);

        if (error) throw error;
        toast.success("Paciente actualizado exitosamente");
      } else {
        // Create new patient
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const { error } = await supabase.from("patients").insert({
          ...submitData,
          created_by: user.id,
        });

        if (error) throw error;
        toast.success("Paciente creado exitosamente");
      }

      setDialogOpen(false);
      setEditingPatient(null);
      resetForm();
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar paciente");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      document_type: "DNI",
      document_number: patient.document_number,
      first_name: patient.first_name,
      last_name: patient.last_name,
      birth_date: patient.birth_date,
      gender: patient.gender,
      email: patient.email || "",
      phone: patient.phone || "",
      mobile_phone: patient.mobile_phone || "",
      insurance_provider: patient.insurance_provider || "",
      insurance_number: patient.insurance_number || "",
      insurance_plan: patient.insurance_plan || "",
      insurance_status: patient.insurance_status || "activo",
      insurance_authorization_required: patient.insurance_authorization_required || false,
      copayment_percentage: patient.copayment_percentage?.toString() || "",
      is_judicial_case: patient.is_judicial_case || false,
      judicial_file_number: patient.judicial_file_number || "",
      judicial_court: patient.judicial_court || "",
      judicial_lawyer_name: patient.judicial_lawyer_name || "",
      judicial_lawyer_contact: patient.judicial_lawyer_contact || "",
      judicial_status: patient.judicial_status || "activo",
      judicial_notes: patient.judicial_notes || "",
    });
    setJudicialSectionOpen(patient.is_judicial_case || false);
    setDialogOpen(true);
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientToDelete.id);

      if (error) throw error;

      toast.success("Paciente eliminado exitosamente");
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar paciente");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      document_type: "DNI",
      document_number: "",
      first_name: "",
      last_name: "",
      birth_date: "",
      gender: "Masculino",
      email: "",
      phone: "",
      mobile_phone: "",
      insurance_provider: "",
      insurance_number: "",
      insurance_plan: "",
      insurance_status: "activo",
      insurance_authorization_required: false,
      copayment_percentage: "",
      is_judicial_case: false,
      judicial_file_number: "",
      judicial_court: "",
      judicial_lawyer_name: "",
      judicial_lawyer_contact: "",
      judicial_status: "activo",
      judicial_notes: "",
    });
    setJudicialSectionOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingPatient(null);
      resetForm();
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.document_number.includes(searchTerm);
    
    const matchesJudicialFilter = !showJudicialOnly || p.is_judicial_case;
    
    return matchesSearch && matchesJudicialFilter;
  });

  const getInsuranceStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      activo: "default",
      suspendido: "secondary",
      baja: "destructive",
      pendiente: "outline",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gestión de Pacientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra la información de tus pacientes
            </p>
          </div>
          {canCreatePatient && (
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? "Editar Paciente" : "Registrar Nuevo Paciente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={formData.document_type}
                      onValueChange={(val) => setFormData({ ...formData, document_type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="CI">CI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Documento</Label>
                    <Input
                      value={formData.document_number}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(val) => setFormData({ ...formData, gender: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Celular</Label>
                    <Input
                      value={formData.mobile_phone}
                      onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-4">Información de Cobertura</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Obra Social</Label>
                      <Input
                        value={formData.insurance_provider}
                        onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                        placeholder="Ej: OSDE, Swiss Medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número de Afiliado</Label>
                      <Input
                        value={formData.insurance_number}
                        onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Plan de Cobertura</Label>
                      <Input
                        value={formData.insurance_plan}
                        onChange={(e) => setFormData({ ...formData, insurance_plan: e.target.value })}
                        placeholder="Plan 210, Plan Ejecutivo, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado de Afiliación</Label>
                      <Select
                        value={formData.insurance_status}
                        onValueChange={(val) => setFormData({ ...formData, insurance_status: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="suspendido">Suspendido</SelectItem>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auth-required"
                        checked={formData.insurance_authorization_required}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, insurance_authorization_required: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="auth-required"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Requiere Autorización Previa
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label>Porcentaje de Copago (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.copayment_percentage}
                        onChange={(e) => setFormData({ ...formData, copayment_percentage: e.target.value })}
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Collapsible open={judicialSectionOpen} onOpenChange={setJudicialSectionOpen}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="judicial-case"
                          checked={formData.is_judicial_case}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, is_judicial_case: checked as boolean });
                            setJudicialSectionOpen(checked as boolean);
                          }}
                        />
                        <label
                          htmlFor="judicial-case"
                          className="text-lg font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Caso Judicializado
                        </label>
                      </div>
                      {formData.is_judicial_case && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {judicialSectionOpen ? "Ocultar" : "Mostrar"} detalles
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {formData.is_judicial_case && (
                      <CollapsibleContent className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Número de Expediente *</Label>
                            <Input
                              value={formData.judicial_file_number}
                              onChange={(e) => setFormData({ ...formData, judicial_file_number: e.target.value })}
                              placeholder="12345/2024"
                              required={formData.is_judicial_case}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Juzgado/Tribunal</Label>
                            <Input
                              value={formData.judicial_court}
                              onChange={(e) => setFormData({ ...formData, judicial_court: e.target.value })}
                              placeholder="Juzgado Civil N°5"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre del Abogado</Label>
                            <Input
                              value={formData.judicial_lawyer_name}
                              onChange={(e) => setFormData({ ...formData, judicial_lawyer_name: e.target.value })}
                              placeholder="Dr. Juan Pérez"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contacto del Abogado</Label>
                            <Input
                              value={formData.judicial_lawyer_contact}
                              onChange={(e) => setFormData({ ...formData, judicial_lawyer_contact: e.target.value })}
                              placeholder="abogado@ejemplo.com o teléfono"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Estado Judicial</Label>
                          <Select
                            value={formData.judicial_status}
                            onValueChange={(val) => setFormData({ ...formData, judicial_status: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="en_proceso">En Proceso</SelectItem>
                              <SelectItem value="finalizado">Finalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Notas Judiciales</Label>
                          <Textarea
                            value={formData.judicial_notes}
                            onChange={(e) => setFormData({ ...formData, judicial_notes: e.target.value })}
                            placeholder="Ej: Amparo judicial por medicación de alto costo"
                            maxLength={1000}
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground">
                            {formData.judicial_notes.length}/1000 caracteres
                          </p>
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingPatient ? "Actualizar Paciente" : "Guardar Paciente"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por nombre, apellido o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="judicial-filter"
                checked={showJudicialOnly}
                onCheckedChange={(checked) => setShowJudicialOnly(checked as boolean)}
              />
              <label
                htmlFor="judicial-filter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mostrar solo casos judicializados
              </label>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando pacientes...</div>
        ) : filteredPatients.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay pacientes registrados</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cobertura</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex items-center gap-2">
                              {patient.first_name} {patient.last_name}
                              {patient.is_judicial_case && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Scale className="w-4 h-4 text-red-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Caso judicializado</p>
                                      {patient.judicial_file_number && (
                                        <p className="text-xs">Expediente: {patient.judicial_file_number}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{patient.document_number}</TableCell>
                        <TableCell>
                          {patient.insurance_status ? (
                            getInsuranceStatusBadge(patient.insurance_status)
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{patient.email || "-"}</TableCell>
                        <TableCell>{patient.mobile_phone || patient.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canUpdatePatient && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(patient)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeletePatient && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(patient)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al paciente{" "}
              <strong>{patientToDelete?.first_name} {patientToDelete?.last_name}</strong>. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
