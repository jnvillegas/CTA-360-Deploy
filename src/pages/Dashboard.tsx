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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Panel de Control
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Bienvenido a <span className="text-primary font-semibold">Heal Path Professional</span>
          </p>
        </div>
        <div className="text-sm font-medium px-4 py-2 bg-primary/5 text-primary rounded-full border border-primary/10">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="uupm-card overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Total Pacientes</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tighter">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Sincronización en tiempo real
            </p>
          </CardContent>
        </Card>

        <Card className="uupm-card overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Turnos Hoy</CardTitle>
            <div className="p-2 rounded-lg bg-accent/20 text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tighter">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Agenda del día de hoy
            </p>
          </CardContent>
        </Card>

        <Card className="uupm-card overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Pendientes</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-colors duration-300">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tighter">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              A la espera de atención
            </p>
          </CardContent>
        </Card>

        <Card className="uupm-card overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Hist. Clínicas</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tighter">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Base de datos centralizada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <Card className="uupm-card border-none bg-white p-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Resumen de Actividad</CardTitle>
              <CardDescription className="text-sm">Estado de las gestiones del día</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-secondary/5 border border-secondary/10 group hover:bg-secondary/10 transition-colors">
              <div className="p-3 rounded-xl bg-secondary/10 text-secondary transition-transform group-hover:scale-110">
                <CheckCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold translate-y-0.5">{stats.completedToday}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary/70">Completados</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/10 group hover:bg-destructive/10 transition-colors">
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive transition-transform group-hover:scale-110">
                <XCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold translate-y-0.5">{stats.cancelledToday}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-destructive/70">Cancelados</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 rounded-2xl bg-warning/5 border border-warning/10 group hover:bg-warning/10 transition-colors">
              <div className="p-3 rounded-xl bg-warning/10 text-warning transition-transform group-hover:scale-110">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold translate-y-0.5">{stats.noShowToday}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-warning/70">Inasistencias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
