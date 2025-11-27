import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col bg-gray-50">
          <header className="h-14 border-b flex items-center px-4 bg-white">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
