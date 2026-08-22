import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { WorkspacePublic } from "@/api/schemas";
import {
	getSystemWorkspacesReadWorkspacesQueryKey,
	useSystemWorkspacesDeleteWorkspace,
	useSystemWorkspacesReadWorkspaces,
} from "@/api/system-workspaces/system-workspaces";
import { SystemWorkspacesReadWorkspacesQueryParams } from "@/api/zod/system-workspaces/system-workspaces";
import { ConfirmDialog } from "@/components/dialogs";
import { FilterInput } from "@/components/filters";
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
import { WorkspaceFormDialog } from "./_components/workspace-form-dialog";
import { WorkspaceMenusDialog } from "./_components/workspace-menus-dialog";

// ── Route definition ──
export const Route = createFileRoute("/_layout/system/workspaces/")({
	component: WorkspacesPage,
	validateSearch: SystemWorkspacesReadWorkspacesQueryParams.catch(
		SystemWorkspacesReadWorkspacesQueryParams.parse({}),
	),
});

// ── Main Page ──
function WorkspacesPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	// ── Pure URL-Driven Pagination ──
	const pagination = skipLimitToPagination(search.skip, search.limit);

	// ── API Params Mapping ──
	const params = {
		...search,
		...paginationToSkipLimit(pagination),
	};

	// ── Data query ──
	const { data: response, isFetching } = useSystemWorkspacesReadWorkspaces(
		params,
		{
			query: { placeholderData: keepPreviousData },
		},
	);

	// Safely narrow the Orval Discriminated Union using exact status
	const workspaces = response?.status === 200 ? response.data.data : [];
	const totalCount = response?.status === 200 ? response.data.count : undefined;

	// ── Dialog states ──
	const [formOpen, setFormOpen] = useState(false);
	const [editingWorkspace, setEditingWorkspace] =
		useState<WorkspacePublic | null>(null);

	const [bindingOpen, setBindingOpen] = useState(false);
	const [bindingWorkspace, setBindingWorkspace] =
		useState<WorkspacePublic | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<WorkspacePublic | null>(
		null,
	);

	// ── Delete mutation ──
	const deleteMutation = useSystemWorkspacesDeleteWorkspace({
		mutation: {
			onSuccess: () => {
				toast.success("工作区删除成功");
				queryClient.invalidateQueries({
					queryKey: getSystemWorkspacesReadWorkspacesQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// ── Column callbacks ──
	const handleEdit = (workspace: WorkspacePublic) => {
		setEditingWorkspace(workspace);
		setFormOpen(true);
	};

	const handleBind = (workspace: WorkspacePublic) => {
		setBindingWorkspace(workspace);
		setBindingOpen(true);
	};

	const handleDelete = (workspace: WorkspacePublic) => {
		setDeleteTarget(workspace);
	};

	const columns = getColumns({
		onEdit: handleEdit,
		onDelete: handleDelete,
		onBind: handleBind,
	});

	const handleReset = () => {
		navigate({
			search: {}, // Resets to schema defaults
			replace: true,
		});
	};

	return (
		<div className="flex flex-col h-full space-y-4">
			<DataTable
				columns={columns}
				data={workspaces}
				rowCount={totalCount}
				pagination={pagination}
				onPaginationChange={(updater) => {
					const next =
						typeof updater === "function" ? updater(pagination) : updater;
					navigate({
						search: (prev) => ({
							...prev,
							...paginationToSkipLimit(next),
						}),
						replace: true,
					});
				}}
				toolbar={() => (
					<div className="flex items-center gap-2 mb-2">
						<FilterInput
							placeholder="搜索工作区名称..."
							value={search.name ?? ""}
							onChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										name: val || undefined,
										skip: 0,
									}),
									replace: true,
								});
							}}
							className="max-w-xs"
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
								<SelectValue placeholder="选择状态" />
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
						<Button
							onClick={() => {
								setEditingWorkspace(null);
								setFormOpen(true);
							}}
						>
							<Plus className="mr-1" />
							新建
						</Button>
					</div>
				)}
			/>

			{formOpen && (
				<WorkspaceFormDialog
					key={`form-${editingWorkspace?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingWorkspace={editingWorkspace}
				/>
			)}

			{bindingOpen && bindingWorkspace && (
				<WorkspaceMenusDialog
					key={`bind-${bindingWorkspace.id ?? "bind"}`}
					open={bindingOpen}
					onOpenChange={setBindingOpen}
					bindingWorkspace={bindingWorkspace}
				/>
			)}

			{deleteTarget != null && (
				<ConfirmDialog
					key={`delete-${deleteTarget.id ?? "delete"}`}
					open={true}
					onOpenChange={(open) => !open && setDeleteTarget(null)}
					onConfirm={() => {
						if (deleteTarget?.id) {
							deleteMutation.mutate({ workspaceId: deleteTarget.id });
						}
					}}
					title="确认删除工作区"
					description={`确定要删除工作区「${deleteTarget?.name}」吗？此操作不可撤销。`}
					confirmText="删除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
