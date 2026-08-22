import type { KitDeviceSlot } from "@/api/schemas";

export const DEVICE_MODEL_OPTIONS = [
	{ value: "HEAD_STEREO", label: "头戴双目" },
	{ value: "HEAD_QUAD", label: "头戴四目" },
	{ value: "HEAD_SIX", label: "头戴六目" },
	{ value: "WRIST_MONO", label: "腕部单目" },
	{ value: "IMU", label: "IMU" },
	{ value: "GLOVE", label: "手套" },
	{ value: "TRACKER", label: "Tracker" },
	{ value: "OTHER", label: "其他设备" },
] as const;

export const KIT_SLOT_PRESETS: Array<{
	label: string;
	slot: KitDeviceSlot;
}> = [
	{
		label: "头戴双目",
		slot: {
			role: "head",
			label: "头戴双目",
			device_model: "HEAD_STEREO",
			quantity: 1,
			required: true,
			channel_count: 2,
			channel_labels: ["头戴 1", "头戴 2"],
			service_key: "jhh02",
			channel_keys: [],
		},
	},
	{
		label: "头戴四目",
		slot: {
			role: "head",
			label: "头戴四目",
			device_model: "HEAD_QUAD",
			quantity: 1,
			required: true,
			channel_count: 4,
			channel_labels: ["头戴 1", "头戴 2", "头戴 3", "头戴 4"],
			service_key: "jhh04",
			channel_keys: [],
		},
	},
	{
		label: "头戴六目",
		slot: {
			role: "head",
			label: "头戴六目",
			device_model: "HEAD_SIX",
			quantity: 1,
			required: true,
			channel_count: 6,
			channel_labels: [
				"头戴 1",
				"头戴 2",
				"头戴 3",
				"头戴 4",
				"头戴 5",
				"头戴 6",
			],
			service_key: "",
			channel_keys: [],
		},
	},
	{
		label: "左腕单目",
		slot: {
			role: "wrist_left",
			label: "左腕单目",
			device_model: "WRIST_MONO",
			quantity: 1,
			required: true,
			channel_count: 1,
			channel_labels: ["左腕"],
			service_key: "jhh2_left",
			channel_keys: ["jhh2_left"],
		},
	},
	{
		label: "右腕单目",
		slot: {
			role: "wrist_right",
			label: "右腕单目",
			device_model: "WRIST_MONO",
			quantity: 1,
			required: true,
			channel_count: 1,
			channel_labels: ["右腕"],
			service_key: "jhh2_right",
			channel_keys: ["jhh2_right"],
		},
	},
	{
		label: "IMU",
		slot: {
			role: "imu",
			label: "IMU",
			device_model: "IMU",
			quantity: 1,
			required: true,
			channel_count: 0,
			channel_labels: [],
			service_key: "imu",
			channel_keys: [],
		},
	},
];
