import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { SystemUsersReadUsersParams, UserPublic } from "@/api/schemas";
import {
	getSystemUsersReadUsersQueryKey,
	useSystemUsersDeleteUser,
	useSystemUsersReadUsers,
} from "@/api/system-users/system-users";
import { SystemUsersReadUsersQueryParams } from "@/api/zod/system-users/system-users";
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
import { UserFormDialog } from "./_components/user-form-dialog";

// ── Route definition ──
export const Route = createFileRoute("/_layout/system/users/")({
	component: UsersPage,
	validateSearch: SystemUsersReadUsersQueryParams.catch(
		SystemUsersReadUsersQueryParams.parse({}),
	),
});

// ── Main Page ──
function UsersPage() {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	// ── Pure URL-Driven Pagination ──
	const pagination = skipLimitToPagination(search.skip, search.limit);

	// ── API Params Mapping ──
	const params: SystemUsersReadUsersParams = {
		...search,
		...paginationToSkipLimit(pagination),
	};

	// ── Data query ──
	const { data: response, isFetching } = useSystemUsersReadUsers(params, {
		query: { placeholderData: keepPreviousData },
	});

	// Safely narrow the Orval Discriminated Union using exact status
	const users = response?.status === 200 ? response.data.data : [];
	const totalCount = response?.status === 200 ? response.data.count : undefined;

	// ── Dialog states ──
	const [formOpen, setFormOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<UserPublic | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null);

	// ── Delete mutation ──
	const deleteMutation = useSystemUsersDeleteUser({
		mutation: {
			onSuccess: () => {
				toast.success("用户删除成功");
				queryClient.invalidateQueries({
					queryKey: getSystemUsersReadUsersQueryKey(),
				});
				setDeleteTarget(null);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// ── Column callbacks ──
	const handleEdit = (user: UserPublic) => {
		setEditingUser(user);
		setFormOpen(true);
	};

	const handleDelete = (user: UserPublic) => {
		setDeleteTarget(user);
	};

	const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

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
				data={users}
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
							placeholder="搜索用户名..."
							value={search.username ?? ""}
							onChange={(val) => {
								navigate({
									search: (prev) => ({
										...prev,
										username: val || undefined,
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
								setEditingUser(null);
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
				<UserFormDialog
					key={`form-${editingUser?.id ?? "create"}`}
					open={formOpen}
					onOpenChange={setFormOpen}
					editingUser={editingUser}
				/>
			)}

			{deleteTarget != null && (
				<ConfirmDialog
					key={`delete-${deleteTarget.id ?? "delete"}`}
					open={true}
					onOpenChange={(open) => !open && setDeleteTarget(null)}
					onConfirm={() => {
						if (deleteTarget?.id) {
							deleteMutation.mutate({ userId: deleteTarget.id });
						}
					}}
					title="确认删除用户"
					description={`确定要删除用户「${deleteTarget?.username}」吗？此操作不可撤销。`}
					confirmText="删除"
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	);
}
