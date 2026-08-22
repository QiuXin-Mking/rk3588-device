import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ManagementAccount } from "../../../services/managementApi";
import { MobileAccountView } from "./MobileAccountView";

const profile: ManagementAccount = {
	id: "operator",
	name: "压力采集员",
	email: "stress@ego.test",
	role: "OPERATOR",
	status: "ACTIVE",
	work_region: "上海",
	phone: "13800000000",
	company: "Ego QA",
	work_serial_number: "QA-0020",
	sex: "男",
	height_cm: 175,
	cooperation_mode: "FULL_TIME",
};

describe("MobileAccountView button and field coverage", () => {
	it("fills every field and uses edit, save, and logout actions", () => {
		const setEditing = vi.fn();
		const setProfile = vi.fn();
		const save = vi.fn();
		const logout = vi.fn();
		render(
			<MobileAccountView
				back={vi.fn()}
				editing
				profile={profile}
				saving={false}
				setEditing={setEditing}
				setProfile={setProfile}
				save={save}
				logout={logout}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
		fireEvent.click(screen.getByRole("button", { name: "紫色头像" }));
		for (const [index, input] of screen.getAllByRole("textbox").entries())
			fireEvent.change(input, { target: { value: `移动压力字段-${index}` } });
		fireEvent.change(screen.getByRole("spinbutton"), {
			target: { value: "198" },
		});
		for (const select of screen.getAllByRole("combobox"))
			fireEvent.change(select, {
				target: {
					value: select.querySelector('option[value="PART_TIME"]')
						? "PART_TIME"
						: "女",
				},
			});
		fireEvent.click(screen.getByRole("button", { name: "保存资料" }));
		fireEvent.click(screen.getByRole("button", { name: /退出/ }));
		expect(setEditing).toHaveBeenCalledWith(false);
		expect(setProfile).toHaveBeenCalledWith(
			expect.objectContaining({ avatar: "avatar-violet" }),
		);
		expect(save).toHaveBeenCalledOnce();
		expect(logout).toHaveBeenCalledOnce();
	});
});
