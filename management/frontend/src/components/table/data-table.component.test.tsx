/**
 * DataTable 组件测试（Vitest Browser Mode + Playwright）
 *
 * 这是 CRUD 模块的标准组件测试模板。
 * 新模块只需复制此文件，替换 columns 和 mockData 即可。
 */

import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DataTable } from "@/components/table";

// ── Mock Data ──────────────────────────────────────────────────
interface MockUser {
	id: number;
	username: string;
	is_active: boolean;
}

const mockUsers: MockUser[] = Array.from({ length: 25 }, (_, i) => ({
	id: i + 1,
	username: `user_${String(i + 1).padStart(3, "0")}`,
	is_active: i % 3 !== 0,
}));

const columns: ColumnDef<MockUser>[] = [
	{ accessorKey: "id", header: "ID" },
	{ accessorKey: "username", header: "用户名" },
	{
		accessorKey: "is_active",
		header: "状态",
		cell: ({ row }) => (row.original.is_active ? "启用" : "禁用"),
	},
];

// ── 受控分页包装（模拟 index.tsx 中 URL-driven 的分页逻辑） ──
function PaginatedTable({
	data,
	rowCount,
	initialPage = 0,
	pageSize = 20,
	stickyHeaderRows = 0,
	columnPinning,
	showSortingControls = false,
}: {
	data: MockUser[];
	rowCount: number;
	initialPage?: number;
	pageSize?: number;
	stickyHeaderRows?: number;
	columnPinning?: { left?: string[]; right?: string[] };
	showSortingControls?: boolean;
}) {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: initialPage,
		pageSize,
	});

	// 模拟服务端切片
	const pageData = data.slice(
		pagination.pageIndex * pagination.pageSize,
		(pagination.pageIndex + 1) * pagination.pageSize,
	);

	return (
		<DataTable
			columns={columns}
			data={pageData}
			rowCount={rowCount}
			pagination={pagination}
			onPaginationChange={setPagination}
			stickyHeaderRows={stickyHeaderRows}
			columnPinning={columnPinning}
			showSortingControls={showSortingControls}
		/>
	);
}

// ── Tests ──────────────────────────────────────────────────────

describe("DataTable 渲染与分页", () => {
	test("渲染表头和数据行", async () => {
		await render(
			<PaginatedTable data={mockUsers} rowCount={mockUsers.length} />,
		);

		// 验证表头
		await expect.element(page.getByText("ID")).toBeVisible();
		await expect.element(page.getByText("用户名")).toBeVisible();
		await expect.element(page.getByText("状态")).toBeVisible();

		// 验证第一页数据（10 行）
		await expect.element(page.getByText("user_001")).toBeVisible();
		await expect.element(page.getByText("user_010")).toBeVisible();
	});

	test("支持固定表头行", async () => {
		await render(
			<PaginatedTable
				data={mockUsers}
				rowCount={mockUsers.length}
				stickyHeaderRows={1}
				columnPinning={{ left: ["id"] }}
			/>,
		);

		const header = page.getByText("ID").element().closest("th");
		expect(header).not.toBeNull();
		expect(header?.className).toContain("sticky");
		expect(header?.className).toContain("backdrop-blur");
		expect(header?.style.cssText).toContain("top: 0px");
		expect(header?.style.cssText).toContain("z-index: 42");
	});

	test("支持拖动调整列宽", async () => {
		await render(
			<PaginatedTable
				data={mockUsers}
				rowCount={mockUsers.length}
				showSortingControls
			/>,
		);

		const resizeHandle = page.getByRole("separator", {
			name: "调整ID列宽",
		});
		const initialSize = Number(
			resizeHandle.element().getAttribute("aria-valuenow"),
		);

		await expect.element(resizeHandle).toBeVisible();
		await expect.element(resizeHandle).toHaveAttribute("title", "拖动调整列宽");
		await expect
			.element(resizeHandle)
			.toHaveAttribute("class", expect.stringContaining("w-2"));
		await expect
			.element(resizeHandle)
			.toHaveAttribute("class", expect.stringContaining("after:right-0"));
		const header = resizeHandle.element().closest("th");
		expect(header).not.toBeNull();
		expect(header?.className).toContain("overflow-hidden");
		expect(header?.className).toContain("pr-0.5");
		const sortButton = page.getByRole("button", { name: "ID" });
		await expect
			.element(sortButton)
			.toHaveAttribute(
				"class",
				expect.stringContaining("max-w-[calc(100%+0.5rem)]"),
			);
		expect(sortButton.element().querySelector("span")?.className).toContain(
			"truncate",
		);
		expect(
			resizeHandle.element().getBoundingClientRect().height,
		).toBeGreaterThan(0);
		await userEvent.dragAndDrop(resizeHandle, page.getByText("用户名"));

		await expect
			.element(resizeHandle)
			.not.toHaveAttribute("aria-valuenow", String(initialSize));
	});

	test("窄列的排序表头不会覆盖拖拽区域", async () => {
		const narrowColumns: ColumnDef<MockUser>[] = [
			{
				accessorKey: "username",
				header: "预估提效值",
				size: 80,
			},
			{ accessorKey: "id", header: "相邻列", size: 150 },
		];

		await render(
			<DataTable
				columns={narrowColumns}
				data={mockUsers.slice(0, 1)}
				showSortingControls
			/>,
		);

		const sortButton = page.getByRole("button", { name: "预估提效值" });
		const contentWrapper = sortButton
			.element()
			.closest("th")
			?.querySelector(".min-w-0");

		expect(contentWrapper?.className).toContain("overflow-hidden");
		expect(sortButton.element().className).toContain("overflow-hidden");
		expect(sortButton.element().className).toContain("-ml-2");
		expect(sortButton.element().className).toContain("w-[calc(100%+0.5rem)]");
		expect(sortButton.element().className).toContain(
			"max-w-[calc(100%+0.5rem)]",
		);
		const sortIcon = sortButton.element().querySelector("svg");
		expect(sortIcon?.classList.contains("ml-auto")).toBe(true);
		expect(sortIcon?.getAttribute("data-icon")).toBe("inline-end");
		expect(
			Number(
				page
					.getByRole("separator", { name: "调整预估提效值列宽" })
					.element()
					.getAttribute("aria-valuemin"),
			),
		).toBe(96);
	});

	test("空数据显示 No results", async () => {
		await render(<PaginatedTable data={[]} rowCount={0} />);

		await expect.element(page.getByText("暂无数据。")).toBeVisible();
	});

	test("翻页按钮可用性", async () => {
		await render(
			<PaginatedTable data={mockUsers} rowCount={mockUsers.length} />,
		);

		// 第一页：上一页禁用，下一页可用
		const prevButton = page.getByRole("button", { name: /上一页/i });
		const nextButton = page.getByRole("button", { name: /下一页/i });

		await expect.element(prevButton).toBeDisabled();
		await expect.element(nextButton).toBeEnabled();
	});

	test("点击下一页渲染第二页数据", async () => {
		await render(
			<PaginatedTable data={mockUsers} rowCount={mockUsers.length} />,
		);

		// 点击下一页
		await page.getByRole("button", { name: /下一页/i }).click();

		// 第二页应该显示 user_021 ~ user_025
		await expect.element(page.getByText("user_021")).toBeVisible();
		await expect.element(page.getByText("user_025")).toBeVisible();

		// user_001 不应该在第二页
		await expect.element(page.getByText("user_001")).not.toBeInTheDocument();
	});

	test("最后一页的下一页按钮禁用", async () => {
		await render(
			<PaginatedTable data={mockUsers} rowCount={mockUsers.length} />,
		);

		const lastButton = page.getByRole("button", { name: /末页/i });
		await lastButton.click();

		// 到最后一页后，下一页和末页应禁用
		await expect
			.element(page.getByRole("button", { name: /下一页/i }))
			.toBeDisabled();
	});

	test("自定义每页条数", async () => {
		await render(
			<PaginatedTable
				data={mockUsers}
				rowCount={mockUsers.length}
				pageSize={5}
			/>,
		);

		// 5 条一页，user_005 应可见，user_006 不应可见
		await expect.element(page.getByText("user_005")).toBeVisible();
		await expect.element(page.getByText("user_006")).not.toBeInTheDocument();
	});
});
