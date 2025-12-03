import {
  Calendar,
  Users,
  UserCog,
  LayoutDashboard,
  LogOut,
  FileText,
  DollarSign,
  TrendingUp,
} from "lucide-react";
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
import Logo from "@/assets/logo.png";

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
    if (session?.user.role === "psicologo") {
      return item.title !== "Financeiro" && item.title !== "Desempenho";
    }
    return true;
  });

  return (
    <Sidebar className="bg-[#1f1b2e] border-r border-[#2a2440]">
      <SidebarContent className="bg-[#1f1b2e]">
        <div className="px-3 py-4 flex justify-center">
          <img
            src={Logo}
            alt="MindCare Logo"
            className="w-[160px] opacity-90 hover:opacity-100 transition"
          />
        </div>

        {/* MENU */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300">
            Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `
                          flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                          ${
                            isActive
                              ? "bg-[#7e61e7] text-white font-semibold"
                              : "text-white hover:bg-[#6b52d9]"
                          }
                        `
                      }
                    >
                      <>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="bg-[#1f1b2e] border-t border-[#2a2440]">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-[#6b52d9]"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
