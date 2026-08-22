import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_STATUS } from "../../../app/model";
import { managementApi } from "../../../services/managementApi";
import { MobileProfileView } from "./MobileProfileView";

describe("MobileProfileView", () => {
	afterEach(() => vi.restoreAllMocks());
	it("provides the mobile-only help center and backend login entry", () => {
		localStorage.clear();
		const go = vi.fn();
		render(
			<MobileProfileView
				status={FALLBACK_STATUS}
				online={false}
				go={go}
				notify={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /帮助中心/ }));
		expect(go).toHaveBeenCalledWith("help-feedback");
		fireEvent.click(screen.getByRole("button", { name: /登录管理/ }));
		expect(go).toHaveBeenCalledWith("account");
		expect(screen.getByText("未登录操作员")).toBeInTheDocument();
		expect(screen.queryByText(/离线账户/)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "退出登录" }),
		).not.toBeInTheDocument();
	});

	it("opens every populated mobile profile destination and logs out", () => {
		localStorage.setItem(
			"ego-management-session",
			JSON.stringify({
				access_token: "stress",
				workspace_id: "workspace",
				user: {
					id: "operator",
					name: "压力采集员",
					email: "stress@ego.test",
					role: "OPERATOR",
				},
			}),
		);
		const go = vi.fn();
		const notify = vi.fn();
		const logout = vi
			.spyOn(managementApi, "logout")
			.mockImplementation(() => {});
		render(
			<MobileProfileView
				status={FALLBACK_STATUS}
				online
				go={go}
				notify={notify}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /我的信息 头像/ }));
		fireEvent.click(screen.getByRole("button", { name: /帮助中心/ }));
		fireEvent.click(screen.getByRole("button", { name: /关于深灵/ }));
		for (const target of ["account", "help-feedback", "about"]) {
			expect(go).toHaveBeenCalledWith(target);
		}
		fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
		expect(logout).toHaveBeenCalledOnce();
		expect(notify).toHaveBeenCalledWith("已退出管理平台账户");
	});
});
