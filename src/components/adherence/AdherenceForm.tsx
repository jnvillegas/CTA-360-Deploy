import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { TreatmentAdherence, AdherenceFormData } from "@/hooks/useAdherence";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  payer_type: z.string().min(1, "Ingrese el tipo de cobertura"),
  payer_file_number: z.string().min(1, "Ingrese el número de afiliado"),
  medication_name: z.string().min(1, "Ingrese el nombre del medicamento"),
  daily_dose: z.coerce.number().positive("La dosis debe ser mayor a 0"),
  dose_unit: z.string().min(1, "Ingrese la unidad"),
  cycles_per_month: z.coerce.number().positive("Los ciclos deben ser mayor a 0"),
  units_per_box: z.coerce.number().positive("Las unidades por caja deben ser mayor a 0"),
  managed_quantity: z.coerce.number().positive("La cantidad gestionada debe ser mayor a 0"),
  treatment_type: z.enum(['prolonged', 'finish']),
  authorization_profile: z.enum(['fast', 'medium', 'slow']),
  authorization_days: z.coerce.number().min(0, "Los días deben ser 0 o mayor"),
  start_date: z.string().min(1, "Seleccione fecha de inicio"),
  checkup_margin_days: z.coerce.number().min(0, "El margen debe ser 0 o mayor"),
  prescription_id: z.string().optional().nullable(),
  notes: z.string().optional(),
});

interface AdherenceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AdherenceFormData) => void;
  editingRecord?: TreatmentAdherence | null;
  isLoading?: boolean;
  defaultPatientId?: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  insurance_provider: string | null;
  insurance_number: string | null;
}

const PAYER_OPTIONS = [
  'OSDE',
  'Swiss Medical',
  'Galeno',
  'Medicus',
  'PAMI',
  'IOMA',
  'Obra Social Provincial',
  'Ministerio de Salud',
  'Particular',
  'Otro',
];

const AUTHORIZATION_PROFILES = [
  { value: 'fast', label: 'Rápida (5-7 días) - Prepagas', days: 7 },
  { value: 'medium', label: 'Media (15-20 días) - Obras Sociales', days: 15 },
  { value: 'slow', label: 'Lenta (30-45 días) - Ministerio/Público', days: 30 },
];

export function AdherenceForm({
  open,
  onOpenChange,
  onSubmit,
  editingRecord,
  isLoading,
  defaultPatientId
}: AdherenceFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: defaultPatientId || "",
      payer_type: "",
      payer_file_number: "",
      medication_name: "",
      daily_dose: 1,
      dose_unit: "mg",
      cycles_per_month: 30,
      units_per_box: 30,
      managed_quantity: 30,
      treatment_type: "prolonged",
      authorization_profile: "medium",
      authorization_days: 15,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      checkup_margin_days: 7,
      prescription_id: null,
      notes: "",
    },
  });

  // Load patients
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, document_number, insurance_provider, insurance_number')
        .order('last_name');

      if (!error && data) {
        setPatients(data);
      }
      setLoadingPatients(false);
    };

    if (open) {
      loadPatients();
    }
  }, [open]);

  // Reset form when editing record changes
  useEffect(() => {
    if (editingRecord) {
      form.reset({
        patient_id: editingRecord.patient_id,
        payer_type: editingRecord.payer_type,
        payer_file_number: editingRecord.payer_file_number,
        medication_name: editingRecord.medication_name,
        daily_dose: editingRecord.daily_dose,
        dose_unit: editingRecord.dose_unit,
        cycles_per_month: editingRecord.cycles_per_month,
        units_per_box: editingRecord.units_per_box,
        managed_quantity: editingRecord.managed_quantity,
        treatment_type: editingRecord.treatment_type,
        authorization_profile: editingRecord.authorization_profile,
        authorization_days: editingRecord.authorization_days,
        start_date: editingRecord.start_date,
        checkup_margin_days: editingRecord.checkup_margin_days,
        prescription_id: editingRecord.prescription_id || null,
        notes: editingRecord.notes || "",
      });
    } else {
      form.reset({
        patient_id: defaultPatientId || "",
        payer_type: "",
        payer_file_number: "",
        medication_name: "",
        daily_dose: 1,
        dose_unit: "mg",
        cycles_per_month: 30,
        units_per_box: 30,
        managed_quantity: 30,
        treatment_type: "prolonged",
        authorization_profile: "medium",
        authorization_days: 15,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        checkup_margin_days: 7,
        notes: "",
      });
    }
  }, [editingRecord, defaultPatientId, form]);

  // Auto-fill payer info when patient is selected
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      if (patient.insurance_provider) {
        form.setValue('payer_type', patient.insurance_provider);
      }
      if (patient.insurance_number) {
        form.setValue('payer_file_number', patient.insurance_number);
      }
    }
  };

  // Auto-update authorization days when profile changes
  const handleProfileChange = (profile: string) => {
    const profileConfig = AUTHORIZATION_PROFILES.find(p => p.value === profile);
    if (profileConfig) {
      form.setValue('authorization_days', profileConfig.days);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as AdherenceFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? 'Editar Adherencia Terapéutica' : 'Nueva Adherencia Terapéutica'}
          </DialogTitle>
          <DialogDescription>
            Configure el programa de adherencia para el paciente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePatientChange(value);
                    }}
                    value={field.value}
                    disabled={!!defaultPatientId || loadingPatients}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingPatients ? "Cargando pacientes..." : "Seleccione paciente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.last_name}, {patient.first_name} - DNI: {patient.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coverage Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Obra Social / Cobertura</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione cobertura" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYER_OPTIONS.map((payer) => (
                          <SelectItem key={payer} value={payer}>
                            {payer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payer_file_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Afiliado / Expediente</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Medication Info */}
            <FormField
              control={form.control}
              name="medication_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Medicamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Metformina 850mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="daily_dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosis diaria</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.1" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dose_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="comprimidos">comprimidos</SelectItem>
                        <SelectItem value="ampollas">ampollas</SelectItem>
                        <SelectItem value="gotas">gotas</SelectItem>
                        <SelectItem value="unidades">unidades</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cycles_per_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclos/mes</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Aplicaciones al mes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="units_per_box"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidades/caja</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="managed_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad gestionada/disponible</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>Total de unidades disponibles actualmente</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Treatment Type & Authorization */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="treatment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de tratamiento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prolonged">Prolongado (crónico)</SelectItem>
                        <SelectItem value="finish">Finalizable (agudo)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authorization_profile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil de autorización</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleProfileChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUTHORIZATION_PROFILES.map((profile) => (
                          <SelectItem key={profile.value} value={profile.value}>
                            {profile.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="authorization_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días autorización</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Días para tramitar</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkup_margin_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margen consulta</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Días antes para cita</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRecord ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
