import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useSystemUsersUpdatePasswordMe } from "@/api/system-users/system-users";
import { FormButton, FormInput } from "@/components/form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { isLoggedIn } from "@/lib/auth-session";

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/login")({
	component: LoginPage,
	beforeLoad: () => {
		if (
			isLoggedIn() &&
			localStorage.getItem("force_password_change") !== "true"
		) {
			throw redirect({ to: "/" });
		}
	},
	head: () => ({
		meta: [{ title: "登录 – Ego 采集管理" }],
	}),
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LoginPage() {
	const navigate = useNavigate();
	const { loginMutation } = useAuth();
	const updatePasswordMutation = useSystemUsersUpdatePasswordMe();

	const [showPasswordChange, setShowPasswordChange] = React.useState(false);
	const [loginCredentials, setLoginCredentials] = React.useState({
		username: "",
		password: "",
	});

	const loginSchema = z.object({
		username: z.string().min(1, "请输入用户名"),
		password: z.string().min(5, "密码长度不能少于 5 个字符"),
	});

	const form = useForm({
		defaultValues: { username: "", password: "" },
		validators: {
			onSubmit: loginSchema,
			onChange: loginSchema,
		},
		onSubmit: async ({ value }) => {
			const res = await loginMutation.mutateAsync({ data: value });
			if (res?.status === 200) {
				if (value.username === value.password) {
					localStorage.setItem("force_password_change", "true");
					setLoginCredentials(value);
					setShowPasswordChange(true);
				} else {
					localStorage.removeItem("force_password_change");
					navigate({ to: "/" });
				}
			}
		},
	});

	const changePasswordSchema = z
		.object({
			new_password: z.string().min(5, "密码长度不能少于 5 个字符"),
			confirm_password: z.string(),
		})
		.refine((data) => data.new_password === data.confirm_password, {
			message: "两次输入的密码不一致",
			path: ["confirm_password"],
		})
		.refine((data) => data.new_password !== loginCredentials.password, {
			message: "新密码不能与当前密码相同",
			path: ["new_password"],
		})
		.refine((data) => data.new_password !== loginCredentials.username, {
			message: "新密码不能与用户名相同",
			path: ["new_password"],
		});

	const passwordForm = useForm({
		defaultValues: { new_password: "", confirm_password: "" },
		validators: {
			onSubmit: changePasswordSchema,
			onChange: changePasswordSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await updatePasswordMutation.mutateAsync({
					data: {
						current_password: loginCredentials.password,
						new_password: value.new_password,
					},
				});
				toast.success("密码修改成功。");
				localStorage.removeItem("force_password_change");
				setShowPasswordChange(false);
				navigate({ to: "/" });
			} catch (_err) {
				toast.error("密码修改失败，请重试。");
			}
		},
	});

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
			<div className="pointer-events-none absolute -left-[10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-teal-200/50 mix-blend-multiply blur-[100px] dark:bg-teal-900/40 dark:mix-blend-screen" />
			<div className="pointer-events-none absolute -right-[10%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-200/50 mix-blend-multiply blur-[100px] dark:bg-emerald-900/40 dark:mix-blend-screen" />

			<Card className="relative z-10 w-full max-w-sm shadow-2xl sm:shadow-3xl dark:border-border dark:bg-card/40 dark:backdrop-blur-xl">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl text-(--sea-ink)">
						登录 Ego 采集管理
					</CardTitle>
					<CardDescription>欢迎回来 — 请输入您的凭证进行登录。</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
						className="grid gap-4"
						id="login-form"
					>
						{/* Username */}
						<FormInput
							form={form}
							name="username"
							label="用户名"
							placeholder="请输入用户名"
						/>

						{/* Password */}
						<FormInput
							form={form}
							name="password"
							label="密码"
							type="password"
							placeholder="••••••••"
						/>

						{/* Submit */}
						<FormButton form={form} className="w-full">
							登 录
						</FormButton>
					</form>
				</CardContent>
			</Card>

			{/* Force Password Change Modal */}
			<Dialog open={showPasswordChange} onOpenChange={() => {}}>
				<DialogContent showCloseButton={false} className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>需要修改密码</DialogTitle>
						<DialogDescription>
							出于安全考虑，请修改您的密码。新密码不能与您的用户名或当前密码相同。
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							passwordForm.handleSubmit();
						}}
						className="grid gap-4 py-4"
					>
						<FormInput
							form={passwordForm}
							name="new_password"
							label="新密码"
							type="password"
							placeholder="••••••••"
						/>
						<FormInput
							form={passwordForm}
							name="confirm_password"
							label="确认新密码"
							type="password"
							placeholder="••••••••"
						/>
						<FormButton form={passwordForm} className="w-full mt-2">
							更新密码
						</FormButton>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
