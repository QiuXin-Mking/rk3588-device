import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoProductKitsReadProductKitsQueryKey,
	useEgoProductKitsCreateProductKit,
	useEgoProductKitsDeleteProductKit,
	useEgoProductKitsReadProductKits,
	useEgoProductKitsUpdateProductKit,
} from "@/api/ego-product-kits/ego-product-kits";
import type { ProductKitCreate, ProductKitPublic } from "@/api/schemas";
import { KitTopologyDialog } from "@/components/ego/kit-topology-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { Badge } from "@/components/ui/badge";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/product-kits/")({
	component: ProductKitsPage,
	validateSearch: resourceSearchSchema,
});

function ProductKitsPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<ProductKitPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } = useEgoProductKitsReadProductKits(
		{
			...paginationToSkipLimit(pagination),
			q: search.q,
			status: search.status,
		},
		{ query: { placeholderData: keepPreviousData } },
	);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoProductKitsCreateProductKit();
	const updateMutation = useEgoProductKitsUpdateProductKit();
	const deleteMutation = useEgoProductKitsDeleteProductKit();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoProductKitsReadProductKitsQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<ProductKitPublic>
				title="产品套件模板"
				description="定义允许包含的设备角色和视频通道，不登记任何实体 SN。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新增套件"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除套件“${item.name}”吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("产品套件已删除");
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
					{ key: "code", label: "套件编码", size: 130 },
					{ key: "name", label: "套件名称", size: 180 },
					{ key: "product_type", label: "产品类型", size: 150 },
					{
						key: "device_slots",
						label: "设备结构",
						size: 360,
						render: (item) => (
							<div className="flex max-w-[340px] flex-wrap gap-1.5">
								{(item.device_slots ?? []).length === 0 ? (
									<span className="text-muted-foreground">未配置</span>
								) : (
									(item.device_slots ?? []).map((slot) => (
										<Badge
											key={`${slot.role}-${slot.device_model}-${slot.sort ?? 0}`}
											variant={
												slot.required === false ? "outline" : "secondary"
											}
										>
											{slot.label} · {(slot.channel_labels ?? []).length} 路
										</Badge>
									))
								)}
							</div>
						),
					},
					{ key: "exam_enabled", label: "需要考试", size: 90 },
					{ key: "status", label: "状态", size: 100 },
					{ key: "instructions", label: "使用说明", size: 260 },
				]}
			/>
			<KitTopologyDialog
				key={editing?.id ?? "create-product-kit"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				kit={editing}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (data: ProductKitCreate) => {
					if (editing)
						await updateMutation.mutateAsync({
							resourceId: editing.id ?? "",
							data,
						});
					else await createMutation.mutateAsync({ data });
					await refresh();
					setCreateOpen(false);
					setEditing(undefined);
					toast.success(editing ? "产品套件已更新" : "产品套件已创建");
				}}
			/>
		</>
	);
}
