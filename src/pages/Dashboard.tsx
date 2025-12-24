import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Calendar, FileText, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Stats {
  totalPatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  totalRecords: number;
  completedToday: number;
  cancelledToday: number;
  noShowToday: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    totalRecords: 0,
    completedToday: 0,
    cancelledToday: 0,
    noShowToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: totalPatients },
        { count: todayAppointments },
        { count: pendingAppointments },
        { count: totalRecords },
        { count: completedToday },
        { count: cancelledToday },
        { count: noShowToday },
      ] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today),
        supabase.from("appointments").select("*", { count: "exact", head: true }).in("status", ["scheduled", "confirmed"]),
        supabase.from("medical_records").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today).eq("status", "completed"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today).eq("status", "cancelled"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today).eq("status", "no_show"),
      ]);

      setStats({
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        totalRecords: totalRecords || 0,
        completedToday: completedToday || 0,
        cancelledToday: cancelledToday || 0,
        noShowToday: noShowToday || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Panel de Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Vista general de tu centro médico
          </p>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-medium transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registrados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-medium transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Turnos Hoy</CardTitle>
              <Calendar className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Programados para hoy
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-medium transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Turnos Pendientes</CardTitle>
              <Clock className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Próximos turnos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-medium transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Historias Clínicas</CardTitle>
              <FileText className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros totales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Actividad de Hoy
            </CardTitle>
            <CardDescription>
              Resumen de la actividad del día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                <CheckCircle className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                  <p className="text-sm text-muted-foreground">Completados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{stats.cancelledToday}</p>
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{stats.noShowToday}</p>
                  <p className="text-sm text-muted-foreground">No Asistieron</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
