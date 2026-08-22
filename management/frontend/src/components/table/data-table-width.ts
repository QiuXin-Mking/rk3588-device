import type { ColumnDef } from "@tanstack/react-table";

const MIN_COLUMN_WIDTH = 32;
const SORTABLE_HEADER_CHROME_WIDTH = 36;
const PLAIN_HEADER_CHROME_WIDTH = 20;

function estimateCharacterWidth(character: string): number {
	if (/\s/u.test(character)) return 4;
	if (/[\u2e80-\u9fff\uff01-\uff60]/u.test(character)) return 12;
	if (/[A-Z0-9]/u.test(character)) return 7.5;
	if (/[a-z]/u.test(character)) return 6.5;
	return 8;
}

export function getHeaderMinSize(label: string, sortable: boolean): number {
	const textWidth = Array.from(label).reduce(
		(total, character) => total + estimateCharacterWidth(character),
		0,
	);
	const chromeWidth = sortable
		? SORTABLE_HEADER_CHROME_WIDTH
		: PLAIN_HEADER_CHROME_WIDTH;

	return Math.max(MIN_COLUMN_WIDTH, Math.ceil(textWidth + chromeWidth));
}

function hasAccessor<TData, TValue>(column: ColumnDef<TData, TValue>): boolean {
	return "accessorKey" in column || "accessorFn" in column;
}

export function withAutomaticHeaderMinSizes<TData, TValue>(
	columns: ColumnDef<TData, TValue>[],
	showSortingControls: boolean,
): ColumnDef<TData, TValue>[] {
	return columns.map((column) => {
		if ("columns" in column && Array.isArray(column.columns)) {
			return {
				...column,
				columns: withAutomaticHeaderMinSizes(
					column.columns,
					showSortingControls,
				),
			};
		}

		if (column.minSize !== undefined || typeof column.header !== "string") {
			return column;
		}

		const sortable =
			showSortingControls &&
			column.enableSorting !== false &&
			hasAccessor(column);

		return {
			...column,
			minSize: getHeaderMinSize(column.header, sortable),
		};
	});
}
