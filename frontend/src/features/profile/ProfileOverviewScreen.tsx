import {
	Bluetooth,
	ChevronRight,
	CircleUserRound,
	Database,
	Info,
	LogOut,
	Radio,
	Settings,
	ShieldCheck,
	Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { ScreenCommonProps } from "../../app/model";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { MobileProfileView } from "./mobile/MobileProfileView";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../../shared/lib/cn';

export function ProfileScreen({
	status,
	online,
	go,
	notify,
}: ScreenCommonProps) {
	const mode = useUiMode();
	if (mode === "mobile")
		return (
			<MobileProfileView
				status={status}
				online={online}
				go={go}
				notify={notify}
			/>
		);
	return (
		<div className="page">
			<PageHeader title="我的主页" subtitle="设备、服务与系统设置" />
			<div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[144px_minmax(0,1fr)] gap-4">
				<Card className="col-span-2 grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-5 border-sky-500/25 bg-sky-500/5 px-6 py-4">
					<div className="grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 [&>svg]:size-14">
						<CircleUserRound />
					</div>
					<div className="min-w-0">
						<h2 className="text-[length:var(--device-text-lg)] font-bold">设备操作员</h2>
						<p className="mt-2 truncate text-[length:var(--device-text-sm)] text-muted-foreground">本地账户 · 云端账户待接入</p>
					</div>
					<div className="flex items-center gap-3">
						<Button
							size="device-compact"
							variant="outline"
							onClick={() => go("account")}
						>
							<span>账户详情</span>
							<ChevronRight data-icon="inline-end" />
						</Button>
						<Button
							size="device-compact"
							variant="destructive"
							title="账户系统待接入"
							onClick={() => notify("账户系统待接入")}
						>
							<LogOut data-icon="inline-start" />
							<span>退出登录</span>
						</Button>
					</div>
				</Card>
				<Card className="grid min-h-0 grid-rows-[70px_repeat(3,minmax(0,1fr))] overflow-hidden">
					<h3 className="px-6 pt-6 text-[length:var(--device-text-sm)] font-bold text-muted-foreground">设备</h3>
					<ProfileItem
						icon={<Database />}
						tone="violet"
						label="设备管理"
						value={online ? "1 台在线" : "设备离线"}
						onClick={() => go("device-list")}
					/>
					<ProfileItem
						icon={<Wifi />}
						tone="cyan"
						label="WiFi 设置"
						value={status.wifi.connected ? status.wifi.ssid : "未连接"}
						onClick={() => go("wifi")}
					/>
					<ProfileItem
						icon={<Bluetooth />}
						tone="blue"
						label="手套与蓝牙"
						value={status.bluetooth.connected ? "已连接" : "未连接"}
						onClick={() => go("bluetooth")}
					/>
				</Card>
				<Card className="grid min-h-0 grid-rows-[70px_repeat(4,minmax(0,1fr))] overflow-hidden">
					<h3 className="px-6 pt-6 text-[length:var(--device-text-sm)] font-bold text-muted-foreground">系统</h3>
					<ProfileItem
						icon={<Settings />}
						tone="slate"
						label="设置"
						onClick={() => go("settings")}
					/>
					<ProfileItem
						icon={<Info />}
						tone="indigo"
						label="关于"
						onClick={() => go("about")}
					/>
					<ProfileItem
						icon={<Radio />}
						tone="amber"
						label="套件指南与考试"
						onClick={() => go("suite-guide")}
					/>
					<ProfileItem
						icon={<ShieldCheck />}
						tone="emerald"
						label="帮助与反馈"
						onClick={() => go("help-feedback")}
					/>
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
		<button className="grid min-h-0 grid-cols-[72px_1fr_auto_36px] items-center gap-4 border-0 border-b border-border bg-transparent px-6 text-left last:border-b-0 hover:bg-secondary" onClick={onClick} disabled={!onClick}>
			<span className={cn('grid size-16 place-items-center rounded-xl [&>svg]:size-8', profileTones[tone])}>{icon}</span>
			<strong className="text-[length:var(--device-text-md)]">{label}</strong>
			{value && <Badge size="device" variant="secondary">{value}</Badge>}
			<ChevronRight className="size-8 text-muted-foreground" />
		</button>
	);
}

const profileTones = {
	violet: 'bg-violet-500/10 text-violet-500',
	cyan: 'bg-cyan-500/10 text-cyan-500',
	blue: 'bg-blue-500/10 text-blue-500',
	slate: 'bg-slate-500/10 text-slate-500',
	indigo: 'bg-indigo-500/10 text-indigo-500',
	amber: 'bg-amber-500/10 text-amber-500',
	emerald: 'bg-emerald-500/10 text-emerald-500',
} as const;
