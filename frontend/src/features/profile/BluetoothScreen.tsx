import {
	Bluetooth,
	ChevronRight,
	ExternalLink,
	Hand,
	RefreshCw,
	RotateCw,
	Search,
	Wrench,
} from "lucide-react";
import { useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Notify } from "../../app/model";
import {
	api,
	type BluetoothDevice,
	type DeviceStatus,
} from "../../services/deviceApi";
import {
	EmptyState,
	HandSkeleton,
	PageHeader,
} from "../../shared/ui/DevicePrimitives";
import { MobileBluetoothView } from "./mobile/MobileBluetoothView";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../../shared/lib/cn';

export function BluetoothScreen({
	status,
	back,
	notify,
	refreshStatus,
}: {
	status: DeviceStatus;
	back: () => void;
	notify: Notify;
	refreshStatus: () => Promise<void>;
}) {
	const mode = useUiMode();
	const gloves = status.bluetooth.gloves || {};
	const [panel, setPanel] = useState<"devices" | "scan" | "calibration">(
		"devices",
	);
	const [devices, setDevices] = useState<BluetoothDevice[]>([]);
	const [scanning, setScanning] = useState(false);
	const [calibrating, setCalibrating] = useState("");

	const toggle = async (
		side: "left" | "right",
		connected: boolean,
		address?: string,
	) => {
		try {
			if (connected) await api.bluetoothDisconnect();
			else {
				const target =
					address ||
					gloves[side]?.address ||
					(side === "left" ? "04:26:04:15:0C:65" : "04:26:04:09:0A:9B");
				await api.bluetoothConnect(target);
			}
			notify(connected ? "蓝牙连接已断开" : "正在连接手套");
			await refreshStatus();
		} catch (error) {
			notify(error instanceof Error ? error.message : "蓝牙操作失败");
		}
	};

	const scan = async () => {
		setScanning(true);
		try {
			setDevices((await api.bluetoothScan()).devices);
		} catch {
			notify("蓝牙扫描失败");
		} finally {
			setScanning(false);
		}
	};

	const controlCalibrator = async (action: "start" | "stop" | "restart") => {
		try {
			await api.calibrator(action);
			notify(
				action === "start"
					? "校准服务已启动"
					: action === "stop"
						? "校准服务已停止"
						: "校准服务已重启",
			);
			await refreshStatus();
		} catch (error) {
			notify(error instanceof Error ? error.message : "校准服务操作失败");
		}
	};

	const startCalibration = async (side: "left" | "right") => {
		const wired = Boolean(status.wiredGloves?.[side]);
		const bluetooth = Boolean(gloves[side]?.connected);
		const transport: "wired" | "spp" = wired && !bluetooth ? "wired" : "spp";
		setCalibrating(side);
		try {
			const result = await api.calibrateStart(side, transport);
			if (!result.ok) throw new Error(result.error || "校准连接失败");
			const target = `http://${window.location.hostname}:8888/?kiosk=1&side=${side}&transport=${transport}`;
			window.location.href = target;
		} catch (error) {
			notify(error instanceof Error ? error.message : "校准连接失败");
			setCalibrating("");
		}
	};

	if (mode === "mobile") {
		return <MobileBluetoothView status={status} panel={panel} setPanel={setPanel} devices={devices} scanning={scanning} calibrating={calibrating} back={back} reconnect={() => toggle("right", false)} scan={scan} toggle={toggle} controlCalibrator={controlCalibrator} startCalibration={startCalibration} />;
	}

	return (
		<div className="page detail-page">
			<PageHeader
				title="手套与蓝牙"
				subtitle="SPP / USB 连接状态"
				back={back}
				action={
					<Button
						className="border-sky-500/30 bg-sky-500/10 text-sky-500"
						size="device-compact"
						variant="outline"
						onClick={() => toggle("right", false)}
					>
						<RefreshCw data-icon="inline-start" />
						重新连接
					</Button>
				}
			/>
			<nav className="grid h-[102px] shrink-0 grid-cols-3 gap-2 rounded-[22px] border border-border bg-muted/50 p-[7px]" aria-label="手套与蓝牙功能">
				<button
					className={cn(tabClass, panel === "devices" && activeTabClass)}
					onClick={() => setPanel("devices")}
				>
					<Hand />
					手套
				</button>
				<button
					className={cn(tabClass, panel === "scan" && activeTabClass)}
					onClick={() => setPanel("scan")}
				>
					<Search />
					扫描
				</button>
				<button
					className={cn(tabClass, panel === "calibration" && activeTabClass)}
					onClick={() => setPanel("calibration")}
				>
					<Wrench />
					校准
				</button>
			</nav>

			<div className="min-h-0 flex-1">
				{panel === "devices" && (
					<div className="grid h-full min-h-0 grid-cols-2 gap-[var(--gap)]">
						{(["left", "right"] as const).map((side) => {
							const glove = gloves[side];
							const wired = Boolean(status.wiredGloves?.[side]);
							const connected = Boolean(glove?.connected || wired);
							return (
								<Card className={cn('grid min-h-0 grid-cols-[1fr_260px] items-center gap-4 p-6', connected && 'border-emerald-500/25 bg-emerald-500/5')} key={side}>
									<HandSkeleton active={connected} flipped={side === "left"} />
									<div className="col-start-1 row-start-2">
										<span className="eyebrow">
											{side === "left" ? "LEFT HAND" : "RIGHT HAND"}
										</span>
										<h2 className="text-[length:var(--device-text-lg)] font-bold">{side === "left" ? "左手手套" : "右手手套"}</h2>
										<p className="mt-2 text-[length:var(--device-text-sm)] text-muted-foreground">
											{wired
												? "USB 有线连接"
												: glove?.connected
													? `Bluetooth SPP · ${glove.address}`
													: "未连接"}
										</p>
									</div>
									<Button
										className="col-start-2 row-start-2"
										size="device"
										variant={connected ? "destructive" : "secondary"}
										onClick={() => toggle(side, connected)}
										disabled={wired}
									>
										{wired ? "有线在线" : connected ? "断开" : "连接"}
									</Button>
								</Card>
							);
						})}
					</div>
				)}

				{panel === "scan" && (
					<Card className="flex h-full min-h-0 flex-col p-[26px]">
						<div className="flex items-center justify-between gap-5">
							<div>
								<span className="eyebrow">BLUETOOTH DISCOVERY</span>
								<h2 className="mt-1 text-[length:var(--device-text-lg)] font-bold">附近设备</h2>
							</div>
							<Button
								size="device"
								variant="secondary"
								onClick={scan}
								disabled={scanning}
							>
								<RefreshCw className={scanning ? "animate-spin" : ""} />
								{scanning ? "扫描中…" : "开始扫描"}
							</Button>
						</div>
						<div className="local-scroll mt-4 min-h-0 flex-1">
							{devices.length ? (
								devices.map((device) => (
									<button
										className="grid min-h-[110px] w-full grid-cols-[66px_1fr_auto_40px] items-center gap-[18px] border-0 border-t border-border bg-transparent px-5 text-left text-foreground"
										key={device.address}
										onClick={() => toggle("right", false, device.address)}
									>
										<Bluetooth className="size-11 text-blue-500" />
										<span className="min-w-0">
											<strong className="block truncate text-[length:var(--device-text-md)]">{device.name || "未知设备"}</strong>
											<small className="mt-1 block truncate text-[length:var(--device-text-xs)] text-muted-foreground">
												{device.address}
												{device.paired ? " · 已配对" : ""}
											</small>
										</span>
										<em className="text-[length:var(--device-text-sm)] not-italic text-blue-500">{device.connected ? "已连接" : "连接"}</em>
										<ChevronRight className="size-8 text-muted-foreground" />
									</button>
								))
							) : (
								<EmptyState
									icon={<Bluetooth />}
									title={scanning ? "正在扫描附近设备" : "尚未扫描"}
									action={
										<Button size="device" onClick={scan}>
											开始扫描
										</Button>
									}
								/>
							)}
						</div>
					</Card>
				)}

				{panel === "calibration" && (
					<div className="grid h-full min-h-0 grid-rows-[132px_minmax(0,1fr)] gap-4">
						<Card className="grid min-h-0 grid-cols-[84px_1fr_auto] items-center gap-5 px-[22px] py-3.5">
							<span
								className={cn('grid size-[76px] place-items-center rounded-[20px] [&>svg]:size-[38px]', status.calibrator.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-violet-500/10 text-violet-500')}
							>
								<Wrench />
							</span>
							<div className="min-w-0">
								<strong className="block text-[length:var(--device-text-md)]">手套校准服务</strong>
								<small className="mt-1 block text-[length:var(--device-text-xs)] text-muted-foreground">
									{status.calibrator.active ? "服务运行中" : "服务未启动"}
								</small>
							</div>
							<div className="flex gap-2.5">
								<Button
									className="min-w-36"
									size="device"
									variant="secondary"
									onClick={() =>
										controlCalibrator(
											status.calibrator.active ? "stop" : "start",
										)
									}
								>
									{status.calibrator.active ? "停止" : "启动"}
								</Button>
								<Button className="min-w-36" size="device" variant="secondary" onClick={() => controlCalibrator("restart")}>
									<RotateCw />
									重启
								</Button>
								<Button
									className="min-w-36"
									size="device"
									variant="secondary"
									onClick={() => {
										window.location.href = `http://${window.location.hostname}:8888/?kiosk=1`;
									}}
								>
									<ExternalLink />
									打开
								</Button>
							</div>
						</Card>
						<div className="grid min-h-0 grid-cols-2 gap-4">
							{(["left", "right"] as const).map((side) => {
								const wired = Boolean(status.wiredGloves?.[side]);
								const bluetooth = Boolean(gloves[side]?.connected);
								const connected = wired || bluetooth;
								return (
									<Card className="grid min-h-0 grid-cols-[1fr_260px] grid-rows-[1fr_auto] items-center gap-4 p-6" key={side}>
										<HandSkeleton
											active={connected}
											flipped={side === "left"}
										/>
										<div className="col-start-1 row-start-2">
											<h2 className="text-[length:var(--device-text-lg)] font-bold">{side === "left" ? "左手校准" : "右手校准"}</h2>
											<p className="mt-2 text-[length:var(--device-text-sm)] text-muted-foreground">
												{wired
													? "USB 有线"
													: bluetooth
														? "Bluetooth SPP"
														: "请先连接手套"}
											</p>
										</div>
										<Button
											className="col-start-2 row-start-2"
											size="device"
											disabled={!connected || Boolean(calibrating)}
											onClick={() => startCalibration(side)}
										>
											{calibrating === side ? "正在交接…" : "开始校准"}
										</Button>
									</Card>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

const tabClass = 'flex items-center justify-center gap-3 rounded-[17px] border-0 bg-transparent text-[length:var(--device-text-md)] font-bold text-muted-foreground [&>svg]:size-[34px]'
const activeTabClass = 'bg-blue-600 text-white shadow-sm'
