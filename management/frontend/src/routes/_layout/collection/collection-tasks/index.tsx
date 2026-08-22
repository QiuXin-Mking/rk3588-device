import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	egoCollectionScenesReadCollectionScenes,
	useEgoCollectionScenesReadCollectionScenes,
} from "@/api/ego-collection-scenes/ego-collection-scenes";
import { useEgoCollectionSopsReadCollectionSops } from "@/api/ego-collection-sops/ego-collection-sops";
import {
	getEgoCollectionTasksReadCollectionTasksQueryKey,
	useEgoCollectionTasksCreateCollectionTask,
	useEgoCollectionTasksDeleteCollectionTask,
	useEgoCollectionTasksReadCollectionTasks,
	useEgoCollectionTasksUpdateCollectionTask,
} from "@/api/ego-collection-tasks/ego-collection-tasks";
import {
	egoProductKitsReadProductKits,
	useEgoProductKitsReadProductKits,
} from "@/api/ego-product-kits/ego-product-kits";
import type { CollectionTaskPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/collection-tasks/")({
	component: CollectionTasksPage,
	validateSearch: resourceSearchSchema,
});
const taskFields: ResourceCreateField[] = [
	{ name: "task_no", label: "任务序列号", placeholder: "留空由系统自动生成" },
	{ name: "project_name", label: "项目名称", required: true },
	{ name: "name", label: "任务名称", required: true },
	{ name: "published_at", label: "发布时间", type: "datetime-local" },
	{ name: "object_count", label: "对象数量", type: "number" },
	{ name: "duration_minutes", label: "总时长（分钟）", type: "number" },
	{ name: "target_count", label: "总采集次数", type: "number" },
];

function CollectionTasksPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CollectionTaskPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } =
		useEgoCollectionTasksReadCollectionTasks(
			{
				...paginationToSkipLimit(pagination),
				q: search.q,
				status: search.status,
			},
			{ query: { placeholderData: keepPreviousData } },
		);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoCollectionTasksCreateCollectionTask();
	const updateMutation = useEgoCollectionTasksUpdateCollectionTask();
	const deleteMutation = useEgoCollectionTasksDeleteCollectionTask();
	const { data: sopsResponse } = useEgoCollectionSopsReadCollectionSops({
		limit: 500,
	});
	const sops = sopsResponse?.status === 200 ? sopsResponse.data.data : [];
	const { data: scenesResponse } = useEgoCollectionScenesReadCollectionScenes({
		limit: 500,
		status: "ACTIVE",
	});
	const scenes = scenesResponse?.status === 200 ? scenesResponse.data.data : [];
	const { data: kitsResponse } = useEgoProductKitsReadProductKits({
		limit: 500,
		status: "ACTIVE",
	});
	const kits = kitsResponse?.status === 200 ? kitsResponse.data.data : [];
	const formFields: ResourceCreateField[] = [
		...taskFields,
		{
			name: "kit_id",
			label: "适用套件模板",
			searchable: true,
			placeholder: "留空表示全部套件",
			loadOptions: async (q) => {
				const response = await egoProductKitsReadProductKits({
					limit: 100,
					status: "ACTIVE",
					q: q || undefined,
				});
				return response.status === 200
					? response.data.data.map((kit) => ({
							value: kit.id ?? "",
							label: `${kit.name}（${kit.code}）`,
						}))
					: [];
			},
			options: kits
				.map((kit) => ({
					value: kit.id ?? "",
					label: `${kit.name}（${kit.code}）`,
				}))
				.filter((option) => option.value),
		},
		{
			name: "scene_type",
			label: "场景类型",
			required: true,
			searchable: true,
			loadOptions: async (q) => {
				const response = await egoCollectionScenesReadCollectionScenes({
					limit: 100,
					status: "ACTIVE",
					q: q || undefined,
				});
				return response.status === 200
					? response.data.data.map((scene) => ({
							value: scene.name,
							label: scene.name,
						}))
					: [];
			},
			placeholder: scenes.length
				? "搜索并选择场景"
				: "请先前往场景管理新增场景",
			options: scenes.map((scene) => ({
				value: scene.name,
				label: scene.name,
			})),
		},
		{
			name: "sop_id",
			label: "任务 SOP",
			required: true,
			placeholder: sops.length ? "请选择任务 SOP" : "请先前往 SOP 管理新增 SOP",
			options: sops
				.map((sop) => ({ value: sop.id ?? "", label: sop.name }))
				.filter((option) => option.value),
		},
		{
			name: "target_objects",
			label: "目标对象",
			multiline: true,
			fullWidth: true,
		},
		{
			name: "subtask_name",
			label: "子任务",
			placeholder: "请输入子任务名称",
			required: true,
			repeatable: !editing,
			fullWidth: true,
		},
	];
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoCollectionTasksReadCollectionTasksQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<CollectionTaskPublic>
				title="采集任务"
				description="一个任务可添加多个子任务，设备端和移动端按任务联动选择子任务。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新建任务"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除任务“${item.name}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("采集任务已删除");
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
					{ key: "task_no", label: "任务编号", size: 150 },
					{ key: "project_name", label: "项目", size: 160 },
					{ key: "name", label: "任务名称", size: 190 },
					{ key: "subtask_name", label: "子任务", size: 170 },
					{ key: "scene_type", label: "场景", size: 100 },
					{ key: "kit_name", label: "适用套件模板", size: 170 },
					{ key: "sop_name", label: "SOP", size: 180 },
					{ key: "published_at", label: "发布时间", size: 180 },
					{ key: "assigned_username", label: "领取人", size: 120 },
					{ key: "device_serial", label: "设备 SN", size: 150 },
					{ key: "location", label: "地点", size: 180 },
					{ key: "target_objects", label: "目标对象", size: 220 },
					{ key: "object_count", label: "对象数", size: 90 },
					{ key: "target_count", label: "目标数", size: 90 },
					{ key: "completed_count", label: "完成数", size: 90 },
					{ key: "status", label: "状态", size: 100 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-task"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑采集任务" : "新建采集任务"}
				description="任务按套件模板匹配实体套件，并同步给 device 与 mobile。"
				fields={formFields}
				columns={2}
				initialValues={
					editing ? resourceFormValues(editing, formFields) : undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					if (!values.sop_id) {
						toast.error("请选择任务 SOP");
						return;
					}
					const subtaskNames = parseSubtaskNames(
						values.subtask_name,
						Boolean(editing),
					);
					if (subtaskNames.length === 0) {
						toast.error("请至少填写一个子任务名称");
						return;
					}
					const sharedTaskNo =
						values.task_no.trim() ||
						`MANGO-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
					const data = {
						task_no: sharedTaskNo,
						project_name: values.project_name,
						name: values.name,
						subtask_name: subtaskNames[0],
						kit_id: values.kit_id || null,
						scene_type: values.scene_type || undefined,
						published_at: values.published_at
							? new Date(values.published_at).toISOString()
							: undefined,
						sop_id: values.sop_id,
						object_count: Number(values.object_count) || 0,
						duration_minutes: Number(values.duration_minutes) || 30,
						target_count: Number(values.target_count) || 1,
						target_objects: values.target_objects || undefined,
					};
					if (editing)
						await updateMutation.mutateAsync({
							resourceId: editing.id ?? "",
							data,
						});
					else {
						for (const subtaskName of [...new Set(subtaskNames)]) {
							await createMutation.mutateAsync({
								data: { ...data, subtask_name: subtaskName },
							});
						}
					}
					await refresh();
					setCreateOpen(false);
					setEditing(undefined);
					toast.success(
						editing
							? "采集任务已更新"
							: `任务已创建，共 ${new Set(subtaskNames).size} 个子任务`,
					);
				}}
			/>
		</>
	);
}

function parseSubtaskNames(value: string, editing: boolean): string[] {
	if (editing) return value.trim() ? [value.trim()] : [];
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed))
			return parsed
				.map(String)
				.map((name) => name.trim())
				.filter(Boolean);
	} catch {
		return value.trim() ? [value.trim()] : [];
	}
	return [];
}
