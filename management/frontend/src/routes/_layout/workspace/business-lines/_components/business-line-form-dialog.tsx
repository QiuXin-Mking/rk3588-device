import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as zod from "zod";
import type { BusinessLineCreate, BusinessLineTreeNode } from "@/api/schemas";
import {
	getWorkspaceBusinessLinesReadBusinessLinesQueryKey,
	getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey,
	useWorkspaceBusinessLinesCreateBusinessLine,
	useWorkspaceBusinessLinesUpdateBusinessLine,
} from "@/api/workspace-business-lines/workspace-business-lines";
import {
	WorkspaceBusinessLinesCreateBusinessLineBody,
	WorkspaceBusinessLinesUpdateBusinessLineBody,
} from "@/api/zod/workspace-business-lines/workspace-business-lines";
import {
	FormBusinessLinePicker,
	FormButton,
	FormInput,
	FormSelect,
} from "@/components/form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface BusinessLineFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingBusinessLine: BusinessLineTreeNode | null;
	defaultParentId?: string;
}

// Function to get all child IDs of a given node
function getDescendantIds(node: BusinessLineTreeNode): string[] {
	if (!node.children || node.children.length === 0) return [];
	return node.children.flatMap((child) => [
		child.id as string,
		...getDescendantIds(child as BusinessLineTreeNode),
	]);
}

export function BusinessLineFormDialog({
	open,
	onOpenChange,
	editingBusinessLine,
	defaultParentId,
}: BusinessLineFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingBusinessLine != null;

	// Determine which IDs should be disabled (the node itself, and all its descendants)
	const disabledIds: string[] = [];
	if (isEditing && editingBusinessLine?.id) {
		disabledIds.push(editingBusinessLine.id);
		const descendantIds = getDescendantIds(editingBusinessLine);
		disabledIds.push(...descendantIds);
	}

	const createMutation = useWorkspaceBusinessLinesCreateBusinessLine({
		mutation: {
			onSuccess: () => {
				toast.success("业务线创建成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useWorkspaceBusinessLinesUpdateBusinessLine({
		mutation: {
			onSuccess: () => {
				toast.success("业务线更新成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getWorkspaceBusinessLinesReadBusinessLinesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// @ts-expect-error TanStack Form generic explosion
	const form = useForm<BusinessLineCreate>({
		defaultValues: {
			parent_id: editingBusinessLine?.parent_id ?? defaultParentId ?? "root",
			name: editingBusinessLine?.name ?? "",
			external_id: editingBusinessLine?.external_id ?? "",
			status: editingBusinessLine?.status ?? 1,
		},
		validators: {
			onChangeAsync: (isEditing
				? WorkspaceBusinessLinesUpdateBusinessLineBody
				: WorkspaceBusinessLinesCreateBusinessLineBody
			).extend({
				parent_id: zod
					.union([zod.string().uuid(), zod.literal("root"), zod.null()])
					.optional(),
			}),
		},
		onSubmit: async ({ value }) => {
			const data = { ...value };
			if (data.parent_id === "root" || !data.parent_id) {
				data.parent_id = null;
			}

			// Local frontend transformation for empty strings to null for optional fields
			if (data.external_id === "") {
				data.external_id = null;
			}

			if (isEditing && editingBusinessLine.id) {
				updateMutation.mutate({ businessLineId: editingBusinessLine.id, data });
			} else {
				createMutation.mutate({ data });
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const statusOptions = [
		{ label: "启用", value: 1 },
		{ label: "停用", value: 0 },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{isEditing ? "编辑业务线" : "新建业务线"}</DialogTitle>
					<DialogDescription>
						{isEditing ? "修改业务线信息" : "添加新的业务线"}
					</DialogDescription>
				</DialogHeader>
				<form action={() => form.handleSubmit()} className="space-y-4 pt-2">
					<FormBusinessLinePicker
						form={form}
						name="parent_id"
						label="父级"
						disabledIds={disabledIds}
						placeholder="搜索并选择父级..."
					/>
					<FormInput
						form={form}
						name="name"
						label="名称"
						placeholder="如: 电商业务"
						required
					/>
					<FormInput
						form={form}
						name="external_id"
						label="外部ID (可选)"
						placeholder="外部系统关联的ID"
					/>
					<FormSelect
						form={form}
						name="status"
						label="状态"
						options={statusOptions}
						valueType="number"
					/>

					<div className="flex justify-end gap-2 pt-4">
						<FormButton form={form} disabled={isPending}>
							{isEditing ? "保存" : "创建"}
						</FormButton>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
