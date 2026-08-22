import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey } from "@/api/workspace-business-lines/workspace-business-lines";
import { FilterBusinessLineMultiPicker } from "./filter-business-line-multi-picker";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
});

queryClient.setQueryData(
	getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey(),
	{
		status: 200,
		data: [
			{
				id: "root",
				name: "文德数慧",
				status: 1,
				workspace_id: "workspace-1",
				children: [
					{
						id: "capability",
						name: "数智科技事业部",
						status: 1,
						workspace_id: "workspace-1",
						children: [],
					},
				],
			},
		],
	},
);

function Wrapper() {
	const [value, setValue] = useState("");

	return (
		<QueryClientProvider client={queryClient}>
			<FilterBusinessLineMultiPicker
				filterKey="capabilityLine"
				filters={{ capabilityLine: value }}
				onFilterChange={(_, nextValue) => setValue(nextValue)}
				placeholder="全选能力线..."
				level={2}
			/>
			<output data-testid="selected-value">{value}</output>
		</QueryClientProvider>
	);
}

describe("FilterBusinessLineMultiPicker", () => {
	test("uses non-selectable parent rows to expand the target level", async () => {
		await render(<Wrapper />);

		const trigger = page.getByRole("combobox");
		await trigger.click();

		await expect
			.element(page.getByTestId("business-line-selection-root"))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByText("数智科技事业部"))
			.not.toBeInTheDocument();

		await page.getByText("文德数慧").click();

		await expect.element(page.getByText("数智科技事业部")).toBeVisible();
		await expect
			.element(page.getByTestId("business-line-selection-capability"))
			.toBeVisible();

		await page.getByText("数智科技事业部").click();
		await expect
			.element(page.getByTestId("selected-value"))
			.toHaveTextContent("capability");
	});
});
