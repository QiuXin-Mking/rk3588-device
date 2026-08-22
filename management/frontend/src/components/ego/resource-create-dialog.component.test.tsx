import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ResourceCreateDialog } from "./resource-create-dialog";

describe("ResourceCreateDialog", () => {
	test("通过添加按钮逐条维护子任务", async () => {
		const onSubmit = vi.fn(async (_values: Record<string, string>) => {});
		await render(
			<ResourceCreateDialog
				open
				onOpenChange={() => {}}
				title="新建采集任务"
				description="创建任务并添加子任务"
				fields={[
					{
						name: "subtask_name",
						label: "子任务",
						placeholder: "请输入子任务名称",
						required: true,
						repeatable: true,
					},
				]}
				isPending={false}
				onSubmit={onSubmit}
			/>,
		);

		await expect
			.element(page.getByRole("textbox", { name: "子任务 1" }))
			.toBeVisible();
		await expect
			.element(page.getByRole("button", { name: "删除子任务 1" }))
			.toBeDisabled();
		await page.getByRole("textbox", { name: "子任务 1" }).fill("开门采集");
		await page.getByRole("button", { name: "添加子任务" }).click();
		await page.getByRole("textbox", { name: "子任务 2" }).fill("关门采集");
		await expect
			.element(page.getByRole("button", { name: "删除子任务 1" }))
			.toBeEnabled();
		await page.getByRole("button", { name: "保存" }).click();

		expect(onSubmit).toHaveBeenCalledOnce();
		const values = onSubmit.mock.calls[0]?.[0];
		expect(JSON.parse(values.subtask_name)).toEqual(["开门采集", "关门采集"]);
	});

	test("可以删除单条子任务输入项", async () => {
		await render(
			<ResourceCreateDialog
				open
				onOpenChange={() => {}}
				title="新建采集任务"
				description="创建任务并添加子任务"
				fields={[{ name: "subtask_name", label: "子任务", repeatable: true }]}
				isPending={false}
				onSubmit={async () => {}}
			/>,
		);

		await page.getByRole("button", { name: "添加子任务" }).click();
		await page.getByRole("textbox", { name: "子任务 2" }).fill("待删除子任务");
		await page.getByRole("button", { name: "删除子任务 2" }).click();
		await expect
			.element(page.getByRole("textbox", { name: "子任务 2" }))
			.not.toBeInTheDocument();
	});
});
