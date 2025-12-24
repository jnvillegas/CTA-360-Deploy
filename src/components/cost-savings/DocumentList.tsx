import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import { toast } from "sonner";

interface Document {
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
}

interface DocumentListProps {
  caseId: string;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function DocumentList({ caseId, currentUserId, isAdmin }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("cost_savings_documents")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load profiles separately
      const docsWithProfiles = await Promise.all(
        (data || []).map(async (doc) => {
          if (doc.uploaded_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", doc.uploaded_by)
              .single();
            
            return { ...doc, profiles: profile };
          }
          return doc;
        })
      );

      setDocuments(docsWithProfiles as Document[]);
    } catch (error: any) {
      console.error("Error loading documents:", error);
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const documentTypeLabels: Record<string, string> = {
    receta: "Recetas",
    estudio: "Estudios",
    informe: "Informes",
    consenso: "Consensos",
    cotizacion: "Cotizaciones",
    otro: "Otros",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Cargando documentos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents by Type */}
      {Object.keys(groupedDocuments).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {searchTerm
                ? "No se encontraron documentos con ese nombre"
                : "No hay documentos adjuntos aún"}
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedDocuments).map(([type, docs]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              {documentTypeLabels[type]} ({docs.length})
            </h3>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onDelete={loadDocuments}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
