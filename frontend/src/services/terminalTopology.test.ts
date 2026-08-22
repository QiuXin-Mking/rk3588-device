import { describe, expect, it } from "vitest";
import { FALLBACK_RECORD } from "../app/model";
import type { TerminalConfig } from "./managementApi";
import { buildTerminalTopology } from "./terminalTopology";

const config: TerminalConfig = {
	physical_kit: {
		id: "physical-1",
		serial_number: "KIT-001",
		name: "四目双腕 001",
		template_id: "template-1",
		terminal_serial: "RK-001",
		bound_username: "operator",
		status: "ASSIGNED",
		location: "",
	},
	template: {
		id: "template-1",
		code: "H4-W2",
		name: "四目双腕模板",
		product_type: "Mango",
		instructions: "",
		exam_enabled: false,
		status: "ACTIVE",
		device_slots: [
			{
				role: "head",
				label: "头戴四目",
				device_model: "HEAD_QUAD",
				quantity: 1,
				required: true,
				channel_count: 4,
				channel_labels: ["头戴 1", "头戴 2", "头戴 3", "头戴 4"],
				service_key: "head",
				channel_keys: ["head-1", "head-2"],
				sort: 1,
			},
		],
	},
	devices: [
		{
			id: "head-device",
			serial_number: "HEAD-001",
			pid: "",
			device_name: "四目头戴",
			device_model: "HEAD_QUAD",
			slot_role: "head",
			physical_kit_id: "physical-1",
			status: "UNKNOWN",
			firmware_version: "",
		},
	],
};

describe("buildTerminalTopology", () => {
	it("uses the template for layout and hardware keys for live state", () => {
		const [head] = buildTerminalTopology(config, {
			...FALLBACK_RECORD,
			cameras: { head: true, "head-1": true, "head-2": false },
		});
		expect(head.entity?.serial_number).toBe("HEAD-001");
		expect(head.state).toBe("online");
		expect(head.channels.map((channel) => channel.state)).toEqual([
			"online",
			"offline",
			"unknown",
			"unknown",
		]);
		expect(head.channels[0].previewUrl).toBe("/api/camera/preview/head-1");
	});

	it("keeps configured devices visible when no hardware interface data exists", () => {
		const [head] = buildTerminalTopology(config, {
			...FALLBACK_RECORD,
			cameras: {},
		});
		expect(head.state).toBe("unknown");
		expect(head.channels).toHaveLength(4);
		expect(head.channels.every((channel) => channel.state === "unknown")).toBe(
			true,
		);
	});
});
