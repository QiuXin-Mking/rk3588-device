import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ResourceTablePage } from "./resource-table-page";

describe("ResourceTablePage", () => {
	test("渲染大数据总数、状态和创建入口", async () => {
		const onPaginationChange = vi.fn();
		const onCreate = vi.fn();
		const onQueryChange = vi.fn();
		const onEdit = vi.fn();
		const onDelete = vi.fn();
		const item = { id: "1", name: "REC-0001", status: "COMPLETED" };
		await render(
			<ResourceTablePage
				title="采集记录"
				description="服务端分页"
				data={[item]}
				rowCount={50000}
				columns={[
					{ key: "name", label: "记录编号" },
					{ key: "status", label: "状态" },
				]}
				pagination={{ pageIndex: 0, pageSize: 20 }}
				onPaginationChange={onPaginationChange}
				query="压力检索"
				onQueryChange={onQueryChange}
				isFetching={false}
				onCreate={onCreate}
				onEdit={onEdit}
				onDelete={onDelete}
			/>,
		);
		await expect.element(page.getByText("采集记录")).toBeVisible();
		await expect.element(page.getByText("共 50,000 条")).toBeVisible();
		await expect.element(page.getByText("REC-0001")).toBeVisible();
		await expect.element(page.getByText("COMPLETED")).toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "新增" }))
			.toBeVisible();
		await page.getByRole("button", { name: "新增" }).click();
		expect(onCreate).toHaveBeenCalledOnce();
		await page.getByPlaceholder("搜索当前模块...").fill("新的压力检索词");
		expect(onQueryChange).toHaveBeenCalledWith("新的压力检索词");
		await page.getByRole("button", { name: "重置" }).click();
		expect(onQueryChange).toHaveBeenCalledWith("");
		await page.getByRole("button", { name: "编辑" }).click();
		await page.getByRole("button", { name: "删除" }).click();
		expect(onEdit).toHaveBeenCalledWith(item);
		expect(onDelete).toHaveBeenCalledWith(item);
		await page.getByRole("button", { name: "下一页" }).click();
		expect(onPaginationChange).toHaveBeenCalledWith({
			pageIndex: 1,
			pageSize: 20,
		});
		await expect.element(page.getByRole("button", { name: "上一页" })).toBeDisabled();
	});
});
