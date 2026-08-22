import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoCollectionSopsReadCollectionSopsQueryKey,
	useEgoCollectionSopsCreateCollectionSop,
	useEgoCollectionSopsDeleteCollectionSop,
	useEgoCollectionSopsReadCollectionSops,
	useEgoCollectionSopsUpdateCollectionSop,
} from "@/api/ego-collection-sops/ego-collection-sops";
import type { CollectionSopPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/collection-sops/")({
	component: CollectionSopsPage,
	validateSearch: resourceSearchSchema,
});

const formFields: ResourceCreateField[] = [
	{ name: "name", label: "SOP 名称", required: true },
	{
		name: "content",
		label: "SOP 详细内容",
		required: true,
		multiline: true,
		multilineRows: 14,
		placeholder: "请直接填写或粘贴 SOP 纯文本内容",
	},
];

function CollectionSopsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CollectionSopPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } =
		useEgoCollectionSopsReadCollectionSops(
			{ ...paginationToSkipLimit(pagination), q: search.q },
			{ query: { placeholderData: keepPreviousData } },
		);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoCollectionSopsCreateCollectionSop();
	const updateMutation = useEgoCollectionSopsUpdateCollectionSop();
	const deleteMutation = useEgoCollectionSopsDeleteCollectionSop();
	const refresh = () => queryClient.invalidateQueries({
		queryKey: getEgoCollectionSopsReadCollectionSopsQueryKey(),
	});

	return <>
		<ResourceTablePage<CollectionSopPublic>
			title="SOP 管理"
			description="统一维护可复用的任务 SOP；一个 SOP 可以关联多个采集任务。"
			data={page?.data ?? []}
			rowCount={page?.count ?? 0}
			isFetching={isFetching}
			onCreate={() => setCreateOpen(true)}
			createLabel="新增 SOP"
			onEdit={setEditing}
			deletingId={deletingId}
			onDelete={async (item) => {
				if (!window.confirm(`确定删除 SOP“${item.name}”吗？`)) return;
				setDeletingId(item.id ?? "");
				try {
					await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
					await refresh();
					toast.success("SOP 已删除");
				} finally {
					setDeletingId("");
				}
			}}
			pagination={pagination}
			onPaginationChange={(next) => navigate({
				search: (prev) => ({ ...prev, ...paginationToSkipLimit(next) }),
			})}
			query={search.q ?? ""}
			onQueryChange={(q) => navigate({
				search: (prev) => ({ ...prev, q: q || undefined, skip: 0 }),
				replace: true,
			})}
			columns={[
				{ key: "name", label: "SOP 名称", size: 220 },
				{ key: "content", label: "SOP 详细内容", size: 600 },
				{ key: "updated_at", label: "更新时间", size: 180 },
			]}
		/>
		<ResourceCreateDialog
			key={editing?.id ?? "create-sop"}
			open={createOpen || Boolean(editing)}
			onOpenChange={(open) => {
				setCreateOpen(open);
				if (!open) setEditing(undefined);
			}}
			title={editing ? "编辑 SOP" : "新增 SOP"}
			description="SOP 使用纯文本保存，并在设备端和移动端直接显示。"
			fields={formFields}
			initialValues={editing ? resourceFormValues(editing, formFields) : undefined}
			isPending={createMutation.isPending || updateMutation.isPending}
			onSubmit={async (values) => {
				const data = { name: values.name.trim(), content: values.content.trim() };
				if (editing) {
					await updateMutation.mutateAsync({ resourceId: editing.id ?? "", data });
				} else {
					await createMutation.mutateAsync({ data });
				}
				await refresh();
				setCreateOpen(false);
				setEditing(undefined);
				toast.success(editing ? "SOP 已更新" : "SOP 已创建");
			}}
		/>
	</>;
}
