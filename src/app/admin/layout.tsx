import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
