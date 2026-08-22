import dayjs from "dayjs";
import { Clock, History, Paperclip } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInfraAuditsGetFieldAuditLogs } from "@/api/infra-audits/infra-audits";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { openOrDownloadAuthenticatedFile } from "@/lib/upload";

interface FieldHistoryDialogProps {
	entityType: string;
	entityId: string | null;
	fieldName: string;
	fieldLabel?: string;
	valueType?: "text" | "file";
}

function parseFilePaths(value: string): string[] {
	return String(value)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function FileHistoryItem({
	filePath,
	variant,
}: {
	filePath: string;
	variant: "old" | "new";
}) {
	const fileName = filePath.split("/").pop() ?? filePath;

	return (
		<button
			type="button"
			className={`flex w-full min-w-0 items-start gap-1.5 text-left text-sm ${
				variant === "old"
					? "text-red-600/90 hover:text-red-700 dark:text-red-400"
					: "text-primary hover:underline"
			}`}
			title={fileName}
			onClick={async () => {
				try {
					await openOrDownloadAuthenticatedFile(filePath);
				} catch (err) {
					toast.error((err as Error).message || "无法下载文件");
				}
			}}
		>
			<Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />
			<span className="min-w-0 break-all">{fileName}</span>
		</button>
	);
}

function FileHistoryValue({
	value,
	variant,
}: {
	value: string;
	variant: "old" | "new";
}) {
	return (
		<div className="flex flex-col gap-1.5">
			{parseFilePaths(value).map((filePath) => (
				<FileHistoryItem key={filePath} filePath={filePath} variant={variant} />
			))}
		</div>
	);
}

export function FieldHistoryDialog({
	entityType,
	entityId,
	fieldName,
	fieldLabel = "字段",
	valueType = "text",
}: FieldHistoryDialogProps) {
	const [open, setOpen] = useState(false);

	const { data: res, isLoading } = useInfraAuditsGetFieldAuditLogs(
		entityType,
		entityId ?? "",
		fieldName,
		{
			query: {
				enabled: open && !!entityId,
			},
		},
	);

	if (!entityId) return null;

	const logs = (
		Array.isArray(res?.data) ? res.data : []
	) as import("@/api/schemas").FieldAuditLogOut[];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="ml-1 text-muted-foreground hover:text-primary shrink-0"
					title="查看修改历史"
				>
					<History className="h-3.5 w-3.5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>【{fieldLabel}】修改历史</DialogTitle>
				</DialogHeader>

				<div className="mt-4 space-y-6">
					{isLoading ? (
						<div className="space-y-4">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : logs.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
							<History className="h-8 w-8 mb-2 opacity-20" />
							暂无修改历史记录
						</div>
					) : (
						<div className="relative border-l border-muted pl-4 ml-2 space-y-8">
							{logs.map((log) => (
								<div key={log.id} className="relative">
									{/* Timeline dot */}
									<div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background ring-2 ring-muted" />

									<div className="text-sm font-medium mb-1 flex items-center gap-2">
										<span className="font-semibold text-foreground">
											{log.operator_name || "未知用户"}
										</span>
										<span className="text-muted-foreground text-xs flex items-center">
											<Clock className="mr-1 h-3 w-3" />
											{dayjs(log.created_at).format("YYYY-MM-DD HH:mm")}
										</span>
									</div>

									<div className="mt-2 text-sm bg-muted/30 p-3 rounded-md border text-muted-foreground break-words whitespace-pre-wrap">
										<div className="grid gap-2">
											{log.old_value != null && log.old_value !== "" && (
												<div className="rounded bg-red-50/50 p-2 line-through decoration-red-500/30 dark:bg-red-950/20">
													{valueType === "file" ? (
														<FileHistoryValue
															value={String(log.old_value)}
															variant="old"
														/>
													) : (
														<span className="text-red-500/90">
															{String(log.old_value)}
														</span>
													)}
												</div>
											)}

											{log.new_value !== null &&
											log.new_value !== undefined &&
											log.new_value !== "" ? (
												<div className="rounded bg-emerald-50/50 p-2 dark:bg-emerald-950/20">
													{valueType === "file" ? (
														<FileHistoryValue
															value={String(log.new_value)}
															variant="new"
														/>
													) : (
														<span className="text-emerald-600 dark:text-emerald-400">
															{String(log.new_value)}
														</span>
													)}
												</div>
											) : (
												<div className="italic text-muted-foreground opacity-70 p-2">
													[内容被清空]
												</div>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
