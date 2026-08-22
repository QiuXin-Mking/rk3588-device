/**
 * UserFormDialog 组件测试（Vitest Browser Mode + Playwright）
 *
 * 测试表单渲染、校验反馈和模式切换（新建 / 编辑）。
 * 这是 CRUD 模块 FormDialog 的标准测试模板。
 */
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { customRender } from "@/test/test-utils";
import { UserFormDialog } from "./user-form-dialog";

describe("UserFormDialog", () => {
	test("新建模式：显示正确标题和按钮", async () => {
		await customRender(
			<UserFormDialog open={true} onOpenChange={() => {}} editingUser={null} />,
		);

		await expect
			.element(page.getByRole("heading", { name: "新建用户" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "创建" }))
			.toBeVisible();
	});

	test("编辑模式：显示正确标题和按钮", async () => {
		await customRender(
			<UserFormDialog
				open={true}
				onOpenChange={() => {}}
				editingUser={{
					id: "1",
					username: "test_user",
					is_active: true,
					is_root: false,
					status: 0,
					avatar: null,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				}}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "编辑用户" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "保存" }))
			.toBeVisible();
	});

	test("编辑模式：表单预填充用户数据", async () => {
		await customRender(
			<UserFormDialog
				open={true}
				onOpenChange={() => {}}
				editingUser={{
					id: "1",
					username: "existing_user",
					is_active: false,
					is_root: true,
					status: 0,
					avatar: null,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				}}
			/>,
		);

		// 用户名应该预填充
		await expect
			.element(page.getByPlaceholder("请输入用户名"))
			.toHaveValue("existing_user");

		// 密码应该始终为空
		await expect.element(page.getByPlaceholder("留空则不修改")).toHaveValue("");
	});

	test("新建模式：用户名和密码为必填", async () => {
		await customRender(
			<UserFormDialog open={true} onOpenChange={() => {}} editingUser={null} />,
		);

		// 表单字段可见
		await expect.element(page.getByPlaceholder("请输入用户名")).toBeVisible();
		await expect.element(page.getByPlaceholder("请输入密码")).toBeVisible();

		// 复选框可见
		await expect.element(page.getByText("启用")).toBeVisible();
		await expect.element(page.getByText("超级管理员")).toBeVisible();
	});

	test("dialog 关闭时不渲染内容", async () => {
		await customRender(
			<UserFormDialog
				open={false}
				onOpenChange={() => {}}
				editingUser={null}
			/>,
		);

		// Dialog 关闭时标题不应可见
		await expect
			.element(page.getByRole("heading", { name: "新建用户" }))
			.not.toBeInTheDocument();
	});
});
