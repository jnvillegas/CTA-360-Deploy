import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploaderProps {
  caseId: string;
  onUploadComplete: () => void;
}

const DOCUMENT_TYPES = [
  { value: "receta", label: "Receta" },
  { value: "estudio", label: "Estudio" },
  { value: "informe", label: "Informe" },
  { value: "consenso", label: "Consenso" },
  { value: "cotizacion", label: "Cotización" },
  { value: "otro", label: "Otro" },
];

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function DocumentUploader({ caseId, onUploadComplete }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  };

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("El archivo supera el tamaño máximo de 20MB");
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG, XLS y XLSX");
      return false;
    }

    return true;
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast.error("Selecciona un archivo y un tipo de documento");
      return;
    }

    if (description.length > 500) {
      toast.error("La descripción no puede superar los 500 caracteres");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(selectedFile.name);
      const filePath = `${caseId}/${timestamp}-${sanitizedName}`;

      // Upload to Supabase Storage
      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("cost-savings-documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("cost_savings_documents")
        .insert({
          case_id: caseId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          document_type: documentType,
          description: description || null,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      setUploadProgress(90);

      // Add timeline event
      await supabase.from("cost_savings_timeline").insert({
        case_id: caseId,
        event_type: "note",
        user_id: user.id,
        description: `Documento adjuntado: ${selectedFile.name}`,
      });

      setUploadProgress(100);

      toast.success("Documento subido exitosamente");
      
      // Reset form
      setSelectedFile(null);
      setDocumentType("");
      setDescription("");
      setUploadProgress(0);
      
      onUploadComplete();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Error al subir documento");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-2">Arrastra archivos aquí o haz click para seleccionar</p>
              <p className="text-sm text-muted-foreground">
                PDF, JPG, PNG, XLS, XLSX (máx. 20MB)
              </p>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" className="mt-4" asChild>
                  <span>Seleccionar Archivo</span>
                </Button>
              </Label>
            </div>
          )}
        </div>

        {/* Document Type Select */}
        <div className="space-y-2">
          <Label htmlFor="document-type">Tipo de Documento *</Label>
          <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            placeholder="Agrega una descripción del documento..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            disabled={uploading}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/500 caracteres
          </p>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subiendo documento...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !documentType || uploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Subiendo..." : "Subir Documento"}
        </Button>
      </CardContent>
    </Card>
  );
}
