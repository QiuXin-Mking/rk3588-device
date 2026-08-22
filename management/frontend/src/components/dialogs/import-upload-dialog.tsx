import {
	AlertCircle,
	CheckCircle2,
	FileUp,
	Loader2,
	UploadCloud,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ImportUploadStatus = "queued" | "uploading" | "done" | "error";

export type ImportUploadItem = {
	id: string;
	file_name: string;
	file_size: number;
	progress: number;
	status: ImportUploadStatus;
	error?: string;
	file_path?: string;
};

interface ImportUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	templateUrl?: string;
	bindingTitle?: string;
	bindingValue?: string;
	bindingHint?: string;
	uploadTitle: string;
	uploadDescription: string;
	uploadHint?: string;
	uploadBadge: string;
	accept: string;
	multiple?: boolean;
	selectButtonText?: string;
	isDragging: boolean;
	isUploading: boolean;
	isSubmitting: boolean;
	uploadItems: ImportUploadItem[];
	onFilesSelected: (files: File[]) => void;
	onDragStateChange: (dragging: boolean) => void;
	onOpenPicker: () => void;
	fileInputId: string;
	footer: ReactNode;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getStatusMeta(status: ImportUploadStatus) {
	if (status === "done") {
		return {
			label: "已完成",
			className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
			icon: <CheckCircle2 className="size-3.5" />,
		};
	}
	if (status === "error") {
		return {
			label: "失败",
			className: "border-destructive/20 bg-destructive/10 text-destructive",
			icon: <AlertCircle className="size-3.5" />,
		};
	}
	if (status === "uploading") {
		return {
			label: "上传中",
			className: "border-primary/20 bg-primary/10 text-primary",
			icon: <Loader2 className="size-3.5 animate-spin" />,
		};
	}
	return {
		label: "排队中",
		className: "border-border bg-muted/50 text-muted-foreground",
		icon: <Loader2 className="size-3.5 animate-spin" />,
	};
}

export function ImportUploadDialog({
	open,
	onOpenChange,
	title,
	description,
	templateUrl,
	bindingTitle,
	bindingValue,
	bindingHint,
	uploadTitle,
	uploadDescription,
	uploadHint = "上传后会进入右侧队列。",
	uploadBadge,
	accept,
	multiple = true,
	selectButtonText = "选择文件",
	isDragging,
	isUploading,
	isSubmitting,
	uploadItems,
	onFilesSelected,
	onDragStateChange,
	onOpenPicker,
	fileInputId,
	footer,
}: ImportUploadDialogProps) {
	const hasBinding = bindingTitle || bindingValue || bindingHint;
	const queuedCount = uploadItems.filter(
		(item) => item.status === "queued" || item.status === "uploading",
	).length;
	const doneCount = uploadItems.filter((item) => item.status === "done").length;
	const errorCount = uploadItems.filter(
		(item) => item.status === "error",
	).length;
	const handleOpenPicker = () => {
		onOpenPicker();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(720px,80vh)] min-h-[min(520px,80vh)] max-h-[80vh] flex-col overflow-hidden p-0 sm:max-w-[1000px]">
				<div className="shrink-0 border-b px-6 py-4">
					<DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
						<div className="min-w-0">
							<DialogTitle>{title}</DialogTitle>
							{description ? (
								<DialogDescription>{description}</DialogDescription>
							) : null}
						</div>
						{templateUrl ? (
							<Button
								variant="link"
								size="sm"
								asChild
								className="shrink-0 self-center px-0"
							>
								<a href={templateUrl} download>
									下载模板
								</a>
							</Button>
						) : null}
					</DialogHeader>
				</div>

				<div className="flex min-h-0 flex-1 px-6 py-4">
					<div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
						<div
							className={cn(
								"min-w-0",
								hasBinding
									? "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3"
									: "flex min-h-0 flex-col",
							)}
						>
							{hasBinding ? (
								<section className="min-w-0 rounded-lg border bg-background p-3">
									<div className="text-sm font-medium">{bindingTitle}</div>
									<div className="mt-2 min-w-0 rounded-md border bg-muted/20 p-3">
										<div className="text-xs text-muted-foreground">
											当前页面绑定
										</div>
										<div className="mt-1 break-words text-sm font-medium">
											{bindingValue}
										</div>
										{bindingHint ? (
											<div className="mt-2 text-xs leading-5 text-muted-foreground">
												{bindingHint}
											</div>
										) : null}
									</div>
								</section>
							) : null}

							<section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border bg-background p-3">
								<div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
									<div className="min-w-0">
										<div className="text-sm font-medium">{uploadTitle}</div>
										<div className="text-xs text-muted-foreground">
											{uploadDescription}
										</div>
									</div>
									<div className="shrink-0 rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
										{uploadBadge}
									</div>
								</div>

								<button
									type="button"
									className={cn(
										"mt-3 flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-3 text-center transition-colors",
										isDragging
											? "border-primary bg-primary/5"
											: "border-border bg-muted/10 hover:bg-muted/20",
										(isUploading || isSubmitting) &&
											"pointer-events-none opacity-70",
									)}
									onClick={handleOpenPicker}
									onDragOver={(event) => {
										event.preventDefault();
										onDragStateChange(true);
									}}
									onDragLeave={() => onDragStateChange(false)}
									onDrop={(event) => {
										event.preventDefault();
										onDragStateChange(false);
										onFilesSelected(Array.from(event.dataTransfer.files));
									}}
								>
									<div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
										<UploadCloud className="size-6" />
									</div>
									<div className="flex flex-col gap-1">
										<p className="text-sm font-medium">
											点击选择文件，或将文件拖到这里
										</p>
										<p className="text-xs text-muted-foreground">
											{uploadHint}
										</p>
									</div>
									<span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm">
										<FileUp />
										{selectButtonText}
									</span>
								</button>
								<Input
									id={fileInputId}
									type="file"
									multiple={multiple}
									accept={accept}
									className="hidden"
									disabled={isUploading || isSubmitting}
									onChange={(event) => {
										onFilesSelected(Array.from(event.target.files ?? []));
										event.target.value = "";
									}}
								/>
							</section>
						</div>

						<section className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-background p-3">
							<div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="text-sm font-medium">上传队列</div>
									<div className="text-xs text-muted-foreground">
										每个文件显示独立状态、进度和结果。
									</div>
								</div>
								<div className="flex flex-wrap gap-2 text-xs">
									<div className="rounded-md border bg-muted/40 px-2.5 py-1 text-muted-foreground">
										排队 {queuedCount}
									</div>
									<div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700">
										完成 {doneCount}
									</div>
									<div className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-destructive">
										失败 {errorCount}
									</div>
								</div>
							</div>

							<div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
								{uploadItems.length > 0 ? (
									<div className="flex flex-col gap-3">
										{uploadItems.map((item) => {
											const meta = getStatusMeta(item.status);
											return (
												<div
													key={item.id}
													className="rounded-lg border bg-background p-2.5"
												>
													<div className="flex min-w-0 items-start gap-3">
														<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
															<FileUp className="size-4" />
														</div>
														<div className="flex min-w-0 flex-1 flex-col gap-2">
															<div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
																<div className="min-w-0 flex-1">
																	<div className="truncate text-sm font-medium">
																		{item.file_name}
																	</div>
																	<div className="truncate text-xs text-muted-foreground">
																		{formatFileSize(item.file_size)}
																		{item.file_path
																			? ` · ${item.file_path}`
																			: ""}
																	</div>
																</div>
																<div
																	className={cn(
																		"inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap",
																		meta.className,
																	)}
																>
																	{meta.icon}
																	{meta.label}
																</div>
															</div>

															<div className="flex flex-col gap-1">
																<Progress
																	value={item.progress}
																	className="h-2"
																/>
																<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
																	<span className="min-w-0 flex-1 break-words">
																		{item.status === "done"
																			? "已完成，等待或已经创建导入任务"
																			: item.status === "error"
																				? (item.error ?? "处理失败")
																				: "正在处理文件"}
																	</span>
																	<span className="shrink-0 whitespace-nowrap">
																		{item.status === "done"
																			? "100%"
																			: `${item.progress}%`}
																	</span>
																</div>
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-4 text-center">
										<div className="flex size-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
											<UploadCloud className="size-5" />
										</div>
										<div className="mt-4 text-sm font-medium">
											还没有上传任务
										</div>
										<div className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
											选择文件后，这里会逐条显示上传中的文件、进度条和失败原因。
										</div>
									</div>
								)}
							</div>
						</section>
					</div>
				</div>

				<DialogFooter className="shrink-0 border-t px-6 py-4">
					{footer}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
