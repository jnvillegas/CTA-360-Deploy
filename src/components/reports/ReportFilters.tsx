import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ReportFiltersProps {
  onFilterChange: (filters: any) => void;
}

export const ReportFilters = ({ onFilterChange }: ReportFiltersProps) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, specialty')
      .in('role', ['medico', 'medico_evaluador'])
      .order('full_name');
    
    if (data) setDoctors(data);
  };

  const applyFilters = () => {
    onFilterChange({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      specialty: specialty && specialty !== "all" ? specialty : undefined,
      doctorId: doctorId && doctorId !== "all" ? doctorId : undefined,
      status: status && status !== "all" ? status : undefined
    });
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSpecialty("all");
    setDoctorId("all");
    setStatus("all");
    onFilterChange({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm font-medium mb-2 block">Fecha Inicio</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">Fecha Fin</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="specialty" className="text-sm font-medium mb-2 block">Especialidad</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Oncología">Oncología</SelectItem>
                <SelectItem value="Neurología">Neurología</SelectItem>
                <SelectItem value="Reumatología">Reumatología</SelectItem>
                <SelectItem value="Hepatología">Hepatología</SelectItem>
                <SelectItem value="Otra">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doctor" className="text-sm font-medium mb-2 block">Médico Evaluador</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger id="doctor">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-medium mb-2 block">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                <SelectItem value="intervenido">Intervenido</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="sin_optimizacion">Sin Optimización</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={applyFilters} className="flex-1">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
          <Button onClick={clearFilters} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
