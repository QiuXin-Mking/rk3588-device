import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoCollectionRecordsReadCollectionRecordsQueryKey,
	useEgoCollectionRecordsCreateCollectionRecord,
	useEgoCollectionRecordsDeleteCollectionRecord,
	useEgoCollectionRecordsReadCollectionRecords,
	useEgoCollectionRecordsUpdateCollectionRecord,
} from "@/api/ego-collection-records/ego-collection-records";
import type { CollectionRecordPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/collection-records/")(
	{ component: CollectionRecordsPage, validateSearch: resourceSearchSchema },
);
const formFields: ResourceCreateField[] = [
	{ name: "record_no", label: "记录编号", required: true },
	{ name: "project_name", label: "项目名称" },
	{ name: "task_name", label: "任务名称" },
	{ name: "subtask_name", label: "子任务" },
	{ name: "kit_name", label: "套件" },
	{ name: "capture_location", label: "采集地点" },
	{ name: "device_serial", label: "设备 SN" },
	{ name: "operator_username", label: "操作员" },
	{ name: "file_name", label: "文件名" },
	{ name: "qa_status", label: "验收状态" },
	{ name: "upload_status", label: "上传状态" },
	{ name: "data_status", label: "数据状态" },
	{ name: "remark", label: "备注", multiline: true },
];

function CollectionRecordsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CollectionRecordPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } =
		useEgoCollectionRecordsReadCollectionRecords(
			{
				...paginationToSkipLimit(pagination),
				q: search.q,
				status: search.status,
			},
			{ query: { placeholderData: keepPreviousData } },
		);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoCollectionRecordsCreateCollectionRecord();
	const updateMutation = useEgoCollectionRecordsUpdateCollectionRecord();
	const deleteMutation = useEgoCollectionRecordsDeleteCollectionRecord();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoCollectionRecordsReadCollectionRecordsQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<CollectionRecordPublic>
				title="数据与验收"
				description="按项目、任务和子任务查看采集数据，管理验收状态与数据状态。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="补录记录"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除记录“${item.record_no}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("采集记录已删除");
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
					{ key: "record_no", label: "记录编号", size: 190 },
					{ key: "project_name", label: "项目", size: 160 },
					{ key: "task_name", label: "任务", size: 180 },
					{ key: "subtask_name", label: "子任务", size: 160 },
					{ key: "kit_name", label: "套件", size: 150 },
					{ key: "capture_location", label: "采集地点", size: 180 },
					{ key: "device_serial", label: "设备 SN", size: 150 },
					{ key: "operator_username", label: "操作员", size: 120 },
					{ key: "file_name", label: "文件", size: 220 },
					{ key: "duration_seconds", label: "时长(秒)", size: 90 },
					{ key: "file_size_bytes", label: "文件字节", size: 120 },
					{ key: "status", label: "记录状态", size: 100 },
					{ key: "qa_status", label: "验收状态", size: 110 },
					{ key: "data_status", label: "数据状态", size: 110 },
					{ key: "upload_status", label: "上传", size: 100 },
					{ key: "captured_at", label: "采集时间", size: 180 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-record"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑采集记录" : "补录采集记录"}
				description="正常记录由 device/mobile 自动上报，本入口用于软件侧联调和补录。"
				fields={formFields}
				initialValues={
					editing ? resourceFormValues(editing, formFields) : undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						record_no: values.record_no,
						project_name: values.project_name || undefined,
						task_name: values.task_name || undefined,
						subtask_name: values.subtask_name || undefined,
						kit_name: values.kit_name || undefined,
						capture_location: values.capture_location || undefined,
						device_serial: values.device_serial || undefined,
						operator_username: values.operator_username || undefined,
						file_name: values.file_name || undefined,
						qa_status: values.qa_status || undefined,
						upload_status: values.upload_status || undefined,
						data_status: values.data_status || undefined,
						remark: values.remark || undefined,
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
					toast.success(editing ? "采集记录已更新" : "采集记录已补录");
				}}
			/>
		</>
	);
}
