import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserCreate, UserPublic } from "@/api/schemas";
import {
	getSystemUsersReadUsersQueryKey,
	useSystemUsersCreateUser,
	useSystemUsersUpdateUser,
} from "@/api/system-users/system-users";
import {
	SystemUsersCreateUserBody,
	SystemUsersUpdateUserBody,
} from "@/api/zod/system-users/system-users";
import { FormButton, FormCheckbox, FormInput } from "@/components/form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingUser: UserPublic | null;
}

export function UserFormDialog({
	open,
	onOpenChange,
	editingUser,
}: UserFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingUser != null;

	const createMutation = useSystemUsersCreateUser({
		mutation: {
			onSuccess: () => {
				toast.success("用户创建成功");
				queryClient.invalidateQueries({
					queryKey: getSystemUsersReadUsersQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useSystemUsersUpdateUser({
		mutation: {
			onSuccess: () => {
				toast.success("用户更新成功");
				queryClient.invalidateQueries({
					queryKey: getSystemUsersReadUsersQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// @ts-expect-error TanStack Form v1 generic explosion
	const form = useForm<UserCreate>({
		defaultValues: {
			username: editingUser?.username ?? "",
			password: undefined, // Let TanStack maintain undefined when unmodified
			is_active: editingUser?.is_active ?? true,
			is_root: editingUser?.is_root ?? false,
			status: editingUser?.status ?? 0,
			avatar: editingUser?.avatar ?? null,
		},
		// Zod 4's Standard Schema implementation natively returns a Promise.
		// Using onChangeAsync avoids the 'async function passed to sync validator' warning from TanStack Form.
		validators: {
			onChangeAsync: isEditing
				? (SystemUsersUpdateUserBody as any)
				: (SystemUsersCreateUserBody as any),
		},
		onSubmit: async ({ value }) => {
			if (isEditing && editingUser.id) {
				updateMutation.mutate({
					userId: editingUser.id,
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
					<DialogTitle>{isEditing ? "编辑用户" : "新建用户"}</DialogTitle>
					<DialogDescription>
						{isEditing ? "修改系统用信息" : "添加新的系统普通用户"}
					</DialogDescription>
				</DialogHeader>
				<form action={() => form.handleSubmit()} className="space-y-4">
					<FormInput
						form={form}
						name="username"
						label="用户名"
						required
						placeholder="请输入用户名"
					/>
					<FormInput
						form={form}
						name="password"
						label="密码"
						type="password"
						required={!isEditing}
						placeholder={isEditing ? "留空则不修改" : "请输入密码"}
					/>
					<div className="flex gap-6">
						<FormCheckbox form={form} name="is_active" label="启用" />
						<FormCheckbox form={form} name="is_root" label="超级管理员" />
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
