import {
	CheckCircle2,
	ChevronRight,
	CircleUserRound,
	Mail,
	MapPin,
	Pencil,
	Phone,
	ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ManagementAccount } from "../../../services/managementApi";
import { cn } from "../../../shared/lib/cn";
import { PageHeader } from "../../../shared/ui/DevicePrimitives";

export function MobileAccountView({
	back,
	editing,
	profile,
	saving,
	setEditing,
	setProfile,
	save,
	logout,
}: {
	back: () => void;
	editing: boolean;
	profile: ManagementAccount;
	saving: boolean;
	setEditing: (value: boolean) => void;
	setProfile: (value: ManagementAccount) => void;
	save: () => void;
	logout: () => void;
}) {
	const fieldClass =
		"grid gap-1.5 text-xs text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_svg]:size-3.5 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-[.8rem] [&_input]:border [&_input]:border-border [&_input]:bg-secondary [&_input]:px-3 [&_input]:text-sm [&_input]:text-foreground [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-[.8rem] [&_select]:border [&_select]:border-border [&_select]:bg-secondary [&_select]:px-3 [&_select]:text-sm [&_select]:text-foreground disabled:[&_input]:opacity-70 disabled:[&_select]:opacity-70";

	return (
		<div className="page detail-page flex min-h-full flex-col gap-3.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(18.75rem,.42fr)_minmax(0,.58fr)] lg:content-start">
			<PageHeader title="个人资料" back={back} />
			<Card className="grid justify-items-center bg-card p-5 text-center">
				<div
					className={cn(
						"grid size-[4.25rem] place-items-center rounded-[1.4rem] text-white",
						avatarTone(profile.avatar),
					)}
				>
					<CircleUserRound className="size-10" />
				</div>
				<h2 className="mt-3 text-xl font-bold">{profile.name}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{profile.role} · 管理平台账户
				</p>
				<Badge className="mt-2.5" variant="default">
					<CheckCircle2 className="size-3.5" />
					已登录
				</Badge>
				<button
					className="mt-2 inline-flex min-h-11 items-center gap-1.5 border-0 bg-transparent px-2 text-sm font-semibold text-primary"
					onClick={() => setEditing(!editing)}
				>
					<Pencil className="size-4" />
					{editing ? "取消编辑" : "编辑资料"}
				</button>
				{editing && (
					<div className="mt-3 flex gap-2" aria-label="选择头像">
						{avatarOptions.map((option) => (
							<button
								key={option.value}
								className={cn(
									"grid size-11 place-items-center rounded-full border-2 text-white",
									option.className,
									profile.avatar === option.value
										? "border-foreground"
										: "border-transparent",
								)}
								aria-label={option.label}
								aria-pressed={profile.avatar === option.value}
								onClick={() => setProfile({ ...profile, avatar: option.value })}
							>
								<CircleUserRound className="size-6" />
							</button>
						))}
					</div>
				)}
			</Card>
			<Card className="p-4 shadow-none">
				<div className="flex justify-between text-sm">
					<span>资料完整度</span>
					<strong>70%</strong>
				</div>
				<div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
					<i className="block h-full w-[70%] rounded-full bg-primary" />
				</div>
				<p className="mt-2.5 text-xs leading-5 text-muted-foreground">
					补充手机号、公司和身高，便于生成完整采集档案。
				</p>
			</Card>
			<Card className="grid gap-3 p-4 shadow-none lg:col-start-2 lg:row-span-3 lg:row-start-1">
				<label className={fieldClass}>
					<span>昵称</span>
					<input
						value={profile.name}
						onChange={(event) =>
							setProfile({ ...profile, name: event.target.value })
						}
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>账号角色</span>
					<input value={profile.role} disabled />
				</label>
				<label className={fieldClass}>
					<span>性别</span>
					<select
						value={profile.sex}
						onChange={(event) =>
							setProfile({ ...profile, sex: event.target.value })
						}
						disabled={!editing}
					>
						<option value="">未设置</option>
						<option value="男">男</option>
						<option value="女">女</option>
					</select>
				</label>
				<label className={fieldClass}>
					<span>
						<Phone />
						手机号
					</span>
					<input
						value={profile.phone}
						onChange={(event) =>
							setProfile({ ...profile, phone: event.target.value })
						}
						placeholder="未绑定"
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>
						<Mail />
						邮箱
					</span>
					<input
						value={profile.email}
						onChange={(event) =>
							setProfile({ ...profile, email: event.target.value })
						}
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>
						<MapPin />
						作业地区（省/市/县/街道）
					</span>
					<input
						value={profile.work_region}
						onChange={(event) =>
							setProfile({ ...profile, work_region: event.target.value })
						}
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>身高（cm）</span>
					<input
						type="number"
						value={profile.height_cm ?? ""}
						onChange={(event) =>
							setProfile({
								...profile,
								height_cm: event.target.value
									? Number(event.target.value)
									: null,
							})
						}
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>所在公司（省/市/县/街道）</span>
					<input
						value={profile.company}
						onChange={(event) =>
							setProfile({ ...profile, company: event.target.value })
						}
						placeholder="未设置"
						disabled={!editing}
					/>
				</label>
				<label className={fieldClass}>
					<span>合作模式</span>
					<select
						value={profile.cooperation_mode}
						onChange={(event) =>
							setProfile({ ...profile, cooperation_mode: event.target.value })
						}
						disabled={!editing}
					>
						<option value="">未设置</option>
						<option value="PART_TIME">兼职</option>
						<option value="FULL_TIME">全职</option>
					</select>
				</label>
				<label className={fieldClass}>
					<span>作业序列号</span>
					<input value={profile.work_serial_number} disabled />
				</label>
			</Card>
			<Card className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.25rem] p-4 shadow-none">
				<ShieldCheck className="size-6 text-primary" />
				<span className="grid gap-0.5">
					<strong className="text-sm">账户与安全</strong>
					<small className="text-xs text-muted-foreground">
						账号已连接 Omega 管理服务
					</small>
				</span>
				<button
					className="inline-flex min-h-11 items-center border-0 bg-transparent px-2 text-sm font-semibold text-primary"
					onClick={logout}
				>
					退出
					<ChevronRight className="size-4" />
				</button>
			</Card>
			{editing && (
				<Card className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-30 grid grid-cols-1 gap-2 rounded-[1.1rem] bg-card/95 p-2 backdrop-blur-xl">
					<Button variant="default" disabled={saving} onClick={save}>
						{saving ? "保存中…" : "保存资料"}
					</Button>
				</Card>
			)}
		</div>
	);
}

const avatarOptions = [
	{
		value: "avatar-sky",
		label: "蓝色头像",
		className: "bg-gradient-to-br from-sky-500 to-blue-700",
	},
	{
		value: "avatar-violet",
		label: "紫色头像",
		className: "bg-gradient-to-br from-violet-500 to-fuchsia-700",
	},
	{
		value: "avatar-emerald",
		label: "绿色头像",
		className: "bg-gradient-to-br from-emerald-500 to-teal-700",
	},
	{
		value: "avatar-orange",
		label: "橙色头像",
		className: "bg-gradient-to-br from-orange-500 to-rose-700",
	},
] as const;

function avatarTone(value?: string) {
	return (
		avatarOptions.find((option) => option.value === value)?.className ??
		avatarOptions[0].className
	);
}
