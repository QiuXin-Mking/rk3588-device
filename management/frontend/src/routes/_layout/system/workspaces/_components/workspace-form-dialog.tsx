import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WorkspaceCreate, WorkspacePublic } from "@/api/schemas";
import {
	getSystemWorkspacesReadWorkspacesQueryKey,
	useSystemWorkspacesCreateWorkspace,
	useSystemWorkspacesUpdateWorkspace,
} from "@/api/system-workspaces/system-workspaces";
import {
	SystemWorkspacesCreateWorkspaceBody,
	SystemWorkspacesUpdateWorkspaceBody,
} from "@/api/zod/system-workspaces/system-workspaces";
import { FormButton, FormCheckbox, FormInput } from "@/components/form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface WorkspaceFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingWorkspace: WorkspacePublic | null;
}

export function WorkspaceFormDialog({
	open,
	onOpenChange,
	editingWorkspace,
}: WorkspaceFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingWorkspace != null;

	const createMutation = useSystemWorkspacesCreateWorkspace({
		mutation: {
			onSuccess: () => {
				toast.success("工作区创建成功");
				queryClient.invalidateQueries({
					queryKey: getSystemWorkspacesReadWorkspacesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useSystemWorkspacesUpdateWorkspace({
		mutation: {
			onSuccess: () => {
				toast.success("工作区更新成功");
				queryClient.invalidateQueries({
					queryKey: getSystemWorkspacesReadWorkspacesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// @ts-expect-error TanStack Form v1 generic explosion
	const form = useForm<WorkspaceCreate>({
		defaultValues: {
			name: editingWorkspace?.name ?? "",
			description: editingWorkspace?.description ?? "",
			is_active: editingWorkspace?.is_active ?? true,
		},
		validators: {
			onChangeAsync: (isEditing
				? SystemWorkspacesUpdateWorkspaceBody
				: SystemWorkspacesCreateWorkspaceBody) as any,
		},
		onSubmit: async ({ value }) => {
			if (isEditing && editingWorkspace.id) {
				updateMutation.mutate({
					workspaceId: editingWorkspace.id,
					data: value,
				});
			} else {
				createMutation.mutate({ data: value });
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEditing ? "编辑工作区" : "新建工作区"}</DialogTitle>
					<DialogDescription>
						{isEditing ? "修改工作区基础信息" : "创建一个全新的独立工作区租户"}
					</DialogDescription>
				</DialogHeader>
				<form action={() => form.handleSubmit()} className="space-y-4">
					<FormInput
						form={form}
						name="name"
						label="工作区名称"
						required
						placeholder="请输入工作区名称"
					/>
					<FormInput
						form={form}
						name="description"
						label="描述"
						placeholder="请输入描述"
					/>
					<div className="flex gap-6">
						<FormCheckbox form={form} name="is_active" label="启用" />
					</div>
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
