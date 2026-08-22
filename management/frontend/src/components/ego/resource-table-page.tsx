import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ResourceColumn<TData extends object> {
	key: keyof TData & string;
	label: string;
	size?: number;
	render?: (item: TData) => ReactNode;
}

interface ResourceTablePageProps<TData extends object> {
	title: string;
	description: string;
	data: TData[];
	rowCount: number;
	columns: ResourceColumn<TData>[];
	pagination: PaginationState;
	onPaginationChange: (next: PaginationState) => void;
	query: string;
	onQueryChange: (value: string) => void;
	isFetching: boolean;
	onCreate?: () => void;
	createLabel?: string;
	extraToolbar?: ReactNode;
	onEdit?: (item: TData) => void;
	onDelete?: (item: TData) => void;
	deletingId?: string;
}

function statusBadge(status: unknown) {
	const value = typeof status === "string" ? status : "-";
	const success = [
		"ACTIVE",
		"ONLINE",
		"CONNECTED",
		"PUBLISHED",
		"COMPLETED",
		"PASS",
	];
	const warning = ["PENDING", "CLAIMED", "OPEN", "LOCAL", "UPLOADING"];
	return (
		<Badge
			variant={
				success.includes(value)
					? "default"
					: warning.includes(value)
						? "secondary"
						: "outline"
			}
		>
			{value}
		</Badge>
	);
}

export function ResourceTablePage<TData extends object>({
	title,
	description,
	data,
	rowCount,
	columns,
	pagination,
	onPaginationChange,
	query,
	onQueryChange,
	isFetching,
	onCreate,
	createLabel = "新增",
	extraToolbar,
	onEdit,
	onDelete,
	deletingId,
}: ResourceTablePageProps<TData>) {
	const tableColumns: ColumnDef<TData>[] = columns.map((column) => ({
		id: column.key,
		accessorKey: column.key,
		header: column.label,
		size: column.size ?? 140,
		cell: ({ row }) => {
			if (column.render) return column.render(row.original);
			const value = row.original[column.key];
			if (column.key === "status" || column.key.endsWith("_status")) {
				return statusBadge(value);
			}
			if (typeof value === "boolean") return value ? "是" : "否";
			const text = value == null || value === "" ? "-" : String(value);
			return (
				<span className="block max-w-full truncate" title={text}>
					{text}
				</span>
			);
		},
	}));
	if (onEdit || onDelete) {
		tableColumns.push({
			id: "actions",
			header: "操作",
			size: 120,
			cell: ({ row }) => {
				const item = row.original;
				const id = "id" in item ? String(item.id) : "";
				return (
					<div className="flex items-center gap-1">
						{onEdit && (
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="编辑"
								onClick={() => onEdit(item)}
							>
								<Pencil />
							</Button>
						)}
						{onDelete && (
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="删除"
								disabled={deletingId === id}
								onClick={() => onDelete(item)}
							>
								{deletingId === id ? (
									<Loader2 className="animate-spin" />
								) : (
									<Trash2 className="text-destructive" />
								)}
							</Button>
						)}
					</div>
				);
			},
		});
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-4">
			<div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline">共 {rowCount.toLocaleString()} 条</Badge>
					{onCreate && (
						<Button onClick={onCreate}>
							<Plus />
							{createLabel}
						</Button>
					)}
				</div>
			</div>
			<div className="min-h-0 flex-1">
				<DataTable
					columns={tableColumns}
					data={data}
					rowCount={rowCount}
					pagination={pagination}
					onPaginationChange={(updater) => {
						const next =
							typeof updater === "function" ? updater(pagination) : updater;
						onPaginationChange(next);
					}}
					stickyHeaderRows={1}
					toolbar={() => (
						<div className="mb-3 flex flex-wrap items-center gap-2">
							<div className="relative w-full sm:w-72">
								<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={query}
									onChange={(event) => onQueryChange(event.target.value)}
									placeholder="搜索当前模块..."
									className="pl-9"
								/>
							</div>
							{query && (
								<Button variant="ghost" onClick={() => onQueryChange("")}>
									<RotateCcw />
									重置
								</Button>
							)}
							{extraToolbar}
							{isFetching && (
								<Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
							)}
						</div>
					)}
				/>
			</div>
		</div>
	);
}
