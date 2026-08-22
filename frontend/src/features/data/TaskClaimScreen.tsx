import {
	ArrowLeft,
	CheckCircle2,
	ClipboardList,
	Clock3,
	LocateFixed,
	Play,
	Search,
	X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Navigate, Notify } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { cn } from "../../shared/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import {
	clearCurrentTask,
	loadManagementSession,
	managementApi,
	saveCurrentTask,
} from "../../services/managementApi";

type PublishRange = "all" | "day" | "week" | "month";

export function TaskClaimScreen({
	back,
	go,
	notify,
}: {
	back?: () => void;
	go: Navigate;
	notify: Notify;
}) {
	const mode = useUiMode();
	const session = loadManagementSession();
	const [selectedTaskId, setSelectedTaskId] = useState("");
	const [sceneType, setSceneType] = useState("");
	const [taskKey, setTaskKey] = useState("");
	const [subtaskName, setSubtaskName] = useState("");
	const [publishRange, setPublishRange] = useState<PublishRange>("all");
	const [gps, setGps] = useState("");
	const [targetObjects, setTargetObjects] = useState("");
	const [objectCount, setObjectCount] = useState(0);
	const [locating, setLocating] = useState(false);
	const [claiming, setClaiming] = useState(false);
	const [abandoning, setAbandoning] = useState(false);
	const [viewingSop, setViewingSop] = useState(false);
	const [showTaskList, setShowTaskList] = useState(false);
	const [sceneSearch, setSceneSearch] = useState("");
	const [taskSearch, setTaskSearch] = useState("");
	const [subtaskSearch, setSubtaskSearch] = useState("");
	const currentTaskQuery = useQuery({
		queryKey: ["management-current-task", session?.user.id],
		queryFn: managementApi.currentTask,
		retry: false,
		enabled: Boolean(session),
	});
	const currentTask = currentTaskQuery.data ?? null;
	const taskQuery = useQuery({
		queryKey: ["management-tasks", session?.user.id],
		queryFn: () => managementApi.tasks(),
		retry: false,
		enabled: Boolean(session) && currentTaskQuery.isFetched,
	});
	const sceneSearchQuery = useQuery({
		queryKey: ["management-task-scene-search", sceneSearch],
		queryFn: () => managementApi.tasks({ q: sceneSearch, limit: 100 }),
		retry: false,
		enabled: Boolean(session && sceneSearch.trim()),
	});
	const taskSearchQuery = useQuery({
		queryKey: ["management-task-name-search", sceneType, taskSearch],
		queryFn: () =>
			managementApi.tasks({
				q: taskSearch,
				scene_type: sceneType || undefined,
				limit: 100,
			}),
		retry: false,
		enabled: Boolean(session && taskSearch.trim()),
	});
	const subtaskSearchQuery = useQuery({
		queryKey: ["management-subtask-search", taskKey, subtaskSearch],
		queryFn: () =>
			managementApi.tasks({
				q: subtaskSearch,
				task_no: taskKey || undefined,
				limit: 100,
			}),
		retry: false,
		enabled: Boolean(session && taskKey && subtaskSearch.trim()),
	});
	const availableTasks = useMemo(() => {
		const merged = [
			...(taskQuery.data ?? []),
			...(sceneSearchQuery.data ?? []),
			...(taskSearchQuery.data ?? []),
			...(subtaskSearchQuery.data ?? []),
		];
		return [...new Map(merged.map((item) => [item.id, item])).values()];
	}, [
		sceneSearchQuery.data,
		subtaskSearchQuery.data,
		taskQuery.data,
		taskSearchQuery.data,
	]);
	const tasksInScope = useMemo(() => {
		const now = Date.now();
		const rangeMs = {
			all: Number.POSITIVE_INFINITY,
			day: 86_400_000,
			week: 604_800_000,
			month: 2_592_000_000,
		}[publishRange];
		return availableTasks.filter((item) => {
			const publishedAt = item.published_at
				? new Date(item.published_at).getTime()
				: now;
			return (
				(!sceneType || item.scene_type === sceneType) &&
				now - publishedAt <= rangeMs
			);
		});
	}, [availableTasks, publishRange, sceneType]);
	const options = useMemo(() => {
		const taskLabels: Record<string, string> = {};
		for (const item of tasksInScope) taskLabels[item.serial_number] = item.name;
		return {
			scenes: unique(availableTasks.map((item) => item.scene_type)),
			tasks: unique(tasksInScope.map((item) => item.serial_number)),
			taskLabels,
			subtasks: unique(
				tasksInScope
					.filter((item) => !taskKey || item.serial_number === taskKey)
					.map((item) => item.subtask_name ?? ""),
			),
		};
	}, [availableTasks, taskKey, tasksInScope]);
	const filteredTasks = useMemo(() => {
		return tasksInScope.filter(
			(item) =>
				(!taskKey || item.serial_number === taskKey) &&
				(!subtaskName || item.subtask_name === subtaskName),
		);
	}, [subtaskName, taskKey, tasksInScope]);
	const selectedTask = availableTasks.find(
		(item) => item.id === selectedTaskId,
	);
	const resetSelectedTask = () => setSelectedTaskId("");
	const changeSceneType = (value: string) => {
		setSceneType(value);
		setTaskKey("");
		setSubtaskName("");
		resetSelectedTask();
	};
	const changePublishRange = (value: string) => {
		setPublishRange(value as PublishRange);
		setTaskKey("");
		setSubtaskName("");
		resetSelectedTask();
	};
	const changeTask = (value: string) => {
		setTaskKey(value);
		setSubtaskName("");
		resetSelectedTask();
	};
	const changeSubtaskName = (value: string) => {
		setSubtaskName(value);
		resetSelectedTask();
	};

	const locate = () => {
		setLocating(true);
		if (!navigator.geolocation) {
			setLocating(false);
			notify("当前设备不支持定位，GPS 已留空，可继续领取任务");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setGps(
					`${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`,
				);
				setLocating(false);
				notify("已获取定位");
			},
			() => {
				setGps("");
				setLocating(false);
				notify("定位获取失败，GPS 已留空，可继续领取任务");
			},
			{ enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
		);
	};

	const viewSop = () => {
		if (!selectedTask) return notify("请选择要领取的任务");
		setViewingSop(true);
	};
	const startCapture = async () => {
		if (currentTask && !showTaskList) {
			saveCurrentTask(currentTask);
			go("capture");
			return;
		}
		if (!selectedTask || claiming) return;
		setClaiming(true);
		try {
			const claimedTask = await managementApi.claimTask(selectedTask.id, {
				location: gps,
				target_objects: targetObjects || selectedTask.target_objects,
				object_count: objectCount,
			});
			saveCurrentTask(claimedTask);
			notify("任务领取成功");
			go("capture");
		} catch (error) {
			notify(error instanceof Error ? error.message : "任务领取失败");
		} finally {
			setClaiming(false);
		}
	};
	const sopTask =
		!showTaskList && currentTask
			? currentTask
			: viewingSop
				? selectedTask
				: null;
	const isClaimedSop = Boolean(currentTask && !showTaskList);
	const cancelSop = async () => {
		if (!currentTask) {
			setViewingSop(false);
			return;
		}
		if (abandoning) return;
		setAbandoning(true);
		try {
			await managementApi.abandonTask(currentTask.id);
			clearCurrentTask();
			notify("任务已取消");
			setViewingSop(false);
			setShowTaskList(true);
			setSelectedTaskId("");
			await currentTaskQuery.refetch();
			await taskQuery.refetch();
		} catch (error) {
			notify(error instanceof Error ? error.message : "取消任务失败");
		} finally {
			setAbandoning(false);
		}
	};

	if (!session)
		return (
			<div className="page detail-page">
				<PageHeader title="任务" subtitle="任务广场与任务承接" back={back} />
				<Card className="min-h-0 flex-1">
					<CardContent className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
						<ClipboardList className="size-14 text-muted-foreground" />
						<strong>请先登录账户</strong>
						<Button
							size={mode === "device" ? "device-primary" : "lg"}
							onClick={() => go("account")}
						>
							前往登录
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	if (currentTaskQuery.isLoading)
		return (
			<div className="page detail-page">
				<PageHeader title="任务" subtitle="任务广场与任务承接" back={back} />
				<Card className="min-h-0 flex-1">
					<CardContent className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
						正在同步当前任务…
					</CardContent>
				</Card>
			</div>
		);
	if (sopTask)
		return (
			<div className="page detail-page">
				<PageHeader title="任务" subtitle="任务广场与任务承接" back={back} />
				<Card className="min-h-0 flex-1">
					<CardContent
						className="local-scroll min-h-0 flex-1 overflow-y-auto p-6"
						aria-label="SOP 内容"
						role="region"
					>
						<h2
							className={cn(
								"font-bold",
								mode === "device"
									? "text-[length:var(--device-text-lg)]"
									: "text-xl",
							)}
						>
							{sopTask.sop_name || "任务 SOP"}
						</h2>
						<div
							className={cn(
								"mt-5 whitespace-pre-wrap break-words leading-relaxed",
								mode === "device"
									? "text-[length:var(--device-text-sm)]"
									: "text-base",
							)}
						>
							{sopTask.sop || "后台尚未填写 SOP 内容"}
						</div>
					</CardContent>
					<CardFooter className="grid grid-cols-3 gap-3">
						<Button
							size={mode === "device" ? "device" : "lg"}
							variant="outline"
							onClick={() => {
								setViewingSop(false);
								setShowTaskList(true);
								setSelectedTaskId("");
							}}
						>
							<ArrowLeft data-icon="inline-start" />
							返回任务列表
						</Button>
						<Button
							size={mode === "device" ? "device" : "lg"}
							variant="outline"
							disabled={abandoning}
							onClick={cancelSop}
						>
							{abandoning ? "取消中…" : "取消"}
						</Button>
						<Button
							size={mode === "device" ? "device-primary" : "lg"}
							disabled={claiming}
							onClick={startCapture}
						>
							<Play data-icon="inline-start" />
							{claiming ? "领取中…" : isClaimedSop ? "继续采集" : "领取采集"}
						</Button>
					</CardFooter>
				</Card>
			</div>
		);

	return (
		<div className="page detail-page">
			<PageHeader title="任务" subtitle="任务广场与任务承接" back={back} />
			<div
				className={cn(
					"grid min-h-0 flex-1 gap-4",
					mode === "device"
						? "grid-cols-[minmax(620px,.95fr)_minmax(0,1.05fr)]"
						: "grid-cols-1 overflow-y-auto pb-24",
				)}
			>
				<Card className="min-h-0">
					<CardContent className="flex min-h-0 flex-1 flex-col gap-3">
						<FieldGroup className="grid grid-cols-2 gap-2">
							<FilterField
								label="场景类型"
								allLabel="全部场景"
								value={sceneType}
								onChange={changeSceneType}
								options={options.scenes}
								searchable
								onSearchChange={setSceneSearch}
								searching={sceneSearchQuery.isFetching}
							/>
							<FilterField
								label="发布时间"
								allLabel="全部时间"
								emptyValue="all"
								value={publishRange}
								onChange={changePublishRange}
								options={["day", "week", "month"]}
								labels={{ day: "24 小时内", week: "7 天内", month: "30 天内" }}
							/>
							<FilterField
								label="任务名称"
								allLabel="全部任务"
								value={taskKey}
								onChange={changeTask}
								options={options.tasks}
								labels={options.taskLabels}
								searchable
								onSearchChange={setTaskSearch}
								searching={taskSearchQuery.isFetching}
							/>
							<FilterField
								label="子任务"
								allLabel="全部子任务"
								value={subtaskName}
								onChange={changeSubtaskName}
								options={options.subtasks}
								searchable
								onSearchChange={setSubtaskSearch}
								searching={subtaskSearchQuery.isFetching}
							/>
						</FieldGroup>
						<div className="local-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
							{filteredTasks.map((item) => (
								<Button
									key={item.id}
									className="h-auto min-h-[88px] w-full justify-start whitespace-normal px-4 py-3 text-left"
									variant={selectedTaskId === item.id ? "secondary" : "ghost"}
									onClick={() => {
										setSelectedTaskId(item.id);
										setGps(item.location || "");
										setTargetObjects(item.target_objects || "");
										setObjectCount(item.object_count ?? 0);
									}}
								>
									<ClipboardList data-icon="inline-start" />
									<span className="flex min-w-0 flex-1 flex-col items-start gap-1">
										<strong className="line-clamp-1">{item.name}</strong>
										<small className="line-clamp-1 text-muted-foreground">
											{item.project_name} · {item.subtask_name || "未分子任务"}
										</small>
										<small className="line-clamp-1 text-muted-foreground">
											{item.serial_number}
										</small>
									</span>
									<Badge variant="outline">{item.scene_type || "未分类"}</Badge>
								</Button>
							))}
							{!taskQuery.isLoading && filteredTasks.length === 0 && (
								<p className="py-8 text-center text-muted-foreground">
									没有符合条件的任务
								</p>
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="min-h-0">
					{selectedTask && (
						<>
							<CardContent className="local-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
								<div className="grid grid-cols-3 gap-2">
									<TaskFact
										label="总时长"
										value={`${selectedTask.duration_minutes} 分钟`}
									/>
									<TaskFact
										label="平均时长"
										value={`${averageDuration(selectedTask.duration_minutes, selectedTask.target_count)} 分钟`}
									/>
									<TaskFact
										label="已采集/总次数"
										value={`${selectedTask.completed_count}/${selectedTask.target_count}`}
									/>
								</div>
								<FieldGroup>
									<Field
										className={cn(
											mode === "device" &&
												"grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3",
										)}
									>
										<FieldLabel htmlFor="claim-location">场景位置</FieldLabel>
										<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
											<Input
												id="claim-location"
												readOnly
												value={gps}
												placeholder="未获取定位，可留空"
											/>
											<Button
												type="button"
												variant="outline"
												disabled={locating}
												onClick={locate}
											>
												<LocateFixed data-icon="inline-start" />
												{locating ? "定位中…" : "获取定位"}
											</Button>
										</div>
									</Field>
									<Field
										className={cn(
											mode === "device" &&
												"grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3",
										)}
									>
										<FieldLabel htmlFor="claim-count">对象数量</FieldLabel>
										<Input
											id="claim-count"
											min={0}
											type="number"
											value={objectCount}
											onChange={(event) =>
												setObjectCount(
													Math.max(0, Number(event.target.value) || 0),
												)
											}
										/>
									</Field>
									<Field
										className={cn(
											mode === "device" &&
												"grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3",
										)}
									>
										<FieldLabel htmlFor="claim-targets">目标物体</FieldLabel>
										<Input
											id="claim-targets"
											value={targetObjects}
											onChange={(event) => setTargetObjects(event.target.value)}
										/>
									</Field>
								</FieldGroup>
							</CardContent>
							<CardFooter>
								<Button
									className="w-full"
									size={mode === "device" ? "device-primary" : "lg"}
									onClick={viewSop}
								>
									<CheckCircle2 data-icon="inline-start" />
									确认领取并查看 SOP
								</Button>
							</CardFooter>
						</>
					)}
				</Card>
			</div>
		</div>
	);
}

function FilterField({
	label,
	allLabel,
	emptyValue = "",
	value,
	onChange,
	options,
	labels = {},
	searchable = false,
	onSearchChange,
	searching = false,
}: {
	label: string;
	allLabel: string;
	emptyValue?: string;
	value: string;
	onChange: (value: string) => void;
	options: string[];
	labels?: Record<string, string>;
	searchable?: boolean;
	onSearchChange?: (value: string) => void;
	searching?: boolean;
}) {
	const mode = useUiMode();
	const active = value !== emptyValue;
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [query, setQuery] = useState("");
	const composingRef = useRef(false);
	const updateSearch = (value: string) => {
		setInputValue(value);
		setQuery(value);
		onSearchChange?.(value);
	};
	const closeSearch = () => {
		setOpen(false);
		composingRef.current = false;
		updateSearch("");
	};
	const visibleOptions = useMemo(() => {
		const keyword = query.trim().toLocaleLowerCase("zh-CN");
		if (!keyword) return options.slice(0, 100);
		return options
			.filter((option) =>
				`${labels[option] ?? option} ${option}`
					.toLocaleLowerCase("zh-CN")
					.includes(keyword),
			)
			.slice(0, 100);
	}, [labels, options, query]);
	if (searchable)
		return (
			<Field>
				{mode === "mobile" && <FieldLabel>{label}</FieldLabel>}
				<div className="relative">
					<Button
						type="button"
						variant="outline"
						size={mode === "device" ? "device" : "lg"}
						className={cn("w-full justify-start", active && "pr-18")}
						onClick={() => setOpen(true)}
						aria-label={label}
					>
						<Search data-icon="inline-start" />
						<span className="truncate">
							{active ? (labels[value] ?? value) : allLabel}
						</span>
					</Button>
					{active && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1/2 -translate-y-1/2"
							onClick={() => onChange(emptyValue)}
							aria-label={`清除${label}`}
						>
							<X />
						</Button>
					)}
				</div>
				<Dialog
					open={open}
					onOpenChange={(nextOpen) => {
						if (nextOpen) setOpen(true);
						else closeSearch();
					}}
				>
					<DialogContent className={cn(mode === "device" && "max-w-3xl p-6")}>
						<DialogHeader>
							<DialogTitle>{label}</DialogTitle>
						</DialogHeader>
						<Input
							autoFocus
							aria-label={`搜索${label}`}
							placeholder={`输入${label}关键词`}
							value={inputValue}
							onChange={(event) => {
								setInputValue(event.target.value);
								if (
									!composingRef.current &&
									!(event.nativeEvent as InputEvent).isComposing
								)
									updateSearch(event.target.value);
							}}
							onCompositionStart={() => {
								composingRef.current = true;
							}}
							onCompositionEnd={(event) => {
								composingRef.current = false;
								updateSearch(event.currentTarget.value);
							}}
						/>
						<div
							className={cn(
								"local-scroll flex max-h-[55vh] flex-col gap-2 overflow-y-auto",
								mode === "device" && "max-h-[52vh]",
							)}
						>
							<Button
								type="button"
								variant={value === emptyValue ? "secondary" : "ghost"}
								size={mode === "device" ? "device" : "lg"}
								className="justify-start"
								onClick={() => {
									onChange(emptyValue);
									closeSearch();
								}}
							>
								{allLabel}
							</Button>
							{visibleOptions.map((option) => (
								<Button
									key={option}
									type="button"
									variant={value === option ? "secondary" : "ghost"}
									size={mode === "device" ? "device" : "lg"}
									className="justify-start"
									onClick={() => {
										onChange(option);
										closeSearch();
									}}
								>
									{labels[option] ?? option}
								</Button>
							))}
							{visibleOptions.length === 0 && (
								<p className="py-8 text-center text-muted-foreground">
									{searching ? "正在搜索…" : "没有匹配项"}
								</p>
							)}
						</div>
					</DialogContent>
				</Dialog>
			</Field>
		);
	if (mode === "device")
		return (
			<Field>
				<div className="relative">
					<Clock3
						aria-hidden="true"
						className="pointer-events-none absolute left-7 top-1/2 size-7 -translate-y-1/2"
					/>
					<NativeSelect
						size="device"
						className={cn(
							"w-full",
							active &&
								"[&_[data-slot=native-select-icon]]:right-18 [&_[data-slot=native-select]]:pr-28",
						)}
						aria-label={label}
						value={value}
						onChange={(event) => onChange(event.target.value)}
					>
						<NativeSelectOption value={emptyValue}>
							{allLabel}
						</NativeSelectOption>
						{options.map((option) => (
							<NativeSelectOption key={option} value={option}>
								{labels[option] ?? option}
							</NativeSelectOption>
						))}
					</NativeSelect>
					{active && (
						<button
							className="absolute right-2 top-1/2 grid size-14 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							type="button"
							onClick={() => onChange(emptyValue)}
							aria-label={`清除${label}`}
						>
							<X className="size-8" />
						</button>
					)}
				</div>
			</Field>
		);
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<NativeSelect
				aria-label={label}
				className="w-full"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				<NativeSelectOption value={emptyValue}>{allLabel}</NativeSelectOption>
				{options.map((option) => (
					<NativeSelectOption key={option} value={option}>
						{labels[option] ?? option}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</Field>
	);
}

function TaskFact({ label, value }: { label: string; value: string }) {
	const mode = useUiMode();
	return (
		<div
			className={cn(
				"flex min-w-0 items-center justify-between rounded-xl bg-secondary",
				mode === "device"
					? "min-h-[94px] gap-3 px-4 py-3"
					: "gap-2 px-3 py-2 text-xs",
			)}
		>
			<small className="whitespace-nowrap text-muted-foreground">{label}</small>
			<strong
				className={cn(
					"shrink-0 whitespace-nowrap",
					mode === "device" && "text-[length:var(--device-text-sm)]",
				)}
			>
				{value}
			</strong>
		</div>
	);
}

function unique(values: string[]) {
	return [...new Set(values.filter(Boolean))].sort((a, b) =>
		a.localeCompare(b, "zh-CN"),
	);
}
function averageDuration(total: number, count: number) {
	return (count > 0 ? total / count : total).toFixed(1);
}
