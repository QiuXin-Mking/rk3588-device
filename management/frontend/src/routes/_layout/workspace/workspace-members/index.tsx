import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw, ShieldPlus, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
	WorkspaceMemberPublic,
	WorkspaceMembersReadWorkspaceMembersParams,
} from "@/api/schemas";
import {
	getWorkspaceMembersReadWorkspaceMembersQueryKey,
	useWorkspaceMembersBatchEnableWorkspaceMembers,
	useWorkspaceMembersDeleteWorkspaceMember,
	useWorkspaceMembersReadWorkspaceMembers,
} from "@/api/workspace-members/workspace-members";
import { WorkspaceMembersReadWorkspaceMembersQueryParams } from "@/api/zod/workspace-members/workspace-members";
import { ConfirmDialog } from "@/components/dialogs";
import {
	FilterBusinessLineMultiPicker,
	FilterInput,
	type FilterValues,
} from "@/components/filters";
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
import type { SidebarContentProps } from "@/routes/_layout";
import { getColumns } from "./_components/columns";
import { WorkspaceMemberAddRolesDialog } from "./_components/workspace-member-add-roles-dialog";
import { WorkspaceMemberBatchSelectDialog } from "./_components/workspace-member-batch-select-dialog";
import { WorkspaceMemberFormDialog } from "./_components/workspace-member-form-dialog";
import { WorkspaceMemberRolesDialog } from "./_components/workspace-member-roles-dialog";
import { WorkspaceMemberSidebarContent } from "./_components/workspace-member-sidebar-content";

type Member = WorkspaceMemberPublic;

export const Route = createFileRoute("/_layout/workspace/workspace-members/")({
	component: WorkspaceMembersPage,
	validateSearch: WorkspaceMembersReadWorkspaceMembersQueryParams.catch(
		WorkspaceMembersReadWorkspaceMembersQueryParams.parse({}),
	),
	staticData: {
		SidebarContent: SidebarWrapper,
	},
});

function SidebarWrapper({ onBack }: SidebarContentProps) {
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const handleFilterChange = (key: string, value: string) => {
		navigate({
			search: (prev) => ({
				...prev,
				[key]: value || undefined,
				skip: 0,
			}),
			replace: true,
		});
	};

	return (
		<WorkspaceMemberSidebarContent
			filters={search as unknown as Record<string, string>}
			onFilterChange={handleFilterChange}
			onBack={onBack}
		/>
	);
}

function WorkspaceMembersPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const pagination = skipLimitToPagination(search.skip, search.limit);

	const params: WorkspaceMembersReadWorkspaceMembersParams = {
		...search,
		...paginationToSkipLimit(pagination),
	};

	const { data: response, isFetching } =
		useWorkspaceMembersReadWorkspaceMembers(params, {
			query: { placeholderData: keepPreviousData },
		});

	const members = response?.status === 200 ? response.data.data : [];
	const totalCount = response?.status === 200 ? response.data.count : undefined;

	const [formOpen, setFormOpen] = useState(false);
	const [rolesOpen, setRolesOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<Member | null>(null);
	const [rolesTarget, setRolesTarget] = useState<Member | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
	const [batchSelectMode, setBatchSelectMode] = useState<
		"enable" | "add-roles" | null
	>(null);
	const [batchMemberIds, setBatchMemberIds] = useState<string[]>([]);
	const [batchEnableOpen, setBatchEnableOpen] = useState(false);
	const [addRolesOpen, setAddRolesOpen] = useState(false);

	const deleteMutation = useWorkspaceMembersDeleteWorkspaceMember({
		mutation: {
			onSuccess: () => {
				toast.success("成员删除成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceMembersReadWorkspaceMembersQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const batchEnableMutation = useWorkspaceMembersBatchEnableWorkspaceMembers({
		mutation: {
			onSuccess: (batchResponse) => {
				toast.success(
					batchResponse.status === 200
						? batchResponse.data.message
						: "账号开启成功",
				);
				queryClient.invalidateQueries({
					queryKey: getWorkspaceMembersReadWorkspaceMembersQueryKey(),
				});
				setBatchEnableOpen(false);
				setBatchMemberIds([]);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const handleEdit = (member: Member) => {
		setEditingMember(member);
		setFormOpen(true);
	};

	const handleSetupRoles = (member: Member) => {
		setRolesTarget(member);
		setRolesOpen(true);
	};

	const handleDelete = (member: Member) => {
		setDeleteTarget(member);
	};

	const columns = getColumns({
		onEdit: handleEdit,
		onSetupRoles: handleSetupRoles,
		onDelete: handleDelete,
	});

	const handleReset = () => {
		navigate({ search: {}, replace: true });
	};

	return (
		<div className="flex flex-col h-full space-y-4">
			<DataTable
				columns={columns}
				data={members}
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
							placeholder="搜索员工姓名..."
							value={search.employee_name ?? ""}
							onChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										employee_name: val || undefined,
										skip: 0,
									}),
									replace: true,
								});
							}}
							className="max-w-[200px]"
						/>
						<FilterInput
							placeholder="搜索员工状态(如:在职)..."
							value={search.employee_status ?? ""}
							onChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										employee_status: val || undefined,
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
								<SelectValue placeholder="账号状态" />
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
						<div className="w-[200px]">
							<FilterBusinessLineMultiPicker
								filterKey="business_line_ids"
								filters={search as FilterValues}
								onFilterChange={(key, value) => {
									navigate({
										search: (prev) => ({
											...prev,
											[key]: value
												? value.split(",").filter(Boolean)
												: undefined,
											skip: 0,
										}),
										replace: true,
									});
								}}
								placeholder="按业务线搜索..."
							/>
						</div>
						<Button variant="ghost" onClick={handleReset}>
							<RotateCcw className="mr-1" />
							清除筛选
						</Button>
						<div className="flex-1" />
						{isFetching && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
						<AuthGuard code="workspace_members:batch_enable">
							<Button
								variant="outline"
								onClick={() => setBatchSelectMode("enable")}
							>
								<UserCheck data-icon="inline-start" />
								批量开启账号
							</Button>
						</AuthGuard>
						<AuthGuard code="workspace_members:add_roles">
							<Button
								variant="outline"
								onClick={() => setBatchSelectMode("add-roles")}
							>
								<ShieldPlus data-icon="inline-start" />
								批量增加角色
							</Button>
						</AuthGuard>
						<AuthGuard code="workspace_members:create">
							<Button
								onClick={() => {
									setEditingMember(null);
									setFormOpen(true);
								}}
							>
								<Plus className="mr-1" />
								添加成员
							</Button>
						</AuthGuard>
					</div>
				)}
			/>

			{formOpen && (
				<WorkspaceMemberFormDialog
					key={`form-${editingMember?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingMember={editingMember}
				/>
			)}

			<WorkspaceMemberRolesDialog
				key={`roles-${rolesTarget?.id ?? "roles"}`}
				open={rolesOpen}
				onOpenChange={setRolesOpen}
				member={rolesTarget}
			/>

			<WorkspaceMemberAddRolesDialog
				key={`add-roles-${addRolesOpen ? batchMemberIds.join("-") : "closed"}`}
				open={addRolesOpen}
				onOpenChange={setAddRolesOpen}
				memberIds={batchMemberIds}
			/>

			{batchSelectMode && (
				<WorkspaceMemberBatchSelectDialog
					key={`batch-select-${batchSelectMode}-${(search.business_line_ids ?? []).join("-")}`}
					open={true}
					onOpenChange={(open) => !open && setBatchSelectMode(null)}
					mode={batchSelectMode}
					initialBusinessLineIds={search.business_line_ids ?? []}
					baseFilters={params}
					onConfirm={(memberIds) => {
						setBatchMemberIds(memberIds);
						if (batchSelectMode === "enable") {
							setBatchEnableOpen(true);
						} else {
							setAddRolesOpen(true);
						}
						setBatchSelectMode(null);
					}}
				/>
			)}

			<ConfirmDialog
				open={batchEnableOpen}
				onOpenChange={setBatchEnableOpen}
				onConfirm={() =>
					batchEnableMutation.mutate({
						data: { member_ids: batchMemberIds },
					})
				}
				title="批量开启账号"
				description={`确定开启所选 ${batchMemberIds.length} 位成员的账号吗？已开启的账号不会受到影响。`}
				confirmText="确认开启"
				isPending={batchEnableMutation.isPending}
			/>

			{deleteTarget != null && (
				<ConfirmDialog
					key={`delete-${deleteTarget.id ?? "delete"}`}
					open={true}
					onOpenChange={(open) => !open && setDeleteTarget(null)}
					onConfirm={() => {
						if (deleteTarget?.id) {
							deleteMutation.mutate({ memberId: deleteTarget.id });
						}
					}}
					title="确认移除成员"
					description={`确定要将员工「${deleteTarget?.employee_name}」从工作空间移除吗？此操作不可撤销。`}
					confirmText="移除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
