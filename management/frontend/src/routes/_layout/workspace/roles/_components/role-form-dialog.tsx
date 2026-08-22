import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as zod from "zod";
import type { RoleCreate, RolePublic } from "@/api/schemas";
import {
	getWorkspaceRolesReadRolesQueryKey,
	useWorkspaceRolesCreateRole,
	useWorkspaceRolesUpdateRole,
} from "@/api/workspace-roles/workspace-roles";
import {
	WorkspaceRolesCreateRoleBody,
	WorkspaceRolesUpdateRoleBody,
} from "@/api/zod/workspace-roles/workspace-roles";
import {
	FormBusinessLinePicker,
	FormButton,
	FormCheckbox,
	FormInput,
	FormTextarea,
} from "@/components/form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RoleFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingRole: RolePublic | null;
}

export function RoleFormDialog({
	open,
	onOpenChange,
	editingRole,
}: RoleFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingRole != null;

	const createMutation = useWorkspaceRolesCreateRole({
		mutation: {
			onSuccess: () => {
				toast.success("角色创建成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceRolesReadRolesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useWorkspaceRolesUpdateRole({
		mutation: {
			onSuccess: () => {
				toast.success("角色更新成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceRolesReadRolesQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// @ts-expect-error TanStack Form generic explosion
	const form = useForm<RoleCreate>({
		defaultValues: {
			role_name: editingRole?.role_name ?? "",
			business_line_id: editingRole?.business_line_id ?? "root",
			sort: editingRole?.sort ?? 1,
			is_active: editingRole?.is_active ?? true,
			remark: editingRole?.remark ?? "",
		},
		validators: {
			onChangeAsync: (isEditing
				? WorkspaceRolesUpdateRoleBody
				: WorkspaceRolesCreateRoleBody
			).extend({
				business_line_id: zod
					.union([zod.string().uuid(), zod.literal("root"), zod.null()])
					.optional(),
			}),
		},
		onSubmit: async ({ value }) => {
			const data = { ...value };
			if (data.business_line_id === "root" || !data.business_line_id) {
				data.business_line_id = null;
			}

			if (isEditing && editingRole.id) {
				updateMutation.mutate({ roleId: editingRole.id, data });
			} else {
				createMutation.mutate({ data });
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{isEditing ? "编辑角色" : "新建角色"}</DialogTitle>
					<DialogDescription>
						{isEditing ? "修改角色信息" : "添加新的系统角色"}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="max-h-[500px] pr-4">
					<form action={() => form.handleSubmit()} className="space-y-4 pt-2">
						<FormInput
							form={form}
							name="role_name"
							label="角色名称"
							placeholder="如: 会员管理员"
							required
						/>

						<FormBusinessLinePicker
							form={form}
							name="business_line_id"
							label="所属业务线"
							placeholder="搜索并选择所属业务线..."
						/>

						<FormInput
							form={form}
							name="sort"
							label="排序"
							type="number"
							placeholder="1"
						/>

						<FormTextarea
							form={form}
							name="remark"
							label="备注"
							placeholder="角色的描述信息"
							rows={3}
						/>

						<div className="pt-2">
							<FormCheckbox form={form} name="is_active" label="启用状态" />
						</div>

						<div className="flex justify-end gap-2 pt-4">
							<FormButton form={form} disabled={isPending}>
								{isEditing ? "保存" : "创建"}
							</FormButton>
						</div>
					</form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
