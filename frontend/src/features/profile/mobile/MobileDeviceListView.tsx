import { Activity, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Navigate } from "../../../app/model";
import {
	type HardwareState,
	hardwareStateLabel,
} from "../../../services/terminalTopology";
import { cn } from "../../../shared/lib/cn";
import { PageHeader } from "../../../shared/ui/DevicePrimitives";
import { deviceTone } from "../../home/homeModel";

export type MobileDeviceItem = {
	id: string;
	name: string;
	subtitle: string;
	state: HardwareState;
	labels: string[];
	icon: React.ReactNode;
};

export function MobileDeviceListView({
	back,
	go,
	devices,
	onRefresh,
}: {
	back: () => void;
	go: Navigate;
	devices: MobileDeviceItem[];
	onRefresh: () => Promise<void>;
}) {
	const connected = devices.filter(
		(device) => device.state === "online",
	).length;
	const [refreshing, setRefreshing] = useState(false);
	const refresh = async () => {
		if (refreshing) return;
		setRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setRefreshing(false);
		}
	};
	return (
		<div className="page detail-page flex min-h-full flex-col gap-3.5 lg:grid lg:grid-cols-1 lg:content-start">
			<PageHeader
				title="设备状态"
				subtitle={`${connected}/${devices.length} 台在线`}
				back={back}
			/>
			<Card className="grid grid-cols-[1fr_auto] items-center gap-3.5 bg-card p-4.5 lg:col-span-2">
				<div className="flex items-center gap-3">
					<Activity className="size-6 text-primary" />
					<span className="grid gap-0.5">
						<small className="text-xs text-muted-foreground">连接状态</small>
						<strong>{connected ? "采集设备已就绪" : "等待设备连接"}</strong>
					</span>
				</div>
				<span
					className={cn(
						"grid size-13 place-items-center rounded-full border-[5px] border-border font-extrabold",
						connected && "border-primary",
					)}
				>
					{connected}/{devices.length}
				</span>
				<Button className="col-span-2" disabled={refreshing} onClick={refresh}>
					<RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
					{refreshing ? "刷新中…" : "刷新状态"}
				</Button>
			</Card>
			<Card className="rounded-[1.25rem] p-4 shadow-none">
				<header className="mb-1">
					<h2 className="text-xl font-bold">后台已配置设备</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						套件、设备 SN 与绑定位置由管理后台统一下发，终端仅显示连接状态。
					</p>
				</header>
				{devices.map((device) => (
					<button
						className="grid w-full min-w-0 grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 border-0 border-b border-border bg-transparent py-3 text-left text-foreground last:border-b-0"
						key={device.id}
						onClick={() => go("device-info")}
					>
						<span
							className={cn(
								"grid size-11 place-items-center rounded-[.9rem] bg-secondary text-muted-foreground [&>svg]:size-5",
								device.state === "online" && deviceTone(device.id),
							)}
						>
							{device.icon}
						</span>
						<span className="grid min-w-0 gap-0.5">
							<strong className="truncate text-sm">{device.name}</strong>
							<small className="truncate text-[11px] text-muted-foreground">
								{device.subtitle} · {device.id}
							</small>
							<em className="truncate text-[11px] not-italic text-muted-foreground">
								{device.labels.join(" · ") || "控制设备"}
							</em>
						</span>
						<Badge
							className={cn(
								device.state === "online" &&
									"border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
							)}
							variant={device.state === "online" ? "outline" : "secondary"}
						>
							{hardwareStateLabel(device.state)}
						</Badge>
						<ChevronRight className="size-4 text-muted-foreground" />
					</button>
				))}
			</Card>
		</div>
	);
}
