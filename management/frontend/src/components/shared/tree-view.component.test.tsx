import { useState } from "react";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { TreeDataItem } from "./tree-view";
import { TreeView } from "./tree-view";

const treeData: TreeDataItem[] = [
	{
		id: "root",
		name: "库存管理",
		children: [
			{
				id: "manage",
				name: "管理后台",
				children: [
					{
						id: "update",
						name: "编辑库存",
						permissionCode: "inventory_records:update",
					},
				],
			},
		],
	},
];

function TreeViewHarness() {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	return (
		<TreeView
			data={treeData}
			selectedIds={selectedIds}
			onSelectedIdsChange={setSelectedIds}
			getSearchText={(node) =>
				`${node.name} ${String(node.permissionCode ?? "")}`
			}
		/>
	);
}

describe("TreeView", () => {
	test("每一层节点都能独立展开和收起", async () => {
		await render(<TreeViewHarness />);

		await expect.element(page.getByText("管理后台")).not.toBeInTheDocument();
		await page.getByLabelText("展开库存管理").click();
		await expect.element(page.getByText("管理后台")).toBeVisible();
		await expect.element(page.getByText("编辑库存")).not.toBeInTheDocument();

		await page.getByLabelText("展开管理后台").click();
		await expect.element(page.getByText("编辑库存")).toBeVisible();
		await page.getByLabelText("收起管理后台").click();
		await expect.element(page.getByText("编辑库存")).not.toBeInTheDocument();
	});

	test("搜索权限码会显示并展开完整路径", async () => {
		await render(<TreeViewHarness />);

		await page.getByPlaceholder("搜索节点").fill("inventory_records:update");
		await expect.element(page.getByText("库存管理")).toBeVisible();
		await expect.element(page.getByText("管理后台")).toBeVisible();
		await expect.element(page.getByText("编辑库存")).toBeVisible();
	});

	test("支持父级联选、全选和清空", async () => {
		await render(<TreeViewHarness />);

		await page.getByLabelText("选择库存管理").click();
		await expect.element(page.getByText("已选择 3 项")).toBeVisible();
		await page.getByRole("button", { name: "清空" }).click();
		await expect.element(page.getByText("已选择 0 项")).toBeVisible();
		await page.getByRole("button", { name: "全选" }).click();
		await expect.element(page.getByText("已选择 3 项")).toBeVisible();
	});
});
