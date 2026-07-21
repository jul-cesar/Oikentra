"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Settings01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Business } from "@/lib/onboarding-api";

export function AppSidebar({
  business,
  user,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  business: Business;
  user: { name?: string | null; email?: string | null };
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const base = `/dashboard/${business.id}`;
  const items = [
    { title: "Resumen", url: base, icon: DashboardSquare01Icon },
    { title: "Clientes", url: `${base}/clientes`, icon: UserGroupIcon },
    { title: "Fiados", url: `${base}/fiados`, icon: Wallet01Icon },
  ];
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher currentBusiness={business} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tu negocio</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  isActive={pathname === item.url}
                  tooltip={item.title}
                  render={<Link href={item.url} />}
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Configuración</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === `${base}/configuracion`}
                tooltip="Configurar negocio"
                render={<Link href={`${base}/configuracion`} />}
              >
                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
                <span>Configurar negocio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name || "Usuario",
            email: user.email || "",
            avatar: "",
          }}
          businessId={business.id}
          onSignOut={onSignOut}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
