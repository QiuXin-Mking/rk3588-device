import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export function BrandSidebarHeader() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton size="lg" asChild>
					<Link to="/">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<ScanLine className="size-5" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">Ego 采集管理</span>
							<span className="truncate text-xs">Device & Mobile Console</span>
						</div>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
