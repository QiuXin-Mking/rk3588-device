import {
	Activity,
	Camera,
	ChevronRight,
	Database,
	FileClock,
	X,
} from "lucide-react";
import { useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { ScreenCommonProps } from "../../app/model";
import type { SelectableProduct } from "../../app/product";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import {
	cameraIsOnline,
	getSideCameraChannels,
	type ProductDeviceId,
	type ProductDeviceStatus,
} from "./dataModel";
import { MobileRealtimeView } from "./mobile/MobileDataViews";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../../shared/lib/cn';

export function RealtimeScreen({
	status,
	record,
	go,
	product,
}: ScreenCommonProps & { product: SelectableProduct }) {
	const mode = useUiMode();
	const [selectedDevice, setSelectedDevice] = useState<ProductDeviceId | null>(
		null,
	);
	const leftWireless = Boolean(record.gloveSides?.left);
	const rightWireless = Boolean(record.gloveSides?.right);
	const leftUsb = Boolean(status.wiredGloves?.left);
	const rightUsb = Boolean(status.wiredGloves?.right);
	const egoUsb = record.cameraConnected;
	const egoStereo = cameraIsOnline(record, [
		"jhh02",
		"stereo",
		"ego_h_stereo",
		"head_stereo",
	]);
	const egoFour = cameraIsOnline(record, [
		"jhh04",
		"four",
		"quad",
		"ego_h_four",
		"head_four",
	]);
	const leftWristUsb = cameraIsOnline(record, [
		"ego_w_left",
		"ego_w_l",
		"wrist_left",
		"jhh2_left",
	]);
	const rightWristUsb = cameraIsOnline(record, [
		"ego_w_right",
		"ego_w_r",
		"wrist_right",
		"jhh2_right",
	]);
	const sideChannels = getSideCameraChannels(product, {
		leftHand: leftUsb || leftWireless,
		rightHand: rightUsb || rightWireless,
		leftWrist: leftWristUsb,
		rightWrist: rightWristUsb,
	});
	const productDevices: ProductDeviceStatus[] =
		product === "Banana"
			? [
					{
						id: "UMI_Fingers_L",
						name: "左指尖夹爪",
						states: [
							["无线", leftWireless],
							["USB", leftUsb],
						],
					},
					{
						id: "UMI_Fingers_R",
						name: "右指尖夹爪",
						states: [
							["无线", rightWireless],
							["USB", rightUsb],
						],
					},
					{
						id: "UMI_Grippers_L",
						name: "左板机夹爪",
						states: [],
						unavailable: true,
					},
					{
						id: "UMI_Grippers_R",
						name: "右板机夹爪",
						states: [],
						unavailable: true,
					},
					{
						id: "Ego_H",
						name: "头部 Ego",
						states: [
							["USB", egoUsb],
							["双目", egoStereo],
							["四目", egoFour],
						],
					},
					{ id: "Suits", name: "手套", states: [], unavailable: true },
				]
			: [
					{
						id: "Ego_H",
						name: "头部 Ego",
						states: [
							["USB", egoUsb],
							["双目", egoStereo],
							["四目", egoFour],
						],
					},
					{
						id: "Ego_W_L",
						name: "左腕部 Ego",
						states: [["USB", leftWristUsb]],
					},
					{
						id: "Ego_W_R",
						name: "右腕部 Ego",
						states: [["USB", rightWristUsb]],
					},
				];

	const cameraChannels = [
		{ label: "头部双目", online: egoStereo },
		{ label: "头部四目", online: egoFour },
		...sideChannels,
	];
	const selectedStates: Array<[string, boolean]> =
		selectedDevice === "Ego_H"
			? [
					["USB 连接", egoUsb],
					["双目状态", egoStereo],
					["四目状态", egoFour],
				]
			: selectedDevice === "UMI_Fingers_L"
				? [
						["无线连接", leftWireless],
						["USB 连接", leftUsb],
					]
				: selectedDevice === "UMI_Fingers_R"
					? [
							["无线连接", rightWireless],
							["USB 连接", rightUsb],
						]
					: selectedDevice === "Ego_W_L"
						? [["USB 连接", leftWristUsb]]
						: [["USB 连接", rightWristUsb]];

	if (mode === "mobile")
		return (
			<>
				<MobileRealtimeView
					devices={productDevices}
					channels={cameraChannels}
					onDeviceClick={setSelectedDevice}
					go={go}
				/>
				{selectedDevice && (
					<DeviceDetailDialog
						id={selectedDevice}
						states={selectedStates}
						onClose={() => setSelectedDevice(null)}
					/>
				)}
			</>
		);

	return (
		<div className="page">
			<PageHeader title="实时数据" subtitle="设备与传感器运行状态" />
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(720px,.85fr)] gap-[var(--gap)]">
				<Card className="flex min-h-0 flex-col gap-[18px] p-[26px]">
					<div className="flex items-center justify-between gap-5">
						<div>
							<span className="eyebrow">DEVICE STATUS</span>
							<h2 className="mt-1 text-[length:var(--device-text-lg)] font-bold">设备状态</h2>
						</div>
						<span className="text-[length:var(--device-text-sm)] text-muted-foreground">点击设备查看连接和数据详情</span>
					</div>
					<div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-1.5">
						{productDevices.map((device) => (
							<DeviceStatusCard
								key={device.id}
								{...device}
								onClick={() => setSelectedDevice(device.id)}
							/>
						))}
					</div>
				</Card>

				<aside className="grid min-h-0 grid-rows-[minmax(0,1fr)_170px] gap-4">
					<Card className="flex min-h-0 flex-col gap-3.5 border-sky-500/20 bg-sky-500/5 p-[22px]">
						<div className="flex items-center justify-between gap-5">
							<div>
								<span className="eyebrow">CAMERA</span>
								<h2 className="mt-1 text-[length:var(--device-text-lg)] font-bold">相机通道</h2>
							</div>
							<Button className="border-sky-500/30 bg-sky-500/10 text-sky-500" size="device-compact" variant="outline" onClick={() => go("camera")}>
								查看画面
								<ChevronRight data-icon="inline-end" />
							</Button>
						</div>
						<div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
							{cameraChannels.map((channel) => (
								<CameraChannel key={channel.label} {...channel} />
							))}
						</div>
						<p className="m-0 text-[length:var(--device-text-xs)] text-amber-500">Y8 展示范围待产品确认</p>
					</Card>
					<div className="grid min-h-0 grid-cols-2 gap-3.5">
						<button className="flex min-w-0 items-center gap-[18px] rounded-[var(--device-radius)] border border-amber-500/30 bg-amber-500/10 p-5 text-left text-amber-500" onClick={() => go("task-claim")}>
							<FileClock className="size-12" />
							<span>
								<strong className="block text-[length:var(--device-text-md)]">领取任务</strong>
								<small className="mt-1.5 block text-[length:var(--device-text-xs)] text-muted-foreground">选择采集任务</small>
							</span>
						</button>
						<button className="flex min-w-0 items-center gap-[18px] rounded-[var(--device-radius)] border border-blue-600 bg-gradient-to-br from-sky-500 to-blue-700 p-5 text-left text-white shadow-lg shadow-blue-500/20" onClick={() => go("capture")}>
							<Database className="size-12" />
							<span>
								<strong className="block text-[length:var(--device-text-md)]">开始采集</strong>
								<small className="mt-1.5 block text-[length:var(--device-text-xs)] text-white/75">预览并录制</small>
							</span>
						</button>
					</div>
				</aside>
			</div>
			{selectedDevice && (
				<DeviceDetailDialog
					id={selectedDevice}
					states={selectedStates}
					onClose={() => setSelectedDevice(null)}
				/>
			)}
		</div>
	);
}

function DeviceStatusCard({
	id,
	name,
	states,
	unavailable = false,
	onClick,
}: ProductDeviceStatus & {
	onClick: () => void;
}) {
	return (
		<button
			className={cn('grid min-h-[108px] shrink-0 grid-cols-[74px_minmax(220px,.8fr)_minmax(0,1.4fr)_36px] items-center gap-4 rounded-[22px] border border-border bg-secondary/50 px-5 py-4 text-left text-foreground transition-colors hover:border-blue-500/40 hover:bg-blue-500/10', unavailable && 'cursor-default opacity-50')}
			disabled={unavailable}
			onClick={onClick}
		>
			<span className="grid size-[68px] place-items-center rounded-[18px] bg-sky-500/10 text-sky-500 [&>svg]:size-9">
				<Activity />
			</span>
			<span>
				<strong className="block text-[length:var(--device-text-sm)]">{id}</strong>
				<small className="mt-1 block text-[length:var(--device-text-xs)] text-muted-foreground">{name}</small>
			</span>
			<span className="flex flex-wrap justify-end gap-2">
				{unavailable && <span className="rounded-full bg-muted px-3 py-2 text-[length:var(--device-text-xs)] text-muted-foreground">未开发</span>}
				{!unavailable &&
					states.map(([label, online]) => (
						<span className={cn('inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-[length:var(--device-text-xs)] text-muted-foreground', online && 'bg-emerald-500/10 text-emerald-500')} key={label}>
							<span className={cn('size-2.5 rounded-full bg-muted-foreground', online && 'bg-emerald-500')} />
							{label} · {online ? "在线" : "离线"}
						</span>
					))}
			</span>
			{!unavailable && <ChevronRight className="size-8 text-muted-foreground" />}
		</button>
	);
}

function CameraChannel({ label, online }: { label: string; online: boolean }) {
	return (
		<div className={cn('camera-channel grid min-h-0 grid-cols-[54px_1fr_14px] items-center gap-3 rounded-xl border border-border bg-card/70 p-3.5', online && 'border-emerald-500/25 bg-emerald-500/10')}>
			<Camera className={cn('size-[38px] text-muted-foreground', online && 'text-emerald-500')} />
			<span>
				<strong className="block text-[length:var(--device-text-xs)]">{label}</strong>
				<small className={cn('block text-[length:var(--device-text-xs)] text-muted-foreground', online && 'text-emerald-500')}>{online ? "在线" : "离线"}</small>
			</span>
			<span className={cn('size-2.5 rounded-full bg-muted-foreground', online && 'bg-emerald-500')} />
		</div>
	);
}

function DeviceDetailDialog({
	id,
	states,
	onClose,
}: {
	id: ProductDeviceId;
	states: Array<[string, boolean]>;
	onClose: () => void;
}) {
	const streams =
		id === "Ego_H"
			? [
					["双目 MKV", "4000 × 1200"],
					["双目 Y8", "4000 × 1200"],
					["四目 Y8", "3104 × 480"],
				]
			: id === "Ego_W_L" || id === "Ego_W_R"
				? [["设备数据流", "MKV · Y8 · IMU"]]
				: [["双目 MKV", "3840 × 1200"]];

	return (
		<div
			className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-10 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label={`${id} 设备详情`}
		>
			<Card className="relative grid max-h-[88vh] w-[min(1120px,92vw)] grid-cols-[1fr_360px] gap-4 overflow-y-auto rounded-3xl border-blue-500/25 p-8 shadow-2xl">
				<Button
					className="absolute right-6 top-6 size-20"
					size="icon-touch"
					variant="outline"
					onClick={onClose}
					aria-label="关闭详情"
				>
					<X />
				</Button>
				<div className="min-w-0 pr-20">
					<span className="eyebrow">DEVICE DETAIL</span>
					<h2 className="my-3 truncate text-[length:var(--device-text-xl)] font-bold">{id}</h2>
					<p className="text-[length:var(--device-text-xs)] text-muted-foreground">设备连接状态与数据规格</p>
				</div>
				<div className="grid content-start gap-2.5 pt-[72px]">
					{states.map(([label, online]) => (
						<div className="flex min-h-[66px] items-center justify-between rounded-xl bg-secondary px-[18px] text-[length:var(--device-text-xs)]" key={label}>
							<span>{label}</span>
							<strong className={cn('text-muted-foreground', online && 'text-emerald-500')}>
								{online ? "在线" : "离线"}
							</strong>
						</div>
					))}
				</div>
				<div className="col-span-2 grid grid-cols-3 gap-3">
					{streams.map(([name, resolution]) => (
						<div className="grid min-w-0 grid-cols-[48px_1fr] gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-[18px]" key={name}>
							<Camera className="size-[38px] text-sky-500" />
							<span>
								<strong className="block text-[length:var(--device-text-xs)]">{name}</strong>
								<small className="mt-1 block text-[length:var(--device-text-xs)] text-muted-foreground">分辨率</small>
							</span>
							<b className="col-span-2 block text-[length:var(--device-text-sm)] text-sky-500">{resolution}</b>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
