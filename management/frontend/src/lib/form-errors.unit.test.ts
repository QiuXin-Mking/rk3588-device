import { describe, expect, it } from "vitest";
import { extractErrors } from "../lib/form-errors";

describe("extractErrors", () => {
	it("extracts string error messages", () => {
		expect(extractErrors(["用户名必填", "密码太短"])).toEqual([
			{ message: "用户名必填" },
			{ message: "密码太短" },
		]);
	});

	it("extracts object error messages", () => {
		expect(extractErrors([{ message: "无效邮箱" }])).toEqual([
			{ message: "无效邮箱" },
		]);
	});

	it("filters out falsy values", () => {
		expect(
			extractErrors([null, undefined, false, "", "有效错误"] as unknown[]),
		).toEqual([{ message: "有效错误" }]);
	});

	it("handles mixed string and object errors", () => {
		expect(extractErrors(["字符串错误", { message: "对象错误" }])).toEqual([
			{ message: "字符串错误" },
			{ message: "对象错误" },
		]);
	});

	it("returns empty array for empty input", () => {
		expect(extractErrors([])).toEqual([]);
	});

	it("handles objects without message property", () => {
		expect(extractErrors([{ code: 123 }])).toEqual([{ message: undefined }]);
	});
});
