import {
	type Column,
	type ColumnDef,
	type ColumnSizingState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type PaginationState,
	type Row,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { withAutomaticHeaderMinSizes } from "./data-table-width";

export interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
	rowCount?: number;
	pagination?: PaginationState;
	onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
	sorting?: SortingState;
	onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
	manualSorting?: boolean;
	showSortingControls?: boolean;
	stickyHeaderRows?: number;
	getSubRows?: (originalRow: TData, index: number) => TData[] | undefined;
	getRowCanExpand?: (row: Row<TData>) => boolean;
	renderSubComponent?: (row: Row<TData>) => React.ReactNode;
	columnPinning?: { left?: string[]; right?: string[] };
	getCellRowSpan?: (rowIndex: number, columnId: string) => number | undefined;
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: React.Dispatch<
		React.SetStateAction<RowSelectionState>
	>;
}

// Keep sticky header rows aligned with the base table header height.
const TABLE_HEADER_ROW_HEIGHT = 40;

const getColumnSizingStyles = <TData, TValue>(
	column: Column<TData, TValue>,
	columnSizing: ColumnSizingState,
): React.CSSProperties => {
	const isFluid = (column.columnDef.meta as { fluid?: boolean })?.fluid;
	if (isFluid && columnSizing[column.id] === undefined) return {};

	return {
		width: column.getSize(),
		minWidth: column.getSize(),
		maxWidth: column.getSize(),
	};
};

const getPinningStyles = <TData, TValue>(
	column: Column<TData, TValue>,
	isHeader = false,
): React.CSSProperties => {
	const isPinned = column.getIsPinned();
	if (!isPinned) return {};
	const isLastLeftPinnedColumn =
		isPinned === "left" && column.getIsLastColumn("left");

	return {
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		position: "sticky",
		zIndex: isHeader ? 30 : 20,
		boxShadow: isLastLeftPinnedColumn
			? "inset -1px 0 0 hsl(var(--border)), 2px 0 5px rgba(0,0,0,0.05)"
			: undefined,
	};
};

export function DataTable<TData, TValue>({
	columns,
	data,
	toolbar,
	rowCount,
	pagination,
	onPaginationChange,
	sorting,
	onSortingChange,
	manualSorting = false,
	showSortingControls = false,
	stickyHeaderRows = 0,
	getSubRows,
	getRowCanExpand,
	renderSubComponent,
	columnPinning,
	getCellRowSpan,
	rowSelection,
	onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
	const [internalSorting, setInternalSorting] = React.useState<SortingState>(
		[],
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
	const [internalRowSelection, setInternalRowSelection] =
		React.useState<RowSelectionState>({});
	const currentRowSelection = rowSelection ?? internalRowSelection;
	const handleRowSelectionChange =
		onRowSelectionChange ?? setInternalRowSelection;
	const [expanded, setExpanded] = React.useState<ExpandedState>({});
	const currentSorting = sorting ?? internalSorting;
	const handleSortingChange = onSortingChange ?? setInternalSorting;
	const stickyHeaderRowCount = Math.max(0, stickyHeaderRows);
	const resolvedColumns = withAutomaticHeaderMinSizes(
		columns,
		showSortingControls,
	);

	const table = useReactTable({
		data,
		columns: resolvedColumns,
		rowCount,
		manualPagination: true,
		onPaginationChange,
		manualSorting,
		onSortingChange: handleSortingChange,
		getCoreRowModel: getCoreRowModel(),
		...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
		getSubRows,
		getRowCanExpand,
		getExpandedRowModel:
			getSubRows || renderSubComponent ? getExpandedRowModel() : undefined,
		onExpandedChange: setExpanded,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnSizingChange: setColumnSizing,
		onRowSelectionChange: handleRowSelectionChange,
		columnResizeMode: "onChange",
		state: {
			sorting: currentSorting,
			columnVisibility,
			columnSizing,
			rowSelection: currentRowSelection,
			...(getSubRows || renderSubComponent ? { expanded } : {}),
			...(pagination ? { pagination } : {}),
			...(columnPinning ? { columnPinning } : {}),
		},
	});

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 min-w-0">{toolbar?.(table)}</div>
			<div className="flex-1 min-h-0 overflow-hidden rounded-md border flex flex-col relative w-full">
				<div className="flex-1 overflow-auto bg-background">
					<table
						className="w-full caption-bottom text-xs"
						style={{ minWidth: table.getTotalSize() }}
					>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup, headerGroupIndex) => {
								const isStickyHeaderRow =
									headerGroupIndex < stickyHeaderRowCount;
								const stickyHeaderTop =
									headerGroupIndex * TABLE_HEADER_ROW_HEIGHT;
								const headerRowZIndex = isStickyHeaderRow
									? 40 - headerGroupIndex
									: 30;

								return (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											const usesSortingHeader =
												!header.isPlaceholder &&
												showSortingControls &&
												header.column.getCanSort() &&
												typeof header.column.columnDef.header === "string";
											const pinnedZIndex =
												header.column.getIsPinned() === "left"
													? 2
													: header.column.getIsPinned() === "right"
														? 1
														: 0;
											const stickyHeaderZIndex = headerRowZIndex + pinnedZIndex;

											return (
												<TableHead
													key={header.id}
													colSpan={header.colSpan}
													style={{
														...getPinningStyles(header.column, true),
														...getColumnSizingStyles(
															header.column,
															columnSizing,
														),
														...(isStickyHeaderRow
															? {
																	position: "sticky",
																	top: `${stickyHeaderTop}px`,
																	zIndex: stickyHeaderZIndex,
																}
															: {}),
													}}
													className={cn(
														"group relative",
														header.column.getCanResize() && "overflow-hidden",
														usesSortingHeader && "pr-0.5",
														isStickyHeaderRow &&
															"sticky bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm",
														header.column.getIsPinned() &&
															"bg-muted/90 backdrop-blur font-semibold",
														header.colSpan > 1 &&
															"text-center font-bold border-x bg-muted/10 border-b border-b-border/30",
														(
															header.column.columnDef.meta as {
																className?: string;
															}
														)?.className,
													)}
												>
													<div className="min-w-0 overflow-hidden">
														{usesSortingHeader ? (
															<DataTableColumnHeader
																column={header.column}
																title={header.column.columnDef.header as string}
															/>
														) : header.isPlaceholder ? null : (
															flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)
														)}
													</div>
													{header.column.getCanResize() && (
														<hr
															aria-label={`调整${
																typeof header.column.columnDef.header ===
																"string"
																	? header.column.columnDef.header
																	: header.column.id
															}列宽`}
															aria-orientation="vertical"
															aria-valuemin={
																header.column.columnDef.minSize ?? 20
															}
															aria-valuenow={header.column.getSize()}
															data-resizing={header.column.getIsResizing()}
															title="拖动调整列宽"
															onMouseDown={header.getResizeHandler()}
															onTouchStart={header.getResizeHandler()}
															onKeyDown={(event) => {
																if (
																	event.key !== "ArrowLeft" &&
																	event.key !== "ArrowRight"
																) {
																	return;
																}
																event.preventDefault();
																const direction =
																	event.key === "ArrowRight" ? 1 : -1;
																const minSize =
																	header.column.columnDef.minSize ?? 20;
																const maxSize =
																	header.column.columnDef.maxSize ??
																	Number.MAX_SAFE_INTEGER;
																setColumnSizing((current) => ({
																	...current,
																	[header.column.id]: Math.min(
																		maxSize,
																		Math.max(
																			minSize,
																			header.column.getSize() + direction * 10,
																		),
																	),
																}));
															}}
															tabIndex={0}
															className="absolute inset-y-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none select-none border-0 bg-transparent outline-none after:absolute after:inset-y-2 after:right-0 after:w-px after:bg-border after:content-[''] hover:after:w-0.5 hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary data-[resizing=true]:after:w-0.5 data-[resizing=true]:after:bg-primary"
														/>
													)}
												</TableHead>
											);
										})}
									</TableRow>
								);
							})}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<React.Fragment key={row.id}>
										<TableRow data-state={row.getIsSelected() && "selected"}>
											{row.getVisibleCells().map((cell) => {
												const rowSpan = getCellRowSpan?.(
													row.index,
													cell.column.id,
												);
												if (rowSpan === 0) {
													return null;
												}
												return (
													<TableCell
														key={cell.id}
														rowSpan={
															rowSpan && rowSpan > 1 ? rowSpan : undefined
														}
														style={{
															...getPinningStyles(cell.column, false),
															...getColumnSizingStyles(
																cell.column,
																columnSizing,
															),
														}}
														className={cn(
															"overflow-hidden align-middle",
															cell.column.getIsPinned() &&
																"bg-background/80 backdrop-blur group-hover:bg-muted/80",
															(
																cell.column.columnDef.meta as {
																	className?: string;
																}
															)?.className,
														)}
													>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												);
											})}
										</TableRow>
										{row.getIsExpanded() && renderSubComponent && (
											<TableRow>
												<TableCell colSpan={row.getVisibleCells().length}>
													{renderSubComponent(row)}
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										暂无数据。
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</table>
				</div>
			</div>
			{pagination && (
				<div className="shrink-0">
					<DataTablePagination
						table={table}
						totalCount={rowCount}
						pageIndex={table.getState().pagination.pageIndex}
						pageSize={table.getState().pagination.pageSize}
						pageCount={table.getPageCount()}
						canPreviousPage={table.getCanPreviousPage()}
						canNextPage={table.getCanNextPage()}
						selectedRowCount={table.getFilteredSelectedRowModel().rows.length}
						onPageIndexChange={
							onPaginationChange
								? (pageIndex) =>
										onPaginationChange({
											...table.getState().pagination,
											pageIndex,
										})
								: undefined
						}
					/>
				</div>
			)}
		</div>
	);
}
