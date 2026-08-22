import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MenuTreeNode, RolePublic } from "@/api/schemas";
import { useSystemMenusReadMenusTree } from "@/api/system-menus/system-menus";
import {
	getWorkspaceRolesReadRoleMenusQueryKey,
	useWorkspaceRolesReadRoleMenus,
	useWorkspaceRolesSetRoleMenus,
} from "@/api/workspace-roles/workspace-roles";
import { type TreeDataItem, TreeView } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface RoleMenusDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: RolePublic | null;
}

function mapTreeData(nodes: MenuTreeNode[]): TreeDataItem[] {
	return nodes.map((node) => ({
		id: node.id as string,
		name: node.name,
		permissionCode: node.permission_code,
		children: node.children ? mapTreeData(node.children) : undefined,
	}));
}

export function RoleMenusDialog({
	open,
	onOpenChange,
	role,
}: RoleMenusDialogProps) {
	const queryClient = useQueryClient();
	const roleId = role?.id;

	// Fetch full menu tree
	const { data: treeResponse, isLoading: isLoadingTree } =
		useSystemMenusReadMenusTree();
	const treeData = mapTreeData(
		treeResponse?.status === 200 ? treeResponse.data : [],
	);

	// Fetch current role menus
	const { data: menusResponse, isLoading: isLoadingRoleMenus } =
		useWorkspaceRolesReadRoleMenus(roleId!, {
			query: { enabled: open && !!roleId },
		});
	const initialSelectedIds =
		menusResponse?.status === 200 ? menusResponse.data : [];

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Reset local state when fetched data changes
	useEffect(() => {
		if (open) {
			setSelectedIds(initialSelectedIds);
		}
	}, [open, initialSelectedIds]);

	const setMenusMutation = useWorkspaceRolesSetRoleMenus({
		mutation: {
			onSuccess: () => {
				toast.success("菜单分配成功");
				if (roleId) {
					queryClient.invalidateQueries({
						queryKey: getWorkspaceRolesReadRoleMenusQueryKey(roleId),
					});
				}
				onOpenChange(false);
			},
			onError: (err) => {
				toast.error((err as Error).message);
			},
		},
	});

	const handleSubmit = () => {
		if (!roleId) return;
		setMenusMutation.mutate({
			roleId,
			data: { menu_ids: selectedIds },
		});
	};

	const isLoading = isLoadingTree || isLoadingRoleMenus;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(760px,85vh)] flex-col overflow-hidden sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>分配菜单权限</DialogTitle>
					<DialogDescription>
						{role
							? `为角色「${role.role_name}」分配系统菜单和操作权限`
							: "分配菜单"}
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
						disabled={isLoading || setMenusMutation.isPending}
					>
						{setMenusMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						保存分配
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
