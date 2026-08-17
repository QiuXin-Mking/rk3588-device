import { ChevronRight, QrCode, ScanLine } from "lucide-react";
import { useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Navigate } from "../../app/model";
import type { DeviceStatus, RecordStatus } from "../../services/deviceApi";
import { formatBytes } from "../../shared/format";
import {
	EmptyState,
	HumanFigure,
	PageHeader,
} from "../../shared/ui/DevicePrimitives";
import { DataBadge, DEVICE_SUITES, isDeviceConnected } from "./deviceCatalog";
import { MobileDeviceListView } from "./mobile/MobileDeviceListView";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../../shared/lib/cn';
import { deviceTone } from '../home/homeModel';

export function DeviceListScreen({
	record,
	back,
	go,
	refreshStatus,
}: {
	status: DeviceStatus;
	record: RecordStatus;
	back: () => void;
	go: Navigate;
	refreshStatus: () => Promise<void>;
}) {
	const mode = useUiMode();
	const connectedCount = DEVICE_SUITES.filter((d) =>
		isDeviceConnected(d, record),
	).length;

	if (mode === "mobile")
		return (
			<MobileDeviceListView
				back={back}
				go={go}
				onRefresh={refreshStatus}
				devices={DEVICE_SUITES.map((device) => ({
					id: device.id,
					name: device.name,
					subtitle: device.subtitle,
					connected: isDeviceConnected(device, record),
					labels: device.dataLabels,
					icon: device.icon,
				}))}
			/>
		);

	return (
		<div className="page detail-page">
			<PageHeader
				title="设备与套件"
				subtitle={`${connectedCount}/${DEVICE_SUITES.length} 在线`}
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
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(520px,.85fr)] gap-[var(--gap)]">
				<div className="local-scroll flex min-h-0 flex-1 flex-col gap-[var(--gap)] pr-1">
					{DEVICE_SUITES.map((d) => {
						const connected = isDeviceConnected(d, record);
						return (
							<button
								key={d.id}
								className={cn('grid min-h-[116px] shrink-0 grid-cols-[72px_1fr_18px_32px] items-center gap-5 rounded-[var(--device-radius)] border border-border bg-card px-6 text-left text-foreground shadow-sm transition-colors hover:border-blue-500/40 hover:bg-blue-500/5')}
								onClick={() => go("device-info")}
							>
								<span className={cn('grid size-16 place-items-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-8', connected && deviceTone(d.id))}>
									{d.icon}
								</span>
								<span className="flex min-w-0 flex-col">
									<strong className="text-[length:var(--device-text-lg)]">{d.name}</strong>
									<small className="mt-1 text-[length:var(--device-text-sm)] text-muted-foreground">{d.subtitle}</small>
									{d.dataLabels.length > 0 && (
										<span className="mt-2 flex flex-wrap gap-2">
											{d.dataLabels.map((l) => (
												<DataBadge key={l} label={l} />
											))}
										</span>
									)}
								</span>
								<span className={cn('size-4 rounded-full bg-muted-foreground', connected && 'bg-emerald-500')} />
								<ChevronRight className="size-8 text-muted-foreground" />
							</button>
						);
					})}
				</div>
				<Card className="grid min-h-0 place-items-center border-dashed border-violet-500/30 bg-violet-500/5">
					<EmptyState
						icon={<ScanLine />}
						title="添加套件"
						description="支持扫码绑定和设备类型选择。"
						action={
							<Button
								size="device"
								variant="secondary"
								onClick={() => go("device-type")}
							>
								绑定套件
							</Button>
						}
					/>
				</Card>
			</div>
		</div>
	);
}

export function DeviceTypeScreen({
	back,
	go,
}: {
	back: () => void;
	go: Navigate;
}) {
	const mode = useUiMode();
	return (
		<div className="page detail-page">
			<PageHeader
				title="选择设备类型"
				subtitle="选择需要绑定的套件"
				back={back}
			/>
			<div className={cn('grid min-h-0 flex-1 gap-[var(--gap)] overflow-y-auto', mode === 'device' ? 'grid-cols-2' : 'grid-cols-1 gap-3')}>
				{DEVICE_SUITES.map((d) => (
					<button
						key={d.id}
						className={cn('grid items-center rounded-[var(--device-radius)] border border-border bg-card text-left text-foreground shadow-sm transition-colors hover:border-blue-500/40 hover:bg-blue-500/5', mode === 'device' ? 'min-h-[190px] grid-cols-[88px_1fr_42px] gap-6 p-7' : 'min-h-24 grid-cols-[56px_1fr_24px] gap-3 p-4')}
						onClick={() => go("qr-scan")}
					>
						<span className={cn('grid place-items-center rounded-xl [&>svg]:size-8', mode === 'device' ? 'size-[72px]' : 'size-12', deviceTone(d.id))}>
							{d.icon}
						</span>
						<div>
							<h2 className={cn('font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-base')}>{d.name}</h2>
							<p className={cn('text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-xs')}>{d.subtitle}</p>
							{d.dataLabels.length > 0 && (
								<span className="mt-2 flex flex-wrap gap-2">
									{d.dataLabels.map((l) => (
										<DataBadge key={l} label={l} />
									))}
								</span>
							)}
						</div>
						<ChevronRight />
					</button>
				))}
			</div>
		</div>
	);
}

export function QrScanScreen({ back, go }: { back: () => void; go: Navigate }) {
	const mode = useUiMode();
	return (
		<div className="page detail-page">
			<PageHeader
				title="扫描二维码"
				subtitle="摄像头扫码接口待接入"
				back={back}
			/>
			<Card className={cn('grid min-h-0 flex-1 place-items-center content-center text-center', mode === 'device' ? 'gap-5 p-8' : 'gap-3 p-5')}>
				<div className={cn('relative rounded-3xl border-4 border-sky-500 bg-sky-500/5 shadow-inner', mode === 'device' ? 'size-[360px]' : 'size-56')}>
					<i className="absolute inset-x-5 top-1/2 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-lg shadow-sky-500/50" />
				</div>
				<QrCode className={mode === 'device' ? 'size-16 text-sky-500' : 'size-10 text-sky-500'} />
				<h2 className={cn('font-bold', mode === 'device' ? 'text-[length:var(--device-text-xl)]' : 'text-xl')}>将设备二维码放入框内</h2>
				<p className={cn('text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-sm')}>当前后端尚未提供二维码识别接口。</p>
				<Button size={mode === 'device' ? 'device' : 'touch'} variant="secondary" onClick={() => go("add-device")}>
					手动确认设备
				</Button>
			</Card>
		</div>
	);
}

export function AddDeviceScreen({
	back,
	go,
}: {
	back: () => void;
	go: Navigate;
}) {
	const mode = useUiMode();
	const [bindPoint, setBindPoint] = useState("头部");
	const [serial, setSerial] = useState("");
	return (
		<div className="page detail-page">
			<PageHeader title="添加设备" subtitle="确认设备信息" back={back} />
			<Card className={cn('grid min-h-0 flex-1 items-center overflow-y-auto', mode === 'device' ? 'grid-cols-[.8fr_1.2fr] gap-12 px-[8%] py-8' : 'grid-cols-1 gap-4 p-4')}>
				<div className={mode === 'device' ? 'h-full' : 'hidden'}><HumanFigure /></div>
				<div className={cn('grid', mode === 'device' ? 'gap-3.5' : 'gap-3', '[&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-5 [&>div]:rounded-xl [&>div]:bg-secondary [&>div]:px-5 [&>label]:grid [&>label]:gap-2 [&>label>span]:text-muted-foreground [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-secondary [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-secondary', mode === 'device' ? '[&>div]:min-h-[92px] [&>div]:text-[length:var(--device-text-sm)] [&_input]:min-h-[88px] [&_input]:px-5 [&_input]:text-[length:var(--device-text-md)] [&_label>span]:text-[length:var(--device-text-sm)] [&_select]:min-h-[88px] [&_select]:px-5 [&_select]:text-[length:var(--device-text-md)]' : '[&>div]:min-h-14 [&>div]:text-sm [&_input]:min-h-12 [&_input]:px-3 [&_label>span]:text-sm [&_select]:min-h-12 [&_select]:px-3')}>
					<div>
						<span>当前选中</span>
						<strong>iSuit</strong>
					</div>
					<label>
						<span>绑定部位</span>
						<select
							value={bindPoint}
							onChange={(event) => setBindPoint(event.target.value)}
						>
							<option>头部</option>
							<option>左腕</option>
							<option>右腕</option>
							<option>身体</option>
						</select>
					</label>
					<label>
						<span>设备 SN / 二维码内容</span>
						<input
							value={serial}
							onChange={(event) => setSerial(event.target.value)}
							placeholder="扫描或手动输入序列号"
						/>
					</label>
					<div>
						<span>通信方式</span>
						<strong>本机网络</strong>
					</div>
					<div>
						<span>绑定状态</span>
						<strong>{serial ? `${bindPoint} · 待确认` : "等待设备信息"}</strong>
					</div>
					<Button
						size={mode === 'device' ? 'device-primary' : 'touch'}
						disabled={!serial}
						onClick={() => go("device-info")}
					>
						确认绑定
					</Button>
				</div>
			</Card>
		</div>
	);
}

export function DeviceInfoScreen({
	status,
	record,
	back,
}: {
	status: DeviceStatus;
	record: RecordStatus;
	back: () => void;
}) {
	const mode = useUiMode();
	return (
		<div className="page detail-page">
			<PageHeader title="设备与套件" subtitle="运行状态" back={back} />
			<div className={cn('grid min-h-0 flex-1 gap-[var(--gap)] overflow-y-auto', mode === 'device' ? 'grid-cols-[.72fr_1.28fr]' : 'grid-cols-1 gap-3')}>
				<Card className={cn(mode === 'device' ? 'p-7' : 'p-4')}>
					<span className="eyebrow">SYSTEM STATUS</span>
					<h2 className={cn('mt-2 font-bold', mode === 'device' ? 'text-[length:var(--device-text-xl)]' : 'text-xl')}>系统状态</h2>
					<dl className={cn('mt-5 grid gap-3 [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:rounded-xl [&>div]:bg-secondary [&>div]:p-4 [&_dt]:text-muted-foreground [&_dd]:font-bold', mode === 'device' ? '[&_dd]:text-[length:var(--device-text-sm)] [&_dt]:text-[length:var(--device-text-xs)]' : '[&_dd]:text-sm [&_dt]:text-xs')}>
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
				<section className="min-h-0">
					<span className="eyebrow">DEVICE SUITES</span>
					<h2 className={cn('my-3 font-bold', mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-xl')}>套件状态</h2>
					<div className={cn('grid gap-[var(--gap)]', mode === 'device' ? 'grid-cols-2' : 'grid-cols-1 gap-3')}>
						{DEVICE_SUITES.map((d) => {
							const connected = isDeviceConnected(d, record);
							return (
								<Card
									className={cn('flex items-start gap-5 p-5', connected && 'border-emerald-500/30 bg-emerald-500/5')}
									key={d.id}
								>
									<span className={cn('grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-7', connected && deviceTone(d.id))}>
										{d.icon}
									</span>
									<div className="flex min-w-0 flex-col">
										<strong className={mode === 'device' ? 'text-[length:var(--device-text-lg)]' : 'text-base'}>{d.name}</strong>
										<small className={cn('mt-1 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-xs')}>{d.subtitle}</small>
										<div className={cn('mt-2 flex items-center gap-2 text-muted-foreground', mode === 'device' ? 'text-[length:var(--device-text-sm)]' : 'text-xs')}>
											<span className={cn('size-3 rounded-full bg-muted-foreground', connected && 'bg-emerald-500')} />
											{connected ? "已连接" : "未连接"}
										</div>
										{d.dataLabels.length > 0 && (
											<span className="mt-2 flex flex-wrap gap-2">
												{d.dataLabels.map((l) => (
													<DataBadge key={l} label={l} />
												))}
											</span>
										)}
									</div>
								</Card>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}
