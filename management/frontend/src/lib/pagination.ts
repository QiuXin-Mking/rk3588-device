import type { PaginationState } from "@tanstack/react-table";

/**
 * URL search params (skip/limit) → TanStack Table PaginationState (pageIndex/pageSize)
 */
export function skipLimitToPagination(
	skip: number | undefined,
	limit: number | undefined,
	defaultLimit = 20,
): PaginationState {
	const pageSize = limit ?? defaultLimit;
	return {
		pageIndex: Math.floor((skip ?? 0) / pageSize),
		pageSize,
	};
}

/**
 * TanStack Table PaginationState → URL search params (skip/limit)
 */
export function paginationToSkipLimit(pagination: PaginationState): {
	skip: number;
	limit: number;
} {
	return {
		skip: pagination.pageIndex * pagination.pageSize,
		limit: pagination.pageSize,
	};
}
