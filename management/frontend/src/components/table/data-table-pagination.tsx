import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	totalCount?: number;
	pageIndex: number;
	pageSize: number;
	pageCount: number;
	canPreviousPage: boolean;
	canNextPage: boolean;
	selectedRowCount: number;
	onPageIndexChange?: (pageIndex: number) => void;
}

export function DataTablePagination<TData>({
	table,
	totalCount,
	pageIndex,
	pageSize,
	pageCount,
	canPreviousPage,
	canNextPage,
	selectedRowCount,
	onPageIndexChange,
}: DataTablePaginationProps<TData>) {
	const setPageIndex = (nextPageIndex: number) => {
		if (onPageIndexChange) onPageIndexChange(nextPageIndex);
		else table.setPageIndex(nextPageIndex);
	};
	return (
		<div className="flex items-center justify-between px-2 pt-2 flex-wrap gap-4">
			<div className="flex-1 text-sm text-muted-foreground whitespace-nowrap">
				{selectedRowCount > 0 ? `已选择 ${selectedRowCount} 条记录` : ""}
			</div>
			<div className="flex items-center gap-4 sm:gap-6 lg:gap-8 flex-wrap">
				<div className="flex items-center space-x-2">
					<p className="text-sm font-medium whitespace-nowrap">
						共 {totalCount ?? "-"} 条
					</p>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="w-[70px]">
							<SelectValue placeholder={pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 25, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center justify-center text-sm font-medium">
						{pageIndex + 1} / {pageCount}
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="icon"
							className="hidden lg:flex"
							onClick={() => setPageIndex(0)}
							disabled={!canPreviousPage}
						>
							<span className="sr-only">回到首页</span>
							<ChevronsLeft />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
							disabled={!canPreviousPage}
						>
							<span className="sr-only">上一页</span>
							<ChevronLeft />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								setPageIndex(Math.min(pageCount - 1, pageIndex + 1))
							}
							disabled={!canNextPage}
						>
							<span className="sr-only">下一页</span>
							<ChevronRight />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="hidden lg:flex"
							onClick={() => setPageIndex(pageCount - 1)}
							disabled={!canNextPage}
						>
							<span className="sr-only">末页</span>
							<ChevronsRight />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
