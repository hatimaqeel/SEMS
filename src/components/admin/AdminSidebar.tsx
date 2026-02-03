
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/common/Logo";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  MapPin,
  Users,
  Settings,
  LogOut,
  Building,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

const mainNavItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/admin/events", icon: Calendar, label: "Manage Events" },
  { href: "/admin/sports", icon: Trophy, label: "Manage Sports" },
  { href: "/admin/venues", icon: MapPin, label: "Manage Venues" },
  { href: "/admin/users", icon: Users, label: "Manage Users" },
  { href: "/admin/departments", icon: Building, label: "Manage Departments" },
];

const bottomNavItems: { href: string, icon: any, label: string }[] = [
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <Trophy className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg font-headline group-data-[collapsible=icon]:hidden">SEMS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter className="p-2">
        <SidebarMenu>
           {bottomNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
