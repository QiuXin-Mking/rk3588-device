import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileRecordsView } from "./MobileRecordsView";

const recording = {
	name: "recording_demo",
	size: 1024,
	mtime: 1,
	hasColor: true,
	hasDepth: true,
	hasGlove: false,
	hasImu: true,
	hasStereo: false,
	hasAudio: false,
	decoded: false,
	decoding: false,
	needsDecode: false,
	transferring: false,
	transferred: false,
	transferPct: 0,
};

describe("MobileRecordsView", () => {
	it("supports record selection and opening details", () => {
		const onToggle = vi.fn();
		const onOpen = vi.fn();
		const onSelectAll = vi.fn();
		const onBatchUpload = vi.fn();
		const onRetry = vi.fn();
		render(
			<MobileRecordsView
				files={Array.from({ length: 101 }, (_, index) => ({
					...recording,
					name: `recording_demo_${index}`,
				}))}
				checked={["recording_demo_0"]}
				uploading={false}
				onToggle={onToggle}
				onSelectAll={onSelectAll}
				onOpen={onOpen}
				onBatchUpload={onBatchUpload}
				onRetry={onRetry}
			/>,
		);
		fireEvent.click(
			screen.getByRole("checkbox", { name: "选择 recording_demo_0" }),
		);
		fireEvent.click(screen.getAllByRole("button", { name: /demo/ })[0]);
		fireEvent.click(screen.getByRole("button", { name: /已选 1/ }));
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		fireEvent.click(screen.getByRole("button", { name: "上传" }));
		fireEvent.click(screen.getByRole("button", { name: /加载更多/ }));
		expect(onToggle).toHaveBeenCalled();
		expect(onOpen).toHaveBeenCalled();
		expect(screen.queryByPlaceholderText(/搜索/)).not.toBeInTheDocument();
		expect(screen.queryByText("记录总数")).not.toBeInTheDocument();
		expect(screen.queryByText("数据容量")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByText("今日")).not.toBeInTheDocument();
		expect(screen.getByTestId("mobile-records-scroll")).toHaveClass(
			"overflow-x-hidden",
		);
		expect(onSelectAll).toHaveBeenCalledOnce();
		expect(onRetry).toHaveBeenCalledOnce();
		expect(onBatchUpload).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("columnheader", { name: "数据 ID" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "任务/子任务" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "验收" }),
		).toBeInTheDocument();
	});
});
