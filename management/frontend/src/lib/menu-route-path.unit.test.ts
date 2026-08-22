import { describe, expect, test } from "vitest";
import type { MenuTreeNode } from "@/api/schemas";
import { collectMenuRoutePaths } from "./menu-route-path";

describe("collectMenuRoutePaths", () => {
	test("内嵌菜单授权 /iframe 路由而非外链 URL", () => {
		const menus: MenuTreeNode[] = [
			{
				name: "内嵌页",
				type: 4,
				path: "https://car.vendetech.com:801/dashboard",
			},
		];

		expect(collectMenuRoutePaths(menus)).toEqual(new Set(["/iframe"]));
	});

	test("外链菜单不加入可访问路由", () => {
		const menus: MenuTreeNode[] = [
			{
				name: "外链",
				type: 3,
				path: "https://example.com",
			},
		];

		expect(collectMenuRoutePaths(menus)).toEqual(new Set());
	});

	test("普通菜单拼接嵌套路由", () => {
		const menus: MenuTreeNode[] = [
			{
				name: "系统",
				type: 0,
				path: "system",
				children: [
					{
						name: "角色",
						type: 1,
						path: "roles",
					},
				],
			},
		];

		expect(collectMenuRoutePaths(menus)).toEqual(
			new Set(["/system", "/system/roles"]),
		);
	});

	test("工作区菜单使用 workspace 根路径匹配实际文件路由", () => {
		const menus: MenuTreeNode[] = [
			{
				name: "工作区设置",
				type: 0,
				path: "workspace",
				children: [
					{ name: "部门管理", type: 1, path: "business-lines" },
					{ name: "角色权限", type: 1, path: "roles" },
					{ name: "工作区成员", type: 1, path: "workspace-members" },
				],
			},
		];

		expect(collectMenuRoutePaths(menus)).toEqual(
			new Set([
				"/workspace",
				"/workspace/business-lines",
				"/workspace/roles",
				"/workspace/workspace-members",
			]),
		);
	});
});
