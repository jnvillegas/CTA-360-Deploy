import {
  LayoutDashboard,
  BarChart3,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  Pill,
  TrendingDown,
  Bell,
  HeartPulse,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";

const navigationSections = [
  {
    section: "General",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador'] },
      { name: "Reportes", href: "/reports", icon: BarChart3, roles: ['gestor', 'administrador'] },
      { name: "Reportes Ejecutivos", href: "/reports/executive", icon: BarChart3, roles: ['gestor', 'administrador'] },
    ],
  },
  {
    section: "Gestión Clínica",
    items: [
      { name: "Pacientes", href: "/patients", icon: Users, roles: ['medico', 'medico_evaluador', 'administrador'] },
      { name: "Médicos", href: "/doctors", icon: Stethoscope, roles: ['administrador', 'gestor'] },
      { name: "Citas", href: "/appointments", icon: Calendar, roles: ['medico', 'medico_evaluador', 'administrador'] },
      { name: "Historias Clínicas", href: "/medical-records", icon: FileText, roles: ['medico', 'medico_evaluador', 'administrador'] },
      { name: "Recetas", href: "/prescriptions", icon: Pill, roles: ['medico', 'medico_evaluador', 'administrador'] },
    ],
  },
  {
    section: "Costo-Ahorratividad",
    items: [
      { name: "Casos de Ahorro", href: "/cost-savings", icon: TrendingDown, roles: ['medico', 'medico_evaluador', 'gestor', 'administrador'] },
      { name: "Adherencia", href: "/adherence", icon: HeartPulse, roles: ['medico', 'medico_evaluador', 'gestor', 'administrador'] },
    ],
  },
  {
    section: "Configuración",
    items: [
      { name: "Notificaciones", href: "/notifications", icon: Bell, roles: ['paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador'] },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { role } = useUserRole();
  const collapsed = state === "collapsed";

  const hasAccess = (allowedRoles: string[]) => {
    return allowedRoles.includes(role || '');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {navigationSections.map((section) => {
          const visibleItems = section.items.filter(item => hasAccess(item.roles));
          
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={section.section}>
              {!collapsed && <SidebarGroupLabel>{section.section}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                          <NavLink to={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
