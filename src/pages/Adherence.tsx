import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdherenceCard } from "@/components/adherence/AdherenceCard";
import { AdherenceStats } from "@/components/adherence/AdherenceStats";
import { AdherenceForm } from "@/components/adherence/AdherenceForm";
import { useAdherence, TreatmentAdherence, AdherenceFormData } from "@/hooks/useAdherence";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertCircle } from "lucide-react";
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

export default function Adherence() {
  const { canCreateAdherence } = usePermissions();
  const { 
    adherenceRecords, 
    isLoading, 
    stats,
    createAdherence,
    updateAdherence,
    deleteAdherence,
    isCreating,
    isUpdating,
    isDeleting 
  } = useAdherence();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TreatmentAdherence | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const filteredRecords = adherenceRecords.filter(record => {
    const matchesSearch = 
      record.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.payer_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (record: TreatmentAdherence) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteAdherence(recordToDelete);
      setRecordToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: AdherenceFormData) => {
    if (editingRecord) {
      updateAdherence({ id: editingRecord.id, data });
    } else {
      createAdherence(data);
    }
    setEditingRecord(null);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingRecord(null);
    }
    setFormOpen(open);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adherencia Terapéutica</h1>
          <p className="text-muted-foreground">
            Gestione el seguimiento de tratamientos y alertas de medicación
          </p>
        </div>
        {canCreateAdherence && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Registro
          </Button>
        )}
      </div>

      <AdherenceStats stats={stats} />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, medicamento o cobertura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="sufficient">Stock suficiente</SelectItem>
            <SelectItem value="warning">Stock bajo</SelectItem>
            <SelectItem value="critical">Stock crítico</SelectItem>
            <SelectItem value="depleted">Sin stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay registros de adherencia</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" 
              ? "No se encontraron registros con los filtros aplicados"
              : "Comience agregando un nuevo registro de adherencia terapéutica"
            }
          </p>
          {canCreateAdherence && !searchTerm && statusFilter === "all" && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer registro
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => (
            <AdherenceCard
              key={record.id}
              adherence={record}
              onEdit={canCreateAdherence ? handleEdit : undefined}
              onDelete={canCreateAdherence ? handleDelete : undefined}
              showPatientInfo
            />
          ))}
        </div>
      )}

      <AdherenceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        editingRecord={editingRecord}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro de adherencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el registro de adherencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
