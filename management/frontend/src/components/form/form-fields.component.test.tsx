import { useForm } from "@tanstack/react-form";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
	FormCheckbox,
	FormDatePicker,
	FormInput,
	FormRadioGroup,
	FormSelect,
	FormTextarea,
} from ".";

function FormWrapper() {
	const form = useForm({
		defaultValues: {
			textVal: "",
			selectVal: "",
			checkVal: false,
			dateVal: "",
			radioVal: "",
			areaVal: "",
		},
		onSubmit: async () => {},
	});

	return (
		<div className="p-4 space-y-4">
			<FormInput form={form} name="textVal" label="Input Test" />
			<FormSelect
				form={form}
				name="selectVal"
				label="Select Test"
				options={[
					{ label: "Option 1", value: "opt1" },
					{ label: "Option 2", value: "opt2" },
				]}
				placeholder="请选择"
			/>
			<FormCheckbox form={form} name="checkVal" label="Checkbox Test" />
			<FormDatePicker
				form={form}
				name="dateVal"
				label="Date Test"
				placeholder="YMD"
			/>
			<FormRadioGroup
				form={form}
				name="radioVal"
				label="Radio Test"
				options={[
					{ label: "Rad 1", value: "r1" },
					{ label: "Rad 2", value: "r2" },
				]}
			/>
			<FormTextarea
				form={form}
				name="areaVal"
				label="Area Test"
				placeholder="Area"
			/>
		</div>
	);
}

describe("FormFields 渲染与交互", () => {
	test("渲染基础输入框并打字", async () => {
		await render(<FormWrapper />);

		const input = page.getByRole("textbox", { name: "Input Test" });
		await expect.element(input).toBeVisible();

		await input.fill("Hello");
		await expect.element(input).toHaveValue("Hello");

		const clearButton = page.getByLabelText("清除Input Test");
		await expect.element(clearButton).toBeVisible();
		await clearButton.click();
		await expect.element(input).toHaveValue("");
	});

	test("渲染复选框并点击", async () => {
		await render(<FormWrapper />);

		const checkbox = page.getByRole("checkbox", { name: "Checkbox Test" });
		await expect.element(checkbox).toBeVisible();

		await checkbox.click();
		await expect.element(checkbox).toBeChecked();
	});

	test("渲染下拉单选并选择", async () => {
		await render(<FormWrapper />);

		const selectTrigger = page.getByRole("combobox", { name: "Select Test" });
		await expect.element(selectTrigger).toBeVisible();

		// 展开下拉菜单
		await selectTrigger.click();

		// 选择 Option 2
		const option2 = page.getByRole("option", { name: "Option 2" });
		await expect.element(option2).toBeVisible();
		await option2.click();

		// 校验值是否更新在触发器上
		await expect.element(selectTrigger).toHaveTextContent("Option 2");
	});

	test("渲染日期选择器", async () => {
		await render(<FormWrapper />);

		const dateBtn = page.getByText("YMD");
		await expect.element(dateBtn).toBeVisible();

		// 点击打开日历弹窗
		await dateBtn.click();

		const calendarApp = page.getByRole("grid"); // the calendar table
		await expect.element(calendarApp).toBeVisible();
	});

	test("渲染单选组", async () => {
		await render(<FormWrapper />);

		const radio1 = page.getByRole("radio", { name: "Rad 1" });
		await expect.element(radio1).toBeVisible();

		await radio1.click();
		await expect.element(radio1).toBeChecked();
	});

	test("渲染多行输入", async () => {
		await render(<FormWrapper />);

		const area = page.getByRole("textbox", { name: "Area Test" });
		await expect.element(area).toBeVisible();

		await area.fill("Line 1\\nLine 2");
		await expect.element(area).toHaveValue("Line 1\\nLine 2");
	});
});
