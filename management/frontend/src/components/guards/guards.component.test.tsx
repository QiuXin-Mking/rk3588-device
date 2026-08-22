import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AuthGuard } from "./auth-guard";
import { RouteGuard } from "./route-guard";

vi.mock("@/hooks/use-permissions", () => ({
	usePermissions: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		useRouterState: vi.fn(),
		Link: ({ children, to }: any) => <a href={to}>{children}</a>,
	};
});

import * as routerModule from "@tanstack/react-router";
// Need to import the mocked module to change return values per test
import * as usePermissionsModule from "@/hooks/use-permissions";

describe("Guards 测试", () => {
	describe("AuthGuard", () => {
		test("有权限时渲染内容", async () => {
			vi.spyOn(usePermissionsModule, "usePermissions").mockReturnValue({
				hasPermission: (code?: string) => code === "test:code",
				canAccessRoute: () => true,
				isLoading: false,
			});

			await render(
				<AuthGuard code="test:code">
					<div data-testid="auth-content">Authorized Content</div>
				</AuthGuard>,
			);

			await expect.element(page.getByTestId("auth-content")).toBeVisible();
		});

		test("无权限时不渲染内容", async () => {
			vi.spyOn(usePermissionsModule, "usePermissions").mockReturnValue({
				hasPermission: () => false,
				canAccessRoute: () => true,
				isLoading: false,
			});

			await render(
				<AuthGuard code="test:code">
					<div data-testid="auth-content">Authorized Content</div>
				</AuthGuard>,
			);

			await expect
				.element(page.getByTestId("auth-content"))
				.not.toBeInTheDocument();
		});
	});

	describe("RouteGuard", () => {
		test("权限加载中展示加载态", async () => {
			vi.spyOn(routerModule, "useRouterState").mockReturnValue(
				"/settlement/config/business-line" as any,
			);

			vi.spyOn(usePermissionsModule, "usePermissions").mockReturnValue({
				hasPermission: () => false,
				canAccessRoute: () => false,
				isLoading: true,
			});

			await render(
				<RouteGuard>
					<div data-testid="route-content">Settlement Content</div>
				</RouteGuard>,
			);

			await expect.element(page.getByText("正在加载权限...")).toBeVisible();
			await expect
				.element(page.getByTestId("route-content"))
				.not.toBeInTheDocument();
		});

		test("允许访问根路径 /", async () => {
			vi.spyOn(routerModule, "useRouterState").mockReturnValue("/" as any);

			vi.spyOn(usePermissionsModule, "usePermissions").mockReturnValue({
				hasPermission: () => false,
				canAccessRoute: () => false, // returns false but / bypasses
				isLoading: false,
			});

			await render(
				<RouteGuard>
					<div data-testid="route-content">Root Content</div>
				</RouteGuard>,
			);

			await expect.element(page.getByTestId("route-content")).toBeVisible();
		});

		test("拦截无权限路由访问并展示无权限提示", async () => {
			vi.spyOn(routerModule, "useRouterState").mockReturnValue("/admin" as any);

			vi.spyOn(usePermissionsModule, "usePermissions").mockReturnValue({
				hasPermission: () => false,
				canAccessRoute: () => false, // Access denied
				isLoading: false,
			});

			await render(
				<RouteGuard>
					<div data-testid="route-content">Secret Content</div>
				</RouteGuard>,
			);

			await expect
				.element(page.getByTestId("route-content"))
				.not.toBeInTheDocument();
			await expect.element(page.getByText("无权访问该页面")).toBeVisible();
		});
	});
});
