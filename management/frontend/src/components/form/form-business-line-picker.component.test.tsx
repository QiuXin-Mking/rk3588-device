import { useForm } from "@tanstack/react-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey } from "@/api/workspace-business-lines/workspace-business-lines";
import { FormBusinessLinePicker } from "./form-business-line-picker";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
});

// Pre-fill query client with mock data
queryClient.setQueryData(
	getWorkspaceBusinessLinesReadBusinessLinesTreeQueryKey(),
	{
		status: 200,
		data: [
			{
				id: "bl-1",
				name: "BL 1",
				status: 1,
				workspace_id: "workspace-1",
				children: [
					{
						id: "bl-1-1",
						name: "BL 1.1",
						status: 1,
						workspace_id: "workspace-1",
						children: [
							{
								id: "bl-1-1-1",
								name: "BL 1.1.1",
								status: 1,
								workspace_id: "workspace-1",
								children: [],
							},
						],
					},
				],
			},
		],
	},
);

function Wrapper({ level }: { level?: number }) {
	const form = useForm({
		defaultValues: { val: "" },
	});
	return (
		<FormBusinessLinePicker
			form={form}
			name="val"
			label="BL"
			level={level}
			placeholder="P_Select"
		/>
	);
}

function DisabledWrapper() {
	const form = useForm({
		defaultValues: { val: "" },
	});
	return (
		<FormBusinessLinePicker
			form={form}
			name="val"
			label="BL"
			disabled
			placeholder="P_Select"
		/>
	);
}

describe("FormBusinessLinePicker", () => {
	test("Should render and open dropdown", async () => {
		await render(
			<QueryClientProvider client={queryClient}>
				<Wrapper />
			</QueryClientProvider>,
		);

		const trigger = page.getByRole("combobox");
		await expect.element(trigger).toBeVisible();

		await trigger.click();

		await expect.element(page.getByText("无")).not.toBeInTheDocument();
		await expect
			.element(page.getByText("BL 1", { exact: true }))
			.not.toBeInTheDocument();

		const option = page.getByText("BL 1.1");
		await expect.element(option).toBeVisible();

		await option.click();
		await expect.element(trigger).toHaveTextContent("BL 1.1");

		const clearButton = page.getByLabelText("清除BL");
		await expect.element(clearButton).toBeVisible();
		await clearButton.click();
		await expect.element(trigger).toHaveTextContent("P_Select");
	});

	test("Should only render tree nodes up to the configured level", async () => {
		await render(
			<QueryClientProvider client={queryClient}>
				<Wrapper level={2} />
			</QueryClientProvider>,
		);

		const trigger = page.getByRole("combobox");
		await trigger.click();

		await page.getByPlaceholder("搜索业务线...").fill("BL 1.1");

		await expect.element(page.getByText("BL 1.1")).toBeVisible();
		await expect.element(page.getByText("BL 1.1.1")).not.toBeInTheDocument();
	});

	test("Should only allow selecting nodes at the configured level", async () => {
		await render(
			<QueryClientProvider client={queryClient}>
				<Wrapper level={3} />
			</QueryClientProvider>,
		);

		const trigger = page.getByRole("combobox");
		await trigger.click();

		const secondLevel = page.getByText("BL 1.1");
		await expect.element(secondLevel).toBeVisible();
		await secondLevel.click();
		await expect.element(page.getByLabelText("清除BL")).not.toBeInTheDocument();
		await expect.element(page.getByText("BL 1.1.1")).toBeVisible();

		await page.getByText("BL 1.1.1").click();
		await expect.element(trigger).toHaveTextContent("BL 1.1.1");
	});

	test("Should respect disabled state", async () => {
		await render(
			<QueryClientProvider client={queryClient}>
				<DisabledWrapper />
			</QueryClientProvider>,
		);

		const trigger = page.getByRole("combobox");
		await expect.element(trigger).toBeDisabled();
	});
});
