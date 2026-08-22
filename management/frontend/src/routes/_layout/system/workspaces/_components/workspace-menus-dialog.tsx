import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MenuTreeNode, WorkspacePublic } from "@/api/schemas";
import { useSystemMenusReadMenusOptions } from "@/api/system-menus/system-menus";
import {
	useSystemWorkspacesReadWorkspaceMenus,
	useSystemWorkspacesSetWorkspaceMenus,
} from "@/api/system-workspaces/system-workspaces";
import { type TreeDataItem, TreeView } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface WorkspaceMenusDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bindingWorkspace: WorkspacePublic | null;
}

function mapTreeData(nodes: MenuTreeNode[]): TreeDataItem[] {
	return nodes.map((node) => ({
		id: node.id as string,
		name: node.name,
		permissionCode: node.permission_code,
		children: node.children ? mapTreeData(node.children) : undefined,
	}));
}

export function WorkspaceMenusDialog({
	open,
	onOpenChange,
	bindingWorkspace,
}: WorkspaceMenusDialogProps) {
	const queryClient = useQueryClient();
	const workspaceId = bindingWorkspace?.id;

	// 1. Fetch ALL available menus (global context, for checkbox tree rendering)
	const { data: allMenusResponse, isLoading: isLoadingAll } =
		useSystemMenusReadMenusOptions(undefined, { query: { enabled: open } });
	const rawData = allMenusResponse?.status === 200 ? allMenusResponse.data : [];
	const treeData = mapTreeData(Array.isArray(rawData) ? rawData : []);

	// 2. Fetch bound menu IDs directly from WorkspaceMenuLink table
	const { data: boundMenusResponse, isLoading: isLoadingBound } =
		useSystemWorkspacesReadWorkspaceMenus(workspaceId ?? "", {
			query: {
				enabled: open && !!workspaceId,
			},
		});

	const initialSelectedIds =
		boundMenusResponse?.status === 200 && Array.isArray(boundMenusResponse.data)
			? (boundMenusResponse.data as string[])
			: [];

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Reset local state when fetched data changes
	useEffect(() => {
		if (open) {
			setSelectedIds(initialSelectedIds);
		}
	}, [open, initialSelectedIds]);

	const bindMutation = useSystemWorkspacesSetWorkspaceMenus({
		mutation: {
			onSuccess: () => {
				toast.success("菜单绑定成功");
				queryClient.invalidateQueries(); // Full invalidate as permissions changed
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const handleSubmit = () => {
		if (!workspaceId) return;
		bindMutation.mutate({
			workspaceId: workspaceId,
			data: { menu_ids: selectedIds },
		});
	};

	const isLoading = isLoadingAll || isLoadingBound;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(760px,85vh)] flex-col overflow-hidden sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>绑定菜单资源</DialogTitle>
					<DialogDescription>
						配置工作区「{bindingWorkspace?.name}」允许访问的菜单路由
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/20">
					{isLoading ? (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : treeData.length > 0 ? (
						<TreeView
							data={treeData}
							selectedIds={selectedIds}
							onSelectedIdsChange={setSelectedIds}
							searchPlaceholder="搜索菜单、操作或权限码"
							getSearchText={(node) =>
								`${node.name} ${String(node.permissionCode ?? "")}`
							}
							className="h-full"
						/>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							暂无可分配菜单
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isLoading || bindMutation.isPending}
					>
						{bindMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						确定绑定
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
