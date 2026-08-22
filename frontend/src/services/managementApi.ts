export type ManagementAccount = {
	id: string;
	username?: string;
	avatar?: string;
	name: string;
	email: string;
	role: string;
	status: string;
	work_region: string;
	phone: string;
	company: string;
	work_serial_number: string;
	sex: string;
	height_cm: number | null;
	cooperation_mode: string;
};

type WorkspaceMemberProfile = {
	employee_name?: string | null;
	sex?: string | null;
	mobile?: string | null;
	email?: string | null;
	work_region?: string | null;
	company?: string | null;
	cooperation_mode?: string | null;
	work_serial_number?: string | null;
	height_cm?: number | null;
};

export type CaptureTask = {
	id: string;
	serial_number: string;
	kit_id?: string;
	project_name: string;
	name: string;
	subtask_name?: string;
	scene_type: string;
	sop_id: string;
	sop_name: string;
	sop: string;
	location: string;
	target_objects: string;
	object_count?: number;
	duration_minutes: number;
	target_count: number;
	completed_count: number;
	published_at?: string | null;
	assigned_username: string;
	device_serial: string;
	status: string;
};

export type ProductKit = {
	id: string;
	code: string;
	name: string;
	product_type: string;
	instructions: string;
	exam_enabled: boolean;
	status: string;
	device_slots: KitDeviceSlot[];
};

export type KitDeviceSlot = {
	role: string;
	label: string;
	device_model: string;
	quantity: number;
	required: boolean;
	channel_count: number;
	channel_labels: string[];
	service_key: string;
	channel_keys: string[];
	sort: number;
};

export type PhysicalKit = {
	id: string;
	serial_number: string;
	name: string;
	template_id: string;
	terminal_serial: string;
	bound_username: string;
	status: string;
	location: string;
};

export type DeviceBinding = {
	id: string;
	serial_number: string;
	pid: string;
	device_name: string;
	device_model: string;
	slot_role: string;
	physical_kit_id?: string | null;
	status: string;
	firmware_version: string;
	last_seen_at?: string | null;
};

export type TerminalConfig = {
	physical_kit: PhysicalKit | null;
	devices: DeviceBinding[];
	template: ProductKit | null;
};

export type ManagementRecord = {
	id: string;
	record_no: string;
	task_id?: string | null;
	project_name?: string;
	task_name: string;
	subtask_name?: string;
	kit_name?: string;
	capture_location?: string;
	device_serial: string;
	operator_username: string;
	file_name: string;
	file_size_bytes: number;
	duration_seconds: number;
	status: string;
	qa_status: string;
	upload_status: string;
	data_status?: string;
	captured_at?: string | null;
};

export type CloudStorageConfig = {
	id?: string;
	name: string;
	provider: string;
	endpoint: string;
	bucket: string;
	region: string;
	status: string;
};

export type ReleaseVersion = {
	id: string;
	platform: string;
	version: string;
	release_notes: string;
	download_url: string;
	is_current: boolean;
	status: string;
};

export type ManagementSession = {
	access_token: string;
	workspace_id: string;
	user: ManagementAccount;
};
type Session = ManagementSession;
const SESSION_KEY = "ego-management-session";
const CURRENT_TASK_KEY = "ego-current-task";
const SESSION_EVENT = "ego-management-session-change";
const TASK_EVENT = "ego-current-task-change";
const RECORD_TASK_MAP_KEY = "ego-record-task-map";

type RawCaptureTask = Omit<CaptureTask, "serial_number" | "sop"> & {
	task_no: string;
	sop_content: string;
};

export type TaskClaimInput = {
	location: string;
	target_objects: string;
	object_count: number;
};

function mapCaptureTask(task: RawCaptureTask): CaptureTask {
	return { ...task, serial_number: task.task_no, sop: task.sop_content };
}

export function loadManagementSession(): Session | null {
	try {
		const value = localStorage.getItem(SESSION_KEY);
		return value ? (JSON.parse(value) as Session) : null;
	} catch {
		return null;
	}
}

function saveSession(session: Session) {
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onManagementSessionChange(listener: () => void) {
	window.addEventListener(SESSION_EVENT, listener);
	return () => window.removeEventListener(SESSION_EVENT, listener);
}

export function loadCurrentTask(): CaptureTask | null {
	try {
		const value = localStorage.getItem(CURRENT_TASK_KEY);
		return value ? (JSON.parse(value) as CaptureTask) : null;
	} catch {
		return null;
	}
}

export function saveCurrentTask(task: CaptureTask) {
	localStorage.setItem(CURRENT_TASK_KEY, JSON.stringify(task));
	window.dispatchEvent(new Event(TASK_EVENT));
}

export function clearCurrentTask() {
	localStorage.removeItem(CURRENT_TASK_KEY);
	window.dispatchEvent(new Event(TASK_EVENT));
}

export function onCurrentTaskChange(listener: () => void) {
	window.addEventListener(TASK_EVENT, listener);
	return () => window.removeEventListener(TASK_EVENT, listener);
}

export function linkRecordingToTask(recordingName: string, taskId: string) {
	let mapping: Record<string, string> = {};
	try {
		mapping = JSON.parse(
			localStorage.getItem(RECORD_TASK_MAP_KEY) || "{}",
		) as Record<string, string>;
	} catch {
		mapping = {};
	}
	mapping[recordingName] = taskId;
	localStorage.setItem(RECORD_TASK_MAP_KEY, JSON.stringify(mapping));
}

export function taskIdForRecording(recordingName: string) {
	try {
		const mapping = JSON.parse(
			localStorage.getItem(RECORD_TASK_MAP_KEY) || "{}",
		) as Record<string, string>;
		return mapping[recordingName];
	} catch {
		return undefined;
	}
}

async function managementRequest<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const headers = new Headers(init?.headers);
	if (init?.body && !(init.body instanceof URLSearchParams))
		headers.set("Content-Type", "application/json");
	const token = loadManagementSession()?.access_token;
	if (token) headers.set("Authorization", `Bearer ${token}`);
	const workspaceId = loadManagementSession()?.workspace_id;
	if (workspaceId) headers.set("X-Workspace-Id", workspaceId);
	const response = await fetch(`/management-api/v1${path}`, {
		...init,
		headers,
	});
	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			detail?: string;
		} | null;
		throw new Error(
			payload?.detail ?? `管理服务请求失败（${response.status}）`,
		);
	}
	return response.json() as Promise<T>;
}

export const managementApi = {
	login: async (email: string, password: string) => {
		const token = await managementRequest<{ access_token: string }>(
			"/login/access-token",
			{
				method: "POST",
				body: new URLSearchParams({ username: email, password }),
			},
		);
		const authHeaders = { Authorization: `Bearer ${token.access_token}` };
		const [profile, workspaceResult] = await Promise.all([
			managementRequest<{
				id?: string;
				username: string;
				avatar?: string | null;
				is_root?: boolean;
				is_active?: boolean;
			}>("/login/test-token", { method: "POST", headers: authHeaders }),
			managementRequest<{ data: Array<{ workspace: { id?: string } }> }>(
				"/system/workspaces/me",
				{ headers: authHeaders },
			),
		]);
		const workspaceId = workspaceResult.data[0]?.workspace.id;
		if (!workspaceId) throw new Error("当前账户未加入任何工作区");
		if (profile.is_root)
			throw new Error("管理员请使用管理后台，采集终端仅供采集员登录");
		const session: Session = {
			access_token: token.access_token,
			workspace_id: workspaceId,
			user: {
				id: profile.id ?? profile.username,
				username: profile.username,
				avatar: profile.avatar || "avatar-sky",
				name: profile.username,
				email: profile.username,
				role: "OPERATOR",
				status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
				work_region: "",
				phone: "",
				company: "",
				work_serial_number: "",
				sex: "",
				height_cm: null,
				cooperation_mode: "",
			},
		};
		saveSession(session);
		const member = await managementRequest<WorkspaceMemberProfile>(
			"/workspace/workspace-members/me",
		).catch(() => null);
		if (member) {
			session.user = {
				...session.user,
				name: member.employee_name || session.user.name,
				email: member.email || session.user.email,
				phone: member.mobile || "",
				work_region: member.work_region || "",
				company: member.company || "",
				work_serial_number: member.work_serial_number || "",
				sex: member.sex || "",
				height_cm: member.height_cm ?? null,
				cooperation_mode: member.cooperation_mode || "",
			};
			saveSession(session);
		}
		return session;
	},
	logout: () => {
		localStorage.removeItem(SESSION_KEY);
		clearCurrentTask();
		window.dispatchEvent(new Event(SESSION_EVENT));
	},
	validateSession: () =>
		managementRequest<{ username: string }>("/login/test-token", {
			method: "POST",
		}),
	refreshProfile: async () => {
		const session = loadManagementSession();
		if (!session) throw new Error("未登录");
		const member = await managementRequest<WorkspaceMemberProfile>(
			"/workspace/workspace-members/me",
		);
		session.user = {
			...session.user,
			name: member.employee_name || session.user.name,
			email: member.email || session.user.email,
			phone: member.mobile || "",
			work_region: member.work_region || "",
			company: member.company || "",
			work_serial_number: member.work_serial_number || "",
			sex: member.sex || "",
			height_cm: member.height_cm ?? null,
			cooperation_mode: member.cooperation_mode || "",
		};
		saveSession(session);
		return session.user;
	},
	me: async () =>
		loadManagementSession()?.user ?? Promise.reject(new Error("未登录")),
	updateProfile: async (profile: ManagementAccount) => {
		const currentSession = loadManagementSession();
		if (!currentSession) throw new Error("未登录");
		const username =
			profile.username ||
			currentSession.user.username ||
			currentSession.user.email;
		await managementRequest("/system/users/me", {
			method: "PUT",
			body: JSON.stringify({ username, avatar: profile.avatar || null }),
		});
		const member = await managementRequest<WorkspaceMemberProfile>(
			"/workspace/workspace-members/me",
			{
				method: "PUT",
				body: JSON.stringify({
					employee_name: profile.name,
					sex: profile.sex || null,
					mobile: profile.phone || null,
					email: profile.email || null,
					work_region: profile.work_region || null,
					company: profile.company || null,
					cooperation_mode: profile.cooperation_mode || null,
					height_cm: profile.height_cm,
				}),
			},
		);
		const session = loadManagementSession();
		if (!session) throw new Error("未登录");
		session.user = {
			...profile,
			name: member.employee_name || profile.name,
			phone: member.mobile || "",
			email: member.email || profile.email,
			work_region: member.work_region || "",
			company: member.company || "",
			cooperation_mode: member.cooperation_mode || "",
			work_serial_number: member.work_serial_number || "",
			sex: member.sex || "",
			height_cm: member.height_cm ?? null,
		};
		saveSession(session);
		return session;
	},
	kits: async () => {
		const page = await managementRequest<{ data: ProductKit[] }>(
			"/ego/product-kits/?limit=100&status=ACTIVE",
		);
		return page.data;
	},
	terminalConfig: () =>
		managementRequest<TerminalConfig>("/ego/device-bindings/mine/config"),
	tasks: async (
		filters: {
			q?: string;
			scene_type?: string;
			task_no?: string;
			limit?: number;
		} = {},
	) => {
		const params = new URLSearchParams({ limit: String(filters.limit ?? 100) });
		if (filters.q) params.set("q", filters.q);
		if (filters.scene_type) params.set("scene_type", filters.scene_type);
		if (filters.task_no) params.set("task_no", filters.task_no);
		const tasks = await managementRequest<RawCaptureTask[]>(
			`/ego/collection-tasks/mine/available?${params}`,
		);
		return tasks.map(mapCaptureTask);
	},
	currentTask: async () => {
		const task = await managementRequest<RawCaptureTask | null>(
			"/ego/collection-tasks/mine/current",
		);
		return task ? mapCaptureTask(task) : null;
	},
	claimTask: async (taskId: string, input?: TaskClaimInput) => {
		const task = await managementRequest<RawCaptureTask>(
			`/ego/collection-tasks/${taskId}/claim`,
			{
				method: "POST",
				body: input ? JSON.stringify(input) : undefined,
			},
		);
		return mapCaptureTask(task);
	},
	startTask: async (taskId: string) =>
		mapCaptureTask(
			await managementRequest<RawCaptureTask>(
				`/ego/collection-tasks/${taskId}/start`,
				{ method: "POST" },
			),
		),
	pauseTask: async (taskId: string) =>
		mapCaptureTask(
			await managementRequest<RawCaptureTask>(
				`/ego/collection-tasks/${taskId}/pause`,
				{ method: "POST" },
			),
		),
	completeTask: async (taskId: string) =>
		mapCaptureTask(
			await managementRequest<RawCaptureTask>(
				`/ego/collection-tasks/${taskId}/complete`,
				{ method: "POST" },
			),
		),
	abandonTask: async (taskId: string) =>
		mapCaptureTask(
			await managementRequest<RawCaptureTask>(
				`/ego/collection-tasks/${taskId}/abandon`,
				{ method: "POST" },
			),
		),
	records: () =>
		managementRequest<ManagementRecord[]>(
			"/ego/collection-records/mine?limit=500",
		),
	reportRecording: (recording: {
		task_id?: string;
		name: string;
		size_bytes: number;
		duration_seconds?: number;
		recorded_at: string;
	}) =>
		managementRequest<ManagementRecord>("/ego/collection-records/", {
			method: "POST",
			body: JSON.stringify({
				record_no: recording.name,
				task_id: recording.task_id,
				file_name: recording.name,
				file_size_bytes: recording.size_bytes,
				duration_seconds: recording.duration_seconds ?? 0,
				captured_at: recording.recorded_at,
			}),
		}),
	feedback: (category: string, content: string) =>
		managementRequest("/ego/feedback/", {
			method: "POST",
			body: JSON.stringify({ category, content }),
		}),
	cloudStorage: async () => {
		const page = await managementRequest<{ data: CloudStorageConfig[] }>(
			"/ego/cloud-storage/?limit=100",
		);
		return page.data;
	},
	saveCloudStorage: async (config: CloudStorageConfig) => {
		const data = {
			name: config.name,
			provider: config.provider,
			endpoint: config.endpoint,
			bucket: config.bucket,
			region: config.region,
		};
		if (config.id)
			return managementRequest<CloudStorageConfig>(
				`/ego/cloud-storage/${config.id}`,
				{ method: "PUT", body: JSON.stringify(data) },
			);
		return managementRequest<CloudStorageConfig>("/ego/cloud-storage/", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},
	releaseVersions: async () => {
		const page = await managementRequest<{ data: ReleaseVersion[] }>(
			"/ego/release-versions/?limit=100&status=PUBLISHED",
		);
		return page.data;
	},
};
