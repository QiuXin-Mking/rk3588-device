import { describe, expect, it } from "vitest";
import { makeUuid } from "./id";

describe("makeUuid", () => {
	it("returns an RFC 4122 v4 UUID", () => {
		const uuid = makeUuid();

		expect(uuid).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it("returns different values on repeated calls", () => {
		const first = makeUuid();
		const second = makeUuid();

		expect(first).not.toBe(second);
	});
});
