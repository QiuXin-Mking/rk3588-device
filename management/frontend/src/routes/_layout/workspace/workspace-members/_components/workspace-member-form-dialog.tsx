import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WorkspaceMemberPublic } from "@/api/schemas";
import {
	getWorkspaceMembersReadWorkspaceMembersQueryKey,
	useWorkspaceMembersCreateWorkspaceMember,
	useWorkspaceMembersUpdateWorkspaceMember,
} from "@/api/workspace-members/workspace-members";
import {
	WorkspaceMembersCreateWorkspaceMemberBody,
	WorkspaceMembersUpdateWorkspaceMemberBody,
} from "@/api/zod/workspace-members/workspace-members";
import {
	FormButton,
	FormCheckbox,
	FormDatePicker,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = WorkspaceMemberPublic;

export interface WorkspaceMemberFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMember: Member | null;
}

export function WorkspaceMemberFormDialog({
	open,
	onOpenChange,
	editingMember,
}: WorkspaceMemberFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingMember != null;

	const createMutation = useWorkspaceMembersCreateWorkspaceMember({
		mutation: {
			onSuccess: () => {
				toast.success("成员创建成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceMembersReadWorkspaceMembersQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useWorkspaceMembersUpdateWorkspaceMember({
		mutation: {
			onSuccess: () => {
				toast.success("成员更新成功");
				queryClient.invalidateQueries({
					queryKey: getWorkspaceMembersReadWorkspaceMembersQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const form = useForm({
		defaultValues: {
			username: editingMember?.employee_name ?? "",
			new_user_password: "",
			employee_name: editingMember?.employee_name ?? "",
			job_number: editingMember?.job_number ?? "",
			mobile: editingMember?.mobile ?? "",
			email: editingMember?.email ?? "",
			sex: editingMember?.sex ?? undefined,
			telephone: editingMember?.telephone ?? "",
			employee_status: editingMember?.employee_status ?? "",
			report_manager: editingMember?.report_manager ?? "",
			employee_type: editingMember?.employee_type ?? "",
			position: editingMember?.position ?? "",
			entry_date: editingMember?.entry_date ?? undefined,
			exit_date: editingMember?.exit_date ?? undefined,
			main_dept: editingMember?.main_dept ?? "",
			first_dept: editingMember?.first_dept ?? "",
			second_dept: editingMember?.second_dept ?? "",
			third_dept: editingMember?.third_dept ?? "",
			fourth_dept: editingMember?.fourth_dept ?? "",
			fifth_dept: editingMember?.fifth_dept ?? "",
			sixth_dept: editingMember?.sixth_dept ?? "",
			is_active: editingMember?.is_active ?? true,
		},
		validators: {
			onChangeAsync: isEditing
				? (WorkspaceMembersUpdateWorkspaceMemberBody as any)
				: (WorkspaceMembersCreateWorkspaceMemberBody as any),
		},
		onSubmit: async ({ value }) => {
			const data = { ...value } as any;

			// Map sentinel values to null for updates/creates
			if (data.sex === "") data.sex = null;
			if (data.employee_status === "") data.employee_status = null;
			if (data.report_manager === "") data.report_manager = null;
			if (data.employee_type === "") data.employee_type = null;
			if (data.position === "") data.position = null;
			if (data.entry_date === undefined) data.entry_date = null;
			if (data.exit_date === undefined) data.exit_date = null;

			if (isEditing && editingMember.id) {
				updateMutation.mutate({
					memberId: editingMember.id,
					data: data,
				});
			} else {
				createMutation.mutate({
					data: data,
				});
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[85vh]">
				<DialogHeader className="px-6 pt-6 pb-2">
					<DialogTitle>{isEditing ? "编辑成员" : "新建成员"}</DialogTitle>
					<DialogDescription>
						{isEditing
							? "修改工作区成员的基础信息"
							: "向当前工作区添加新的成员"}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 min-h-0 overflow-y-auto px-6">
					<form
						action={() => form.handleSubmit()}
						className="space-y-6 pb-6 pt-2"
					>
						{/* 第一部分：账号与密码 */}
						{!isEditing && (
							<div className="space-y-4">
								<h3 className="text-sm font-medium border-b pb-2">账号信息</h3>
								<div className="grid grid-cols-2 gap-4">
									<FormInput
										form={form}
										name="username"
										label="登录账号"
										required
										placeholder="请输入登录用户名"
									/>
									<FormInput
										form={form}
										name="new_user_password"
										label="初始密码"
										type="password"
										placeholder="留空则不设置"
									/>
								</div>
							</div>
						)}

						{/* 第二部分：基础员工信息 */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium border-b pb-2">基础信息</h3>
							<div className="grid grid-cols-2 gap-4">
								<FormInput
									form={form}
									name="employee_name"
									label="员工姓名"
									required
									placeholder="真实姓名"
								/>
								<FormInput
									form={form}
									name="job_number"
									label="工号"
									placeholder="如: 0001"
								/>
								<div className="space-y-2">
									<Label htmlFor="work-serial-number">作业序列号</Label>
									<Input
										id="work-serial-number"
										value={
											editingMember?.work_serial_number || "创建后自动生成"
										}
										disabled
									/>
								</div>
								<FormSelect
									form={form}
									name="sex"
									label="性别"
									options={[
										{ label: "男", value: "男" },
										{ label: "女", value: "女" },
										{ label: "未知", value: "未知" },
									]}
								/>
								<FormInput form={form} name="mobile" label="手机号" />
								<FormInput form={form} name="telephone" label="座机/备用电话" />
								<FormInput form={form} name="email" label="邮箱" type="email" />
								<FormSelect
									form={form}
									name="employee_status"
									label="在职状态"
									options={[
										{ label: "正式", value: "正式" },
										{ label: "试用", value: "试用" },
										{ label: "实习", value: "实习" },
										{ label: "离职", value: "离职" },
									]}
								/>
								<FormDatePicker
									form={form}
									name="entry_date"
									label="入职日期"
									outputMode="date"
									placeholder="选择日期"
								/>
								<FormDatePicker
									form={form}
									name="exit_date"
									label="离职日期"
									outputMode="date"
									placeholder="选择日期"
								/>
								<FormInput
									form={form}
									name="report_manager"
									label="直属上级"
									placeholder="如: 张三"
								/>
								<FormInput
									form={form}
									name="employee_type"
									label="员工类型"
									placeholder="如: 全职"
								/>
								<FormInput
									form={form}
									name="position"
									label="岗位"
									placeholder="如: 项目专员"
								/>
							</div>
						</div>

						{/* 第三部分：组织架构 */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium border-b pb-2">组织架构</h3>
							<div className="grid grid-cols-3 gap-4">
								<FormInput
									form={form}
									name="main_dept"
									label="主部门"
									placeholder="主部门名称"
								/>
								<FormInput form={form} name="first_dept" label="一级部门" />
								<FormInput form={form} name="second_dept" label="二级部门" />
								<FormInput form={form} name="third_dept" label="三级部门" />
								<FormInput form={form} name="fourth_dept" label="四级部门" />
								<FormInput form={form} name="fifth_dept" label="五级部门" />
								<FormInput form={form} name="sixth_dept" label="六级部门" />
							</div>
						</div>

						{/* 第四部分：状态设定 */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium border-b pb-2">系统状态</h3>
							<div className="flex gap-6">
								<FormCheckbox
									form={form}
									name="is_active"
									label="允许登录系统 (账号启用)"
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-4">
							<FormButton form={form} disabled={isPending}>
								{isEditing ? "保存" : "创建"}
							</FormButton>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
