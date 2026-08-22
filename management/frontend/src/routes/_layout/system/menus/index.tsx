import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MenuTreeNode, SystemMenusReadMenusParams } from "@/api/schemas";
import {
	getSystemMenusReadMenusQueryKey,
	getSystemMenusReadMenusTreeQueryKey,
	useSystemMenusDeleteMenu,
	useSystemMenusReadMenus,
	useSystemMenusReadMenusTree,
} from "@/api/system-menus/system-menus";
import { SystemMenusReadMenusQueryParams } from "@/api/zod/system-menus/system-menus";
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
import { MenuFormDialog } from "./_components/menu-form-dialog";

export const Route = createFileRoute("/_layout/system/menus/")({
	component: MenusPage,
	validateSearch: SystemMenusReadMenusQueryParams.catch(
		SystemMenusReadMenusQueryParams.parse({}),
	),
});

function MenusPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const isFiltering = !!(search.name || search.is_active !== undefined);
	const pagination = skipLimitToPagination(
		search.skip ?? 0,
		search.limit ?? 100,
	);

	// ── Data query (Tree vs Flat) ──
	const { data: treeResponse, isFetching: treeFetching } =
		useSystemMenusReadMenusTree({
			query: {
				placeholderData: keepPreviousData,
				enabled: !isFiltering,
			},
		});

	const flatParams: SystemMenusReadMenusParams = {
		...search,
		...paginationToSkipLimit(pagination),
	};
	const { data: flatResponse, isFetching: flatFetching } =
		useSystemMenusReadMenus(flatParams, {
			query: {
				placeholderData: keepPreviousData,
				enabled: isFiltering,
			},
		});

	const menus: MenuTreeNode[] = isFiltering
		? flatResponse?.status === 200
			? (flatResponse.data.data as MenuTreeNode[])
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
	const [editingMenu, setEditingMenu] = useState<MenuTreeNode | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<MenuTreeNode | null>(null);

	// ── Delete mutation ──
	const deleteMutation = useSystemMenusDeleteMenu({
		mutation: {
			onSuccess: () => {
				toast.success("菜单删除成功");
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// ── Column callbacks ──
	const handleCreateChild = (menu: MenuTreeNode) => {
		setEditingMenu(null);
		setDefaultParentId(menu.id as string);
		setFormOpen(true);
	};

	const handleEdit = (menu: MenuTreeNode) => {
		setEditingMenu(menu);
		setDefaultParentId(undefined);
		setFormOpen(true);
	};

	const handleDelete = (menu: MenuTreeNode) => {
		setDeleteTarget(menu);
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
			<DataTable<MenuTreeNode, unknown>
				columns={columns}
				data={menus}
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
						: (row) => row.children as MenuTreeNode[] | undefined
				}
				toolbar={() => (
					<div className="flex items-center gap-2 mb-2">
						<FilterInput
							placeholder="搜索菜单名称..."
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
								setEditingMenu(null);
								setDefaultParentId(undefined);
								setFormOpen(true);
							}}
						>
							<Plus className="mr-1" />
							新建菜单
						</Button>
					</div>
				)}
			/>

			{formOpen && (
				<MenuFormDialog
					key={`form-${editingMenu?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingMenu={editingMenu}
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
							deleteMutation.mutate({ id: deleteTarget.id });
						}
					}}
					title="确认删除菜单"
					description={`确定要删除菜单「${deleteTarget?.name}」吗？如果它有子菜单则无法删除。此操作不可撤销。`}
					confirmText="删除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
