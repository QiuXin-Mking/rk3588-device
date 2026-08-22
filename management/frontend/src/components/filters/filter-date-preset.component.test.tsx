import dayjs from "dayjs";
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { FilterDatePreset } from "./filter-date-preset";

function Wrapper({
	gte,
	lte,
	onChange,
}: {
	gte?: string;
	lte?: string;
	onChange?: (gte: string | undefined, lte: string | undefined) => void;
}) {
	return (
		<FilterDatePreset gte={gte} lte={lte} onChange={onChange ?? (() => {})} />
	);
}

describe("FilterDatePreset", () => {
	test("matches recent period from ISO dates", async () => {
		const gte = dayjs().subtract(7, "day").startOf("day").format("YYYY-MM-DD");

		await render(<Wrapper gte={gte} />);

		await expect.element(page.getByRole("combobox")).toHaveTextContent("近7天");
	});

	test("emits date-only values", async () => {
		const onChange = vi.fn();

		await render(<Wrapper onChange={onChange} />);

		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "近7天" }).click();

		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls.at(-1)).toEqual([
			dayjs().subtract(7, "day").startOf("day").format("YYYY-MM-DD"),
			undefined,
		]);
	});

	test("shows all time when empty", async () => {
		await render(<Wrapper />);

		await expect
			.element(page.getByRole("combobox"))
			.toHaveTextContent("全部时间");
	});
});
