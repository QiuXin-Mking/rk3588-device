import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoCollectionScenesReadCollectionScenesQueryKey,
	useEgoCollectionScenesCreateCollectionScene,
	useEgoCollectionScenesDeleteCollectionScene,
	useEgoCollectionScenesReadCollectionScenes,
	useEgoCollectionScenesUpdateCollectionScene,
} from "@/api/ego-collection-scenes/ego-collection-scenes";
import type { CollectionScenePublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/collection-scenes/")({
	component: CollectionScenesPage,
	validateSearch: resourceSearchSchema,
});

const formFields: ResourceCreateField[] = [
	{ name: "name", label: "场景名称", required: true },
	{ name: "description", label: "场景说明", multiline: true, multilineRows: 5 },
	{
		name: "status",
		label: "状态",
		required: true,
		options: [
			{ value: "ACTIVE", label: "启用" },
			{ value: "INACTIVE", label: "停用" },
		],
	},
	{ name: "sort", label: "排序", type: "number" },
];

function CollectionScenesPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CollectionScenePublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } =
		useEgoCollectionScenesReadCollectionScenes(
			{ ...paginationToSkipLimit(pagination), q: search.q },
			{ query: { placeholderData: keepPreviousData } },
		);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoCollectionScenesCreateCollectionScene();
	const updateMutation = useEgoCollectionScenesUpdateCollectionScene();
	const deleteMutation = useEgoCollectionScenesDeleteCollectionScene();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoCollectionScenesReadCollectionScenesQueryKey(),
		});

	return (
		<>
			<ResourceTablePage<CollectionScenePublic>
				title="场景管理"
				description="统一维护任务可选择的采集场景；任务创建时只能从启用场景中选择。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新增场景"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除场景“${item.name}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("场景已删除");
					} finally {
						setDeletingId("");
					}
				}}
				pagination={pagination}
				onPaginationChange={(next) =>
					navigate({
						search: (prev) => ({ ...prev, ...paginationToSkipLimit(next) }),
					})
				}
				query={search.q ?? ""}
				onQueryChange={(q) =>
					navigate({
						search: (prev) => ({ ...prev, q: q || undefined, skip: 0 }),
						replace: true,
					})
				}
				columns={[
					{ key: "name", label: "场景名称", size: 220 },
					{ key: "description", label: "场景说明", size: 500 },
					{ key: "status", label: "状态", size: 100 },
					{ key: "sort", label: "排序", size: 80 },
					{ key: "updated_at", label: "更新时间", size: 180 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-scene"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑场景" : "新增场景"}
				description="场景保存后可在采集任务中搜索选择。"
				fields={formFields}
				initialValues={
					editing
						? resourceFormValues(editing, formFields)
						: { status: "ACTIVE", sort: "1" }
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						name: values.name.trim(),
						description: values.description.trim(),
						status: values.status,
						sort: Number(values.sort) || 1,
					};
					if (editing)
						await updateMutation.mutateAsync({
							resourceId: editing.id ?? "",
							data,
						});
					else await createMutation.mutateAsync({ data });
					await refresh();
					setCreateOpen(false);
					setEditing(undefined);
					toast.success(editing ? "场景已更新" : "场景已创建");
				}}
			/>
		</>
	);
}
