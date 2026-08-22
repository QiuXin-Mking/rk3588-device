import { Camera, ChevronRight, Cpu, Hand, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Navigate } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import type { DeviceStatus, RecordStatus } from "../../services/deviceApi";
import type { TerminalConfig } from "../../services/managementApi";
import {
	buildTerminalTopology,
	hardwareStateLabel,
} from "../../services/terminalTopology";
import { formatBytes } from "../../shared/format";
import { cn } from "../../shared/lib/cn";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { deviceTone } from "../home/homeModel";
import { DataBadge } from "./deviceCatalog";
import { MobileDeviceListView } from "./mobile/MobileDeviceListView";

function iconForModel(model: string) {
	if (model.startsWith("HEAD_")) return <Camera />;
	if (model === "WRIST_MONO") return <Radio />;
	if (model === "GLOVE") return <Hand />;
	return <Cpu />;
}

export function DeviceListScreen({
	record,
	terminalConfig,
	back,
	go,
	refreshStatus,
}: {
	status: DeviceStatus;
	record: RecordStatus;
	terminalConfig?: TerminalConfig;
	back: () => void;
	go: Navigate;
	refreshStatus: () => Promise<void>;
}) {
	const mode = useUiMode();
	const devices = buildTerminalTopology(terminalConfig, record);
	const connectedCount = devices.filter(
		(device) => device.state === "online",
	).length;

	if (mode === "mobile")
		return (
			<MobileDeviceListView
				back={back}
				go={go}
				onRefresh={refreshStatus}
				devices={devices.map((device) => ({
					id: device.id,
					name: device.label,
					subtitle: device.entity?.serial_number || "SN 未录入",
					state: device.state,
					labels: [device.model, `视频 ${device.channels.length} 路`],
					icon: iconForModel(device.model),
				}))}
			/>
		);

	return (
		<div className="page detail-page">
			<PageHeader
				title="设备状态"
				subtitle={
					terminalConfig?.physical_kit
						? `${terminalConfig.physical_kit.name} · ${connectedCount}/${devices.length} 在线`
						: "未绑定实体套件"
				}
				back={back}
				action={
					<div className="flex items-center gap-3.5">
						<Button
							className="border-violet-500/30 bg-violet-500/10 text-violet-500"
							size="device-compact"
							variant="outline"
							onClick={() => go("package-download")}
						>
							大包下载
						</Button>
					</div>
				}
			/>
			<div className="local-scroll grid min-h-0 flex-1 grid-cols-2 content-start gap-[var(--gap)] overflow-y-auto pr-1">
				{devices.map((device) => {
					const connected = device.state === "online";
					return (
						<button
							key={device.id}
							className={cn(
								"grid h-[148px] shrink-0 grid-cols-[72px_minmax(220px,1fr)_auto_18px_32px] items-center gap-5 rounded-[var(--device-radius)] border border-border bg-card px-6 text-left text-foreground shadow-sm transition-colors hover:border-blue-500/40 hover:bg-blue-500/5",
							)}
							onClick={() => go("device-info")}
						>
							<span
								className={cn(
									"grid size-16 place-items-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-8",
									connected && deviceTone(device.role),
								)}
							>
								{iconForModel(device.model)}
							</span>
							<span className="flex min-w-0 flex-col">
								<strong className="truncate text-[length:var(--device-text-lg)]">
									{device.label}
								</strong>
								<small className="mt-1 text-[length:var(--device-text-sm)] text-muted-foreground">
									{device.entity?.serial_number || "SN 未录入"}
								</small>
							</span>
							<span className="flex min-w-[220px] flex-wrap justify-end gap-2">
								{[device.model, `视频 ${device.channels.length} 路`].map(
									(l) => (
										<DataBadge key={l} label={l} />
									),
								)}
							</span>
							<span
								className={cn(
									"size-4 rounded-full bg-muted-foreground",
									device.state === "online" && "bg-emerald-500",
								)}
							/>
							<ChevronRight className="size-8 text-muted-foreground" />
						</button>
					);
				})}
				{devices.length === 0 && (
					<Card className="col-span-2 grid min-h-40 place-items-center text-muted-foreground">
						当前账号尚未绑定实体套件
					</Card>
				)}
			</div>
		</div>
	);
}

export function DeviceInfoScreen({
	status,
	record,
	terminalConfig,
	back,
}: {
	status: DeviceStatus;
	record: RecordStatus;
	terminalConfig?: TerminalConfig;
	back: () => void;
}) {
	const mode = useUiMode();
	const devices = buildTerminalTopology(terminalConfig, record);
	return (
		<div className="page detail-page">
			<PageHeader title="设备状态" subtitle="运行状态" back={back} />
			<div
				className={cn(
					"grid min-h-0 flex-1 gap-[var(--gap)]",
					mode === "device"
						? "grid-cols-[.72fr_1.28fr] overflow-hidden"
						: "grid-cols-1 gap-3 overflow-y-auto",
				)}
			>
				<Card className={cn(mode === "device" ? "h-full min-h-0 p-7" : "p-4")}>
					<span className="eyebrow">SYSTEM STATUS</span>
					<h2
						className={cn(
							"mt-2 font-bold",
							mode === "device"
								? "text-[length:var(--device-text-xl)]"
								: "text-xl",
						)}
					>
						系统状态
					</h2>
					<dl
						className={cn(
							"mt-5 grid gap-3 [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:rounded-xl [&>div]:bg-secondary [&>div]:p-4 [&_dt]:text-muted-foreground [&_dd]:font-bold",
							mode === "device"
								? "[&_dd]:text-[length:var(--device-text-sm)] [&_dt]:text-[length:var(--device-text-xs)]"
								: "[&_dd]:text-sm [&_dt]:text-xs",
						)}
					>
						<div>
							<dt>电量</dt>
							<dd>{status.battery.pct}%</dd>
						</div>
						<div>
							<dt>电压</dt>
							<dd>{status.battery.voltage || "—"} V</dd>
						</div>
						<div>
							<dt>存储</dt>
							<dd>
								{formatBytes(status.storage.used)} /{" "}
								{formatBytes(status.storage.total)}
							</dd>
						</div>
						<div>
							<dt>网络</dt>
							<dd>{status.wifi.connected ? status.wifi.ssid : "未连接"}</dd>
						</div>
						<div>
							<dt>录制</dt>
							<dd>{record.recording ? "录制中" : "空闲"}</dd>
						</div>
					</dl>
				</Card>
				<section
					className={cn(
						"min-h-0",
						mode === "device" && "flex flex-col overflow-hidden",
					)}
				>
					<span className="eyebrow">DEVICE SUITES</span>
					<h2
						className={cn(
							"my-3 shrink-0 font-bold",
							mode === "device"
								? "text-[length:var(--device-text-lg)]"
								: "text-xl",
						)}
					>
						套件状态
					</h2>
					<div
						className={cn(
							"grid gap-[var(--gap)]",
							mode === "device"
								? "local-scroll min-h-0 flex-1 grid-cols-2 auto-rows-[154px] content-start overflow-y-auto pr-1"
								: "grid-cols-1 gap-3",
						)}
					>
						{devices.map((device) => {
							const connected = device.state === "online";
							return (
								<Card
									className={cn(
										"grid h-[154px] grid-cols-[64px_minmax(0,1fr)_auto] grid-rows-[1fr_auto] items-center gap-x-4 gap-y-2 p-4",
										connected && "border-emerald-500/30 bg-emerald-500/5",
									)}
									key={device.id}
								>
									<span
										className={cn(
											"row-span-2 grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-7",
											connected && deviceTone(device.role),
										)}
									>
										{iconForModel(device.model)}
									</span>
									<div className="flex min-w-0 flex-col justify-center">
										<strong
											className={cn(
												"whitespace-nowrap",
												mode === "device" ? "text-[30px]" : "text-base",
											)}
										>
											{device.label}
										</strong>
										<small
											className={cn(
												"mt-1 text-muted-foreground",
												mode === "device"
													? "text-[length:var(--device-text-sm)]"
													: "text-xs",
											)}
										>
											{device.entity?.serial_number || "SN 未录入"}
										</small>
									</div>
									<div className="flex min-w-[130px] items-center justify-end gap-2">
										<div
											className={cn(
												"flex items-center gap-2 text-muted-foreground",
												mode === "device"
													? "text-[length:var(--device-text-sm)]"
													: "text-xs",
											)}
										>
											<span
												className={cn(
													"size-3 rounded-full bg-muted-foreground",
													connected && "bg-emerald-500",
												)}
											/>
											{hardwareStateLabel(device.state)}
										</div>
									</div>
									<span className="col-span-2 col-start-2 flex min-h-9 flex-wrap justify-end gap-2">
										{[device.model, `视频 ${device.channels.length} 路`].map(
											(l) => (
												<DataBadge key={l} label={l} />
											),
										)}
									</span>
								</Card>
							);
						})}
						{devices.length === 0 && (
							<Card className="col-span-2 grid min-h-40 place-items-center text-muted-foreground">
								当前账号尚未绑定实体套件
							</Card>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
