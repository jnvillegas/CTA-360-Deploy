import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StepIndicator } from "./StepIndicator";
import { Step1ClinicalData } from "./Step1ClinicalData";
import { Step2CostAnalysis } from "./Step2CostAnalysis";
import { Step3InterventionResult } from "./Step3InterventionResult";
import { ArrowRight, ArrowLeft, Check, Save } from "lucide-react";
import { toast } from "sonner";

interface CostSavingsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

interface Doctor {
  id: string;
  full_name: string;
}

const steps = [
  { number: 1, label: "Datos Clínicos" },
  { number: 2, label: "Análisis de Costos" },
  { number: 3, label: "Intervención" },
];

export function CostSavingsWizard({ open, onOpenChange, onSuccess }: CostSavingsWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Step 1 Data
  const [step1Data, setStep1Data] = useState({
    patient_id: "",
    medical_record_id: "",
    diagnosis: "",
    medications: [] as Medication[],
    monthly_cost: 0,
    projected_period: 12,
    initial_cost: 0,
    currency_type: 'ARS' as 'ARS' | 'USD',
    exchange_rate: 1,
  });

  // Step 2 Data
  const [step2Data, setStep2Data] = useState({
    intervention_type: "",
    intervention_cost: 0,
    current_monthly_cost: 0,
    current_projected_cost: 0,
    monthly_savings: 0,
    projected_savings: 0,
    savings_percentage: 0,
  });

  // Step 3 Data
  const [step3Data, setStep3Data] = useState({
    observations: "",
    evaluating_doctor_id: "",
    files: [] as UploadedFile[],
    final_projected_savings: 0,
    porcentaje_honorarios: 0,
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    // Reset form when dialog closes
    if (!open) {
      resetForm();
    }
  }, [open]);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setStep1Data({
      patient_id: "",
      medical_record_id: "",
      diagnosis: "",
      medications: [],
      monthly_cost: 0,
      projected_period: 12,
      initial_cost: 0,
      currency_type: 'ARS',
      exchange_rate: 1,
    });
    setStep2Data({
      intervention_type: "",
      intervention_cost: 0,
      current_monthly_cost: 0,
      current_projected_cost: 0,
      monthly_savings: 0,
      projected_savings: 0,
      savings_percentage: 0,
    });
    setStep3Data({
      observations: "",
      evaluating_doctor_id: "",
      files: [],
      final_projected_savings: 0,
      porcentaje_honorarios: 0,
    });
  };

  const validateStep1 = () => {
    if (!step1Data.patient_id) {
      toast.error("Seleccione un paciente");
      return false;
    }
    if (!step1Data.medical_record_id) {
      toast.error("Seleccione una historia clínica");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!step2Data.intervention_type.trim()) {
      toast.error("Ingrese el tipo de intervención");
      return false;
    }
    if (step2Data.current_monthly_cost <= 0) {
      toast.error("Ingrese el costo mensual actual");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!step3Data.observations.trim()) {
      toast.error("Ingrese la descripción de la intervención");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const uploadFiles = async (caseId: string, userId: string) => {
    for (const uploadedFile of step3Data.files) {
      const fileExt = uploadedFile.file.name.split('.').pop();
      const fileName = `${caseId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cost-savings-documents')
        .upload(fileName, uploadedFile.file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        continue;
      }

      await supabase.from('cost_savings_documents').insert({
        case_id: caseId,
        file_name: uploadedFile.file.name,
        file_path: fileName,
        file_type: uploadedFile.file.type,
        file_size: uploadedFile.file.size,
        document_type: 'intervention_evidence',
        uploaded_by: userId,
      });
    }
  };

  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validateStep3()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Prepare medications as JSON
      const initialMedication = step1Data.medications.map(med => ({
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
      }));

      // Determine automatic status based on intervention data
      let newStatus: 'en_evaluacion' | 'intervenido' | 'completado' | 'sin_optimizacion';
      
      if (asDraft) {
        newStatus = 'en_evaluacion';
      } else if (step2Data.current_monthly_cost > 0 && step2Data.current_monthly_cost < step1Data.monthly_cost) {
        // If there's a valid intervention with savings, complete the case
        newStatus = 'completado';
      } else if (step2Data.current_monthly_cost > 0 && step2Data.current_monthly_cost >= step1Data.monthly_cost) {
        // If cost increased, mark as intervened (needs evaluation)
        newStatus = 'intervenido';
      } else {
        // No intervention possible
        newStatus = 'sin_optimizacion';
      }

      const caseData: any = {
        patient_id: step1Data.patient_id,
        medical_record_id: step1Data.medical_record_id || null,
        diagnosis: step1Data.diagnosis,
        initial_medication: initialMedication,
        initial_monthly_cost: step1Data.monthly_cost,
        projected_period_months: step1Data.projected_period,
        intervention_type: step2Data.intervention_type,
        intervention_cost: step2Data.intervention_cost,
        current_monthly_cost: step2Data.current_monthly_cost || null,
        current_projected_period_months: step1Data.projected_period,
        intervention_description: step3Data.observations || null,
        evaluating_doctor_id: step3Data.evaluating_doctor_id || null,
        observations: step3Data.observations || null,
        porcentaje_honorarios: step3Data.porcentaje_honorarios || 0,
        currency_type: step1Data.currency_type,
        exchange_rate: step1Data.exchange_rate,
        status: newStatus,
        created_by: user.id,
      };

      const { data: newCase, error } = await supabase
        .from("cost_savings_cases")
        .insert([caseData])
        .select()
        .single();

      if (error) throw error;

      // Upload files if any
      if (step3Data.files.length > 0) {
        await uploadFiles(newCase.id, user.id);
      }

      const statusMessages: Record<string, string> = {
        en_evaluacion: "Borrador guardado exitosamente",
        intervenido: "Caso creado - Intervención registrada",
        completado: "Caso creado y completado exitosamente",
        sin_optimizacion: "Caso marcado como sin optimización",
      };

      toast.success(statusMessages[newStatus] || "Caso creado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al crear el caso");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === 1 ? "Agregar Nuevo Caso" : "Nueva Gestión de Caso"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete la información para iniciar la evaluación.
          </p>
        </DialogHeader>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <Step1ClinicalData data={step1Data} onChange={setStep1Data} />
          )}
          {currentStep === 2 && (
            <Step2CostAnalysis
              data={step2Data}
              onChange={setStep2Data}
              initialMonthlyCost={step1Data.monthly_cost}
              projectedPeriod={step1Data.projected_period}
              initialCost={step1Data.initial_cost}
              medications={step1Data.medications}
              currency_type={step1Data.currency_type}
              exchange_rate={step1Data.exchange_rate}
            />
          )}
          {currentStep === 3 && (
            <Step3InterventionResult
              data={step3Data}
              onChange={setStep3Data}
              doctors={doctors}
              projectedSavings={step2Data.projected_savings}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep === 3 && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Borrador
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmit(false)} disabled={loading}>
                <Check className="w-4 h-4 mr-2" />
                Finalizar y Guardar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
