import {
	createFileRoute,
	Outlet,
	redirect,
	useMatches,
	useRouterState,
} from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { type ComponentType, useState } from "react";
import type { MenuTreeNode } from "@/api/schemas";
import {
	ChangePasswordDialog,
	WorkspaceSelectionDialog,
} from "@/components/dialogs";
import { RouteGuard } from "@/components/guards";
import { GlobalTaskTray, ModeToggle } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMenuTree } from "@/hooks/use-menu-tree";
import { isLoggedIn } from "@/lib/auth-session";
import { AppSidebar } from "./_components/app-sidebar";

export const Route = createFileRoute("/_layout")({
	component: Layout,
	beforeLoad: () => {
		if (!isLoggedIn()) {
			throw redirect({ to: "/login" });
		}
		if (localStorage.getItem("force_password_change") === "true") {
			throw redirect({ to: "/login" });
		}
	},
});

export interface SidebarContentProps {
	onBack: () => void;
}

declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		SidebarContent?: ComponentType<SidebarContentProps>;
	}
}

function Layout() {
	const { logout } = useAuth();

	const handleLogout = () => {
		logout();
	};

	const matches = useMatches();
	const SpecificSidebar =
		matches[matches.length - 1]?.staticData?.SidebarContent;

	// showNav: when true, force AppSidebar even if the route has a custom sidebar
	const [prevSpecificSidebar, setPrevSpecificSidebar] = useState(
		() => SpecificSidebar,
	);
	const [showNav, setShowNav] = useState(!SpecificSidebar);

	// Render phase pattern: reset state when prop/derived value changes
	if (SpecificSidebar !== prevSpecificSidebar) {
		setPrevSpecificSidebar(() => SpecificSidebar);
		setShowNav(!SpecificSidebar);
	}

	// Calculate dynamic header title
	const { data: menuResponse } = useMenuTree();
	const menuTree = menuResponse?.status === 200 ? menuResponse.data : [];
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	const searchParams = useRouterState({
		select: (s) => s.location.search,
	}) as { url?: string };

	function buildPath(
		parentPath: string,
		currentPath: string | null | undefined,
	): string {
		if (!currentPath) return parentPath || "";
		if (currentPath.startsWith("http")) return currentPath;

		const cleanParent = parentPath.replace(/\/+$/, "");
		const cleanCurrent = currentPath.replace(/^\/+/, "").replace(/\/+$/, "");

		if (!cleanCurrent) return cleanParent || "/";
		if (!cleanParent) return `/${cleanCurrent}`;

		return `${cleanParent}/${cleanCurrent}`;
	}

	const findMenuTitle = (
		nodes: MenuTreeNode[],
		targetPath: string,
		parentPath = "",
	): string | null => {
		for (const node of nodes) {
			const activePath = buildPath(parentPath, node.path);

			if (node.type === 4 && targetPath === "/iframe") {
				if (node.path === searchParams?.url) return node.name;
			} else if (activePath === targetPath) {
				return node.name;
			}

			if (node.children && node.children.length > 0) {
				const found = findMenuTitle(
					node.children as MenuTreeNode[],
					targetPath,
					activePath,
				);
				if (found) return found;
			}
		}
		return null;
	};

	const currentMenuTitle = findMenuTitle(menuTree, pathname) || "";

	return (
		<RouteGuard>
			<TooltipProvider delayDuration={0}>
				<SidebarProvider>
					{showNav || !SpecificSidebar ? (
						<AppSidebar onNavigate={() => setShowNav(false)} />
					) : (
						<SpecificSidebar onBack={() => setShowNav(true)} />
					)}
					<SidebarInset className="h-svh overflow-hidden">
						<header className="sticky top-0 z-50 flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b bg-background/95 pt-[env(safe-area-inset-top)] pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] backdrop-blur transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/60 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-[calc(3rem+env(safe-area-inset-top))]">
							<div className="flex items-center gap-2">
								<SidebarTrigger className="-ml-1" />
								<Separator orientation="vertical" className="mr-2 h-4" />
							</div>

							{/* Center Title */}
							<div className="absolute top-1/2 left-1/2 hidden max-w-[calc(100%-12rem)] -translate-x-1/2 -translate-y-1/2 truncate font-semibold text-base text-foreground/90 sm:block">
								{currentMenuTitle}
							</div>

							{/* Right side actions */}
							<div className="flex items-center gap-1.5">
								<GlobalTaskTray />
								<ModeToggle />
								<ChangePasswordDialog />
								<Button
									variant="ghost"
									size="icon"
									onClick={handleLogout}
									title="Logout"
									className="rounded-full"
								>
									<LogOut className="size-4" />
								</Button>
							</div>
						</header>
						<main className="flex-1 flex flex-col min-h-0 p-2 overflow-hidden">
							<Outlet />
						</main>
					</SidebarInset>
				</SidebarProvider>
				<WorkspaceSelectionDialog />
			</TooltipProvider>
		</RouteGuard>
	);
}
