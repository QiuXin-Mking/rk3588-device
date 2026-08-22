import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoDeviceBindingsReadDeviceBindingsQueryKey,
	useEgoDeviceBindingsCreateDeviceBinding,
	useEgoDeviceBindingsDeleteDeviceBinding,
	useEgoDeviceBindingsReadDeviceBindings,
	useEgoDeviceBindingsUpdateDeviceBinding,
} from "@/api/ego-device-bindings/ego-device-bindings";
import { useEgoPhysicalKitsReadPhysicalKits } from "@/api/ego-physical-kits/ego-physical-kits";
import type { DeviceBindingPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/device-bindings/")({
	component: DeviceBindingsPage,
	validateSearch: resourceSearchSchema,
});
function DeviceBindingsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<DeviceBindingPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } = useEgoDeviceBindingsReadDeviceBindings(
		{
			...paginationToSkipLimit(pagination),
			q: search.q,
			status: search.status,
		},
		{ query: { placeholderData: keepPreviousData } },
	);
	const { data: physicalKitsResponse } = useEgoPhysicalKitsReadPhysicalKits({
		limit: 500,
	});
	const page = response?.status === 200 ? response.data : undefined;
	const physicalKits =
		physicalKitsResponse?.status === 200 ? physicalKitsResponse.data.data : [];
	const physicalKitNames = new Map(
		physicalKits.map((kit) => [kit.id ?? "", kit.name]),
	);
	const assemblyTargets = physicalKits.flatMap((kit) => {
		return (kit.device_slots ?? []).map((slot) => ({
			value: `${kit.id}|${slot.role}`,
			label: `${kit.name} / ${slot.label}（${slot.role}）`,
			physicalKitId: kit.id ?? "",
			role: slot.role,
			deviceModel: slot.device_model,
		}));
	});
	const formFields: ResourceCreateField[] = [
		{ name: "serial_number", label: "设备 SN", required: true },
		{ name: "pid", label: "PID / 硬件标识" },
		{ name: "device_name", label: "设备名称", required: true },
		{
			name: "assembly_target",
			label: "实体套件 / 装配位置",
			required: true,
			placeholder: "搜索实体套件并选择装配位置",
			options: assemblyTargets.map(({ value, label }) => ({ value, label })),
			searchable: true,
		},
		{ name: "firmware_version", label: "固件版本" },
		{
			name: "remark",
			label: "备注",
			multiline: true,
			fullWidth: true,
		},
	];
	const createMutation = useEgoDeviceBindingsCreateDeviceBinding();
	const updateMutation = useEgoDeviceBindingsUpdateDeviceBinding();
	const deleteMutation = useEgoDeviceBindingsDeleteDeviceBinding();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoDeviceBindingsReadDeviceBindingsQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<DeviceBindingPublic>
				title="实体设备"
				description="登记单台真实硬件，并装配到某个实体套件的模板槽位。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新增实体设备"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除实体设备“${item.serial_number}”吗？`))
						return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("实体设备已删除");
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
					{ key: "serial_number", label: "设备 SN", size: 180 },
					{ key: "pid", label: "PID", size: 130 },
					{ key: "device_name", label: "设备名称", size: 170 },
					{ key: "device_model", label: "设备型号", size: 140 },
					{ key: "slot_role", label: "槽位角色", size: 130 },
					{
						key: "physical_kit_id",
						label: "所属套件",
						size: 180,
						render: (item) =>
							item.physical_kit_id
								? (physicalKitNames.get(item.physical_kit_id) ??
									item.physical_kit_id)
								: "-",
					},
					{ key: "status", label: "在线状态", size: 100 },
					{ key: "firmware_version", label: "版本", size: 100 },
					{ key: "last_seen_at", label: "最后在线", size: 180 },
					{ key: "remark", label: "备注", size: 220 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-device-binding"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "编辑实体设备" : "新增实体设备"}
				description="硬件在线状态由服务上报；后台只维护 SN、型号和装配关系。"
				fields={formFields}
				columns={2}
				initialValues={
					editing
						? {
								...resourceFormValues(editing, formFields),
								assembly_target:
									editing.physical_kit_id && editing.slot_role
										? `${editing.physical_kit_id}|${editing.slot_role}`
										: "",
							}
						: undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const target = assemblyTargets.find(
						(option) => option.value === values.assembly_target,
					);
					if (!target) throw new Error("请选择有效的实体套件装配位置");
					const data = {
						serial_number: values.serial_number,
						device_name: values.device_name,
						device_model: target.deviceModel,
						slot_role: target.role,
						physical_kit_id: target.physicalKitId,
						pid: values.pid || undefined,
						status: editing?.status || "UNKNOWN",
						firmware_version: values.firmware_version || undefined,
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
					toast.success(editing ? "实体设备已更新" : "实体设备已创建");
				}}
			/>
		</>
	);
}
