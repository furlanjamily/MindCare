import { Calendar, Users, UserCog, LayoutDashboard, LogOut, FileText, DollarSign, TrendingUp } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agendamentos", url: "/agendamentos", icon: Calendar },
  { title: "Prontuário", url: "/prontuarios", icon: FileText },
  { title: "Psicólogos", url: "/psicologos", icon: UserCog },
  { title: "Pacientes", url: "/pacientes", icon: Users },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Desempenho", url: "/desempenho", icon: TrendingUp },
];

export function AppSidebar() {
  const { signOut, session } = useAuth();

  // Filtrar itens do menu baseado no role do usuário
  const filteredMenuItems = menuItems.filter((item) => {
    // Se for psicólogo, ocultar Financeiro e Desempenho
    if (session?.user.role === 'psicologo') {
      return item.title !== 'Financeiro' && item.title !== 'Desempenho';
    }
    return true;
  });

  return (
    <Sidebar className="bg-[#2C3E50] border-r border-[#34495E]">
      <SidebarContent className="bg-[#2C3E50]">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Sistema de Gestão
          </h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="bg-transparent hover:bg-[#34495E] text-white">
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-[#007BFF] text-white font-medium"
                          : "hover:bg-[#34495E] text-white"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-[#2C3E50] border-t border-[#34495E]">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-[#34495E]"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
