import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, test } from "vitest";
import {
	getHeaderMinSize,
	withAutomaticHeaderMinSizes,
} from "./data-table-width";

interface RowData {
	id: number;
	name: string;
}

describe("DataTable 自动表头最小宽度", () => {
	test("按中英文字符和排序控件计算宽度", () => {
		expect(getHeaderMinSize("预估提效值", true)).toBe(96);
		expect(getHeaderMinSize("未使用前的毛利率", true)).toBe(132);
		expect(getHeaderMinSize("BU", true)).toBe(51);
		expect(getHeaderMinSize("序号", false)).toBe(44);
	});

	test("递归处理分组中的叶子列", () => {
		const columns: ColumnDef<RowData>[] = [
			{
				header: "分组",
				columns: [
					{ accessorKey: "id", header: "序号", enableSorting: false },
					{ accessorKey: "name", header: "需求名称" },
				],
			},
		];

		const resolved = withAutomaticHeaderMinSizes(columns, true);
		const children = "columns" in resolved[0] ? resolved[0].columns : [];

		expect(resolved[0].minSize).toBeUndefined();
		expect(children?.[0]?.minSize).toBe(getHeaderMinSize("序号", false));
		expect(children?.[1]?.minSize).toBe(getHeaderMinSize("需求名称", true));
	});

	test("保留业务显式设置和自定义表头", () => {
		const columns: ColumnDef<RowData>[] = [
			{ accessorKey: "id", header: "序号", minSize: 80 },
			{ accessorKey: "name", header: () => "需求名称" },
		];

		const resolved = withAutomaticHeaderMinSizes(columns, true);

		expect(resolved[0].minSize).toBe(80);
		expect(resolved[1].minSize).toBeUndefined();
	});
});
