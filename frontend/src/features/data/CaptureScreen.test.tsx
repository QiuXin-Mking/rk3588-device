import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_RECORD, FALLBACK_STATUS } from "../../app/model";
import { UiModeContext } from "../../app/uiModeContext";
import {
	type CaptureTask,
	type ManagementSession,
	managementApi,
	type TerminalConfig,
} from "../../services/managementApi";
import { CaptureScreen } from "./DataScreens";

const session: ManagementSession = {
	access_token: "test",
	workspace_id: "workspace",
	user: {
		id: "operator",
		name: "采集员",
		email: "operator@example.com",
		role: "OPERATOR",
		status: "ACTIVE",
		work_region: "",
		phone: "",
		company: "",
		work_serial_number: "",
		sex: "",
		height_cm: null,
		cooperation_mode: "",
	},
};
const task: CaptureTask = {
	id: "task-1",
	serial_number: "TSK-REAL-1",
	project_name: "真实项目",
	name: "真实后台任务",
	scene_type: "室内",
	sop_id: "sop-1",
	sop_name: "标准 SOP",
	sop: "第一步：确认设备\n第二步：开始采集",
	location: "上海",
	target_objects: "物体",
	duration_minutes: 20,
	target_count: 30,
	completed_count: 6,
	assigned_username: "operator",
	device_serial: "DEV-1",
	status: "CLAIMED",
};
const terminalConfig: TerminalConfig = {
	physical_kit: {
		id: "physical-1",
		serial_number: "KIT-001",
		name: "双目套件 001",
		template_id: "template-1",
		terminal_serial: "RK-001",
		bound_username: "operator",
		status: "ASSIGNED",
		location: "",
	},
	template: {
		id: "template-1",
		code: "H2",
		name: "双目模板",
		product_type: "Mango",
		instructions: "",
		exam_enabled: false,
		status: "ACTIVE",
		device_slots: [
			{
				role: "head",
				label: "头戴双目",
				device_model: "HEAD_STEREO",
				quantity: 1,
				required: true,
				channel_count: 1,
				channel_labels: ["头部双目"],
				service_key: "camera",
				channel_keys: ["camera"],
				sort: 1,
			},
		],
	},
	devices: [
		{
			id: "device-1",
			serial_number: "HEAD-001",
			pid: "",
			device_name: "头戴双目",
			device_model: "HEAD_STEREO",
			slot_role: "head",
			physical_kit_id: "physical-1",
			status: "UNKNOWN",
			firmware_version: "",
		},
	],
};
const commonProps = {
	status: FALLBACK_STATUS,
	busy: false,
	notify: vi.fn(),
	toggleRecord: vi.fn().mockResolvedValue(true),
	go: vi.fn(),
	terminalConfig,
};
const readyRecord = {
	...FALLBACK_RECORD,
	cameraConnected: true,
	cameras: { camera: true },
};

describe("CaptureScreen", () => {
	beforeEach(() => localStorage.clear());

	it("requires an account before exposing task controls", () => {
		render(<CaptureScreen {...commonProps} record={FALLBACK_RECORD} />);
		expect(screen.getByText("未领取任务")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "开始录制" })).toBeDisabled();
	});

	it("shows the claimed backend task with device status, inline previews and logs", () => {
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		localStorage.setItem("ego-current-task", JSON.stringify(task));
		render(<CaptureScreen {...commonProps} record={readyRecord} />);
		expect(screen.getByText("真实后台任务")).toBeInTheDocument();
		expect(screen.getByText("设备状态")).toBeInTheDocument();
		expect(screen.queryByText("头戴六目预览")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "开始录制" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "标0检查" })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: "标0检查" }));
		expect(screen.getByRole("button", { name: "开始录制" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "放大头部双目" })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: "放大头部双目" }));
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "头部双目放大预览" }),
		).toBeInTheDocument();
		expect(screen.getByText("日志")).toBeInTheDocument();
		expect(screen.queryByText("最近记录")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "查看实时大画面" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("把药盒、药瓶、空药瓶分类"),
		).not.toBeInTheDocument();
	});

	it("keeps two device previews per row and scrolls additional rows vertically", () => {
		const template = terminalConfig.template;
		if (!template) throw new Error("测试套件模板缺失");
		const [headSlot] = template.device_slots;
		if (!headSlot) throw new Error("测试设备槽位缺失");
		const sixChannelTerminalConfig: TerminalConfig = {
			...terminalConfig,
			template: {
				...template,
				device_slots: [
					{
						...headSlot,
						channel_count: 6,
						channel_labels: Array.from(
							{ length: 6 },
							(_, index) => `头戴 ${index + 1}`,
						),
						channel_keys: Array.from(
							{ length: 6 },
							(_, index) => `head-${index + 1}`,
						),
					},
				],
			},
		};
		const sixChannelRecord = {
			...readyRecord,
			cameras: Object.fromEntries(
				Array.from({ length: 6 }, (_, index) => [`head-${index + 1}`, true]),
			),
		};

		render(
			<CaptureScreen
				{...commonProps}
				terminalConfig={sixChannelTerminalConfig}
				record={sixChannelRecord}
			/>,
		);

		const previewGrid = screen
			.getByRole("button", { name: "放大头戴 1" })
			.closest('[data-slot="card-content"]');
		expect(previewGrid).toHaveClass(
			"grid-cols-2",
			"auto-rows-[100%]",
			"overflow-y-auto",
		);
		expect(screen.getAllByRole("button", { name: /放大头戴/ })).toHaveLength(6);
	});

	it("shows server kit and terminal SN while mobile waits for hardware", () => {
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		render(
			<UiModeContext.Provider value="mobile">
				<CaptureScreen {...commonProps} record={FALLBACK_RECORD} />
			</UiModeContext.Provider>,
		);
		expect(screen.getByText("已配置，等待连接")).toBeInTheDocument();
		expect(screen.getByText("套件 KIT-001 · 终端 RK-001")).toBeInTheDocument();
		expect(screen.queryByText("未绑定实体套件")).not.toBeInTheDocument();
	});

	it("completes the task in management before clearing the local task", async () => {
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		localStorage.setItem("ego-current-task", JSON.stringify(task));
		const complete = vi
			.spyOn(managementApi, "completeTask")
			.mockResolvedValue({ ...task, status: "COMPLETED" });
		render(<CaptureScreen {...commonProps} record={readyRecord} />);
		fireEvent.click(screen.getByRole("button", { name: "结束任务" }));
		await waitFor(() => expect(complete).toHaveBeenCalledWith("task-1"));
		expect(localStorage.getItem("ego-current-task")).toBeNull();
	});

	it("starts only after zero check, then turns the same action into slice without stopping recording", async () => {
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		localStorage.setItem("ego-current-task", JSON.stringify(task));
		const toggleRecord = vi.fn().mockResolvedValue(true);
		const view = render(
			<CaptureScreen
				{...commonProps}
				toggleRecord={toggleRecord}
				record={readyRecord}
			/>,
		);
		expect(screen.getByRole("button", { name: "开始录制" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "标0检查" }));
		fireEvent.click(screen.getByRole("button", { name: "开始录制" }));
		await waitFor(() => expect(toggleRecord).toHaveBeenCalledOnce());

		view.rerender(
			<CaptureScreen
				{...commonProps}
				toggleRecord={toggleRecord}
				record={{ ...readyRecord, recording: true }}
			/>,
		);
		expect(screen.getByRole("button", { name: "切片" })).toBeEnabled();
		expect(screen.getByRole("button", { name: /标0/ })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "切片" }));
		expect(toggleRecord).toHaveBeenCalledOnce();
		expect(screen.getByText(/已切 1 次/)).toBeInTheDocument();
	});

	it("stops an active recording before completing the task", async () => {
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		localStorage.setItem("ego-current-task", JSON.stringify(task));
		const toggleRecord = vi.fn().mockResolvedValue(true);
		const complete = vi
			.spyOn(managementApi, "completeTask")
			.mockResolvedValue({ ...task, status: "COMPLETED" });
		render(
			<CaptureScreen
				{...commonProps}
				toggleRecord={toggleRecord}
				record={{ ...readyRecord, recording: true }}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "结束任务" }));
		await waitFor(() => expect(toggleRecord).toHaveBeenCalledOnce());
		expect(complete).toHaveBeenCalledWith("task-1");
	});
});
