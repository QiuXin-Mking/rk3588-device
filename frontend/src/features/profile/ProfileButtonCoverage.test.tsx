import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_RECORD, FALLBACK_STATUS } from "../../app/model";
import { TopbarPortalContext } from "../../app/TopbarPortal";
import { api } from "../../services/deviceApi";
import type { TerminalConfig } from "../../services/managementApi";
import { BluetoothScreen } from "./BluetoothScreen";
import { DeviceListScreen } from "./DeviceScreens";
import { ProfileScreen } from "./ProfileOverviewScreen";
import { WifiScreen } from "./WifiScreen";

const status = {
	...FALLBACK_STATUS,
	wifi: { connected: false, ssid: "", signal: 0 },
	bluetooth: {
		connected: true,
		gloves: {
			left: {
				connected: true,
				device: "Stress Glove Left",
				address: "AA:BB:CC:00:00:01",
			},
			right: {
				connected: false,
				device: "Stress Glove Right",
				address: "AA:BB:CC:00:00:02",
			},
		},
	},
	wiredGloves: { left: false, right: false },
	calibrator: { active: false, state: "inactive" },
};

const terminalConfig: TerminalConfig = {
	physical_kit: {
		id: "kit-1",
		serial_number: "MANGO-KIT-0020",
		name: "Mango 测试套件",
		template_id: "template-1",
		terminal_serial: "RK3588-0020",
		bound_username: "stress.operator.0020",
		status: "ASSIGNED",
		location: "",
	},
	template: {
		id: "template-1",
		code: "MANGO-TEST",
		name: "Mango 测试模板",
		product_type: "Mango",
		instructions: "",
		exam_enabled: false,
		status: "ACTIVE",
		device_slots: [
			["head", "Ego_H", "HEAD_STEREO", "jhh02"],
			["wrist", "Ego_W", "WRIST_MONO", "wrist_left"],
			["fingers", "UMI_Fingers", "GLOVE", "imu"],
			["grippers", "UMI_Grippers", "GRIPPER", "imu"],
			["suits", "Suits", "SUIT", "imu"],
		].map(([role, label, deviceModel, serviceKey], index) => ({
			role,
			label,
			device_model: deviceModel,
			quantity: 1,
			required: true,
			channel_count: 0,
			channel_labels: [],
			service_key: serviceKey,
			channel_keys: [],
			sort: index + 1,
		})),
	},
	devices: [],
};

function renderDevice(ui: ReactElement) {
	const heading = document.createElement("div");
	const action = document.createElement("div");
	document.body.append(heading, action);
	return render(
		<TopbarPortalContext.Provider value={{ heading, action }}>
			{ui}
		</TopbarPortalContext.Provider>,
	);
}

describe("device profile button coverage", () => {
	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(
			"ego-management-session",
			JSON.stringify({
				access_token: "stress-token",
				workspace_id: "stress-workspace",
				user: {
					id: "operator-20",
					name: "采集员 0020",
					email: "operator.0020@ego.test",
					role: "OPERATOR",
				},
			}),
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it("opens the restored profile actions without duplicating account actions", () => {
		const go = vi.fn();
		const notify = vi.fn();
		renderDevice(
			<ProfileScreen
				status={status}
				record={FALLBACK_RECORD}
				files={{ files: [], root: "", externalDisk: null }}
				online
				go={go}
				notify={notify}
				refreshStatus={vi.fn()}
				refreshFiles={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /我的信息/ }));
		expect(go).toHaveBeenLastCalledWith("account");
		fireEvent.click(screen.getByRole("button", { name: /关于深灵/ }));
		expect(go).toHaveBeenLastCalledWith("about");
		fireEvent.click(screen.getByRole("button", { name: /登录管理/ }));
		expect(go).toHaveBeenLastCalledWith("account");
	});

	it("opens all populated device suites, package download, refresh, and return", () => {
		const go = vi.fn();
		const back = vi.fn();
		const refreshStatus = vi.fn().mockResolvedValue(undefined);
		renderDevice(
			<DeviceListScreen
				status={status}
				terminalConfig={terminalConfig}
				record={{
					...FALLBACK_RECORD,
					cameras: { jhh2_left: true, jhh2_right: true, jhh02: true },
					gloveSides: { left: true, right: true },
				}}
				back={back}
				go={go}
				refreshStatus={refreshStatus}
			/>,
		);

		for (const name of [
			"Ego_H",
			"Ego_W",
			"UMI_Fingers",
			"UMI_Grippers",
			"Suits",
		]) {
			fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
		}
		expect(
			go.mock.calls.filter(([target]) => target === "device-info"),
		).toHaveLength(5);
		fireEvent.click(screen.getByRole("button", { name: "大包下载" }));
		expect(go).toHaveBeenLastCalledWith("package-download");
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(back).toHaveBeenCalledOnce();
	});

	it("scans populated WiFi, opens secured and open networks, toggles password and hotspot", async () => {
		const refreshStatus = vi.fn().mockResolvedValue(undefined);
		const notify = vi.fn();
		const scan = vi.spyOn(api, "wifiScan").mockResolvedValue({
			networks: [
				{
					ssid: "Stress-Secure-5G",
					signal: 92,
					security: "WPA2",
					active: false,
				},
				{ ssid: "Stress-Open", signal: 61, security: "none", active: false },
			],
		});
		const connect = vi
			.spyOn(api, "wifiConnect")
			.mockResolvedValue({ ok: true });
		renderDevice(
			<WifiScreen
				status={status}
				back={vi.fn()}
				notify={notify}
				refreshStatus={refreshStatus}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "扫描网络" }));
		await waitFor(() => expect(scan).toHaveBeenCalledOnce());
		fireEvent.click(
			await screen.findByRole("button", { name: /Stress-Secure-5G/ }),
		);
		const dialog = screen.getByRole("dialog", { name: "输入 WiFi 密码" });
		fireEvent.click(within(dialog).getByRole("button", { name: "显示密码" }));
		expect(
			within(dialog).getByRole("button", { name: "隐藏密码" }),
		).toBeInTheDocument();
		fireEvent.click(within(dialog).getByRole("button", { name: "s" }));
		fireEvent.click(within(dialog).getByRole("button", { name: "t" }));
		fireEvent.click(within(dialog).getByRole("button", { name: "连接" }));
		await waitFor(() =>
			expect(connect).toHaveBeenCalledWith("Stress-Secure-5G", "st"),
		);

		fireEvent.click(screen.getByRole("button", { name: /Stress-Open/ }));
		await waitFor(() =>
			expect(connect).toHaveBeenCalledWith("Stress-Open", ""),
		);
		fireEvent.click(screen.getByRole("button", { name: "开启热点" }));
		expect(
			screen.getByRole("button", { name: "关闭热点" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "关闭热点" }));
		expect(notify).toHaveBeenCalledWith("热点配置已保存在页面，待系统接口接入");
		expect(notify).toHaveBeenCalledWith("热点已关闭");
	});

	it("uses populated Bluetooth panels while hardware calls stay mocked", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const notify = vi.fn();
		const refreshStatus = vi.fn().mockResolvedValue(undefined);
		const connect = vi
			.spyOn(api, "bluetoothConnect")
			.mockResolvedValue({ ok: true });
		const disconnect = vi
			.spyOn(api, "bluetoothDisconnect")
			.mockResolvedValue({ ok: true });
		const scan = vi.spyOn(api, "bluetoothScan").mockResolvedValue({
			devices: [
				{
					name: "Stress Glove A",
					address: "AA:BB:CC:11:22:33",
					paired: true,
					connected: false,
				},
				{
					name: "Stress Glove B",
					address: "AA:BB:CC:44:55:66",
					paired: false,
					connected: true,
				},
			],
		});
		const calibrator = vi
			.spyOn(api, "calibrator")
			.mockResolvedValue({ ok: true, active: true });
		const calibrateStart = vi
			.spyOn(api, "calibrateStart")
			.mockResolvedValue({ ok: false, error: "mocked hardware handoff" });
		renderDevice(
			<BluetoothScreen
				status={status}
				back={vi.fn()}
				notify={notify}
				refreshStatus={refreshStatus}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "断开" }));
		await waitFor(() => expect(disconnect).toHaveBeenCalledOnce());
		fireEvent.click(screen.getByRole("button", { name: "连接" }));
		await waitFor(() =>
			expect(connect).toHaveBeenCalledWith("AA:BB:CC:00:00:02"),
		);
		fireEvent.click(screen.getByRole("button", { name: "重新连接" }));

		fireEvent.click(screen.getByRole("button", { name: "扫描" }));
		fireEvent.click(screen.getAllByRole("button", { name: "开始扫描" })[1]);
		await waitFor(() => expect(scan).toHaveBeenCalledOnce());
		fireEvent.click(
			await screen.findByRole("button", { name: /Stress Glove A/ }),
		);
		await waitFor(() =>
			expect(connect).toHaveBeenCalledWith("AA:BB:CC:11:22:33"),
		);

		fireEvent.click(screen.getByRole("button", { name: "校准" }));
		fireEvent.click(screen.getByRole("button", { name: "启动" }));
		fireEvent.click(screen.getByRole("button", { name: "重启" }));
		fireEvent.click(screen.getByRole("button", { name: "打开" }));
		await waitFor(() => expect(calibrator).toHaveBeenCalledWith("start"));
		expect(calibrator).toHaveBeenCalledWith("restart");
		const calibrationButtons = screen.getAllByRole("button", {
			name: "开始校准",
		});
		expect(calibrationButtons).toHaveLength(2);
		expect(calibrationButtons[0]).toBeEnabled();
		expect(calibrationButtons[1]).toBeDisabled();
		fireEvent.click(calibrationButtons[0]);
		await waitFor(() =>
			expect(calibrateStart).toHaveBeenCalledWith("left", "spp"),
		);
		expect(notify).toHaveBeenCalledWith("mocked hardware handoff");
	});

	it("uses the Bluetooth scan toolbar button with hardware calls mocked", async () => {
		const scan = vi
			.spyOn(api, "bluetoothScan")
			.mockResolvedValue({ devices: [] });
		renderDevice(
			<BluetoothScreen
				status={status}
				back={vi.fn()}
				notify={vi.fn()}
				refreshStatus={vi.fn().mockResolvedValue(undefined)}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "扫描" }));
		fireEvent.click(screen.getAllByRole("button", { name: "开始扫描" })[0]);
		await waitFor(() => expect(scan).toHaveBeenCalledOnce());
	});
});
