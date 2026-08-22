import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RolePublic, WorkspaceRolesReadRolesParams } from "@/api/schemas";
import {
	getWorkspaceRolesReadRolesQueryKey,
	useWorkspaceRolesDeleteRole,
	useWorkspaceRolesReadRoles,
} from "@/api/workspace-roles/workspace-roles";
import { WorkspaceRolesReadRolesQueryParams } from "@/api/zod/workspace-roles/workspace-roles";
import { ConfirmDialog } from "@/components/dialogs";
import { FilterInput } from "@/components/filters";
import { AuthGuard } from "@/components/guards";
import { DataTable } from "@/components/table";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { getColumns } from "./_components/columns";
import { RoleFormDialog } from "./_components/role-form-dialog";
import { RoleMembersDialog } from "./_components/role-members-dialog";
import { RoleMenusDialog } from "./_components/role-menus-dialog";

export const Route = createFileRoute("/_layout/workspace/roles/")({
	component: RolesPage,
	validateSearch: WorkspaceRolesReadRolesQueryParams.catch(
		WorkspaceRolesReadRolesQueryParams.parse({}),
	),
});

function RolesPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const pagination = skipLimitToPagination(search.skip, search.limit);

	const params: WorkspaceRolesReadRolesParams = {
		...search,
		...paginationToSkipLimit(pagination),
	};

	const { data: response, isFetching } = useWorkspaceRolesReadRoles(params, {
		query: { placeholderData: keepPreviousData },
	});

	const roles = response?.status === 200 ? response.data.data : [];
	const totalCount = response?.status === 200 ? response.data.count : undefined;

	const [formOpen, setFormOpen] = useState(false);
	const [menusOpen, setMenusOpen] = useState(false);
	const [membersOpen, setMembersOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<RolePublic | null>(null);
	const [menusTarget, setMenusTarget] = useState<RolePublic | null>(null);
	const [membersTarget, setMembersTarget] = useState<RolePublic | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RolePublic | null>(null);

	const deleteMutation = useWorkspaceRolesDeleteRole({
		mutation: {
			onSuccess: () => {
				toast.success("角色删除成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceRolesReadRolesQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const handleEdit = (role: RolePublic) => {
		setEditingRole(role);
		setFormOpen(true);
	};

	const handleAssignMenus = (role: RolePublic) => {
		setMenusTarget(role);
		setMenusOpen(true);
	};

	const handleViewMembers = (role: RolePublic) => {
		setMembersTarget(role);
		setMembersOpen(true);
	};

	const handleDelete = (role: RolePublic) => {
		setDeleteTarget(role);
	};

	const columns = getColumns({
		onEdit: handleEdit,
		onAssignMenus: handleAssignMenus,
		onViewMembers: handleViewMembers,
		onDelete: handleDelete,
	});

	const handleReset = () => {
		navigate({ search: {}, replace: true });
	};

	return (
		<div className="flex flex-col h-full space-y-4">
			<DataTable
				columns={columns}
				data={roles}
				rowCount={totalCount}
				pagination={pagination}
				onPaginationChange={(updater) => {
					const next =
						typeof updater === "function" ? updater(pagination) : updater;
					navigate({
						search: (prev) => ({ ...prev, ...paginationToSkipLimit(next) }),
						replace: true,
					});
				}}
				toolbar={() => (
					<div className="flex items-center gap-2 mb-2">
						<FilterInput
							placeholder="搜索角色名称..."
							value={search.role_name ?? ""}
							onChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										role_name: val || undefined,
										skip: 0,
									}),
									replace: true,
								});
							}}
							className="max-w-[200px]"
						/>
						<Select
							value={
								search.is_active === true
									? "true"
									: search.is_active === false
										? "false"
										: "all"
							}
							onValueChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										is_active: val === "all" ? undefined : val === "true",
										skip: 0,
									}),
									replace: true,
								});
							}}
						>
							<SelectTrigger className="w-[120px]">
								<SelectValue placeholder="角色状态" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">全部状态</SelectItem>
								<SelectItem value="true">
									<div className="flex items-center gap-2">
										<div className="h-2 w-2 rounded-full bg-primary" />
										启用
									</div>
								</SelectItem>
								<SelectItem value="false">
									<div className="flex items-center gap-2">
										<div className="h-2 w-2 rounded-full bg-muted-foreground" />
										禁用
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<Button variant="ghost" onClick={handleReset}>
							<RotateCcw className="mr-1" />
							清除筛选
						</Button>
						<div className="flex-1" />
						{isFetching && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
						<AuthGuard code="roles:create">
							<Button
								onClick={() => {
									setEditingRole(null);
									setFormOpen(true);
								}}
							>
								<Plus className="mr-1" />
								新建角色
							</Button>
						</AuthGuard>
					</div>
				)}
			/>

			{formOpen && (
				<RoleFormDialog
					key={`form-${editingRole?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingRole={editingRole}
				/>
			)}

			<RoleMenusDialog
				key={`menus-${menusTarget?.id ?? "menus"}`}
				open={menusOpen}
				onOpenChange={setMenusOpen}
				role={menusTarget}
			/>

			<RoleMembersDialog
				key={`members-${membersTarget?.id ?? "members"}`}
				open={membersOpen}
				onOpenChange={setMembersOpen}
				role={membersTarget}
			/>

			{deleteTarget != null && (
				<ConfirmDialog
					key={`delete-${deleteTarget.id ?? "delete"}`}
					open={true}
					onOpenChange={(open) => !open && setDeleteTarget(null)}
					onConfirm={() => {
						if (deleteTarget?.id) {
							deleteMutation.mutate({ roleId: deleteTarget.id });
						}
					}}
					title="确认删除角色"
					description={`确定要删除角色「${deleteTarget?.role_name}」吗？此操作不可撤销。`}
					confirmText="删除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
