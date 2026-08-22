import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoReleaseVersionsReadReleaseVersionsQueryKey,
	useEgoReleaseVersionsCreateReleaseVersion,
	useEgoReleaseVersionsDeleteReleaseVersion,
	useEgoReleaseVersionsReadReleaseVersions,
	useEgoReleaseVersionsUpdateReleaseVersion,
} from "@/api/ego-release-versions/ego-release-versions";
import type { ReleaseVersionPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/release-versions/")({
	component: ReleaseVersionsPage,
	validateSearch: resourceSearchSchema,
});
const formFields: ResourceCreateField[] = [
	{
		name: "platform",
		label: "平台",
		required: true,
		placeholder: "device / mobile / management",
	},
	{ name: "version", label: "版本号", required: true },
	{ name: "release_notes", label: "发布说明", multiline: true },
	{ name: "download_url", label: "下载地址" },
	{ name: "status", label: "发布状态" },
];

function ReleaseVersionsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<ReleaseVersionPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } =
		useEgoReleaseVersionsReadReleaseVersions(
			{
				...paginationToSkipLimit(pagination),
				q: search.q,
				status: search.status,
			},
			{ query: { placeholderData: keepPreviousData } },
		);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoReleaseVersionsCreateReleaseVersion();
	const updateMutation = useEgoReleaseVersionsUpdateReleaseVersion();
	const deleteMutation = useEgoReleaseVersionsDeleteReleaseVersion();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoReleaseVersionsReadReleaseVersionsQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<ReleaseVersionPublic>
				title="版本管理"
				description="统一管理 device、mobile 与 management 的版本记录、发布说明和下载地址。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="发布版本"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除版本“${item.version}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("版本记录已删除");
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
					{ key: "platform", label: "平台", size: 110 },
					{ key: "version", label: "版本", size: 120 },
					{ key: "build_number", label: "构建号", size: 90 },
					{ key: "status", label: "状态", size: 100 },
					{ key: "is_current", label: "当前版本", size: 90 },
					{ key: "release_notes", label: "发布说明", size: 360 },
					{ key: "download_url", label: "下载地址", size: 260 },
					{ key: "published_at", label: "发布时间", size: 180 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-version"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑版本记录" : "发布版本记录"}
				description="分别记录 device、mobile 和 management 的软件版本。"
				fields={formFields}
				initialValues={
					editing ? resourceFormValues(editing, formFields) : undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						platform: values.platform,
						version: values.version,
						release_notes: values.release_notes || undefined,
						download_url: values.download_url || undefined,
						status: values.status || undefined,
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
					toast.success(editing ? "版本记录已更新" : "版本记录已发布");
				}}
			/>
		</>
	);
}
