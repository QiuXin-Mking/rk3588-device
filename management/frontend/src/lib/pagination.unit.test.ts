import { describe, expect, it } from "vitest";
import { paginationToSkipLimit, skipLimitToPagination } from "./pagination";

describe("skipLimitToPagination", () => {
	it("converts skip=0, limit=20 to first page", () => {
		expect(skipLimitToPagination(0, 20)).toEqual({
			pageIndex: 0,
			pageSize: 20,
		});
	});

	it("converts skip=40, limit=20 to page 2", () => {
		expect(skipLimitToPagination(40, 20)).toEqual({
			pageIndex: 2,
			pageSize: 20,
		});
	});

	it("uses default limit when undefined", () => {
		expect(skipLimitToPagination(undefined, undefined)).toEqual({
			pageIndex: 0,
			pageSize: 20,
		});
	});

	it("handles skip=undefined as 0", () => {
		expect(skipLimitToPagination(undefined, 25)).toEqual({
			pageIndex: 0,
			pageSize: 25,
		});
	});

	it("floors non-aligned skip values", () => {
		// skip=15 with limit=20 → floor(15/20) = page 0
		expect(skipLimitToPagination(15, 20)).toEqual({
			pageIndex: 0,
			pageSize: 20,
		});
	});

	it("respects custom default limit", () => {
		expect(skipLimitToPagination(undefined, undefined, 25)).toEqual({
			pageIndex: 0,
			pageSize: 25,
		});
	});
});

describe("paginationToSkipLimit", () => {
	it("converts first page to skip=0", () => {
		expect(paginationToSkipLimit({ pageIndex: 0, pageSize: 20 })).toEqual({
			skip: 0,
			limit: 20,
		});
	});

	it("converts page 3 with size 20 to skip=60", () => {
		expect(paginationToSkipLimit({ pageIndex: 3, pageSize: 20 })).toEqual({
			skip: 60,
			limit: 20,
		});
	});

	it("roundtrips correctly", () => {
		const original = { skip: 40, limit: 20 };
		const pagination = skipLimitToPagination(original.skip, original.limit);
		const result = paginationToSkipLimit(pagination);
		expect(result).toEqual(original);
	});
});
