import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, FileText, Image, Info, Calculator, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Doctor {
  id: string;
  full_name: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

interface Step3Data {
  observations: string;
  evaluating_doctor_id: string;
  files: UploadedFile[];
  final_projected_savings: number;
  porcentaje_honorarios: number;
}

interface Step3InterventionResultProps {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  doctors: Doctor[];
  projectedSavings: number;
}

export function Step3InterventionResult({
  data,
  onChange,
  doctors,
  projectedSavings,
}: Step3InterventionResultProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: UploadedFile[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el tamaño máximo de 10MB`);
        return;
      }

      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} no es un tipo de archivo válido`);
        return;
      }

      const uploadedFile: UploadedFile = { file };
      
      if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      validFiles.push(uploadedFile);
    });

    onChange({
      ...data,
      files: [...data.files, ...validFiles],
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const file = data.files[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onChange({
      ...data,
      files: data.files.filter((_, i) => i !== index),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Observations and Files */}
        <div className="space-y-6">
          {/* Observations */}
          <div className="space-y-2">
            <Label>Descripción de la Intervención *</Label>
            <Textarea
              className="min-h-[150px]"
              placeholder="Detalle las acciones clínicas o administrativas tomadas para lograr el ahorro..."
              value={data.observations}
              onChange={(e) => onChange({ ...data, observations: e.target.value })}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {data.observations.length}/500
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Adjuntar Documentación Médica</Label>
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/30 hover:border-primary/50"
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                Haga clic para subir o arrastre archivos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG (Max 10MB)
              </p>
            </div>

            {/* Uploaded Files */}
            {data.files.length > 0 && (
              <div className="space-y-2 mt-4">
                {data.files.map((uploadedFile, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                  >
                    {uploadedFile.preview ? (
                      <img
                        src={uploadedFile.preview}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Doctor and Summary */}
        <div className="space-y-6">
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label>Responsable de Seguimiento</Label>
            <Select 
              value={data.evaluating_doctor_id} 
              onValueChange={(val) => onChange({ ...data, evaluating_doctor_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario..." />
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

          {/* Porcentaje de Honorarios */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Porcentaje de Honorarios
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Ej: 10"
                value={data.porcentaje_honorarios || ""}
                onChange={(e) => onChange({ 
                  ...data, 
                  porcentaje_honorarios: parseFloat(e.target.value) || 0 
                })}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Porcentaje pactado sobre el ahorro generado
            </p>
          </div>

          {/* Final Projected Savings Card */}
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                    Ahorro Final
                  </p>
                  <p className="text-xs text-green-600/70">
                    Proyectado
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(projectedSavings > 0 ? projectedSavings : 0)}
              </p>
              <p className="text-sm text-green-600/70 mt-1">
                Calculado basado en la intervención seleccionada.
              </p>
            </CardContent>
          </Card>

          {/* Honorarios Calculados Card */}
          {data.porcentaje_honorarios > 0 && projectedSavings > 0 && (
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                      Honorarios
                    </p>
                    <p className="text-xs text-purple-600/70">
                      {data.porcentaje_honorarios}% del ahorro
                    </p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(projectedSavings * (data.porcentaje_honorarios / 100))}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p>
                    Asegúrese de adjuntar toda la evidencia clínica. Los casos sin 
                    documentación completa pueden ser rechazados durante la auditoría.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
