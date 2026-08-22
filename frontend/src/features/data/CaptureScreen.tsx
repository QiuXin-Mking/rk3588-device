import {
	Camera,
	CheckCircle2,
	ClipboardList,
	LogIn,
	Play,
	RotateCcw,
	Scissors,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Navigate, Notify } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import {
	api,
	type DeviceStatus,
	type RecordStatus,
} from "../../services/deviceApi";
import {
	type CaptureTask,
	clearCurrentTask,
	loadCurrentTask,
	loadManagementSession,
	managementApi,
	onCurrentTaskChange,
	type TerminalConfig,
} from "../../services/managementApi";
import {
	buildTerminalTopology,
	type HardwareState,
	hardwareStateLabel,
	type TerminalDeviceView,
} from "../../services/terminalTopology";
import { formatTime } from "../../shared/format";
import { cn } from "../../shared/lib/cn";
import { CameraFeed, PageHeader } from "../../shared/ui/DevicePrimitives";

type PreviewChannel = {
	id: string;
	title: string;
	state: HardwareState;
	src?: string;
};

export function CaptureScreen({
	status: _status,
	record,
	busy,
	notify,
	toggleRecord,
	go,
	terminalConfig,
}: {
	status: DeviceStatus;
	record: RecordStatus;
	busy: boolean;
	notify: Notify;
	toggleRecord: () => Promise<boolean>;
	go?: Navigate;
	terminalConfig?: TerminalConfig;
}) {
	const mode = useUiMode();
	const session = loadManagementSession();
	const [task, setTask] = useState<CaptureTask | null>(() => loadCurrentTask());
	const [elapsed, setElapsed] = useState(0);
	const [finishing, setFinishing] = useState(false);
	const [zeroReady, setZeroReady] = useState(false);
	const [sliceCount, setSliceCount] = useState(0);
	const [slicing, setSlicing] = useState(false);
	const [logs, setLogs] = useState<string[]>(["采集页面已就绪"]);
	const [selectedDevice, setSelectedDevice] = useState("");
	const [stamp, setStamp] = useState(Date.now());
	const startedAt = useRef<number | null>(null);
	const recordingRef = useRef(record.recording);
	recordingRef.current = record.recording;

	useEffect(() => onCurrentTaskChange(() => setTask(loadCurrentTask())), []);
	useEffect(() => {
		if (!record.recording) {
			startedAt.current = null;
			setElapsed(0);
			return;
		}
		if (!startedAt.current) startedAt.current = Date.now();
		const timer = window.setInterval(
			() =>
				setElapsed(
					Math.floor((Date.now() - (startedAt.current || Date.now())) / 1000),
				),
			1000,
		);
		return () => window.clearInterval(timer);
	}, [record.recording]);
	useEffect(() => {
		if (!record.cameraConnected) return;
		const timer = window.setInterval(() => setStamp(Date.now()), 850);
		return () => window.clearInterval(timer);
	}, [record.cameraConnected]);
	useEffect(() => {
		if (!record.cameraConnected || record.recording) return;
		api.startLive().catch(() => undefined);
		return () => {
			if (!recordingRef.current) api.stopLive().catch(() => undefined);
		};
	}, [record.cameraConnected, record.recording]);

	const devices = useMemo(
		() => buildTerminalTopology(terminalConfig, record),
		[record, terminalConfig],
	);
	useEffect(() => {
		if (!devices.length) return setSelectedDevice("");
		if (!devices.some((device) => device.id === selectedDevice))
			setSelectedDevice(devices[0].id);
	}, [devices, selectedDevice]);
	const selected = devices.find((device) => device.id === selectedDevice);
	const visibleChannels: PreviewChannel[] = (selected?.channels ?? []).map(
		(channel) => ({
			id: channel.id,
			title: channel.label,
			state: channel.state,
			src: channel.previewUrl ? `${channel.previewUrl}?t=${stamp}` : undefined,
		}),
	);
	const selectedName = selected?.label ?? "设备";
	const hasReadyCamera = devices.some((device) =>
		device.channels.some((channel) => channel.state === "online"),
	);

	const appendLog = (message: string) =>
		setLogs((items) =>
			[
				`${new Date().toLocaleTimeString("zh-CN", { hour12: false })}  ${message}`,
				...items,
			].slice(0, 200),
		);
	const prepareZero = () => {
		setZeroReady(true);
		appendLog("标0动作检查通过，可开始录制");
		notify("标0动作已确认");
	};
	const handleCaptureAction = async () => {
		if (!task) return notify("请先在任务页领取任务");
		if (record.recording) {
			// UI contract only: replace this local boundary with the real device slice API when its protocol is available.
			setSlicing(true);
			try {
				const next = sliceCount + 1;
				setSliceCount(next);
				appendLog(`第 ${next} 次采集已切片，继续录制`);
				notify(`第 ${next} 次采集已完成，继续录制`);
			} finally {
				setSlicing(false);
			}
			return;
		}
		if (!zeroReady) return notify("请先完成标0检查");
		appendLog("正在开始录制");
		const started = await toggleRecord();
		if (started) {
			setSliceCount(0);
			appendLog("录制已开始");
		}
	};
	const finishTask = async () => {
		if (!task || finishing) return;
		setFinishing(true);
		try {
			if (record.recording) {
				appendLog(`正在结束录制并关闭第 ${sliceCount + 1} 次采集`);
				const stopped = await toggleRecord();
				if (!stopped) return;
			}
			await managementApi.completeTask(task.id);
			clearCurrentTask();
			setZeroReady(false);
			setSliceCount(0);
			appendLog("任务已结束并同步后台");
			notify("任务已完成并同步后台");
			go?.("tasks");
		} catch (error) {
			notify(error instanceof Error ? error.message : "任务结束失败");
		} finally {
			setFinishing(false);
		}
	};

	const subtitle =
		terminalConfig?.physical_kit && terminalConfig.template
			? `${terminalConfig.physical_kit.name} · ${terminalConfig.template.name}`
			: "当前账号尚未分配实体套件";
	const controls = (
		<>
			<Button
				size={mode === "device" ? "device" : "default"}
				variant={zeroReady ? "default" : "secondary"}
				disabled={record.recording || !task}
				onClick={prepareZero}
			>
				<RotateCcw data-icon="inline-start" />
				{zeroReady ? "标0已通过" : "标0检查"}
			</Button>
			<Button
				className="flex-1"
				size={mode === "device" ? "device-primary" : "default"}
				variant={record.recording ? "secondary" : "default"}
				disabled={
					busy ||
					slicing ||
					!task ||
					!hasReadyCamera ||
					(!record.recording && !zeroReady)
				}
				onClick={handleCaptureAction}
			>
				{record.recording ? (
					<Scissors data-icon="inline-start" />
				) : (
					<Play data-icon="inline-start" />
				)}
				{busy
					? "设备处理中…"
					: slicing
						? "切片中…"
						: record.recording
							? "切片"
							: "开始录制"}
			</Button>
			<Button
				size={mode === "device" ? "device" : "default"}
				variant="outline"
				disabled={!task || finishing || busy}
				onClick={finishTask}
			>
				<CheckCircle2 data-icon="inline-start" />
				{finishing ? "同步中…" : "结束任务"}
			</Button>
		</>
	);

	if (mode === "mobile")
		return (
			<div className="page flex min-h-full flex-col gap-3.5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
				<PageHeader title="采集" subtitle={subtitle} />
				<TaskNotice session={Boolean(session)} task={task} go={go} />
				<DeviceStatusCard
					devices={devices}
					terminalConfig={terminalConfig}
					selectedDevice={selectedDevice}
					onSelect={setSelectedDevice}
				/>
				<PreviewCard
					channels={visibleChannels}
					selectedName={selectedName}
					compact
				/>
				<LogCard logs={logs} />
				<Card className="sticky bottom-0">
					<CardFooter className="grid grid-cols-3 gap-2 p-2.5">
						{controls}
					</CardFooter>
				</Card>
			</div>
		);

	return (
		<div className="page">
			<PageHeader title="采集" subtitle={subtitle} />
			<div className="grid min-h-0 flex-1 grid-cols-[460px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_220px] gap-4">
				<DeviceStatusCard
					devices={devices}
					terminalConfig={terminalConfig}
					selectedDevice={selectedDevice}
					onSelect={setSelectedDevice}
				/>
				<PreviewCard channels={visibleChannels} selectedName={selectedName} />
				<LogCard logs={logs} />
				<Card className="min-h-0">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between gap-3">
							<CardTitle>{task?.name ?? "未领取任务"}</CardTitle>
							<Badge
								size="device"
								variant={
									record.recording
										? "destructive"
										: task
											? "default"
											: "secondary"
								}
							>
								{record.recording
									? `录制中 ${formatTime(elapsed)} · 已切 ${sliceCount} 次`
									: task
										? "待采集"
										: "未领取"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="flex min-h-0 items-center gap-3">
						{controls}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function TaskNotice({
	session,
	task,
	go,
}: {
	session: boolean;
	task: CaptureTask | null;
	go?: Navigate;
}) {
	const mode = useUiMode();
	if (session && task)
		return (
			<Card>
				<CardHeader>
					<CardTitle>{task.name}</CardTitle>
					<CardDescription>
						{task.project_name} · {task.serial_number}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	return (
		<Card>
			<CardContent className="flex items-center gap-3 py-4">
				{session ? (
					<ClipboardList className="size-6 text-muted-foreground" />
				) : (
					<LogIn className="size-6 text-muted-foreground" />
				)}
				<span className="flex min-w-0 flex-1 flex-col">
					<strong>{session ? "请先领取任务" : "请先登录"}</strong>
					{mode !== "device" && (
						<small className="text-muted-foreground">
							{session
								? "采集页不承接任务，任务统一在任务页操作"
								: "登录后同步后台任务和套件"}
						</small>
					)}
				</span>
				<Button
					variant="outline"
					onClick={() => go?.(session ? "tasks" : "account")}
				>
					{session ? "前往任务页" : "前往登录"}
				</Button>
			</CardContent>
		</Card>
	);
}

function DeviceStatusCard({
	devices,
	terminalConfig,
	selectedDevice,
	onSelect,
}: {
	devices: TerminalDeviceView[];
	terminalConfig?: TerminalConfig;
	selectedDevice: string;
	onSelect: (device: string) => void;
}) {
	const mode = useUiMode();
	const configured = Boolean(
		terminalConfig?.physical_kit && terminalConfig.template,
	);
	const onlineCount = devices.filter(
		(device) => device.state === "online",
	).length;
	const connectionLabel = !configured
		? "未分配套件"
		: onlineCount === 0
			? "已配置，等待连接"
			: onlineCount === devices.length
				? `已连接 ${onlineCount}/${devices.length}`
				: `部分连接 ${onlineCount}/${devices.length}`;
	return (
		<Card className="min-h-0">
			<CardHeader>
				<CardTitle>设备状态</CardTitle>
				{mode !== "device" && (
					<>
						<CardDescription>
							{configured
								? `套件 ${terminalConfig?.physical_kit?.serial_number} · 终端 ${terminalConfig?.physical_kit?.terminal_serial || "SN 未配置"}`
								: "后台尚未给当前账号分配实体套件"}
						</CardDescription>
						<CardAction>
							<Badge variant={onlineCount > 0 ? "default" : "secondary"}>
								{connectionLabel}
							</Badge>
						</CardAction>
					</>
				)}
			</CardHeader>
			<CardContent className="local-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
				{devices.map((device) =>
					mode === "device" ? (
						<Button
							key={device.id}
							className="h-auto min-h-[112px] flex-col items-stretch gap-2 px-4 py-3 text-left"
							variant={selectedDevice === device.id ? "secondary" : "ghost"}
							onClick={() => onSelect(device.id)}
						>
							<span className="flex items-center justify-between gap-3">
								<strong className="truncate text-[30px] leading-tight">
									{device.label}
								</strong>
								<Badge
									variant={device.state === "online" ? "default" : "secondary"}
								>
									{hardwareStateLabel(device.state)}
								</Badge>
							</span>
							<span className="grid grid-cols-2 gap-2">
								<Badge className="w-full" variant="outline">
									{device.entity?.serial_number || "SN 未录入"}
								</Badge>
								<Badge className="w-full" variant="outline">
									视频 · {device.channels.length} 路
								</Badge>
							</span>
						</Button>
					) : (
						<Button
							key={device.id}
							className="h-auto min-h-24 justify-start whitespace-normal px-4 py-3 text-left"
							variant={selectedDevice === device.id ? "secondary" : "ghost"}
							onClick={() => onSelect(device.id)}
						>
							<span className="flex min-w-0 flex-1 flex-col items-start">
								<strong>{device.label}</strong>
								<small className="text-muted-foreground">
									{device.entity?.serial_number || "SN 未录入"}
								</small>
							</span>
							<Badge
								variant={device.state === "online" ? "default" : "secondary"}
							>
								{hardwareStateLabel(device.state)}
							</Badge>
						</Button>
					),
				)}
				{devices.length === 0 && (
					<div className="grid min-h-32 place-items-center text-muted-foreground">
						{terminalConfig?.physical_kit ? "套件配置不完整" : "未分配实体套件"}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function PreviewCard({
	channels,
	selectedName,
	compact = false,
}: {
	channels: PreviewChannel[];
	selectedName: string;
	compact?: boolean;
}) {
	const mode = useUiMode();
	const [expanded, setExpanded] = useState<PreviewChannel | null>(null);
	return (
		<>
			<Card className={cn("min-h-0", mode === "device" && "gap-0 py-0")}>
				{mode !== "device" && (
					<CardHeader>
						<CardTitle>{selectedName}预览</CardTitle>
					</CardHeader>
				)}
				<CardContent
					className={cn(
						"grid min-h-0 flex-1 gap-3",
						mode === "device" &&
							"local-scroll auto-rows-[100%] grid-cols-2 overflow-y-auto overscroll-contain p-0",
						channels.length > 1 && "grid-cols-2",
						compact && "[&_.camera-feed]:min-h-64",
					)}
				>
					{channels.map((channel) => (
						<CameraFeed
							key={channel.id}
							title={channel.title}
							connected={channel.state === "online"}
							state={channel.state}
							src={channel.src}
							note={channel.state === "unknown" ? "未获取" : "无信号"}
							onExpand={() => setExpanded(channel)}
						/>
					))}
					{channels.length === 0 && (
						<div className="grid min-h-48 place-items-center text-muted-foreground">
							<Camera className="size-12" />
						</div>
					)}
				</CardContent>
			</Card>
			<Dialog
				open={Boolean(expanded)}
				onOpenChange={(open) => {
					if (!open) setExpanded(null);
				}}
			>
				<DialogContent
					className={cn(
						"h-[calc(100%-32px)] max-w-[calc(100%-32px)] p-0",
						mode === "device" && "rounded-[var(--device-radius)]",
					)}
				>
					<DialogTitle className="sr-only">
						{expanded?.title ?? selectedName}放大预览
					</DialogTitle>
					{expanded && (
						<CameraFeed
							title={expanded.title}
							connected={expanded.state === "online"}
							state={expanded.state}
							src={expanded.src}
							note={expanded.state === "unknown" ? "未获取" : "无信号"}
							large
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function LogCard({ logs }: { logs: string[] }) {
	const mode = useUiMode();
	const visibleLogs = useMemo(() => {
		const occurrences = new Map<string, number>();
		return logs.slice(0, 200).map((message) => {
			const occurrence = (occurrences.get(message) ?? 0) + 1;
			occurrences.set(message, occurrence);
			return { key: `${message}-${occurrence}`, message };
		});
	}, [logs]);
	return (
		<Card className="min-h-0">
			<CardHeader className="pb-2">
				<CardTitle>日志</CardTitle>
				{mode !== "device" && (
					<CardDescription>采集操作和设备反馈</CardDescription>
				)}
			</CardHeader>
			<CardContent className="local-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
				{visibleLogs.map((item) => (
					<code className="text-xs text-muted-foreground" key={item.key}>
						{item.message}
					</code>
				))}
			</CardContent>
		</Card>
	);
}
