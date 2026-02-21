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
      { name: "Historias Clínicas", href: "/medical-records", icon: FileText, roles: ['medico', 'medico_evaluador', 'administrador'] },
    ],
  },
  {
    section: "Costo-Ahorratividad",
    items: [
      { name: "Casos de Ahorro", href: "/cost-savings", icon: TrendingDown, roles: ['medico', 'medico_evaluador', 'gestor', 'administrador'] },
      { name: "Adherencia", href: "/adherence", icon: HeartPulse, roles: ['medico', 'medico_evaluador', 'gestor', 'administrador'] },
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
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-white/80 backdrop-blur-xl">
      <SidebarContent className="px-3 py-4">
        {navigationSections.map((section) => {
          const visibleItems = section.items.filter(item => hasAccess(item.roles));

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={section.section} className="mb-4">
              {!collapsed && (
                <SidebarGroupLabel className="px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
                  {section.section}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.name}
                          className={`
                            h-10 px-4 rounded-xl transition-all duration-300
                            ${isActive
                              ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                              : "text-foreground/70 hover:bg-primary/5 hover:text-primary"}
                          `}
                        >
                          <NavLink to={item.href} className="flex items-center gap-3">
                            <item.icon className={`h-[18px] w-[18px] transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                            <span className="font-medium text-sm">{item.name}</span>
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
