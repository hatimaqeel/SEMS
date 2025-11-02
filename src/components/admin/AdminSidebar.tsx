
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  Shield,
  GanttChartSquare,
} from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  // { href: "/admin/events", icon: Calendar, label: "Manage Events" },
  { href: "/admin/sports", icon: Trophy, label: "Manage Sports" },
  { href: "/admin/venues", icon: MapPin, label: "Manage Venues" },
  { href: "/admin/users", icon: Users, label: "Manage Users" },
  { href: "/admin/departments", icon: Building, label: "Manage Departments" },
];

const bottomNavItems = [
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isEventsOpen, setIsEventsOpen] = useState(pathname.startsWith('/admin/events'));

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
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
           <Collapsible open={isEventsOpen} onOpenChange={setIsEventsOpen} className="w-full">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        variant="ghost"
                        className="w-full justify-start"
                        isActive={pathname.startsWith('/admin/events')}
                    >
                        <Calendar />
                        <span>Manage Events</span>
                        <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", isEventsOpen && "rotate-90")} />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
            </SidebarMenuItem>

            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/admin/events'}>
                     <Link href="/admin/events">All Events</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                 <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname.includes('/registrations')}>
                     <Link href="/admin/events">Registrations</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname.includes('/teams')}>
                     <Link href="/admin/events">Teams</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname.includes('/schedule')}>
                     <Link href="/admin/events">Schedule</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
           </Collapsible>
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
