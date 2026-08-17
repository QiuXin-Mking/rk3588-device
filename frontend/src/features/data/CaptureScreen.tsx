import {
	Activity,
	Camera,
	CloudUpload,
	FolderOpen,
	Pause,
	Play,
	Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Navigate, Notify } from "../../app/model";
import type { SelectableProduct } from "../../app/product";
import {
	api,
	type FilesResponse,
	type RecordStatus,
} from "../../services/deviceApi";
import { formatTime } from "../../shared/format";
import {
	CameraFeed,
	EmptyState,
	PageHeader,
	RecordingRow,
} from "../../shared/ui/DevicePrimitives";
import { MobileCaptureView } from "./mobile/MobileDataViews";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../../shared/lib/cn';

export function CaptureScreen({
	product,
	record,
	files,
	busy,
	back,
	notify,
	refreshStatus,
	toggleRecord,
	go,
}: {
	product: SelectableProduct;
	record: RecordStatus;
	files: FilesResponse;
	busy: boolean;
	back: () => void;
	notify: Notify;
	refreshStatus: () => Promise<void>;
	toggleRecord: () => Promise<void>;
	go?: Navigate;
}) {
	const mode = useUiMode();
	const [elapsed, setElapsed] = useState(0);
	const [previewStamp, setPreviewStamp] = useState(Date.now());
	const startedAt = useRef<number | null>(null);
	const recordingRef = useRef(record.recording);
	const previewingRef = useRef(record.previewing);
	const [liveBusy, setLiveBusy] = useState(false);
	const [paused, setPaused] = useState(false);
	recordingRef.current = record.recording;
	previewingRef.current = record.previewing;

	useEffect(() => {
		if (!record.previewing && !record.recording) return;
		const timer = window.setInterval(() => setPreviewStamp(Date.now()), 850);
		return () => window.clearInterval(timer);
	}, [record.previewing, record.recording]);

	useEffect(
		() => () => {
			if (previewingRef.current && !recordingRef.current)
				api.stopLive().catch(() => undefined);
		},
		[],
	);

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

	const togglePreview = async () => {
		if (liveBusy || record.recording) return;
		setLiveBusy(true);
		try {
			const result = record.previewing
				? await api.stopLive()
				: await api.startLive();
			if (!result.ok) throw new Error(result.error || "预览操作失败");
			notify(record.previewing ? "实时预览已停止" : "实时预览已启动");
			await refreshStatus();
		} catch (error) {
			notify(error instanceof Error ? error.message : "预览操作失败");
		} finally {
			setLiveBusy(false);
		}
	};

	const liveActive = record.previewing || record.recording;
	const mangoPreviews = [
		{ title: "头部双目", camera: "jhh02", route: "head-stereo" },
		{ title: "头部四目", camera: "jhh04", route: "head-four" },
		{ title: "左腕部单目", camera: "wrist_left", route: "wrist-left" },
		{ title: "右腕部单目", camera: "wrist_right", route: "wrist-right" },
	];
	const previewCards =
		product === "Mango" ? (
			mangoPreviews.map(({ title, camera, route }) => (
				<CameraFeed
					key={camera}
					title={title}
					connected={Boolean(record.cameras?.[camera])}
					src={
						liveActive
							? `/api/camera/preview/${route}?t=${previewStamp}`
							: undefined
					}
					note={record.cameras?.[camera] ? "预览未启动" : "无信号"}
				/>
			))
		) : (
			<>
				<CameraFeed
					title="FPV_L"
					connected={record.cameraConnected}
					src={liveActive ? `/api/camera/preview?t=${previewStamp}` : undefined}
					note={record.cameraConnected ? "预览未启动" : "无信号"}
				/>
				<CameraFeed title="FPV_R" connected={false} note="独立右路待接入" />
			</>
		);
	const taskCaptured = Math.min(files.files.length, 30);

	if (mode === "mobile")
		return (
			<MobileCaptureView
				record={record}
				files={files}
				elapsed={elapsed}
				paused={paused}
				busy={busy}
				liveBusy={liveBusy}
				previews={previewCards}
				taskCaptured={taskCaptured}
				back={back}
				notify={notify}
				togglePaused={() => {
					setPaused((value) => !value);
					notify(paused ? "继续采集（前端状态）" : "采集已暂停（前端状态）");
				}}
				togglePreview={togglePreview}
				toggleRecord={toggleRecord}
				go={go}
			/>
		);

	return (
		<div className="page detail-page">
			<PageHeader
				title="任务采集"
				subtitle={record.cameraConnected ? "设备就绪" : "相机未连接"}
				back={back}
			/>
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.45fr)_minmax(520px,.72fr)] gap-[var(--gap)]">
				<Card className="flex min-h-0 flex-col border-sky-500/20 bg-sky-500/5 p-[18px]">
					<div
						className={cn('grid min-h-0 flex-1 gap-3.5 [&_.camera-feed]:border-0 [&_.camera-feed]:bg-transparent [&_.camera-feed]:p-0', product === "Mango" ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2')}
					>
						{previewCards}
					</div>
					<div className={cn('mt-3.5 grid min-h-[84px] grid-cols-[20px_1fr_auto] items-center gap-4 rounded-xl bg-card px-6 text-[length:var(--device-text-sm)] text-muted-foreground', record.recording && 'bg-red-500/10 text-red-500')}>
						<span className={cn('size-4 rounded-full bg-muted-foreground', record.recording && 'bg-red-500 shadow-lg shadow-red-500/40')} />
						<span>录制时间</span>
						<strong className="text-[length:var(--device-text-lg)] tabular-nums">{formatTime(elapsed)}</strong>
					</div>
				</Card>
				<aside className="grid min-h-0 min-w-0 grid-rows-2 gap-4">
					<Card className="min-h-0 border-violet-500/20 bg-violet-500/5 px-5 py-[18px]">
						<span className="eyebrow">CURRENT TASK</span>
						<h2 className="my-2 text-[length:var(--device-text-lg)] font-bold">把药盒、药瓶、空药瓶分类</h2>
						<div className="grid grid-cols-[1.25fr_.75fr_.75fr] gap-2 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:bg-secondary/70 [&>div]:px-2.5 [&>div]:py-2 [&_span]:block [&_span]:text-[length:var(--device-text-xs)] [&_span]:text-muted-foreground [&_strong]:mt-1 [&_strong]:block [&_strong]:truncate [&_strong]:text-[length:var(--device-text-xs)]">
							<div>
								<span>项目</span>
								<strong>收纳盒@紫竹家具馆5</strong>
							</div>
							<div>
								<span>任务号</span>
								<strong>TSK-20260815-017</strong>
							</div>
							<div>
								<span>已采集</span>
								<strong>{taskCaptured} / 30</strong>
							</div>
							<div>
								<span>目标 / 场景</span>
								<strong>3 类物体 · 家庭收纳</strong>
							</div>
							<div>
								<span>状态</span>
								<strong>
									{paused
										? "已暂停"
										: record.recording
											? "录制中"
											: record.previewing
												? "预览中"
												: "待开始"}
								</strong>
							</div>
						</div>
					</Card>
					<Card className="flex min-h-0 flex-col px-5 py-[18px]">
						<div className="flex items-center justify-between gap-5">
							<h2 className="text-[length:var(--device-text-lg)] font-bold">最近记录</h2>
							<span className="text-[length:var(--device-text-sm)] text-muted-foreground">{files.files.length} 条</span>
						</div>
						<div className="local-scroll">
							{files.files.length ? (
								files.files
									.slice(0, 3)
									.map((item) => (
										<RecordingRow
											key={item.name}
											item={item}
											compact
											onClick={() => go?.("records")}
										/>
									))
							) : (
								<EmptyState icon={<FolderOpen />} title="暂无本地记录" />
							)}
						</div>
					</Card>
				</aside>
			</div>
			<div className="grid min-h-[var(--touch-primary)] shrink-0 grid-cols-5 items-center gap-4">
				<Button
					size="device"
					variant="secondary"
					disabled={!record.recording}
					onClick={() => {
						setPaused((value) => !value);
						notify(paused ? "继续采集（前端状态）" : "采集已暂停（前端状态）");
					}}
				>
					{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
					{paused ? "继续" : "暂停"}
				</Button>
				<Button
					size="device"
					variant="secondary"
					disabled={!record.cameraConnected || record.recording || liveBusy}
					onClick={togglePreview}
				>
					<Camera data-icon="inline-start" />
					{liveBusy
						? "设备处理中…"
						: record.previewing
							? "停止预览"
							: "实时预览"}
				</Button>
				<Button
					className={cn(record.recording && 'bg-red-600 hover:bg-red-500')}
					size="device-primary"
					disabled={busy || !record.cameraConnected}
					onClick={toggleRecord}
				>
					{record.recording ? <Square data-icon="inline-start" /> : <Play data-icon="inline-start" />}
					{busy ? "设备处理中…" : record.recording ? "停止录制" : "开始录制"}
				</Button>
				<Button
					className="border-violet-500/30 bg-violet-500/10 text-violet-500"
					size="device"
					variant="outline"
					onClick={() => notify("云端上报接口待接入")}
				>
					<CloudUpload data-icon="inline-start" />
					<span>信息上报</span>
				</Button>
				<Button
					size="device"
					variant="secondary"
					onClick={() => go?.("diagnostics")}
				>
					<Activity data-icon="inline-start" />
					采集诊断
				</Button>
			</div>
		</div>
	);
}
