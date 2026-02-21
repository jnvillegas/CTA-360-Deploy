import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Image, FileSpreadsheet, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentCardProps {
  document: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    document_type: string;
    description: string | null;
    created_at: string;
    uploaded_by: string;
    profiles?: {
      full_name: string;
    };
  };
  currentUserId: string | null;
  isAdmin: boolean;
  onDelete: () => void;
}

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  receta: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  estudio: "bg-green-500/10 text-green-600 border-green-500/20",
  informe: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  consenso: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  cotizacion: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  otro: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  receta: "Receta",
  estudio: "Estudio",
  informe: "Informe",
  consenso: "Consenso",
  cotizacion: "Cotización",
  otro: "Otro",
};

export function DocumentCard({ document, currentUserId, isAdmin, onDelete }: DocumentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = () => {
    if (document.file_type.startsWith("image/")) {
      return <Image className="w-5 h-5 text-primary" />;
    } else if (
      document.file_type.includes("sheet") ||
      document.file_type.includes("excel")
    ) {
      return <FileSpreadsheet className="w-5 h-5 text-primary" />;
    }
    return <FileText className="w-5 h-5 text-primary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("cost-savings-documents")
        .createSignedUrl(document.file_path, 3600); // 1 hour validity

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error: any) {
      console.error("Error downloading document:", error);
      toast.error("Error al descargar documento");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("cost-savings-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("cost_savings_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;

      // Add timeline event
      await supabase.from("cost_savings_timeline").insert({
        case_id: document.file_path.split("/")[0], // Extract case_id from path
        event_type: "note",
        user_id: user.id,
        description: `Documento eliminado: ${document.file_name}`,
      });

      toast.success("Documento eliminado");
      onDelete();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error("Error al eliminar documento");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const canDelete = isAdmin || currentUserId === document.uploaded_by;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {getFileIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{document.file_name}</p>
                  <Badge className={DOCUMENT_TYPE_COLORS[document.document_type]}>
                    {DOCUMENT_TYPE_LABELS[document.document_type]}
                  </Badge>
                </div>
                {document.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {document.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(document.file_size)}</span>
                  <span>{formatDate(document.created_at)}</span>
                  <span>Por: {document.profiles?.full_name || "Usuario"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={downloading}
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting}
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{document.file_name}"? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
