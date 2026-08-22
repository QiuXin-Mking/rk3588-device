import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { customRender } from "@/test/test-utils";
import { WorkspaceMemberFormDialog } from "./workspace-member-form-dialog";

describe("WorkspaceMemberFormDialog", () => {
	test("新建模式：显示正确标题和表单", async () => {
		await customRender(
			<WorkspaceMemberFormDialog
				open={true}
				onOpenChange={() => {}}
				editingMember={null}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "新建成员" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "创建" }))
			.toBeVisible();

		// 新建时必须有 username 输入框
		await expect
			.element(page.getByPlaceholder("请输入登录用户名"))
			.toBeVisible();
	});

	test("编辑模式：显示正确标题和按钮，而且隐藏登录账号字段", async () => {
		await customRender(
			<WorkspaceMemberFormDialog
				open={true}
				onOpenChange={() => {}}
				editingMember={{
					id: "1",
					account_id: "2",
					workspace_id: "3",
					employee_name: "test_member",
					job_number: "001",
					is_active: true,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				}}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "编辑成员" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "保存" }))
			.toBeVisible();

		// 编辑时不应显示 username 创建相关字段
		await expect
			.element(page.getByPlaceholder("请输入登录用户名"))
			.not.toBeInTheDocument();

		// 应该预填充姓名
		await expect
			.element(page.getByPlaceholder("真实姓名"))
			.toHaveValue("test_member");
	});

	test("新建模式：账号启用复选框可见", async () => {
		await customRender(
			<WorkspaceMemberFormDialog
				open={true}
				onOpenChange={() => {}}
				editingMember={null}
			/>,
		);

		await expect.element(page.getByText("账号启用")).toBeVisible();
	});

	test("dialog 关闭时不渲染内容", async () => {
		await customRender(
			<WorkspaceMemberFormDialog
				open={false}
				onOpenChange={() => {}}
				editingMember={null}
			/>,
		);

		// Dialog 关闭时标题不应可见
		await expect
			.element(page.getByRole("heading", { name: "新建成员" }))
			.not.toBeInTheDocument();
	});
});
