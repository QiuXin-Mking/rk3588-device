import {
	CheckSquare2,
	ChevronRight,
	Database,
	FolderOpen,
	RotateCcw,
	UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Recording } from "../../../services/deviceApi";
import type { ManagementRecord } from "../../../services/managementApi";
import { formatBytes } from "../../../shared/format";
import { cn } from "../../../shared/lib/cn";
import { EmptyState, PageHeader } from "../../../shared/ui/DevicePrimitives";
import { recordState } from "../recordModel";

const PAGE_SIZE = 100;

export function MobileRecordsView({
	files,
	checked,
	uploading,
	selectedName,
	onToggle,
	onSelectAll,
	onOpen,
	onBatchUpload,
	onRetry,
	managementRecords = [],
}: {
	files: Recording[];
	checked: string[];
	uploading: boolean;
	selectedName?: string;
	onToggle: (name: string, checked: boolean) => void;
	onSelectAll: () => void;
	onOpen: (item: Recording) => void;
	onBatchUpload: () => void;
	onRetry: () => void;
	managementRecords?: ManagementRecord[];
}) {
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const visibleFiles = files.slice(0, visibleCount);
	const recordByFile = new Map(
		managementRecords.map((item) => [item.file_name || item.record_no, item]),
	);

	return (
		<div
			className="page flex min-h-full min-w-0 flex-col gap-3.5 overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-[minmax(17.5rem,.34fr)_minmax(0,1fr)] md:content-start"
			data-testid="mobile-records-scroll"
		>
			<PageHeader title="数据" />

			<div className="flex items-center justify-between md:col-span-2">
				<strong className="text-lg">最近记录</strong>
				<button
					className="inline-flex min-h-11 items-center gap-1 border-0 bg-transparent px-2 text-sm font-semibold text-primary"
					onClick={onSelectAll}
				>
					<CheckSquare2 className="size-4" />
					{checked.length ? `已选 ${checked.length}` : "批量选择"}
				</button>
			</div>
			<div
				className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,.55fr)_4.5rem] gap-2 rounded-xl border border-border bg-secondary/70 px-11 py-2 text-xs font-semibold text-muted-foreground md:col-span-2"
				role="row"
				aria-label="记录列表字段"
			>
				<span role="columnheader">数据 ID</span>
				<span role="columnheader">任务/子任务</span>
				<span className="text-right" role="columnheader">
					验收
				</span>
			</div>
			<section className="grid gap-2.5 md:col-span-2 md:grid-cols-2 xl:grid-cols-3">
				{files.length ? (
					visibleFiles.map((item) => {
						const metadata = recordByFile.get(item.name);
						const state = recordState(metadata);
						const streams = [
							item.hasColor && "彩色",
							item.hasDepth && "深度",
							item.hasGlove && "手套",
							item.hasImu && "IMU",
						].filter(Boolean);
						const tone =
							state.className === "returned"
								? "destructive"
								: state.className === "reviewing"
									? "default"
									: "outline";
						return (
							<article
								className={cn(
									"grid grid-cols-[1.25rem_1fr] items-center gap-1 rounded-[1.1rem] border border-border bg-card p-2.5",
									selectedName === item.name && "border-primary",
								)}
								key={item.name}
							>
								<input
									className="size-[17px] accent-primary"
									type="checkbox"
									checked={checked.includes(item.name)}
									onChange={(event) =>
										onToggle(item.name, event.target.checked)
									}
									aria-label={`选择 ${item.name}`}
								/>
								<button
									className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-0 bg-transparent text-left text-foreground"
									onClick={() => onOpen(item)}
								>
									<span
										className={cn(
											"grid size-10 place-items-center rounded-xl",
											state.className === "returned"
												? "bg-red-500/10 text-red-500"
												: state.className === "reviewing"
													? "bg-violet-500/10 text-violet-500"
													: "bg-amber-500/10 text-amber-500",
										)}
									>
										<Database className="size-5" />
									</span>
									<span className="grid min-w-0 gap-0.5">
										<strong className="truncate text-sm">
											{metadata?.record_no ||
												item.name.replace("recording_", "")}
										</strong>
										<small className="truncate text-[11px] text-muted-foreground">
											{metadata?.project_name || "未关联项目"} ·{" "}
											{metadata?.task_name || "未关联任务"} ·{" "}
											{metadata?.subtask_name || "未分子任务"}
										</small>
										<em className="truncate text-[11px] not-italic text-muted-foreground">
											{metadata?.kit_name || streams.join(" · ") || "本地数据"}{" "}
											· {metadata?.capture_location || "未填地点"} ·{" "}
											{new Date(item.mtime).toLocaleString("zh-CN")} ·{" "}
											{formatBytes(item.size)}
										</em>
									</span>
									<Badge
										className={cn(
											state.className === "returned"
												? "border-red-500/30 bg-red-500/10 text-red-500"
												: state.className === "reviewing"
													? "border-violet-500/30 bg-violet-500/10 text-violet-500"
													: "border-amber-500/30 bg-amber-500/10 text-amber-500",
										)}
										variant={tone}
									>
										{state.label}
									</Badge>
									<ChevronRight className="size-4 text-muted-foreground" />
								</button>
							</article>
						);
					})
				) : (
					<EmptyState
						icon={<FolderOpen />}
						title="暂无采集记录"
						description="完成采集后，记录会显示在这里。"
					/>
				)}
				{visibleCount < files.length && (
					<Button
						className="md:col-span-2 xl:col-span-3"
						onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
					>
						加载更多（剩余 {files.length - visibleCount} 条）
					</Button>
				)}
			</section>

			{checked.length > 0 && (
				<Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[1.1rem] bg-card/95 p-2.5 backdrop-blur-xl">
					<span className="text-sm">
						已选择 <strong>{checked.length}</strong> 条
					</span>
					<Button size="touch" onClick={onRetry}>
						<RotateCcw className="size-4" />
						重试
					</Button>
					<Button variant="default" size="touch" onClick={onBatchUpload}>
						<UploadCloud className="size-4" />
						{uploading ? "处理中…" : "上传"}
					</Button>
				</Card>
			)}
		</div>
	);
}
