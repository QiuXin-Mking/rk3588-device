import { useForm } from "@tanstack/react-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getWorkspaceMembersReadWorkspaceMembersQueryKey } from "@/api/workspace-members/workspace-members";
import { FormWorkspaceMemberPicker } from "./form-workspace-member-picker";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
});

// Pre-fill query client with mock data
queryClient.setQueryData(
	getWorkspaceMembersReadWorkspaceMembersQueryKey({ limit: 50 }),
	{
		status: 200,
		data: {
			data: [
				{
					id: "user-1",
					account_id: "acct-1",
					employee_name: "Mock User 1",
					job_number: "EMP001",
				},
				{
					id: "user-2",
					account_id: "acct-2",
					employee_name: "Mock User 2",
					job_number: "EMP002",
				},
			],
		},
	},
);

function Wrapper() {
	const form = useForm({
		defaultValues: { memberId: "" },
	});
	return (
		<FormWorkspaceMemberPicker
			form={form}
			name="memberId"
			label="Picker"
			placeholder="Select..."
		/>
	);
}

describe("FormWorkspaceMemberPicker", () => {
	test("Should render and open command menu", async () => {
		await render(
			<QueryClientProvider client={queryClient}>
				<Wrapper />
			</QueryClientProvider>,
		);

		const trigger = page.getByRole("combobox");
		await expect.element(trigger).toBeVisible();
		await expect.element(trigger).toHaveTextContent("Select...");

		await trigger.click();

		const inputBox = page.getByPlaceholder("按姓名搜索成员...");
		await expect.element(inputBox).toBeVisible();

		const opt1 = page.getByText("Mock User 1");
		await expect.element(opt1).toBeVisible();

		await opt1.click();
		await expect.element(trigger).toHaveTextContent("Mock User 1");

		const clearButton = page.getByLabelText("清除Picker");
		await expect.element(clearButton).toBeVisible();
		await clearButton.click();
		await expect.element(trigger).toHaveTextContent("Select...");
	});
});
