import type { SortingState } from "@tanstack/react-table";

export type SortFieldOverrides = Record<string, string>;

function getReverseSortMap(
	sortFieldOverrides: SortFieldOverrides,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(sortFieldOverrides).map(([tableKey, sortKey]) => [
			sortKey,
			tableKey,
		]),
	);
}

export function searchToSortingState(
	sortBy: string | null | undefined,
	sortOrder: string | null | undefined,
	sortFieldOverrides: SortFieldOverrides = {},
): SortingState {
	if (!sortBy) return [];
	const reverseSortMap = getReverseSortMap(sortFieldOverrides);
	const tableSortKey = reverseSortMap[sortBy] ?? sortBy;
	return [
		{
			id: tableSortKey,
			desc: sortOrder !== "asc",
		},
	];
}

export function sortingStateToSearch(
	sorting: SortingState,
	sortFieldOverrides: SortFieldOverrides = {},
): { sort_by?: string; sort_order?: "asc" | "desc" } {
	const first = sorting[0];
	if (!first) return {};
	return {
		sort_by: sortFieldOverrides[first.id] ?? first.id,
		sort_order: first.desc ? "desc" : "asc",
	};
}
