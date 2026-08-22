import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
	BusinessLineTreeNode,
	WorkspaceBusinessLinesReadBusinessLinesParams,
} from "@/api/schemas";
import {
	getWorkspaceBusinessLinesReadBusinessLinesQueryKey,
	getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey,
	useWorkspaceBusinessLinesDeleteBusinessLine,
	useWorkspaceBusinessLinesReadBusinessLines,
	useWorkspaceBusinessLinesReadBusinessLinesTree,
} from "@/api/workspace-business-lines/workspace-business-lines";
import { WorkspaceBusinessLinesReadBusinessLinesQueryParams } from "@/api/zod/workspace-business-lines/workspace-business-lines";
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
import { BusinessLineFormDialog } from "./_components/business-line-form-dialog";
import { getColumns } from "./_components/columns";

export const Route = createFileRoute("/_layout/workspace/business-lines/")({
	component: BusinessLinesPage,
	validateSearch: WorkspaceBusinessLinesReadBusinessLinesQueryParams.catch(
		WorkspaceBusinessLinesReadBusinessLinesQueryParams.parse({}),
	),
});

function BusinessLinesPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const isFiltering = !!(search.name || search.status !== undefined);
	const pagination = skipLimitToPagination(
		search.skip ?? 0,
		search.limit ?? 100,
	);

	// ── Data query (Tree vs Flat) ──
	const { data: treeResponse, isFetching: treeFetching } =
		useWorkspaceBusinessLinesReadBusinessLinesTree(undefined, {
			query: {
				placeholderData: keepPreviousData,
				enabled: !isFiltering,
			},
		});

	const flatParams: WorkspaceBusinessLinesReadBusinessLinesParams = {
		...search,
		...paginationToSkipLimit(pagination),
	};
	const { data: flatResponse, isFetching: flatFetching } =
		useWorkspaceBusinessLinesReadBusinessLines(flatParams, {
			query: {
				placeholderData: keepPreviousData,
				enabled: isFiltering,
			},
		});

	const businessLines: BusinessLineTreeNode[] = isFiltering
		? flatResponse?.status === 200
			? (flatResponse.data.data as BusinessLineTreeNode[])
			: []
		: treeResponse?.status === 200
			? treeResponse.data
			: [];

	const totalCount = isFiltering
		? flatResponse?.status === 200
			? flatResponse.data.count
			: undefined
		: undefined;

	const isFetching = treeFetching || flatFetching;

	// ── Dialog states ──
	const [formOpen, setFormOpen] = useState(false);
	const [defaultParentId, setDefaultParentId] = useState<string | undefined>(
		undefined,
	);
	const [editingBusinessLine, setEditingBusinessLine] =
		useState<BusinessLineTreeNode | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<BusinessLineTreeNode | null>(
		null,
	);

	// ── Delete mutation ──
	const deleteMutation = useWorkspaceBusinessLinesDeleteBusinessLine({
		mutation: {
			onSuccess: () => {
				toast.success("业务线删除成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// ── Column callbacks ──
	const handleCreateChild = (businessLine: BusinessLineTreeNode) => {
		setEditingBusinessLine(null);
		setDefaultParentId(businessLine.id as string);
		setFormOpen(true);
	};

	const handleEdit = (businessLine: BusinessLineTreeNode) => {
		setEditingBusinessLine(businessLine);
		setDefaultParentId(undefined);
		setFormOpen(true);
	};

	const handleDelete = (businessLine: BusinessLineTreeNode) => {
		setDeleteTarget(businessLine);
	};

	const columns = getColumns({
		onCreateChild: handleCreateChild,
		onEdit: handleEdit,
		onDelete: handleDelete,
	});

	const handleReset = () => {
		navigate({ search: {}, replace: true });
	};

	return (
		<div className="flex flex-col h-full space-y-4">
			<DataTable<BusinessLineTreeNode, unknown>
				columns={columns}
				data={businessLines}
				rowCount={totalCount}
				pagination={isFiltering ? pagination : undefined}
				onPaginationChange={
					isFiltering
						? (updater) => {
								const next =
									typeof updater === "function" ? updater(pagination) : updater;
								navigate({
									search: (prev) => ({
										...prev,
										...paginationToSkipLimit(next),
									}),
									replace: true,
								});
							}
						: undefined
				}
				getSubRows={
					isFiltering
						? undefined
						: (row) => row.children as BusinessLineTreeNode[] | undefined
				}
				toolbar={() => (
					<div className="flex items-center gap-2 mb-2">
						<FilterInput
							placeholder="搜索业务线名称..."
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
							className="max-w-[150px] lg:max-w-[200px]"
						/>
						<Select
							value={
								search.status === 1 ? "1" : search.status === 0 ? "0" : "all"
							}
							onValueChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										status: val === "all" ? undefined : parseInt(val, 10),
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
								<SelectItem value="1">
									<div className="flex items-center gap-2">
										<div className="h-2 w-2 rounded-full bg-primary" />
										启用
									</div>
								</SelectItem>
								<SelectItem value="0">
									<div className="flex items-center gap-2">
										<div className="h-2 w-2 rounded-full bg-muted-foreground" />
										停用
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
						<AuthGuard code="business_lines:create">
							<Button
								onClick={() => {
									setEditingBusinessLine(null);
									setDefaultParentId(undefined);
									setFormOpen(true);
								}}
							>
								<Plus className="mr-1" />
								新建业务线
							</Button>
						</AuthGuard>
					</div>
				)}
			/>

			{formOpen && (
				<BusinessLineFormDialog
					key={`form-${editingBusinessLine?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingBusinessLine={editingBusinessLine}
					defaultParentId={defaultParentId}
				/>
			)}

			{deleteTarget != null && (
				<ConfirmDialog
					key={`delete-${deleteTarget.id ?? "delete"}`}
					open={true}
					onOpenChange={(open) => !open && setDeleteTarget(null)}
					onConfirm={() => {
						if (deleteTarget?.id) {
							deleteMutation.mutate({ businessLineId: deleteTarget.id });
						}
					}}
					title="确认删除业务线"
					description={`确定要删除业务线「${deleteTarget?.name}」吗？如果其下包含子节点则无法被删除。此操作不可撤销。`}
					confirmText="删除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
