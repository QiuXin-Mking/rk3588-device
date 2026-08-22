import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { customRender } from "@/test/test-utils";
import { WorkspaceFormDialog } from "./workspace-form-dialog";

describe("WorkspaceFormDialog", () => {
	test("新建模式：显示正确标题和按钮", async () => {
		await customRender(
			<WorkspaceFormDialog
				open={true}
				onOpenChange={() => {}}
				editingWorkspace={null}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "新建工作区" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "创建" }))
			.toBeVisible();
	});

	test("编辑模式：显示正确标题和按钮", async () => {
		await customRender(
			<WorkspaceFormDialog
				open={true}
				onOpenChange={() => {}}
				editingWorkspace={{
					id: "1",
					name: "Test Workspace",
					description: "A description",
					is_active: true,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				}}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "编辑工作区" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "保存" }))
			.toBeVisible();
	});

	test("编辑模式：表单预填充工作区数据", async () => {
		await customRender(
			<WorkspaceFormDialog
				open={true}
				onOpenChange={() => {}}
				editingWorkspace={{
					id: "1",
					name: "Existing Workspace",
					description: "Some desc",
					is_active: false,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				}}
			/>,
		);

		await expect
			.element(page.getByPlaceholder("请输入工作区名称"))
			.toHaveValue("Existing Workspace");
		await expect
			.element(page.getByPlaceholder("请输入描述"))
			.toHaveValue("Some desc");
	});

	test("dialog 关闭时不渲染内容", async () => {
		await customRender(
			<WorkspaceFormDialog
				open={false}
				onOpenChange={() => {}}
				editingWorkspace={null}
			/>,
		);

		await expect
			.element(page.getByRole("heading", { name: "新建工作区" }))
			.not.toBeInTheDocument();
	});
});
