import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	getEgoFeedbackReadFeedbackQueryKey,
	useEgoFeedbackCreateFeedback,
	useEgoFeedbackDeleteFeedback,
	useEgoFeedbackReadFeedback,
	useEgoFeedbackUpdateFeedback,
} from "@/api/ego-feedback/ego-feedback";
import type { FeedbackPublic } from "@/api/schemas";
import {
	ResourceCreateDialog,
	type ResourceCreateField,
	resourceFormValues,
} from "@/components/ego/resource-create-dialog";
import { ResourceTablePage } from "@/components/ego/resource-table-page";
import { paginationToSkipLimit, skipLimitToPagination } from "@/lib/pagination";
import { resourceSearchSchema } from "@/lib/resource-search";

export const Route = createFileRoute("/_layout/collection/feedback/")({
	component: FeedbackPage,
	validateSearch: resourceSearchSchema,
});
const formFields: ResourceCreateField[] = [
	{ name: "category", label: "分类", required: true },
	{ name: "content", label: "反馈内容", required: true, multiline: true },
	{ name: "contact", label: "联系方式" },
	{ name: "submitter_username", label: "提交人" },
	{ name: "status", label: "处理状态" },
	{ name: "reply", label: "处理回复", multiline: true },
];

function FeedbackPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<FeedbackPublic>();
	const [deletingId, setDeletingId] = useState("");
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const pagination = skipLimitToPagination(search.skip, search.limit);
	const { data: response, isFetching } = useEgoFeedbackReadFeedback(
		{
			...paginationToSkipLimit(pagination),
			q: search.q,
			status: search.status,
		},
		{ query: { placeholderData: keepPreviousData } },
	);
	const page = response?.status === 200 ? response.data : undefined;
	const createMutation = useEgoFeedbackCreateFeedback();
	const updateMutation = useEgoFeedbackUpdateFeedback();
	const deleteMutation = useEgoFeedbackDeleteFeedback();
	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: getEgoFeedbackReadFeedbackQueryKey(),
		});
	return (
		<>
			<ResourceTablePage<FeedbackPublic>
				title="反馈工单"
				description="集中处理设备端与移动端提交的问题反馈、功能建议和服务支持请求。"
				data={page?.data ?? []}
				rowCount={page?.count ?? 0}
				isFetching={isFetching}
				onCreate={() => setCreateOpen(true)}
				createLabel="新建工单"
				onEdit={setEditing}
				deletingId={deletingId}
				onDelete={async (item) => {
					if (!window.confirm(`确定删除此反馈工单吗？`)) return;
					setDeletingId(item.id ?? "");
					try {
						await deleteMutation.mutateAsync({ resourceId: item.id ?? "" });
						await refresh();
						toast.success("反馈工单已删除");
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
					{ key: "category", label: "分类", size: 120 },
					{ key: "content", label: "反馈内容", size: 360 },
					{ key: "submitter_username", label: "提交人", size: 120 },
					{ key: "contact", label: "联系方式", size: 160 },
					{ key: "status", label: "状态", size: 100 },
					{ key: "reply", label: "处理回复", size: 300 },
					{ key: "created_at", label: "提交时间", size: 180 },
				]}
			/>
			<ResourceCreateDialog
				key={editing?.id ?? "create-feedback"}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(undefined);
				}}
				title={editing ? "处理反馈工单" : "新建反馈工单"}
				description="后台可代录反馈；device/mobile 的反馈也会进入同一列表。"
				fields={formFields}
				initialValues={
					editing ? resourceFormValues(editing, formFields) : undefined
				}
				isPending={createMutation.isPending || updateMutation.isPending}
				onSubmit={async (values) => {
					const data = {
						category: values.category,
						content: values.content,
						contact: values.contact || undefined,
						submitter_username: values.submitter_username || undefined,
						status: values.status || undefined,
						reply: values.reply || undefined,
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
					toast.success(editing ? "反馈工单已更新" : "反馈工单已创建");
				}}
			/>
		</>
	);
}
