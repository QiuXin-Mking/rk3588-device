import {
	ChevronDown,
	ChevronRight,
	FolderOpen,
	HardDrive,
	PlayCircle,
	RotateCcw,
	Trash2,
	UploadCloud,
	Wrench,
	X,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScreenCommonProps } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import { api, type Recording } from "../../services/deviceApi";
import {
	type CaptureTask,
	loadManagementSession,
	type ManagementRecord,
	managementApi,
	taskIdForRecording,
} from "../../services/managementApi";
import { cn } from "../../shared/lib/cn";
import { EmptyState, PageHeader } from "../../shared/ui/DevicePrimitives";
import { MobileRecordsView } from "./mobile/MobileRecordsView";
import { recordingFromManagementRecord } from "./recordModel";

export function RecordsScreen({
	files,
	refreshFiles,
	notify,
}: ScreenCommonProps) {
	const mode = useUiMode();
	const [selected, setSelected] = useState<Recording | null>(null);
	const [deleting, setDeleting] = useState("");
	const [previewFailed, setPreviewFailed] = useState(false);
	const [checked, setChecked] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);
	const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
	const [managementRecords, setManagementRecords] = useState<
		ManagementRecord[]
	>([]);
	useEffect(() => {
		if (!loadManagementSession()) return;
		managementApi
			.records()
			.then(setManagementRecords)
			.catch(() => setManagementRecords([]));
	}, []);
	const recordByFile = new Map(
		managementRecords.map((item) => [item.file_name || item.record_no, item]),
	);
	const localNames = new Set(files.files.map((item) => item.name));
	const remoteFiles = managementRecords
		.filter((item) => !localNames.has(item.file_name || item.record_no))
		.map(recordingFromManagementRecord);
	const allFiles = [...files.files, ...remoteFiles];
	const selectedMetadata = selected
		? recordByFile.get(selected.name)
		: undefined;
	const visibleFiles = allFiles.slice(0, 100);
	const groupedFiles = Array.from(
		visibleFiles.reduce((groups, item) => {
			const metadata = recordByFile.get(item.name);
			const key = metadata?.subtask_name || "未分子任务";
			groups.set(key, [...(groups.get(key) || []), item]);
			return groups;
		}, new Map<string, Recording[]>()),
	);
	const batchUpload = async () => {
		if (!checked.length) return notify("请先选择记录");
		const pendingFiles = files.files.filter(
			(item) => checked.includes(item.name) && !recordByFile.has(item.name),
		);
		if (!pendingFiles.length) return notify("所选记录均已同步后台");
		setUploading(true);
		try {
			const task = JSON.parse(
				localStorage.getItem("ego-current-task") || "null",
			) as CaptureTask | null;
			await Promise.all(
				pendingFiles.map((item) =>
					managementApi.reportRecording({
						task_id: taskIdForRecording(item.name) ?? task?.id,
						name: item.name,
						size_bytes: item.size,
						recorded_at: new Date(item.mtime).toISOString(),
					}),
				),
			);
			setManagementRecords(await managementApi.records());
			notify(`${pendingFiles.length} 条记录已同步到后台上传队列`);
			setChecked([]);
		} catch (error) {
			notify(error instanceof Error ? error.message : "记录同步失败");
		} finally {
			setUploading(false);
		}
	};

	const remove = async (item: Recording) => {
		if (item.remoteOnly)
			return notify("后台历史记录为只读，本机不存在对应文件");
		if (!window.confirm(`确定删除 ${item.name}？此操作不可恢复。`)) return;
		setDeleting(item.name);
		try {
			const result = await api.deleteFile(item.name);
			if (!result.ok) throw new Error("删除失败");
			notify("记录已删除");
			setSelected(null);
			await refreshFiles();
		} catch (error) {
			notify(error instanceof Error ? error.message : "删除失败");
		} finally {
			setDeleting("");
		}
	};

	const openRecord = (item: Recording) => {
		setPreviewFailed(false);
		setSelected(item);
	};

	const detailOverlay = selected && (
		<div
			className={cn(
				"fixed inset-0 z-50 grid bg-black/60 backdrop-blur-sm",
				mode === "device"
					? "place-items-center p-8"
					: "place-items-end p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]",
			)}
			role="dialog"
			aria-modal="true"
			aria-label="记录详情"
		>
			<Card
				className={cn(
					"relative grid w-full overflow-y-auto",
					mode === "device"
						? "max-h-[920px] max-w-[1500px] grid-cols-[minmax(0,1.45fr)_minmax(420px,.75fr)] gap-[30px] p-[42px]"
						: "max-h-[92dvh] max-w-lg grid-cols-1 gap-4 rounded-2xl p-4",
				)}
			>
				<Button
					className={cn(
						"absolute right-4 top-4",
						mode === "device" && "size-20",
					)}
					size="icon-touch"
					variant="outline"
					onClick={() => setSelected(null)}
					aria-label="关闭详情"
				>
					<X />
				</Button>
				<div
					className={cn(
						"grid place-items-center overflow-hidden rounded-xl bg-black",
						mode === "device" ? "min-h-[520px]" : "min-h-[260px]",
					)}
				>
					{selected.hasColor && !selected.remoteOnly && !previewFailed ? (
						<video
							controls
							playsInline
							preload="metadata"
							src={api.recordingPreviewUrl(selected.name)}
							onError={() => setPreviewFailed(true)}
						/>
					) : (
						<div
							className={cn(
								"grid place-items-center gap-3 px-5 text-center text-muted-foreground",
								mode === "device" ? "[&>svg]:size-[90px]" : "[&>svg]:size-14",
							)}
						>
							<PlayCircle />
							<strong
								className={
									mode === "device"
										? "text-[length:var(--device-text-lg)]"
										: "text-lg"
								}
							>
								{selected.hasColor ? "预览生成失败" : "该记录没有彩色视频"}
							</strong>
							<span
								className={
									mode === "device"
										? "text-[length:var(--device-text-sm)]"
										: "text-sm"
								}
							>
								深度、手套和 IMU 数据仍可正常管理
							</span>
						</div>
					)}
				</div>
				<div className="flex min-w-0 flex-col justify-center overflow-hidden">
					<span
						className={cn(
							"font-extrabold tracking-[.12em] text-violet-500",
							mode === "device"
								? "text-[length:var(--device-text-xs)]"
								: "text-xs",
						)}
					>
						RECORD DETAIL
					</span>
					<h2
						className={cn(
							"mr-20 mt-3 line-clamp-2 break-all font-bold leading-tight",
							mode === "device"
								? "text-[length:var(--device-text-xl)]"
								: "text-xl",
						)}
					>
						{selected.name}
					</h2>
					<p
						className={cn(
							"mt-2 text-muted-foreground",
							mode === "device"
								? "text-[length:var(--device-text-sm)]"
								: "text-sm",
						)}
					>
						{new Date(selected.mtime).toLocaleString("zh-CN")}
					</p>
					<dl
						className={cn(
							"my-4 grid gap-2",
							mode === "device" && "text-[length:var(--device-text-xs)]",
						)}
					>
						{[
							["创建", new Date(selected.mtime).toLocaleString("zh-CN")],
							[
								"上传",
								selectedMetadata?.upload_status ||
									(selected.remoteOnly ? "后台记录" : "等待上传"),
							],
							["审核", selectedMetadata?.qa_status || "尚未提交"],
						].map(([term, value]) => (
							<div className="flex justify-between gap-4" key={term}>
								<dt className="text-muted-foreground">{term}</dt>
								<dd>{value}</dd>
							</div>
						))}
					</dl>
					<div className="my-4 flex flex-wrap gap-2">
						{selected.hasColor && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								彩色
							</Badge>
						)}
						{selected.hasDepth && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								深度
							</Badge>
						)}
						{selected.hasStereo && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								双目
							</Badge>
						)}
						{selected.hasGlove && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								手套
							</Badge>
						)}
						{selected.hasImu && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								IMU
							</Badge>
						)}
						{selected.hasAudio && (
							<Badge
								size={mode === "device" ? "device" : "default"}
								variant="outline"
							>
								音频
							</Badge>
						)}
					</div>
					<div className="grid grid-cols-3 gap-3">
						{!selected.remoteOnly && selected.needsDecode && (
							<Button
								size={mode === "device" ? "device" : "touch"}
								variant="secondary"
								onClick={async () => {
									await api.decodeFile(selected.name);
									notify("解码已开始");
									refreshFiles();
								}}
							>
								<Wrench data-icon="inline-start" />
								解码
							</Button>
						)}
						{!selected.remoteOnly && files.externalDisk && (
							<Button
								size={mode === "device" ? "device" : "touch"}
								variant="secondary"
								onClick={async () => {
									await api.transferFile(selected.name);
									notify("传输已开始");
									refreshFiles();
								}}
							>
								<HardDrive data-icon="inline-start" />
								传输
							</Button>
						)}
						{!selected.remoteOnly && (
							<Button
								size={mode === "device" ? "device" : "touch"}
								variant="destructive"
								disabled={deleting === selected.name}
								onClick={() => remove(selected)}
							>
								<Trash2 data-icon="inline-start" />
								{deleting ? "删除中" : "删除"}
							</Button>
						)}
					</div>
				</div>
			</Card>
		</div>
	);

	if (mode === "mobile")
		return (
			<>
				<MobileRecordsView
					files={visibleFiles}
					checked={checked}
					uploading={uploading}
					selectedName={selected?.name}
					onToggle={(name, next) =>
						setChecked((values) =>
							next
								? [...values, name]
								: values.filter((value) => value !== name),
						)
					}
					onSelectAll={() =>
						setChecked((values) =>
							values.length ? [] : visibleFiles.map((file) => file.name),
						)
					}
					onOpen={openRecord}
					onBatchUpload={batchUpload}
					onRetry={() => notify("失败记录已加入重试队列")}
					managementRecords={managementRecords}
				/>
				{detailOverlay}
			</>
		);

	return (
		<div className="page">
			<PageHeader title="数据" />
			<Card
				className="local-scroll isolate min-h-0 min-w-0 flex-1 gap-0 overflow-auto py-0"
				data-testid="device-records-scroll"
			>
				{checked.length > 0 && (
					<div className="m-3 flex min-h-20 items-center gap-3 rounded-xl bg-blue-500/10 px-4 py-1 text-[length:var(--device-text-xs)] text-blue-500">
						<strong>已选择 {checked.length} 条</strong>
						<Button size="device-compact" onClick={batchUpload}>
							<UploadCloud data-icon="inline-start" />
							{uploading ? "加入队列中…" : "一键上传"}
						</Button>
						<Button
							size="device-compact"
							variant="outline"
							onClick={() => notify("失败记录已加入重试队列")}
						>
							<RotateCcw data-icon="inline-start" />
							重试
						</Button>
						<Button
							size="device-compact"
							variant="ghost"
							onClick={() => setChecked([])}
						>
							取消选择
						</Button>
					</div>
				)}
				<div
					className="sticky top-0 z-30 grid min-h-[82px] min-w-[1720px] grid-cols-[32px_165px_175px_155px_145px_190px_170px_180px_125px_125px_110px] items-center gap-3 overflow-hidden border-b border-border bg-card px-3 text-[length:var(--device-text-xs)] font-semibold leading-none text-muted-foreground [&>span]:whitespace-nowrap"
					role="row"
				>
					<span aria-label="选择" />
					<span>项目</span>
					<span>任务</span>
					<span>子任务</span>
					<span>套件</span>
					<span>数据 ID</span>
					<span>采集地点</span>
					<span>采集时间</span>
					<span>验收状态</span>
					<span>数据状态</span>
					<span>数据管理</span>
				</div>
				{visibleFiles.length ? (
					groupedFiles.map(([groupName, groupFiles]) => (
						<Fragment key={groupName}>
							<button
								className="sticky left-0 z-0 grid min-h-12 min-w-[1720px] grid-cols-[32px_1fr] items-center gap-3 border-b border-border bg-secondary px-3 text-left font-semibold"
								aria-expanded={!collapsedGroups.includes(groupName)}
								onClick={() =>
									setCollapsedGroups((values) =>
										values.includes(groupName)
											? values.filter((value) => value !== groupName)
											: [...values, groupName],
									)
								}
							>
								{collapsedGroups.includes(groupName) ? (
									<ChevronRight className="size-5" />
								) : (
									<ChevronDown className="size-5" />
								)}
								<span>
									{groupName} · {groupFiles.length} 条数据
								</span>
							</button>
							{!collapsedGroups.includes(groupName) &&
								groupFiles.map((item) => {
									const metadata = recordByFile.get(item.name);
									return (
										<div
											className="grid min-h-16 min-w-[1720px] grid-cols-[32px_165px_175px_155px_145px_190px_170px_180px_125px_125px_110px] items-center gap-3 border-b border-border px-3"
											key={item.name}
											role="row"
										>
											<input
												className="size-5 accent-blue-600"
												type="checkbox"
												checked={checked.includes(item.name)}
												onChange={(event) =>
													setChecked((values) =>
														event.target.checked
															? [...values, item.name]
															: values.filter((name) => name !== item.name),
													)
												}
												aria-label={`选择 ${item.name}`}
											/>
											<DataCell
												value={metadata?.project_name || "未关联项目"}
											/>
											<DataCell value={metadata?.task_name || "未关联任务"} />
											<DataCell
												value={metadata?.subtask_name || "未分子任务"}
											/>
											<DataCell value={metadata?.kit_name || "未绑定套件"} />
											<DataCell value={metadata?.record_no || item.name} />
											<DataCell value={metadata?.capture_location || "-"} />
											<DataCell
												value={new Date(
													metadata?.captured_at || item.mtime,
												).toLocaleString("zh-CN")}
											/>
											<Badge variant="secondary">
												{acceptanceLabel(metadata?.qa_status)}
											</Badge>
											<Badge variant="outline">
												{dataStatusLabel(
													metadata?.data_status,
													item.remoteOnly,
												)}
											</Badge>
											<Button
												size="device-compact"
												variant="outline"
												aria-label={`管理 ${item.name}`}
												onClick={() => openRecord(item)}
											>
												管理
											</Button>
										</div>
									);
								})}
						</Fragment>
					))
				) : (
					<EmptyState
						icon={<FolderOpen />}
						title="暂无采集记录"
						description="完成一次录制后，记录会显示在这里。"
					/>
				)}
				<div className="flex items-center justify-end gap-3 p-4 text-[length:var(--device-text-xs)] text-muted-foreground">
					<span>每页 100 条</span>
					<Button size="device-compact" disabled variant="outline">
						上一页
					</Button>
					<strong>1 / 1</strong>
					<Button size="device-compact" disabled variant="outline">
						下一页
					</Button>
				</div>
			</Card>

			{detailOverlay}
		</div>
	);
}

function DataCell({ value }: { value: string }) {
	return (
		<span
			className="truncate text-[length:var(--device-text-xs)] text-muted-foreground"
			title={value}
		>
			{value}
		</span>
	);
}

function acceptanceLabel(value?: string) {
	return (
		(
			{
				PENDING: "待验收",
				REVIEWING: "验收中",
				PASS: "已通过",
				APPROVED: "已通过",
				RETURNED: "已退回",
			} as Record<string, string>
		)[value || ""] || "待验收"
	);
}

function dataStatusLabel(value?: string, remoteOnly?: boolean) {
	if (value === "MISSING") return "无数据";
	if (value === "UPLOADED" || remoteOnly) return "已上传";
	return "在盘";
}
