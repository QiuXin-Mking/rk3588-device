import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type * as React from "react";
import { z } from "zod";
import type { MenuTreeNode } from "@/api/schemas";
import { BrandSidebarHeader } from "@/components/layout";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useMenuTree } from "@/hooks/use-menu-tree";

// Dynamic Icon Component
const DynamicIcon = ({ name }: { name?: string | null }) => {
	if (!name) return <Icons.Circle className="size-4" />;
	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: generic icon router
	const Icon = Icons[name as keyof typeof Icons] as React.ElementType;
	if (!Icon) return <Icons.Box className="size-4" />;
	return <Icon className="size-4" />;
};

export function AppSidebar({
	onNavigate,
	...props
}: React.ComponentProps<typeof Sidebar> & { onNavigate?: () => void }) {
	// Active Path integration
	const matchedPath = useRouterState({ select: (s) => s.location.pathname });

	// Fetch Menus
	const { data: menuResponse, isLoading } = useMenuTree();
	const menuTree = menuResponse?.status === 200 ? menuResponse.data : [];

	return (
		<Sidebar collapsible="icon" {...props} className="z-40">
			<SidebarHeader>
				<BrandSidebarHeader />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					{/* <SidebarGroupLabel>Application Mode</SidebarGroupLabel> */}
					<SidebarMenu>
						{isLoading ? (
							<div className="flex justify-center p-4">
								<Icons.Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : (
							menuTree.map((item: MenuTreeNode) => (
								<MenuTreeRenderer
									key={item.id}
									item={item}
									currentPath={matchedPath}
									onNavigate={onNavigate}
								/>
							))
						)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
function buildPath(
	parentPath: string,
	currentPath: string | null | undefined,
): string {
	if (!currentPath) return parentPath || "";
	if (currentPath.startsWith("http")) return currentPath;

	// 去除末尾的斜杠
	const cleanParent = parentPath.replace(/\/+$/, "");
	// 去除首尾的斜杠
	const cleanCurrent = currentPath.replace(/^\/+/, "").replace(/\/+$/, "");

	if (!cleanCurrent) return cleanParent || "/";

	// 如果没有父级（根节点），则补齐首斜杠
	if (!cleanParent) return `/${cleanCurrent}`;

	// 父级和子级之间安全拼接一个斜杠
	return `${cleanParent}/${cleanCurrent}`;
}

const searchSchema = z.object({ url: z.string().optional() }).catch({});

function useMenuLink(
	item: MenuTreeNode,
	currentPath: string,
	activePath: string,
) {
	const search = useRouterState({ select: (s) => s.location.search });
	const searchParams = searchSchema.parse(search);

	const targetPath = activePath || "/";
	const isExternal = item.type === 3;
	const isIframe = item.type === 4;
	const isIframeActive =
		isIframe && currentPath === "/iframe" && searchParams?.url === item.path;
	const isNormalActive = !isExternal && !isIframe && currentPath === targetPath;

	return {
		isActive: isNormalActive || isIframeActive,
		isExternal,
		isIframe,
		targetPath,
		isIframeActive,
	};
}

function MenuTreeRenderer({
	item,
	currentPath,
	parentPath = "",
	onNavigate,
	isSubItem = false,
}: {
	item: MenuTreeNode;
	currentPath: string;
	parentPath?: string;
	onNavigate?: () => void;
	isSubItem?: boolean;
}) {
	const activePath = buildPath(parentPath, item.path);
	const linkState = useMenuLink(item, currentPath, activePath);

	if (item.is_visible === false) return null;

	const visibleChildren =
		item.children?.filter((c) => c.is_visible !== false) || [];
	const hasChildren = visibleChildren.length > 0;

	// Deep check for parent expansion logic
	const isParentActive =
		hasChildren && checkIsActiveDeep(visibleChildren, currentPath, activePath);

	const isDirectory = item.type === 0 || hasChildren;

	const ItemWrapper = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;
	const ButtonWrapper = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;

	if (!isDirectory) {
		return (
			<ItemWrapper>
				<ButtonWrapper
					asChild
					tooltip={!isSubItem ? item.name : undefined}
					isActive={linkState.isActive}
				>
					{linkState.isExternal ? (
						<a href={item.path || ""} target="_blank" rel="noreferrer">
							<DynamicIcon name={item.icon} />
							<span>{item.name}</span>
						</a>
					) : (
						<Link
							to={linkState.isIframe ? "/iframe" : linkState.targetPath}
							search={linkState.isIframe ? { url: item.path || "" } : undefined}
							onClick={() => {
								if (
									(linkState.isIframe
										? linkState.isIframeActive
										: currentPath === linkState.targetPath) &&
									onNavigate
								) {
									onNavigate();
								}
							}}
						>
							<DynamicIcon name={item.icon} />
							<span>{item.name}</span>
						</Link>
					)}
				</ButtonWrapper>
			</ItemWrapper>
		);
	}

	if (isSubItem) {
		return (
			<Collapsible defaultOpen={isParentActive}>
				<ItemWrapper>
					<CollapsibleTrigger asChild>
						<ButtonWrapper>
							<DynamicIcon name={item.icon} />
							<span>{item.name}</span>
						</ButtonWrapper>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub className="ml-2 border-l">
							{visibleChildren.map((subItem) => (
								<MenuTreeRenderer
									key={subItem.id}
									item={subItem}
									currentPath={currentPath}
									parentPath={activePath}
									onNavigate={onNavigate}
									isSubItem={true}
								/>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</ItemWrapper>
			</Collapsible>
		);
	}

	return (
		<Collapsible
			asChild
			defaultOpen={isParentActive}
			className="group/collapsible"
		>
			<ItemWrapper>
				<CollapsibleTrigger asChild>
					<ButtonWrapper tooltip={item.name}>
						<DynamicIcon name={item.icon} />
						<span>{item.name}</span>
						<Icons.ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
					</ButtonWrapper>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{visibleChildren.map((subItem) => (
							<MenuTreeRenderer
								key={subItem.id}
								item={subItem}
								currentPath={currentPath}
								parentPath={activePath}
								onNavigate={onNavigate}
								isSubItem={true}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</ItemWrapper>
		</Collapsible>
	);
}

function checkIsActiveDeep(
	nodes: MenuTreeNode[],
	currentPath: string,
	parentPath = "",
): boolean {
	return nodes.some((node) => {
		const activePath = buildPath(parentPath, node.path);
		if (node.path && currentPath.includes(activePath)) return true;
		if (
			node.children &&
			checkIsActiveDeep(node.children, currentPath, activePath)
		)
			return true;
		return false;
	});
}
