import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	CircleGauge,
	ClipboardClock,
	Database,
	HardDrive,
	MessageSquareWarning,
	MonitorCheck,
} from "lucide-react";
import { useEgoDashboardReadDashboardSummary } from "@/api/ego-dashboard/ego-dashboard";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_layout/collection/dashboard/")({
	component: CollectionDashboard,
});

const metrics = [
	{
		key: "online_device_count",
		totalKey: "device_count",
		label: "在线设备",
		icon: MonitorCheck,
		tone: "text-emerald-600",
	},
	{
		key: "pending_task_count",
		label: "待执行任务",
		icon: ClipboardClock,
		tone: "text-amber-600",
	},
	{
		key: "today_record_count",
		label: "今日采集",
		icon: Activity,
		tone: "text-blue-600",
	},
	{
		key: "pending_qa_count",
		label: "待质检",
		icon: CircleGauge,
		tone: "text-violet-600",
	},
	{
		key: "open_feedback_count",
		label: "待处理反馈",
		icon: MessageSquareWarning,
		tone: "text-rose-600",
	},
] as const;

function formatBytes(value: number) {
	if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
	return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function CollectionDashboard() {
	const { data: response, isFetching } = useEgoDashboardReadDashboardSummary();
	const data = response?.status === 200 ? response.data : undefined;
	return (
		<div className="flex h-full flex-col gap-5 overflow-auto p-1">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						采集运营总览
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						设备、任务、采集记录、质检和反馈的实时软件侧状态。
					</p>
				</div>
				<Badge variant={isFetching ? "secondary" : "outline"}>
					{isFetching ? "同步中" : "数据已同步"}
				</Badge>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				{metrics.map((metric) => {
					const Icon = metric.icon;
					const value = data?.[metric.key] ?? 0;
					const suffix =
						"totalKey" in metric ? ` / ${data?.[metric.totalKey] ?? 0}` : "";
					return (
						<Card key={metric.key}>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									{metric.label}
								</CardTitle>
								<Icon className={`size-4 ${metric.tone}`} />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-semibold">
									{value.toLocaleString()}
									{suffix}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
			<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader>
						<CardTitle>采集链路</CardTitle>
						<CardDescription>
							任务领取 → 设备采集 → 本地记录 → 质检 →
							云端上传，前后端共享统一状态。
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-4">
						{[
							["任务池", data?.pending_task_count ?? 0],
							["今日记录", data?.today_record_count ?? 0],
							["待质检", data?.pending_qa_count ?? 0],
							["在线设备", data?.online_device_count ?? 0],
						].map(([label, value]) => (
							<div
								key={String(label)}
								className="rounded-lg border bg-muted/20 p-4"
							>
								<p className="text-xs text-muted-foreground">{label}</p>
								<p className="mt-2 text-xl font-semibold">
									{Number(value).toLocaleString()}
								</p>
							</div>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HardDrive className="size-4" />
							记录数据量
						</CardTitle>
						<CardDescription>数据库中持久化的采集文件元数据。</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-semibold">
							{formatBytes(data?.stored_bytes ?? 0)}
						</div>
						<Progress
							value={Math.min(
								100,
								((data?.stored_bytes ?? 0) / 1024 ** 4) * 100,
							)}
						/>
						<p className="flex items-center gap-2 text-xs text-muted-foreground">
							<Database className="size-3.5" />
							硬件存储容量接口未提供时，本页只展示软件端已知数据。
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
