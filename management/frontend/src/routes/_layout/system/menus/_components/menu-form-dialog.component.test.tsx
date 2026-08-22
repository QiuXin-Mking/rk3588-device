import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { customRender } from "@/test/test-utils";
import { MenuFormDialog } from "./menu-form-dialog";

describe("MenuFormDialog", () => {
	test("新建模式：显示正确标题和按钮", async () => {
		await customRender(
			<MenuFormDialog open={true} onOpenChange={() => {}} editingMenu={null} />,
		);

		await expect
			.element(page.getByRole("heading", { name: "新建菜单" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "创建" }))
			.toBeVisible();
	});

	test("编辑模式：显示正确标题和按钮", async () => {
		await customRender(
			<MenuFormDialog
				open={true}
				onOpenChange={() => {}}
				editingMenu={{
					id: "1",
					parent_id: null,
					name: "test_menu",
					type: 0,
					path: null,
					icon: null,
					permission_code: null,
					sort: 1,
					is_active: true,
					is_visible: true,
					is_cache: true,
					created_at: "2026-01-01T00:00:00Z",
					children: [],
				}}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "编辑菜单" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "保存" }))
			.toBeVisible();
	});

	test("新建模式：显示主要表单字段", async () => {
		await customRender(
			<MenuFormDialog open={true} onOpenChange={() => {}} editingMenu={null} />,
		);

		// 表单字段可见
		await expect.element(page.getByPlaceholder("如: 用户管理")).toBeVisible();
		await expect.element(page.getByText("父菜单")).toBeVisible();
		await expect.element(page.getByText("类型")).toBeVisible();

		// 复选框可见
		await expect.element(page.getByText("启用")).toBeVisible();
		await expect.element(page.getByText("显示")).toBeVisible();
	});

	test("dialog 关闭时不渲染内容", async () => {
		await customRender(
			<MenuFormDialog
				open={false}
				onOpenChange={() => {}}
				editingMenu={null}
			/>,
		);

		// Dialog 关闭时标题不应可见
		await expect
			.element(page.getByRole("heading", { name: "新建菜单" }))
			.not.toBeInTheDocument();
	});
});
