"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	UserGroupIcon,
	Settings01Icon,
	Wallet01Icon,
	Dollar01Icon,
	ChartLineData01Icon,
	Calendar03Icon,
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
	const canManageBusiness =
		business.role === "OWNER" || business.role === "MANAGER";
	const items = [
		{ title: "Dashboard", url: base, icon: ChartLineData01Icon },
		{ title: "Agenda", url: `${base}/agenda`, icon: Calendar03Icon },
		{ title: "Clientes", url: `${base}/clientes`, icon: UserGroupIcon },
		{ title: "Caja", url: `${base}/ventas`, icon: Dollar01Icon },
		{ title: "Cartera", url: `${base}/cartera`, icon: Wallet01Icon },
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
				{canManageBusiness ? (
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
				) : null}
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
