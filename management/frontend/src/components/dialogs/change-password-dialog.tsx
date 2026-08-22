import { useForm } from "@tanstack/react-form";
import { LockKeyhole, LogIn } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useSystemUsersUpdateUserMe } from "@/api/system-users/system-users";
import { FormButton, FormInput } from "@/components/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { clearAuthSession } from "@/lib/auth-session";

export function ChangePasswordDialog() {
	const { user } = useAuth();
	const updateUserMutation = useSystemUsersUpdateUserMe({
		mutation: {
			onSuccess: () => {
				toast.success("密码修改成功，请重新登录。");
				passwordForm.reset();
				setOpen(false);
				clearAuthSession();
				window.location.replace("/login");
			},
			onError: (err) => {
				toast.error((err as Error).message || "密码修改失败，请重试。");
			},
		},
	});
	const [open, setOpen] = React.useState(false);
	const username = user?.username ?? "";
	const userInitial = username.slice(0, 1).toUpperCase() || "U";

	const passwordSchema = z
		.object({
			new_password: z.string().min(5, "密码长度不能少于 5 个字符"),
			confirm_password: z.string(),
		})
		.refine((data) => data.new_password === data.confirm_password, {
			message: "两次输入的密码不一致",
			path: ["confirm_password"],
		})
		.refine((data) => data.new_password !== user?.username, {
			message: "新密码不能与用户名相同",
			path: ["new_password"],
		});

	const passwordForm = useForm({
		defaultValues: {
			new_password: "",
			confirm_password: "",
		},
		validators: {
			onSubmit: passwordSchema,
			onChange: passwordSchema,
		},
		onSubmit: async ({ value }) => {
			if (!user?.username) {
				toast.error("当前用户信息缺失，无法修改密码。");
				return;
			}

			updateUserMutation.mutate({
				data: {
					username: user.username,
					password: value.new_password,
				},
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							className="group h-9 gap-2 rounded-full border border-border/70 bg-background/80 px-1.5 pr-3 shadow-sm backdrop-blur transition-all hover:border-border hover:bg-muted/50"
						>
							<Avatar size="sm" className="size-7 ring-1 ring-border/60">
								<AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-foreground">
									{userInitial}
								</AvatarFallback>
							</Avatar>
							<span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors group-hover:bg-background">
								<LockKeyhole className="size-3" />
								修改密码
							</span>
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>{username}</TooltipContent>
			</Tooltip>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>修改密码</DialogTitle>
					<DialogDescription>
						请输入新密码。修改成功后会自动退出登录。
					</DialogDescription>
				</DialogHeader>
				<form action={() => passwordForm.handleSubmit()} className="grid gap-4">
					<FormInput
						form={passwordForm}
						name="new_password"
						label="新密码"
						type="password"
						placeholder="请输入新密码"
					/>
					<FormInput
						form={passwordForm}
						name="confirm_password"
						label="确认新密码"
						type="password"
						placeholder="请再次输入新密码"
					/>
					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setOpen(false)}
							disabled={passwordForm.state.isSubmitting}
						>
							取消
						</Button>
						<FormButton form={passwordForm}>
							<LogIn className="size-3.5" />
							提交并退出
						</FormButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
