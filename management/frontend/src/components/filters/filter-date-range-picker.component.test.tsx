import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { FilterDateRangePicker } from "./filter-date-range-picker";

describe("FilterDateRangePicker", () => {
	test("does not show clear button when empty", async () => {
		await render(
			<FilterDateRangePicker label="日期范围" onChange={() => {}} />,
		);

		await expect
			.element(page.getByLabelText("清除日期范围"))
			.not.toBeInTheDocument();
	});

	test("renders date-only values", async () => {
		await render(
			<FilterDateRangePicker
				label="日期范围"
				gte="2026-05-12"
				lte="2026-05-20"
				onChange={() => {}}
			/>,
		);

		await expect
			.element(page.getByText("2026-05-12 - 2026-05-20"))
			.toBeVisible();
	});

	test("renders a date-time range in one control", async () => {
		await render(
			<FilterDateRangePicker
				gte="2026-07-16T20:00:00"
				lte="2026-07-17T08:00:00"
				includeTime
				timeZone="Asia/Shanghai"
				onChange={() => {}}
			/>,
		);

		await expect
			.element(page.getByText("2026-07-16 20:00:00 - 2026-07-17 08:00:00"))
			.toBeVisible();
	});
});
