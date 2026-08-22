import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoPhysicalKitsReadPhysicalKitsQueryKey,
	useEgoPhysicalKitsCreatePhysicalKit,
	useEgoPhysicalKitsDeletePhysicalKit,
	useEgoPhysicalKitsReadPhysicalKits,
	useEgoPhysicalKitsUpdatePhysicalKit,
} from "@/api/ego-physical-kits/ego-physical-kits";
import { useEgoProductKitsReadProductKits } from "@/api/ego-product-kits/ego-product-kits";
import type { PhysicalKitPublic } from "@/api/schemas";
import { systemUsersReadUsers } from "@/api/system-users/system-users";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/physical-kits/")({
	component: PhysicalKitsPage,
	validateSearch: resourceSearchSchema,
});

function PhysicalKitsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<PhysicalKitPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } = useEgoPhysicalKitsReadPhysicalKits(
		{
			...paginationToSkipLimit(pagination),
			q: search.q,
			status: search.status,
		},
		{ query: { placeholderData: keepPreviousData } },
	);
	const { data: templatesResponse } = useEgoProductKitsReadProductKits({
		limit: 500,
		status: "ACTIVE",
	});
	const templates =
		templatesResponse?.status === 200 ? templatesResponse.data.data : [];
	const page = response?.status === 200 ? response.data : undefined;
	const fields: ResourceCreateField[] = [
		{ name: "serial_number", label: "实体套件 SN", required: true },
		{ name: "name", label: "实体套件名称", required: true },
		{
			name: "template_id",
			label: "产品套件模板",
			required: true,
			searchable: true,
			options: templates
				.map((template) => ({
					value: template.id ?? "",
					label: `${template.name}（${template.code}）`,
				}))
				.filter((option) => option.value),
		},
		{ name: "terminal_serial", label: "采集终端 SN" },
		{
			name: "operator_username",
			label: "绑定采集员账号",
			searchable: true,
			loadOptions: async (query) => {
				const usersResponse = await systemUsersReadUsers({
					limit: 100,
					username: query || undefined,
				});
				if (usersResponse.status !== 200) return [];
				return usersResponse.data.data.map((user) => ({
					value: user.username,
					label: user.username,
				}));
			},
		},
		{
			name: "status",
			label: "资产状态",
			options: [
				{ value: "READY", label: "待使用" },
				{ value: "ASSIGNED", label: "已分配" },
				{ value: "MAINTENANCE", label: "维修中" },
				{ value: "RETIRED", label: "已停用" },
			],
		},
		{ name: "location", label: "存放位置" },
		{ name: "remark", label: "备注", multiline: true, fullWidth: true },
	];
	const createMutation = useEgoPhysicalKitsCreatePhysicalKit();
	const updateMutation = useEgoPhysicalKitsUpdatePhysicalKit();
	const deleteMutation = useEgoPhysicalKitsDeletePhysicalKit();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoPhysicalKitsReadPhysicalKitsQueryKey(),
		});

	return (
		<>
			<ResourceTablePage<PhysicalKitPublic>
				title="实体套件"
				description="登记真实存在的一整套设备，并关联模板、采集终端和采集员。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新增实体套件"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除实体套件“${item.name}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("实体套件已删除");
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
					{ key: "serial_number", label: "实体套件 SN", size: 180 },
					{ key: "name", label: "名称", size: 180 },
					{ key: "template_name", label: "产品套件模板", size: 190 },
					{ key: "terminal_serial", label: "采集终端 SN", size: 170 },
					{ key: "bound_username", label: "采集员", size: 160 },
					{ key: "status", label: "资产状态", size: 110 },
					{ key: "location", label: "存放位置", size: 160 },
					{ key: "remark", label: "备注", size: 220 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-physical-kit"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑实体套件" : "新增实体套件"}
				description="实体套件 SN 代表整套资产；内部单台硬件在“实体设备”中装配。"
				fields={fields}
				columns={2}
				initialValues={
					editing
						? {
								...resourceFormValues(editing, fields),
								operator_username: editing.bound_username ?? "",
							}
						: undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						serial_number: values.serial_number,
						name: values.name,
						template_id: values.template_id,
						terminal_serial: values.terminal_serial,
						bound_username: values.operator_username,
						status: values.status || "READY",
						location: values.location,
						remark: values.remark,
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
					toast.success(editing ? "实体套件已更新" : "实体套件已创建");
				}}
			/>
		</>
	);
}
