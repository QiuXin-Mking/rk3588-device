import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	FALLBACK_RECORD,
	FALLBACK_STATUS,
	type ScreenCommonProps,
} from "../../app/model";
import { api, type Recording } from "../../services/deviceApi";
import {
	type ManagementRecord,
	managementApi,
} from "../../services/managementApi";
import { RecordsScreen } from "./RecordsScreen";

const recording = (
	name: string,
	size: number,
	mtime = Date.now(),
): Recording => ({
	name,
	size,
	mtime,
	hasColor: false,
	hasDepth: false,
	hasGlove: false,
	hasImu: false,
	hasStereo: false,
	hasAudio: false,
	decoded: false,
	decoding: false,
	needsDecode: false,
	transferring: false,
	transferred: false,
	transferPct: 0,
});

const props = (files: Recording[]): ScreenCommonProps => ({
	status: FALLBACK_STATUS,
	record: FALLBACK_RECORD,
	files: {
		files,
		root: "/records",
		externalDisk: {
			present: true,
			mount: "/mnt/usb",
			dev: "/dev/sda1",
			free: 1024 ** 4,
			total: 2 * 1024 ** 4,
		},
	},
	online: false,
	go: vi.fn(),
	notify: vi.fn(),
	refreshStatus: vi.fn(),
	refreshFiles: vi.fn(),
});

describe("RecordsScreen", () => {
	beforeEach(() => localStorage.clear());
	it("does not add summary statistics or a search field outside the prototype", () => {
		render(<RecordsScreen {...props([recording("one", 1024 ** 2)])} />);

		expect(screen.queryByText("记录数量")).not.toBeInTheDocument();
		expect(screen.queryByText("数据总量")).not.toBeInTheDocument();
		expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
		expect(screen.queryByPlaceholderText(/搜索/)).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByText("今日")).not.toBeInTheDocument();
		expect(screen.getByTestId("device-records-scroll")).toHaveClass(
			"overflow-auto",
		);
	});

	it("confirms and executes deletion from record details", async () => {
		const deleteFile = vi
			.spyOn(api, "deleteFile")
			.mockResolvedValue({ ok: true });
		vi.spyOn(window, "confirm").mockReturnValue(true);
		const screenProps = props([recording("session_delete", 1024)]);
		render(<RecordsScreen {...screenProps} />);

		fireEvent.click(screen.getByRole("button", { name: /session_delete/ }));
		fireEvent.click(screen.getByRole("button", { name: "删除" }));

		await waitFor(() =>
			expect(deleteFile).toHaveBeenCalledWith("session_delete"),
		);
		expect(screenProps.refreshFiles).toHaveBeenCalled();
		expect(
			screen.queryByRole("dialog", { name: "记录详情" }),
		).not.toBeInTheDocument();
		vi.restoreAllMocks();
	});

	it("renders data ID, task, and acceptance state from management metadata", async () => {
		localStorage.setItem(
			"ego-management-session",
			JSON.stringify({
				access_token: "test",
				workspace_id: "workspace",
				user: { id: "operator" },
			}),
		);
		const metadata: ManagementRecord = {
			id: "record-1",
			record_no: "REC-REAL",
			task_id: "task-1",
			task_name: "真实任务",
			device_serial: "RK3588-REAL",
			operator_username: "operator",
			file_name: "local-file",
			file_size_bytes: 1024,
			duration_seconds: 10,
			status: "COMPLETED",
			qa_status: "PASS",
			upload_status: "UPLOADED",
			captured_at: new Date().toISOString(),
		};
		vi.spyOn(managementApi, "records").mockResolvedValue([metadata]);
		render(<RecordsScreen {...props([recording("local-file", 1024)])} />);
		expect(await screen.findByText("REC-REAL")).toBeInTheDocument();
		expect(screen.getByText("真实任务")).toBeInTheDocument();
		expect(screen.getByText("已通过")).toBeInTheDocument();
	});

	it("shows backend history when the hardware has no local files", async () => {
		localStorage.setItem(
			"ego-management-session",
			JSON.stringify({
				access_token: "test",
				workspace_id: "workspace",
				user: { id: "operator" },
			}),
		);
		const metadata: ManagementRecord = {
			id: "record-2",
			record_no: "REC-HISTORY",
			task_id: "task-2",
			task_name: "后台历史任务",
			device_serial: "RK3588-HISTORY",
			operator_username: "operator",
			file_name: "capture-history.mp4",
			file_size_bytes: 2048,
			duration_seconds: 20,
			status: "COMPLETED",
			qa_status: "PENDING",
			upload_status: "LOCAL",
			captured_at: new Date().toISOString(),
		};
		vi.spyOn(managementApi, "records").mockResolvedValue([metadata]);

		render(<RecordsScreen {...props([])} />);

		fireEvent.click(
			await screen.findByRole("button", { name: /capture-history.mp4/ }),
		);
		expect(await screen.findByText("REC-HISTORY")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "删除" }),
		).not.toBeInTheDocument();
	});

	it("uses the desktop batch actions", async () => {
		localStorage.setItem(
			"ego-management-session",
			JSON.stringify({
				access_token: "test",
				workspace_id: "workspace",
				user: { id: "operator" },
			}),
		);
		vi.spyOn(managementApi, "records").mockResolvedValue([]);
		const report = vi
			.spyOn(managementApi, "reportRecording")
			.mockResolvedValue({} as ManagementRecord);
		const screenProps = props([
			recording("stress_batch_record", 1024, Date.now()),
		]);
		render(<RecordsScreen {...screenProps} />);

		fireEvent.click(
			screen.getByRole("checkbox", { name: "选择 stress_batch_record" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		expect(screenProps.notify).toHaveBeenCalledWith("失败记录已加入重试队列");
		fireEvent.click(screen.getByRole("button", { name: "取消选择" }));
		fireEvent.click(
			screen.getByRole("checkbox", { name: "选择 stress_batch_record" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "一键上传" }));
		await waitFor(() => expect(report).toHaveBeenCalledOnce());
		expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
	});

	it("uses decode, transfer, and close detail actions with device APIs mocked", async () => {
		const decode = vi.spyOn(api, "decodeFile").mockResolvedValue({ ok: true });
		const transfer = vi
			.spyOn(api, "transferFile")
			.mockResolvedValue({ ok: true });
		const item = {
			...recording("stress_detail_record", 4096),
			needsDecode: true,
			hasImu: true,
			hasDepth: true,
			hasStereo: true,
			hasGlove: true,
			hasAudio: true,
		};
		const screenProps = props([item]);
		render(<RecordsScreen {...screenProps} />);
		fireEvent.click(
			screen.getByRole("button", { name: /stress_detail_record/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "解码" }));
		fireEvent.click(screen.getByRole("button", { name: "传输" }));
		await waitFor(() =>
			expect(decode).toHaveBeenCalledWith("stress_detail_record"),
		);
		expect(transfer).toHaveBeenCalledWith("stress_detail_record");
		fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
		expect(
			screen.queryByRole("dialog", { name: "记录详情" }),
		).not.toBeInTheDocument();
	});
});
