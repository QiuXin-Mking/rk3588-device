import { useState } from "react";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { FilterMultiSelect } from "./filter-multi-select";

function Wrapper({ initialValue = [] }: { initialValue?: string[] }) {
	const [value, setValue] = useState(initialValue);
	return (
		<FilterMultiSelect
			label="环节状态"
			value={value}
			onChange={setValue}
			options={["关联", "提需", "调研"]}
		/>
	);
}

describe("FilterMultiSelect", () => {
	test("keeps menu open after selecting an item", async () => {
		await render(<Wrapper />);

		const trigger = page.getByRole("combobox", { name: "环节状态筛选" });
		await trigger.click();

		const item = page.getByText("关联");
		await expect.element(item).toBeVisible();
		await item.click();

		await expect.element(page.getByText("关联")).toBeVisible();
	});

	test("clears selected values with one click", async () => {
		await render(<Wrapper initialValue={["关联"]} />);

		const trigger = page.getByRole("combobox", { name: "环节状态筛选" });
		await expect.element(trigger).toHaveTextContent("1 已选");

		await page.getByLabelText("清除环节状态").click();

		await expect.element(trigger).not.toHaveTextContent("已选");
		await expect
			.element(page.getByLabelText("清除环节状态"))
			.not.toBeInTheDocument();
	});

	test("filters options by search text", async () => {
		await render(<Wrapper />);

		await page.getByRole("combobox", { name: "环节状态筛选" }).click();
		await page.getByPlaceholder("搜索环节状态").fill("调研");

		await expect.element(page.getByText("调研")).toBeVisible();
		await expect.element(page.getByText("关联")).not.toBeInTheDocument();
		await expect.element(page.getByText("提需")).not.toBeInTheDocument();
	});
});
