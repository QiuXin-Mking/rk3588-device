import {
	ChevronRight,
	CircleUserRound,
	HelpCircle,
	Info,
	LogIn,
	LogOut,
	UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ScreenCommonProps } from "../../../app/model";
import {
	loadManagementSession,
	managementApi,
} from "../../../services/managementApi";
import { cn } from "../../../shared/lib/cn";
import { PageHeader } from "../../../shared/ui/DevicePrimitives";

type MobileProfileProps = Pick<
	ScreenCommonProps,
	"status" | "online" | "go" | "notify"
>;

export function MobileProfileView({ go, notify }: MobileProfileProps) {
	const session = loadManagementSession();
	const logout = () => {
		managementApi.logout();
		notify("已退出管理平台账户");
		go("account");
	};

	return (
		<div className="page flex min-h-full flex-col gap-4 pb-[calc(1.75rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-2 md:content-start">
			<PageHeader title="我的" />
			<Card className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 overflow-hidden border-sky-500/25 bg-sky-500/5 p-5 md:col-span-2">
				<div
					className={cn(
						"grid size-14 place-items-center rounded-[1.15rem] text-white shadow-md",
						avatarTone(session?.user.avatar),
					)}
				>
					<CircleUserRound className="size-8" />
				</div>
				<div className="min-w-0">
					<h2 className="m-0 truncate text-xl font-bold">
						{session?.user.name || "未登录操作员"}
					</h2>
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{session
							? `${session.user.role} · ${session.user.work_serial_number || "序列号待生成"}`
							: "登录后读取个人资料"}
					</p>
				</div>
				<button
					className="inline-flex min-h-11 items-center gap-0.5 border-0 bg-transparent px-1 text-sm font-semibold text-primary"
					onClick={() => go("account")}
				>
					{session ? "我的信息" : "登录"}
					<ChevronRight className="size-4" />
				</button>
				<div className="col-span-3 mt-1 flex items-center justify-between border-t border-border pt-3">
					<span className="text-xs text-muted-foreground">管理后台账户</span>
					<Badge
						className={cn(
							session &&
								"border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
						)}
						variant={session ? "outline" : "secondary"}
					>
						{session ? "已登录" : "未登录"}
					</Badge>
				</div>
			</Card>

			<MobileMenu
				title="账户"
				items={[
					{
						icon: <UserRound />,
						tone: "sky",
						label: "我的信息",
						note: "头像、昵称与作业资料",
						action: () => go("account"),
					},
					{
						icon: session ? <LogOut /> : <LogIn />,
						tone: "violet",
						label: "登录管理",
						note: session ? "退出当前账户" : "账号密码登录",
						action: session ? logout : () => go("account"),
					},
				]}
			/>

			<MobileMenu
				title="服务"
				items={[
					{
						icon: <HelpCircle />,
						tone: "orange",
						label: "帮助中心",
						note: "问题反馈",
						action: () => go("help-feedback"),
					},
					{
						icon: <Info />,
						tone: "indigo",
						label: "关于深灵",
						note: "版本与更新记录",
						action: () => go("about"),
					},
				]}
			/>

			{session && (
				<button
					className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 text-sm font-semibold text-destructive md:col-span-2"
					onClick={logout}
				>
					<LogOut className="size-4" />
					退出登录
				</button>
			)}
		</div>
	);
}

const menuTones = {
	sky: "bg-sky-500/12 text-sky-500",
	violet: "bg-violet-500/12 text-violet-500",
	orange: "bg-orange-500/12 text-orange-500",
	indigo: "bg-indigo-500/12 text-indigo-500",
} as const;

function MobileMenu({
	title,
	items,
}: {
	title: string;
	items: Array<{
		icon: React.ReactNode;
		tone: keyof typeof menuTones;
		label: string;
		note: string;
		action: () => void;
	}>;
}) {
	return (
		<section className="w-full self-stretch">
			<h3 className="mb-2 ml-1 text-xs font-semibold text-muted-foreground">
				{title}
			</h3>
			<Card className="overflow-hidden rounded-[1.25rem] py-0 shadow-none">
				{items.map((item) => (
					<button
						key={item.label}
						className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-0 border-b border-border bg-transparent px-3.5 py-3 text-left last:border-b-0 hover:bg-secondary"
						onClick={item.action}
					>
						<span
							className={cn(
								"grid size-10 place-items-center rounded-xl [&>svg]:size-5",
								menuTones[item.tone],
							)}
						>
							{item.icon}
						</span>
						<span className="grid min-w-0 gap-0.5">
							<strong className="text-[15px] text-foreground">
								{item.label}
							</strong>
							<small className="truncate text-xs text-muted-foreground">
								{item.note}
							</small>
						</span>
						<ChevronRight className="size-[18px] text-muted-foreground" />
					</button>
				))}
			</Card>
		</section>
	);
}

function avatarTone(avatar?: string) {
	return (
		(
			{
				"avatar-violet": "bg-gradient-to-br from-violet-500 to-fuchsia-700",
				"avatar-emerald": "bg-gradient-to-br from-emerald-500 to-teal-700",
				"avatar-orange": "bg-gradient-to-br from-orange-500 to-rose-700",
			} as Record<string, string>
		)[avatar || ""] || "bg-gradient-to-br from-sky-500 to-blue-700"
	);
}
