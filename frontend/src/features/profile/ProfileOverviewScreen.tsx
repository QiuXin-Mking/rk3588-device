import {
	ChevronRight,
	CircleUserRound,
	Info,
	LogIn,
	LogOut,
	UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ScreenCommonProps } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import { loadManagementSession } from "../../services/managementApi";
import { cn } from "../../shared/lib/cn";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { MobileProfileView } from "./mobile/MobileProfileView";

export function ProfileScreen({
	status,
	online,
	go,
	notify,
}: ScreenCommonProps) {
	const mode = useUiMode();
	const session = loadManagementSession();
	if (mode === "mobile") {
		return (
			<MobileProfileView
				status={status}
				online={online}
				go={go}
				notify={notify}
			/>
		);
	}

	return (
		<div className="page">
			<PageHeader title="我的" />
			<div className="min-h-0 w-full flex-1">
				<Card className="grid h-full grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)] gap-0 overflow-hidden border-sky-500/20 py-0">
					<section className="flex min-w-0 flex-col justify-center border-r border-border bg-sky-500/5 px-12">
						<div className="grid size-28 place-items-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 [&>svg]:size-16">
							<CircleUserRound />
						</div>
						<h2 className="mt-6 truncate text-[length:var(--device-text-lg)] font-bold">
							{session?.user.name || "未登录操作员"}
						</h2>
						<p className="mt-2 truncate text-[length:var(--device-text-sm)] text-muted-foreground">
							{session?.user.role || "尚未登录"}
						</p>
						<p className="mt-5 text-[length:var(--device-text-xs)] text-muted-foreground">
							作业序列号
						</p>
						<strong className="mt-1 truncate text-[length:var(--device-text-sm)]">
							{session?.user.work_serial_number || "待生成"}
						</strong>
					</section>

					<section className="grid min-h-0 min-w-0 grid-rows-[64px_1fr_1fr_64px_1fr]">
						<h3 className="flex items-center border-b border-border bg-secondary/20 px-8 text-[length:var(--device-text-xs)] font-bold text-muted-foreground">
							账户
						</h3>
						<ProfileItem
							icon={<UserRound />}
							tone="sky"
							label="我的信息"
							value={session ? "已登录" : "未登录"}
							onClick={() => go("account")}
						/>
						<ProfileItem
							icon={session ? <LogOut /> : <LogIn />}
							tone="violet"
							label="登录管理"
							value={session ? "管理当前账户" : "账号密码登录"}
							onClick={() => go("account")}
						/>
						<h3 className="flex items-center border-y border-border bg-secondary/20 px-8 text-[length:var(--device-text-xs)] font-bold text-muted-foreground">
							服务
						</h3>
						<ProfileItem
							icon={<Info />}
							tone="indigo"
							label="关于深灵"
							value="版本与更新记录"
							onClick={() => go("about")}
						/>
					</section>
				</Card>
			</div>
		</div>
	);
}

function ProfileItem({
	icon,
	tone,
	label,
	value,
	onClick,
}: {
	icon: ReactNode;
	tone: keyof typeof profileTones;
	label: string;
	value?: string;
	onClick?: () => void;
}) {
	return (
		<button
			className="grid min-h-0 grid-cols-[64px_minmax(max-content,1fr)_auto_28px] items-center gap-4 border-0 border-b border-border bg-transparent px-8 text-left last:border-b-0 hover:bg-secondary"
			onClick={onClick}
			disabled={!onClick}
		>
			<span
				className={cn(
					"grid size-16 place-items-center rounded-2xl [&>svg]:size-8",
					profileTones[tone],
				)}
			>
				{icon}
			</span>
			<strong className="whitespace-nowrap text-[length:var(--device-text-sm)]">
				{label}
			</strong>
			{value && (
				<Badge size="device" variant="secondary" className="px-3 text-[20px]">
					{value}
				</Badge>
			)}
			<ChevronRight className="size-7 text-muted-foreground" />
		</button>
	);
}

const profileTones = {
	sky: "bg-sky-500/10 text-sky-500",
	violet: "bg-violet-500/10 text-violet-500",
	indigo: "bg-indigo-500/10 text-indigo-500",
} as const;
