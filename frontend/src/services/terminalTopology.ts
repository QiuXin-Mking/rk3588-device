import type { RecordStatus } from "./deviceApi";
import type {
	DeviceBinding,
	KitDeviceSlot,
	TerminalConfig,
} from "./managementApi";

export type HardwareState = "online" | "offline" | "unknown";

export type TerminalChannelView = {
	id: string;
	label: string;
	serviceKey: string;
	state: HardwareState;
	previewUrl?: string;
};

export type TerminalDeviceView = {
	id: string;
	role: string;
	label: string;
	model: string;
	required: boolean;
	state: HardwareState;
	entity?: DeviceBinding;
	channels: TerminalChannelView[];
};

function reportedState(
	record: RecordStatus,
	serviceKey: string,
): HardwareState {
	if (!serviceKey) return "unknown";
	if (serviceKey === "imu") {
		return record.imu === undefined
			? "unknown"
			: record.imu
				? "online"
				: "offline";
	}
	if (!record.cameras || !(serviceKey in record.cameras)) return "unknown";
	return record.cameras[serviceKey] ? "online" : "offline";
}

function channelsForSlot(
	slot: KitDeviceSlot,
	instanceId: string,
	record: RecordStatus,
): TerminalChannelView[] {
	const labels = slot.channel_labels ?? [];
	const keys = slot.channel_keys ?? [];
	const count = Math.max(slot.channel_count ?? 0, labels.length);
	return Array.from({ length: count }, (_, index) => {
		const serviceKey = keys[index] ?? "";
		const state = reportedState(record, serviceKey);
		return {
			id: `${instanceId}-channel-${index + 1}`,
			label: labels[index] || `视频通道 ${index + 1}`,
			serviceKey,
			state,
			previewUrl: serviceKey
				? `/api/camera/preview/${encodeURIComponent(serviceKey)}`
				: undefined,
		};
	});
}

export function buildTerminalTopology(
	config: TerminalConfig | undefined,
	record: RecordStatus,
): TerminalDeviceView[] {
	const template = config?.template;
	if (!template) return [];
	const devicesByRole = new Map<string, DeviceBinding[]>();
	for (const device of config.devices) {
		const roleDevices = devicesByRole.get(device.slot_role) ?? [];
		roleDevices.push(device);
		devicesByRole.set(device.slot_role, roleDevices);
	}

	return [...(template.device_slots ?? [])]
		.sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
		.flatMap((slot) =>
			Array.from({ length: slot.quantity ?? 1 }, (_, index) => {
				const id = `${slot.role}-${index + 1}`;
				const entity = devicesByRole.get(slot.role)?.[index];
				const state = reportedState(record, slot.service_key ?? "");
				return {
					id,
					role: slot.role,
					label:
						(slot.quantity ?? 1) > 1
							? `${slot.label} ${index + 1}`
							: slot.label,
					model: slot.device_model,
					required: slot.required ?? true,
					state,
					entity,
					channels: channelsForSlot(slot, id, record),
				};
			}),
		);
}

export function hardwareStateLabel(state: HardwareState) {
	if (state === "online") return "在线";
	if (state === "offline") return "离线";
	return "未获取";
}
