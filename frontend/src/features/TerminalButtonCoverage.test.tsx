import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_STATUS } from "../app/model";
import { TopbarPortalContext } from "../app/TopbarPortal";
import { UiModeContext } from "../app/uiModeContext";
import { I18nProvider } from "../shared/i18n/I18n";
import { api } from "../services/deviceApi";
import {
	managementApi,
	type CaptureTask,
	type ManagementSession,
} from "../services/managementApi";
import { TaskClaimScreen } from "./data/TaskClaimScreen";
import {
	AccountScreen,
	FeaturedScreen,
	MarketplaceScreen,
	PackageDownloadScreen,
} from "./expansion/ExpansionScreens";
import { SettingsScreen } from "./profile/SystemScreens";

const user = {
	id: "operator-20",
	name: "压力采集员",
	email: "stress@ego.test",
	role: "OPERATOR",
	status: "ACTIVE",
	work_region: "上海",
	phone: "13800000000",
	company: "Ego QA",
	work_serial_number: "QA-0020",
	sex: "男",
	height_cm: 175,
	cooperation_mode: "FULL_TIME",
};
const session: ManagementSession = {
	access_token: "stress-token",
	workspace_id: "stress-workspace",
	user,
};
const task: CaptureTask = {
	id: "task-1",
	serial_number: "TSK-STRESS-1",
	project_name: "压力项目",
	name: "压力任务 A",
	scene_type: "实验室",
	sop_id: "sop-1",
	sop_name: "实验室采集 SOP",
	sop: "第一步：检查设备\n第二步：开始采集",
	location: "",
	target_objects: "物体",
	duration_minutes: 30,
	target_count: 500,
	completed_count: 12,
	assigned_username: "",
	device_serial: "RK3588-QA",
	status: "PENDING",
};

function renderTerminal(ui: ReactElement) {
	const heading = document.createElement("div");
	const action = document.createElement("div");
	document.body.append(heading, action);
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<I18nProvider>
			<QueryClientProvider client={client}>
				<TopbarPortalContext.Provider value={{ heading, action }}>
					{ui}
				</TopbarPortalContext.Provider>
			</QueryClientProvider>
		</I18nProvider>,
	);
}

describe("remaining terminal button and populated-form coverage", () => {
	beforeEach(() => {
		localStorage.clear();
		Object.defineProperty(window, "PointerEvent", {
			configurable: true,
			value: MouseEvent,
		});
		localStorage.setItem("ego-management-session", JSON.stringify(session));
		vi.spyOn(managementApi, "currentTask").mockResolvedValue(null);
	});
	afterEach(() => vi.restoreAllMocks());

	it("selects each populated task, claims one, and returns", async () => {
		const back = vi.fn();
		const go = vi.fn();
		const notify = vi.fn();
		vi.spyOn(managementApi, "tasks").mockResolvedValue([
			task,
			{
				...task,
				id: "task-2",
				name: "压力任务 B",
				serial_number: "TSK-STRESS-2",
			},
		]);
		const claim = vi
			.spyOn(managementApi, "claimTask")
			.mockResolvedValue({ ...task, status: "CLAIMED" });
		renderTerminal(<TaskClaimScreen back={back} go={go} notify={notify} />);

		expect(
			await screen.findByRole("button", { name: "场景类型" }),
		).toHaveTextContent("全部场景");
		expect(
			screen.getByRole("option", { name: "全部时间" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("发布时间")).toHaveAttribute(
			"data-size",
			"device",
		);
		expect(screen.getByRole("button", { name: "任务名称" })).toHaveTextContent(
			"全部任务",
		);
		expect(screen.getByRole("button", { name: "子任务" })).toHaveTextContent(
			"全部子任务",
		);
		expect(screen.queryByText("任务筛选")).not.toBeInTheDocument();
		expect(screen.queryByText("2 条")).not.toBeInTheDocument();
		expect(
			screen.queryByPlaceholderText("搜索任务、项目、子任务或序列号"),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "场景类型" }));
		fireEvent.change(screen.getByLabelText("搜索场景类型"), {
			target: { value: "实验" },
		});
		fireEvent.click(screen.getByRole("button", { name: "实验室" }));
		fireEvent.click(screen.getByRole("button", { name: "清除场景类型" }));
		expect(screen.getByRole("button", { name: "场景类型" })).toHaveTextContent(
			"全部场景",
		);
		fireEvent.change(screen.getByLabelText("发布时间"), {
			target: { value: "day" },
		});
		fireEvent.click(screen.getByRole("button", { name: "清除发布时间" }));
		expect(screen.getByLabelText("发布时间")).toHaveValue("all");
		fireEvent.click(screen.getByRole("button", { name: "任务名称" }));
		fireEvent.change(screen.getByLabelText("搜索任务名称"), {
			target: { value: "压力任务 A" },
		});
		fireEvent.click(screen.getByRole("button", { name: "压力任务 A" }));
		fireEvent.click(screen.getByRole("button", { name: "清除任务名称" }));
		expect(screen.getByRole("button", { name: "任务名称" })).toHaveTextContent(
			"全部任务",
		);
		fireEvent.click(await screen.findByRole("button", { name: /压力任务 A/ }));
		fireEvent.click(screen.getByRole("button", { name: /压力任务 B/ }));
		fireEvent.click(screen.getByRole("button", { name: "确认领取并查看 SOP" }));
		expect(screen.getByRole("region", { name: "SOP 内容" })).toHaveTextContent(
			"第一步：检查设备",
		);
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		expect(
			screen.getByRole("button", { name: "确认领取并查看 SOP" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "确认领取并查看 SOP" }));
		fireEvent.click(screen.getByRole("button", { name: "返回任务列表" }));
		expect(
			screen.queryByRole("button", { name: "确认领取并查看 SOP" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /压力任务 B/ }));
		fireEvent.click(screen.getByRole("button", { name: "确认领取并查看 SOP" }));
		expect(
			screen.queryByRole("button", { name: "继续采集" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "领取采集" }));
		await waitFor(() =>
			expect(claim).toHaveBeenCalledWith(
				"task-2",
				expect.objectContaining({ location: "" }),
			),
		);
		expect(go).toHaveBeenCalledWith("capture");
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(back).toHaveBeenCalledOnce();
	});

	it.each(["device", "mobile"] as const)(
		"links subtask choices to the selected task in %s mode and clears a stale child choice",
		async (mode) => {
			vi.spyOn(managementApi, "tasks").mockResolvedValue([
				{
					...task,
					id: "task-a1",
					serial_number: "TASK-A",
					name: "任务 A",
					subtask_name: "子任务 A1",
				},
				{
					...task,
					id: "task-a2",
					serial_number: "TASK-A",
					name: "任务 A",
					subtask_name: "子任务 A2",
				},
				{
					...task,
					id: "task-b1",
					serial_number: "TASK-B",
					name: "任务 B",
					subtask_name: "子任务 B1",
				},
			]);
			renderTerminal(
				<UiModeContext.Provider value={mode}>
					<TaskClaimScreen back={vi.fn()} go={vi.fn()} notify={vi.fn()} />
				</UiModeContext.Provider>,
			);

			await screen.findByRole("button", { name: "任务名称" });
			fireEvent.click(screen.getByRole("button", { name: "任务名称" }));
			fireEvent.change(screen.getByLabelText("搜索任务名称"), {
				target: { value: "任务 A" },
			});
			fireEvent.click(await screen.findByRole("button", { name: "任务 A" }));
			fireEvent.click(screen.getByRole("button", { name: "子任务" }));
			expect(
				screen.getByRole("button", { name: "子任务 A1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "子任务 A2" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "子任务 B1" }),
			).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: "子任务 A1" }));
			fireEvent.click(screen.getByRole("button", { name: "任务名称" }));
			fireEvent.change(screen.getByLabelText("搜索任务名称"), {
				target: { value: "任务 B" },
			});
			fireEvent.click(await screen.findByRole("button", { name: "任务 B" }));
			expect(screen.getByRole("button", { name: "子任务" })).toHaveTextContent(
				"全部子任务",
			);
			fireEvent.click(screen.getByRole("button", { name: "子任务" }));
			expect(
				screen.getByRole("button", { name: "子任务 B1" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "子任务 A1" }),
			).not.toBeInTheDocument();
		},
	);

	it.each(["device", "mobile"] as const)(
		"searches a task outside the initial page after Chinese IME composition in %s mode",
		async (mode) => {
			const remoteTask = {
				...task,
				id: "remote-task",
				serial_number: "TASK-REMOTE",
				name: "中文远程任务",
				subtask_name: "远程子任务",
			};
			const tasks = vi
				.spyOn(managementApi, "tasks")
				.mockImplementation(async (filters = {}) =>
					filters.q === remoteTask.name ? [remoteTask] : [task],
				);
			renderTerminal(
				<UiModeContext.Provider value={mode}>
					<TaskClaimScreen back={vi.fn()} go={vi.fn()} notify={vi.fn()} />
				</UiModeContext.Provider>,
			);

			await screen.findByRole("button", { name: "任务名称" });
			tasks.mockClear();
			fireEvent.click(screen.getByRole("button", { name: "任务名称" }));
			const input = screen.getByLabelText("搜索任务名称");
			fireEvent.compositionStart(input);
			fireEvent.change(input, { target: { value: remoteTask.name } });
			expect(tasks).not.toHaveBeenCalled();
			expect(
				screen.queryByRole("button", { name: remoteTask.name }),
			).not.toBeInTheDocument();

			fireEvent.compositionEnd(input);
			await waitFor(() =>
				expect(tasks).toHaveBeenCalledWith({
					q: remoteTask.name,
					scene_type: undefined,
					limit: 100,
				}),
			);
			expect(
				await screen.findByRole("button", { name: remoteTask.name }),
			).toBeInTheDocument();
		},
	);

	it("reopens the current task SOP and can temporarily return to the task list", async () => {
		const go = vi.fn();
		const notify = vi.fn();
		const currentTask = {
			...task,
			assigned_username: user.name,
			status: "CLAIMED",
		};
		vi.mocked(managementApi.currentTask).mockResolvedValue(currentTask);
		vi.spyOn(managementApi, "tasks").mockResolvedValue([
			{ ...task, id: "task-2", name: "另一项任务" },
		]);
		const firstRender = renderTerminal(
			<TaskClaimScreen back={vi.fn()} go={go} notify={notify} />,
		);

		expect(
			await screen.findByRole("region", { name: "SOP 内容" }),
		).toBeInTheDocument();
		expect(screen.queryByText("您有一项进行中的任务")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "返回任务列表" }));
		expect(
			await screen.findByRole("button", { name: /另一项任务/ }),
		).toBeInTheDocument();
		firstRender.unmount();

		renderTerminal(<TaskClaimScreen back={vi.fn()} go={go} notify={notify} />);
		expect(
			await screen.findByRole("region", { name: "SOP 内容" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "领取采集" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "继续采集" }));
		expect(go).toHaveBeenCalledWith("capture");
	});

	it("cancels the current task from the SOP page", async () => {
		const notify = vi.fn();
		const currentTask = {
			...task,
			assigned_username: user.name,
			status: "CLAIMED",
		};
		vi.mocked(managementApi.currentTask).mockResolvedValue(currentTask);
		vi.spyOn(managementApi, "tasks").mockResolvedValue([]);
		const abandon = vi.spyOn(managementApi, "abandonTask").mockResolvedValue({
			...currentTask,
			assigned_username: "",
			status: "PENDING",
		});
		renderTerminal(
			<TaskClaimScreen back={vi.fn()} go={vi.fn()} notify={notify} />,
		);

		expect(
			await screen.findByRole("region", { name: "SOP 内容" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		await waitFor(() => expect(abandon).toHaveBeenCalledWith("task-1"));
		expect(notify).toHaveBeenCalledWith("任务已取消");
	});

	it.each([
		[1, "refused"],
		[3, "timed out"],
	] as const)(
		"keeps task claiming available when GPS error code %s means %s",
		async (code, _label) => {
			const go = vi.fn();
			const notify = vi.fn();
			Object.defineProperty(navigator, "geolocation", {
				configurable: true,
				value: {
					getCurrentPosition: vi.fn((_success, failure) => failure({ code })),
				},
			});
			vi.spyOn(managementApi, "tasks").mockResolvedValue([
				{
					...task,
					subtask_name: "压力子任务",
					published_at: new Date().toISOString(),
				},
			]);
			const claim = vi
				.spyOn(managementApi, "claimTask")
				.mockResolvedValue({ ...task, status: "CLAIMED" });
			renderTerminal(
				<TaskClaimScreen back={vi.fn()} go={go} notify={notify} />,
			);
			fireEvent.click(
				await screen.findByRole("button", { name: /压力任务 A/ }),
			);
			fireEvent.click(screen.getByRole("button", { name: "获取定位" }));
			expect(notify).toHaveBeenCalledWith(
				expect.stringContaining("GPS 已留空"),
			);
			fireEvent.click(
				screen.getByRole("button", { name: "确认领取并查看 SOP" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "领取采集" }));
			await waitFor(() =>
				expect(claim).toHaveBeenCalledWith(
					"task-1",
					expect.objectContaining({ location: "" }),
				),
			);
			expect(go).toHaveBeenCalledWith("capture");
		},
	);

	it("keeps task claiming available when geolocation is unsupported", async () => {
		const go = vi.fn();
		const notify = vi.fn();
		Object.defineProperty(navigator, "geolocation", {
			configurable: true,
			value: undefined,
		});
		vi.spyOn(managementApi, "tasks").mockResolvedValue([task]);
		const claim = vi
			.spyOn(managementApi, "claimTask")
			.mockResolvedValue({ ...task, status: "CLAIMED" });
		renderTerminal(<TaskClaimScreen back={vi.fn()} go={go} notify={notify} />);
		fireEvent.click(await screen.findByRole("button", { name: /压力任务 A/ }));
		fireEvent.click(screen.getByRole("button", { name: "获取定位" }));
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("不支持定位"));
		fireEvent.click(screen.getByRole("button", { name: "确认领取并查看 SOP" }));
		fireEvent.click(screen.getByRole("button", { name: "领取采集" }));
		await waitFor(() =>
			expect(claim).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({ location: "" }),
			),
		);
		expect(go).toHaveBeenCalledWith("capture");
	});

	it("uses GPS coordinates when geolocation succeeds", async () => {
		const notify = vi.fn();
		Object.defineProperty(navigator, "geolocation", {
			configurable: true,
			value: {
				getCurrentPosition: vi.fn((success) =>
					success({ coords: { latitude: 31.230416, longitude: 121.473701 } }),
				),
			},
		});
		vi.spyOn(managementApi, "tasks").mockResolvedValue([task]);
		const claim = vi
			.spyOn(managementApi, "claimTask")
			.mockResolvedValue({ ...task, status: "CLAIMED" });
		renderTerminal(
			<TaskClaimScreen back={vi.fn()} go={vi.fn()} notify={notify} />,
		);
		fireEvent.click(await screen.findByRole("button", { name: /压力任务 A/ }));
		fireEvent.click(screen.getByRole("button", { name: "获取定位" }));
		expect(screen.getByLabelText("场景位置")).toHaveValue(
			"31.230416,121.473701",
		);
		fireEvent.click(screen.getByRole("button", { name: "确认领取并查看 SOP" }));
		fireEvent.click(screen.getByRole("button", { name: "领取采集" }));
		await waitFor(() =>
			expect(claim).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({ location: "31.230416,121.473701" }),
			),
		);
	});

	it("returns from catalog, plays featured content, and checks populated releases", async () => {
		const back = vi.fn();
		const notify = vi.fn();
		vi.spyOn(managementApi, "releaseVersions").mockResolvedValue([
			{
				id: "release-1",
				platform: "device",
				version: "v9.9.9-stress",
				release_notes: "压力版本说明与完整变更记录",
				download_url: "https://stress.example.com/device.tar.gz",
				is_current: true,
				status: "PUBLISHED",
			},
		]);

		const catalog = renderTerminal(<MarketplaceScreen back={back} />);
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		catalog.unmount();
		const featured = renderTerminal(
			<FeaturedScreen back={back} notify={notify} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "播放内容" }));
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(notify).toHaveBeenCalledWith("内容播放接口待接入");
		featured.unmount();

		renderTerminal(<PackageDownloadScreen back={back} notify={notify} />);
		expect(await screen.findByText("v9.9.9-stress")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith("已同步 1 条版本记录"),
		);
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(back).toHaveBeenCalledTimes(3);
	});

	it("fills every editable account field, saves, logs out, and logs back in", async () => {
		const notify = vi.fn();
		const back = vi.fn();
		const update = vi
			.spyOn(managementApi, "updateProfile")
			.mockImplementation(async (profile) => ({ ...session, user: profile }));
		vi.spyOn(managementApi, "logout").mockImplementation(() =>
			localStorage.removeItem("ego-management-session"),
		);
		const login = vi.spyOn(managementApi, "login").mockResolvedValue(session);
		renderTerminal(<AccountScreen back={back} notify={notify} />);

		fireEvent.click(screen.getByRole("button", { name: "编辑资料" }));
		const textboxes = screen.getAllByRole("textbox");
		for (const [index, input] of textboxes.entries())
			fireEvent.change(input, {
				target: { value: `压力字段-${index}-${"x".repeat(80)}` },
			});
		for (const select of screen.getAllByRole("combobox"))
			fireEvent.change(select, {
				target: {
					value: select.querySelector('option[value="FULL_TIME"]')
						? "FULL_TIME"
						: "女",
				},
			});
		fireEvent.change(screen.getByRole("spinbutton"), {
			target: { value: "199" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存资料" }));
		await waitFor(() => expect(update).toHaveBeenCalledOnce());

		fireEvent.click(screen.getByRole("button", { name: "编辑资料" }));
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		fireEvent.click(screen.getByRole("button", { name: "退出账户" }));
		fireEvent.change(screen.getByLabelText("账号"), {
			target: { value: "stress@ego.test" },
		});
		fireEvent.change(screen.getByLabelText("密码"), {
			target: { value: "stress-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "登录" }));
		await waitFor(() =>
			expect(login).toHaveBeenCalledWith("stress@ego.test", "stress-password"),
		);
		fireEvent.click(screen.getByRole("button", { name: "返回" }));
		expect(back).toHaveBeenCalledOnce();
	});

	it("uses every settings action with device APIs mocked", async () => {
		const back = vi.fn();
		const go = vi.fn();
		const notify = vi.fn();
		vi.spyOn(api, "settings").mockResolvedValue({ postCaptureEnabled: true });
		const save = vi
			.spyOn(api, "saveSettings")
			.mockResolvedValue({ postCaptureEnabled: false });
		renderTerminal(
			<SettingsScreen
				status={FALLBACK_STATUS}
				back={back}
				go={go}
				notify={notify}
			/>,
		);
		fireEvent.click(screen.getByRole("switch", { name: "录制后自动处理" }));
		await waitFor(() => expect(save).toHaveBeenCalledWith(false));
		fireEvent.click(screen.getByRole("button", { name: /界面语言/ }));
		fireEvent.click(screen.getByRole("button", { name: /数据存储与云端/ }));
		fireEvent.click(screen.getByRole("button", { name: /采集诊断/ }));
		expect(go).toHaveBeenCalledWith("cloud-settings");
		expect(go).toHaveBeenCalledWith("diagnostics");
		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(back).toHaveBeenCalledOnce();
	});
});
