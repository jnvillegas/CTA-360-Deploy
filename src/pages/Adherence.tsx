import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Adherencia Terapéutica
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitoreo clínico de tratamientos y gestión de stock farmacológico
          </p>
        </div>
        {canCreateAdherence && (
          <Button
            onClick={() => setFormOpen(true)}
            className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-semibold">Nuevo Registro</span>
          </Button>
        )}
      </div>

      <div className="animate-in slide-in-from-top-4 duration-1000">
        <AdherenceStats stats={stats} />
      </div>

      <Card className="uupm-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por paciente, medicamento o tipo de cobertura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[240px] h-12 bg-muted/30 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all">
              <SelectValue placeholder="Estado de Adherencia" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="sufficient">Stock suficiente</SelectItem>
              <SelectItem value="warning">Stock bajo</SelectItem>
              <SelectItem value="critical">Stock crítico</SelectItem>
              <SelectItem value="depleted">Sin stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[24px]" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="uupm-card p-12 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-primary/5 text-primary mb-6">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">No se encontraron registros</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Ajuste los criterios de búsqueda o filtros para visualizar otros registros de adherencia."
              : "Comience integrando el primer registro de adherencia terapéutica para iniciar el monitoreo de stock."
            }
          </p>
          {canCreateAdherence && !searchTerm && statusFilter === "all" && (
            <Button
              onClick={() => setFormOpen(true)}
              variant="outline"
              className="mt-8 h-12 px-8 rounded-xl font-bold transition-all hover:bg-primary hover:text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear primer registro
            </Button>
          )}
        </Card>
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
