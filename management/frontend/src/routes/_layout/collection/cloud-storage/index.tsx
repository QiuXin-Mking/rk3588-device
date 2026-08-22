import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoCloudStorageReadCloudStorageQueryKey,
	useEgoCloudStorageCreateCloudStorage,
	useEgoCloudStorageDeleteCloudStorage,
	useEgoCloudStorageReadCloudStorage,
	useEgoCloudStorageUpdateCloudStorage,
} from "@/api/ego-cloud-storage/ego-cloud-storage";
import type { CloudStoragePublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/cloud-storage/")({
	component: CloudStoragePage,
	validateSearch: resourceSearchSchema,
});
const formFields: ResourceCreateField[] = [
	{ name: "name", label: "连接名称", required: true },
	{ name: "provider", label: "服务商", required: true },
	{ name: "endpoint", label: "Endpoint" },
	{ name: "bucket", label: "Bucket" },
	{ name: "region", label: "区域" },
];

function CloudStoragePage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CloudStoragePublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } = useEgoCloudStorageReadCloudStorage(
		{
			...paginationToSkipLimit(pagination),
			q: search.q,
			status: search.status,
		},
		{ query: { placeholderData: keepPreviousData } },
	);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoCloudStorageCreateCloudStorage();
	const updateMutation = useEgoCloudStorageUpdateCloudStorage();
	const deleteMutation = useEgoCloudStorageDeleteCloudStorage();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoCloudStorageReadCloudStorageQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<CloudStoragePublic>
				title="云存储"
				description="管理软件侧云存储连接和容量视图；当前未提供的硬件/存储接口只保留页面与契约。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新增连接"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除云存储连接“${item.name}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("云存储连接已删除");
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
					{ key: "name", label: "连接名称", size: 180 },
					{ key: "provider", label: "服务商", size: 120 },
					{ key: "endpoint", label: "Endpoint", size: 260 },
					{ key: "bucket", label: "Bucket", size: 160 },
					{ key: "region", label: "区域", size: 110 },
					{ key: "used_bytes", label: "已用字节", size: 130 },
					{ key: "total_bytes", label: "总字节", size: 130 },
					{ key: "status", label: "状态", size: 100 },
					{ key: "is_active", label: "启用", size: 80 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-cloud"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑云存储连接" : "新增云存储连接"}
				description="当前只保存软件侧配置；未接入接口时不会尝试访问硬件或真实云服务。"
				fields={formFields}
				initialValues={
					editing ? resourceFormValues(editing, formFields) : undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						name: values.name,
						provider: values.provider,
						endpoint: values.endpoint || undefined,
						bucket: values.bucket || undefined,
						region: values.region || undefined,
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
					toast.success(editing ? "云存储连接已更新" : "云存储连接已创建");
				}}
			/>
		</>
	);
}
