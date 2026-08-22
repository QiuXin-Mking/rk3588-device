import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAuthSession, isLoggedIn } from "./auth-session";

describe("auth-session", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("detects whether an access token exists", () => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key: string) =>
				key === "access_token" ? "token" : null,
			),
			setItem: vi.fn(),
			removeItem: vi.fn(),
		});

		expect(isLoggedIn()).toBe(true);
	});

	it("clears all auth session keys", () => {
		const removeItem = vi.fn();

		vi.stubGlobal("localStorage", {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem,
		});

		clearAuthSession();

		expect(removeItem).toHaveBeenCalledWith("access_token");
		expect(removeItem).toHaveBeenCalledWith("workspace_id");
		expect(removeItem).toHaveBeenCalledWith("force_password_change");
	});
});
