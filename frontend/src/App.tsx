import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AppShell } from "./app/AppShell";
import type { ScreenCommonProps } from "./app/model";
import {
	type MainTab,
	pathForView,
	tabForView,
	type View,
	viewForPath,
} from "./app/navigation";
import { CaptureScreen, TaskClaimScreen } from "./features/data/DataScreens";
import { useDeviceRuntime } from "./features/device/hooks/useDeviceRuntime";
import {
	AccountScreen,
	FeaturedScreen,
	MarketplaceScreen,
	PackageDownloadScreen,
} from "./features/expansion/ExpansionScreens";
import {
	AboutScreen,
	BluetoothScreen,
	DeviceInfoScreen,
	DeviceListScreen,
	ProfileScreen,
	SettingsScreen,
	WifiScreen,
} from "./features/profile/ProfileScreens";
import { RecordsScreen } from "./features/records/RecordsScreen";
import {
	CloudSettingsScreen,
	DiagnosticsScreen,
	HelpFeedbackScreen,
	SuiteGuideScreen,
} from "./features/requirements/RequirementScreens";
import { api } from "./services/deviceApi";
import {
	clearCurrentTask,
	linkRecordingToTask,
	loadCurrentTask,
	loadManagementSession,
	managementApi,
	onManagementSessionChange,
	saveCurrentTask,
} from "./services/managementApi";
import { useToast } from "./shared/hooks/useToast";

function App() {
	const location = useLocation();
	const navigate = useNavigate();
	const [session, setSession] = useState(loadManagementSession);
	const accessToken = session?.access_token;
	const terminalConfig = useQuery({
		queryKey: ["operator-terminal-config", session?.user.id],
		queryFn: managementApi.terminalConfig,
		enabled: Boolean(session),
		retry: false,
		refetchInterval: 15_000,
		refetchOnWindowFocus: true,
	});
	const view = viewForPath(location.pathname);
	const { toast, notify } = useToast();
	const {
		status,
		record,
		files,
		online,
		busy,
		toggleRecord: toggleRecordRequest,
		refreshStatus,
		refreshFiles,
	} = useDeviceRuntime();
	const calibrationReturnHandled = useRef(false);

	useEffect(
		() => onManagementSessionChange(() => setSession(loadManagementSession())),
		[],
	);

	useEffect(() => {
		if (!accessToken) return;
		void managementApi.refreshProfile().catch(() => undefined);
	}, [accessToken]);

	useEffect(() => {
		if (session?.user.role !== "ADMIN") return;
		managementApi.logout();
		notify("管理员请使用管理后台，采集终端仅供采集员使用");
	}, [notify, session]);

	useEffect(() => {
		if (!session) return;
		let active = true;
		const validate = () =>
			managementApi.validateSession().catch(() => {
				if (!active) return;
				managementApi.logout();
				notify("登录已失效，请重新登录");
			});
		void validate();
		const timer = window.setInterval(validate, 60_000);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [notify, session]);

	useEffect(() => {
		if (!session) return;
		let active = true;
		const syncCurrentTask = () =>
			managementApi
				.currentTask()
				.then((task) => {
					if (!active) return;
					if (task) saveCurrentTask(task);
					else clearCurrentTask();
				})
				.catch(() => undefined);
		void syncCurrentTask();
		const timer = window.setInterval(syncCurrentTask, 5_000);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [session]);

	useEffect(() => {
		if (calibrationReturnHandled.current) return;
		const params = new URLSearchParams(window.location.search);
		if (params.get("calDone") !== "1") return;
		calibrationReturnHandled.current = true;
		const side = params.get("side") === "left" ? "left" : "right";
		const transport = params.get("transport") === "wired" ? "wired" : "spp";
		const cleanUrl = new URL(window.location.href);
		cleanUrl.searchParams.delete("calDone");
		cleanUrl.searchParams.delete("side");
		cleanUrl.searchParams.delete("transport");
		window.history.replaceState(null, "", cleanUrl);
		navigate(pathForView("bluetooth"), { replace: true });
		api
			.calibrateStop(side, transport)
			.then(async () => {
				notify("校准完成，手套采集服务正在恢复");
				await refreshStatus();
			})
			.catch((error) =>
				notify(error instanceof Error ? error.message : "校准服务恢复失败"),
			);
	}, [navigate, notify, refreshStatus]);

	const go = (next: View) => {
		if (next !== view) navigate(pathForView(next), { state: { from: view } });
	};

	const back = () => {
		const from = (location.state as { from?: View } | null)?.from;
		navigate(pathForView(from ?? tabForView(view)), { replace: true });
	};

	const selectTab = (tab: MainTab) => navigate(pathForView(tab));

	const selectAdminView = (next: "settings" | "device-list") => {
		const password = window.prompt("请输入管理员密码");
		if (password === null) return;
		const expected = import.meta.env.VITE_TERMINAL_ADMIN_PASSWORD ?? "omega";
		if (password !== expected) return notify("管理员密码错误");
		go(next);
	};

	const toggleRecord = async () => {
		if (busy) return false;
		const task = loadCurrentTask();
		if (!task) {
			notify("请先领取任务");
			return false;
		}
		const wasRecording = record.recording;
		const filesBefore = new Set(files.files.map((item) => item.name));
		try {
			const result = await toggleRecordRequest();
			if (!result.ok) throw new Error(result.error || "设备未响应");
			if (!wasRecording) {
				try {
					saveCurrentTask(await managementApi.startTask(task.id));
				} catch (error) {
					await toggleRecordRequest().catch(() => undefined);
					throw error;
				}
				notify("录制已开始");
				return true;
			}
			await new Promise((resolve) => window.setTimeout(resolve, 300));
			const latestFiles = await api.files();
			const newest = latestFiles.files.find(
				(item) => !filesBefore.has(item.name),
			);
			if (newest) {
				linkRecordingToTask(newest.name, task.id);
				await managementApi.reportRecording({
					task_id: task.id,
					name: newest.name,
					size_bytes: newest.size,
					recorded_at: new Date(newest.mtime).toISOString(),
				});
				const refreshedTask = await managementApi.currentTask();
				if (refreshedTask) saveCurrentTask(refreshedTask);
			}
			await refreshFiles();
			notify(
				newest ? "录制已停止，记录已同步后台" : "录制已停止，未检测到新记录",
			);
			return true;
		} catch (error) {
			notify(error instanceof Error ? error.message : "录制操作失败");
			return false;
		}
	};

	const common: ScreenCommonProps = {
		status,
		record,
		files,
		online,
		go,
		notify,
		refreshStatus,
		refreshFiles,
	};

	const screen = (() => {
		switch (view) {
			case "tasks":
				return <TaskClaimScreen go={go} notify={notify} />;
			case "capture":
				return (
					<CaptureScreen
						status={status}
						record={record}
						busy={busy}
						notify={notify}
						toggleRecord={toggleRecord}
						go={go}
						terminalConfig={terminalConfig.data}
					/>
				);
			case "records":
				return <RecordsScreen {...common} />;
			case "profile":
				return <ProfileScreen {...common} />;
			case "device-list":
				return (
					<DeviceListScreen
						status={status}
						record={record}
						terminalConfig={terminalConfig.data}
						back={back}
						go={go}
						refreshStatus={refreshStatus}
					/>
				);
			case "device-info":
				return (
					<DeviceInfoScreen
						status={status}
						record={record}
						terminalConfig={terminalConfig.data}
						back={back}
					/>
				);
			case "wifi":
				return (
					<WifiScreen
						status={status}
						back={back}
						notify={notify}
						refreshStatus={refreshStatus}
					/>
				);
			case "bluetooth":
				return (
					<BluetoothScreen
						status={status}
						back={back}
						notify={notify}
						refreshStatus={refreshStatus}
					/>
				);
			case "settings":
				return (
					<SettingsScreen status={status} back={back} go={go} notify={notify} />
				);
			case "about":
				return <AboutScreen back={back} />;
			case "marketplace":
				return <MarketplaceScreen back={back} />;
			case "featured":
				return <FeaturedScreen back={back} notify={notify} />;
			case "package-download":
				return <PackageDownloadScreen back={back} notify={notify} />;
			case "account":
				return <AccountScreen back={back} notify={notify} />;
			case "cloud-settings":
				return <CloudSettingsScreen back={back} notify={notify} />;
			case "help-feedback":
				return <HelpFeedbackScreen back={back} notify={notify} />;
			case "suite-guide":
				return <SuiteGuideScreen back={back} notify={notify} />;
			case "diagnostics":
				return <DiagnosticsScreen back={back} record={record} />;
		}
	})();

	return (
		<AppShell
			active={tabForView(view)}
			online={online}
			status={status}
			toast={toast}
			userName={session?.user.name ?? "未登录"}
			onSelect={selectTab}
			onAdminSelect={selectAdminView}
		>
			{screen}
		</AppShell>
	);
}

export default App;
