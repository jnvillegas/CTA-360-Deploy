import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Pill, User, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  birth_date: string;
  gender: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  diagnosis: string | null;
  monthly_quantity: number | null;
  monthly_cost: number | null;
  initial_projected_period: number | null;
  initial_cost: number | null;
  attachments: any;
}

interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

interface Step1Data {
  patient_id: string;
  medical_record_id: string;
  diagnosis: string;
  medications: Medication[];
  monthly_cost: number;
  projected_period: number;
  initial_cost: number;
  currency_type: 'ARS' | 'USD';
  exchange_rate: number;
}

interface Step1ClinicalDataProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
}

export function Step1ClinicalData({ data, onChange }: Step1ClinicalDataProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (data.patient_id) {
      loadMedicalRecords(data.patient_id);
      const patient = patients.find(p => p.id === data.patient_id);
      setSelectedPatient(patient || null);
    }
  }, [data.patient_id, patients]);

  const loadPatients = async () => {
    try {
      const { data: patientsData, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, document_number, birth_date, gender")
        .order("last_name");

      if (error) throw error;
      setPatients(patientsData || []);
    } catch (error: any) {
      toast.error("Error al cargar pacientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalRecords = async (patientId: string) => {
    try {
      const { data: records, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      setMedicalRecords(records || []);
    } catch (error: any) {
      toast.error("Error al cargar historias clínicas");
      console.error(error);
    }
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
    setMedicalRecords([]);
    onChange({
      ...data,
      patient_id: patientId,
      medical_record_id: "",
      diagnosis: "",
      medications: [],
      monthly_cost: 0,
      projected_period: 12,
      initial_cost: 0,
    });
    loadMedicalRecords(patientId);
  };

  const handleCurrencyChange = (currency: 'ARS' | 'USD') => {
    const newExchangeRate = currency === 'USD' ? data.exchange_rate : 1;
    onChange({
      ...data,
      currency_type: currency,
      exchange_rate: newExchangeRate,
    });
  };

  const handleExchangeRateChange = (value: string) => {
    const rate = parseFloat(value) || 0;
    onChange({
      ...data,
      exchange_rate: rate,
    });
  };

  const getCurrencySymbol = () => {
    return data.currency_type === 'USD' ? 'US$' : '$';
  };

  const formatWithCurrency = (value: number) => {
    return `${getCurrencySymbol()}${value.toLocaleString('es-AR')}`;
  };

  const handleMedicalRecordChange = (recordId: string) => {
    const record = medicalRecords.find(r => r.id === recordId);
    if (record) {
      const medications = record.attachments?.medications || [];
      onChange({
        ...data,
        medical_record_id: recordId,
        diagnosis: record.diagnosis || "",
        medications: medications,
        monthly_cost: record.monthly_cost || 0,
        projected_period: record.initial_projected_period || 12,
        initial_cost: record.initial_cost || 0,
      });
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Femenino",
      other: "Otro",
    };
    return labels[gender] || gender;
  };

  return (
    <div className="space-y-6">
      {/* Patient Selection */}
      <div className="space-y-2">
        <Label>Seleccionar Paciente *</Label>
        <Select value={data.patient_id} onValueChange={handlePatientChange}>
          <SelectTrigger>
            <SelectValue placeholder="Buscar paciente..." />
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

      {/* Patient Info Display */}
      {selectedPatient && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nombre del Paciente</p>
              <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Edad</p>
            <p className="font-medium">{calculateAge(selectedPatient.birth_date)} años</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Género</p>
            <p className="font-medium">{getGenderLabel(selectedPatient.gender)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Tipo de Moneda
          </Label>
          <Select value={data.currency_type} onValueChange={handleCurrencyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
              <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.currency_type === 'USD' && (
          <div className="space-y-2">
            <Label>Cotización del Dólar (ARS)</Label>
            <Input
              type="number"
              value={data.exchange_rate || ''}
              onChange={(e) => handleExchangeRateChange(e.target.value)}
              placeholder="Ej: 1050"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Ingrese el valor de 1 USD en ARS para conversión automática
            </p>
          </div>
        )}
      </div>

      {/* Medical Records Selection */}
      {data.patient_id && (
        <div className="space-y-2">
          <Label>Seleccionar Historia Clínica *</Label>
          <Select value={data.medical_record_id} onValueChange={handleMedicalRecordChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar historia clínica..." />
            </SelectTrigger>
            <SelectContent>
              {medicalRecords.length === 0 ? (
                <SelectItem value="none" disabled>
                  No hay historias clínicas disponibles
                </SelectItem>
              ) : (
                medicalRecords.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    {new Date(record.visit_date).toLocaleDateString('es-AR')} - {record.diagnosis || "Sin diagnóstico"}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Medical Record Data */}
      {data.medical_record_id && (
        <>
          {/* Diagnosis */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">Diagnóstico Principal</p>
            <p className="font-medium">{data.diagnosis || "Sin diagnóstico"}</p>
          </div>

          {/* Cost Information */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Costo Mensual</p>
              <p className="font-medium text-lg">
                {formatWithCurrency(data.monthly_cost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Período Proyectado</p>
              <p className="font-medium text-lg">{data.projected_period} meses</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo Inicial Total</p>
              <p className="font-medium text-lg">
                {formatWithCurrency(data.initial_cost)}
              </p>
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              <Label className="text-base font-semibold">Medicamentos Actuales</Label>
            </div>
            {data.medications.length > 0 ? (
              <div className="space-y-2">
                {data.medications.map((med, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
                  >
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
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No hay medicamentos registrados en esta historia clínica
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
