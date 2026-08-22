import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { AlertCircle, Ban, FileDown, FileX, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	getInfraAsyncTasksReadMyAsyncTasksQueryKey,
	useInfraAsyncTasksCancelAsyncTask,
	useInfraAsyncTasksReadMyAsyncTasks,
} from "@/api/infra-async-tasks/infra-async-tasks";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function GlobalTaskTray() {
	const [isOpen, setIsOpen] = useState(false);
	const [terminatingTaskId, setTerminatingTaskId] = useState<string | null>(
		null,
	);
	const queryClient = useQueryClient();

	// Poll every 5 seconds globally.
	const { data: response } = useInfraAsyncTasksReadMyAsyncTasks(
		{ skip: 0, limit: 20 },
		{ query: { refetchInterval: 5000 } },
	);
	const terminateMutation = useInfraAsyncTasksCancelAsyncTask({
		mutation: {
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: getInfraAsyncTasksReadMyAsyncTasksQueryKey({
						skip: 0,
						limit: 20,
					}),
				});
				toast.success("任务已终止");
			},
			onError: (error) => {
				toast.error((error as Error).message || "终止任务失败");
			},
			onSettled: () => {
				setTerminatingTaskId(null);
			},
		},
	});

	const tasks = response?.status === 200 ? response.data.data : [];
	const runningCount = tasks.filter((t) => t.status === "processing").length;

	useEffect(() => {
		if (runningCount > 0) {
			toast.info("后台有正在执行的任务...", { id: "global-task-tray-running" });
		} else {
			toast.dismiss("global-task-tray-running");
		}
	}, [runningCount]);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					title="后台任务中心"
					className="relative"
				>
					{runningCount > 0 ? (
						<Loader2 className="size-4 animate-spin text-blue-500" />
					) : (
						<FileDown className="size-4" />
					)}
					{runningCount > 0 && (
						<span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-blue-600" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[340px] p-0" align="end">
				<div className="p-4 border-b">
					<h4 className="font-medium leading-none">任务中心</h4>
					<p className="text-sm text-muted-foreground mt-1">
						最近 10 条后台异步任务进度
					</p>
				</div>
				<ScrollArea className="h-[400px]">
					{tasks.length === 0 ? (
						<div className="p-4 text-sm text-center text-muted-foreground flex flex-col items-center justify-center h-40">
							<FileX className="h-8 w-8 mb-2 opacity-50" />
							暂无任务
						</div>
					) : (
						<div className="p-2 space-y-2">
							{tasks.map((task) => {
								const progress = task.progress as any;
								const isFinished =
									task.status === "completed" ||
									task.status === "failed" ||
									task.status === "partial_failed" ||
									task.status === "cancelled";
								return (
									<div
										key={task.id}
										className={cn(
											"p-3 rounded-md border text-sm transition-colors",
											task.status === "processing" &&
												"bg-blue-50/50 border-blue-200",
											task.status === "failed" &&
												"bg-rose-50/50 border-rose-200",
											task.status === "partial_failed" &&
												"bg-amber-50/50 border-amber-200",
											task.status === "cancelled" &&
												"bg-slate-50/50 border-slate-200",
											task.status === "completed" && "hover:bg-accent/50",
										)}
									>
										<div className="flex justify-between items-start mb-2">
											<div className="flex flex-col">
												<span className="font-medium text-foreground">
													{task.name || task.task_type}
												</span>
												<span className="text-[10px] text-muted-foreground mt-0.5">
													{dayjs(task.created_at as string).format(
														"YYYY-MM-DD HH:mm:ss",
													)}
												</span>
											</div>
											<span
												className={cn(
													"text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5",
													task.status === "processing" &&
														"bg-blue-100 text-blue-700",
													task.status === "completed" &&
														"bg-emerald-100 text-emerald-700",
													task.status === "partial_failed" &&
														"bg-amber-100 text-amber-700",
													task.status === "failed" &&
														"bg-rose-100 text-rose-700",
													task.status === "cancelled" &&
														"bg-slate-100 text-slate-700",
												)}
											>
												{task.status === "processing"
													? "执行中"
													: task.status === "completed"
														? "已完成"
														: task.status === "partial_failed"
															? "部分失败"
															: task.status === "cancelled"
																? "已终止"
																: "失败"}
											</span>
										</div>

										<div className="text-xs text-muted-foreground space-y-1">
											<div className="flex justify-between">
												<span>处理进度:</span>
												<span>
													{progress?.success || 0} 成功 / {progress?.error || 0}{" "}
													失败
												</span>
											</div>
											<div className="flex justify-between">
												<span>总数:</span>
												<span>{progress?.total || "计算中..."}</span>
											</div>
										</div>

										{task.status === "processing" && (
											<div className="mt-3 flex justify-end">
												<Button
													size="sm"
													variant="destructive"
													disabled={
														terminateMutation.isPending &&
														terminatingTaskId === task.id
													}
													onClick={() => {
														setTerminatingTaskId(task.id);
														terminateMutation.mutate({ id: task.id });
													}}
												>
													<Ban className="mr-1 size-3.5" />
													{terminateMutation.isPending &&
													terminatingTaskId === task.id
														? "终止中..."
														: "终止任务"}
												</Button>
											</div>
										)}

										{isFinished && progress?.errors_data?.length > 0 && (
											<div className="mt-3">
												<Dialog>
													<DialogTrigger asChild>
														<Button
															size="sm"
															variant="outline"
															className="w-full h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
														>
															<AlertCircle className="w-3 h-3 mr-1" />
															查看 {progress.errors_data.length} 条错误详情
														</Button>
													</DialogTrigger>
													<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
														<DialogHeader className="mb-2">
															<DialogTitle>
																导入失败详情 ({task.name || task.task_type})
															</DialogTitle>
														</DialogHeader>
														<div className="flex-1 min-h-0 relative border rounded-md">
															<ScrollArea className="absolute inset-0 h-full w-full">
																<Table>
																	<TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
																		<TableRow>
																			<TableHead className="w-16 text-center">
																				行
																			</TableHead>
																			<TableHead>失败原因</TableHead>
																		</TableRow>
																	</TableHeader>
																	<TableBody>
																		{progress.errors_data.map(
																			(errItem: any, idx: number) => (
																				// biome-ignore lint/suspicious/noArrayIndexKey: no unique id for error list
																				<TableRow key={idx}>
																					<TableCell className="text-center font-medium text-muted-foreground">
																						{idx + 1}
																					</TableCell>
																					<TableCell className="text-rose-600 font-medium whitespace-pre-wrap">
																						{errItem["导入失败原因"]}
																					</TableCell>
																				</TableRow>
																			),
																		)}
																	</TableBody>
																</Table>
															</ScrollArea>
														</div>
													</DialogContent>
												</Dialog>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</ScrollArea>
			</PopoverContent>
		</Popover>
	);
}
