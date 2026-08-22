import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("merges multiple class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("ignores falsy values", () => {
		expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
	});

	it("resolves tailwind conflicts — last one wins", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
		expect(cn("text-sm", "text-lg")).toBe("text-lg");
	});

	it("handles array inputs from clsx", () => {
		expect(cn(["foo", "bar"])).toBe("foo bar");
	});

	it("returns empty string when no classes provided", () => {
		expect(cn()).toBe("");
	});
});
