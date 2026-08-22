import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	CheckCircle2,
	CloudDownload,
	CloudUpload,
	Hand,
	Play,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Notify } from "../../app/model";
import { useUiMode } from "../../app/uiModeContext";
import {
	loadManagementSession,
	type ManagementAccount,
	managementApi,
} from "../../services/managementApi";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { MobileAccountView } from "./mobile/MobileAccountView";

export function MarketplaceScreen({ back }: { back: () => void }) {
	const mode = useUiMode();
	const devices = [
		{
			icon: <Activity />,
			name: "Ego_H",
			description: "头部 Ego 采集设备",
			tags: ["USB", "双目", "四目"],
		},
		{
			icon: <Hand />,
			name: "UMI_Grippers_L",
			description: "左侧板机夹爪",
			tags: ["展示设备", "暂未开发"],
		},
		{
			icon: <Hand />,
			name: "UMI_Grippers_R",
			description: "右侧板机夹爪",
			tags: ["展示设备", "暂未开发"],
		},
	];
	if (mode === "mobile")
		return (
			<div className="page detail-page flex min-h-full flex-col gap-3 pb-6">
				<PageHeader title="设备展示" back={back} />
				<div className="px-1">
					<h2 className="text-xl font-extrabold">支持的采集设备</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						当前版本仅展示本机已支持或规划中的设备。
					</p>
				</div>
				<section className="grid gap-3 md:grid-cols-2">
					{devices.map((device) => (
						<Card
							className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.2rem] p-4 shadow-none"
							key={device.name}
						>
							<span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary [&>svg]:size-6">
								{device.icon}
							</span>
							<span className="grid min-w-0 gap-1">
								<strong>{device.name}</strong>
								<small className="text-xs text-muted-foreground">
									{device.description}
								</small>
								<span className="mt-1 flex flex-wrap gap-1">
									{device.tags.map((tag) => (
										<Badge key={tag}>{tag}</Badge>
									))}
								</span>
							</span>
							<Badge>离线</Badge>
						</Card>
					))}
				</section>
			</div>
		);
	return (
		<div className="page detail-page">
			<PageHeader title="设备展示" subtitle="仅展示本机支持设备" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-3 gap-[var(--gap)]">
				{devices.map((device) => (
					<CatalogCard key={device.name} {...device} />
				))}
			</div>
		</div>
	);
}

function CatalogCard({
	icon,
	name,
	description,
	tags,
}: {
	icon: React.ReactNode;
	name: string;
	description: string;
	tags: string[];
}) {
	return (
		<Card className="relative grid min-h-0 grid-rows-[1fr_auto] gap-5 border-sky-500/20 bg-sky-500/5 p-7">
			<div className="grid min-h-[220px] place-items-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/5 text-sky-500 [&>svg]:size-24">
				{icon}
			</div>
			<div>
				<span className="eyebrow">SENSORHUB DEVICE</span>
				<h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">
					{name}
				</h2>
				<p className="mt-2 text-[length:var(--device-text-sm)] text-muted-foreground">
					{description}
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					{tags.map((tag) => (
						<Badge size="device" variant="outline" key={tag}>
							{tag}
						</Badge>
					))}
				</div>
			</div>
			<Badge
				className="absolute right-10 top-10"
				size="device"
				variant="secondary"
			>
				离线
			</Badge>
		</Card>
	);
}

export function FeaturedScreen({
	back,
	notify,
}: {
	back: () => void;
	notify: Notify;
}) {
	return (
		<div className="page detail-page">
			<PageHeader title="精选内容" subtitle="采集指南与推荐任务" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-[1.15fr_.85fr] gap-[var(--gap)]">
				<Card className="grid min-h-0 grid-rows-[1fr_auto_auto] gap-6 border-blue-500/25 bg-gradient-to-br from-sky-500/10 to-blue-600/5 p-8">
					<span className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 [&>svg]:size-12">
						<Play />
					</span>
					<div>
						<span className="eyebrow">GETTING STARTED</span>
						<h2 className="mt-3 text-[length:var(--device-text-xl)] font-bold">
							第一次使用 Ego 采集终端
						</h2>
						<p className="mt-3 text-[length:var(--device-text-sm)] text-muted-foreground">
							了解设备检查、任务领取、相机预览和数据录制的完整流程。
						</p>
					</div>
					<Button
						size="device-primary"
						onClick={() => notify("内容播放接口待接入")}
					>
						播放内容
					</Button>
				</Card>
				<Card className="grid min-h-0 grid-rows-3 overflow-hidden">
					<FeatureRow
						icon={<ShieldCheck />}
						title="采集前检查"
						note="确认相机、手套、存储和电量"
					/>
					<FeatureRow
						icon={<Activity />}
						title="高质量动作数据"
						note="保持目标物体处于相机视野内"
					/>
					<FeatureRow
						icon={<CloudUpload />}
						title="数据整理与上报"
						note="完成解码、传输和云端同步"
					/>
				</Card>
			</div>
		</div>
	);
}

function FeatureRow({
	icon,
	title,
	note,
}: {
	icon: React.ReactNode;
	title: string;
	note: string;
}) {
	return (
		<div className="grid grid-cols-[76px_1fr] items-center gap-5 border-b border-border px-6 last:border-b-0">
			<span className="grid size-[68px] place-items-center rounded-xl bg-violet-500/10 text-violet-500 [&>svg]:size-9">
				{icon}
			</span>
			<div>
				<strong className="block text-[length:var(--device-text-md)]">
					{title}
				</strong>
				<small className="mt-1.5 block text-[length:var(--device-text-xs)] text-muted-foreground">
					{note}
				</small>
			</div>
		</div>
	);
}

export function PackageDownloadScreen({
	back,
	notify,
}: {
	back: () => void;
	notify: Notify;
}) {
	const versions = useQuery({
		queryKey: ["management-release-versions"],
		queryFn: managementApi.releaseVersions,
		retry: false,
	});
	const current =
		versions.data?.find(
			(item) => item.platform === "device" && item.is_current,
		) ?? versions.data?.find((item) => item.platform === "device");
	return (
		<div className="page detail-page">
			<PageHeader title="大包下载" subtitle="设备软件与离线资源" back={back} />
			<div className="grid min-h-0 flex-1 grid-rows-[.8fr_1.2fr] gap-[var(--gap)]">
				<Card className="grid grid-cols-[86px_1fr_auto] items-center gap-5 border-emerald-500/25 bg-emerald-500/5 p-7">
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-sky-500/10 text-sky-500 [&>svg]:size-[38px]">
						<CheckCircle2 />
					</span>
					<div>
						<span className="eyebrow">CURRENT VERSION</span>
						<h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">
							设备软件包
						</h2>
						<p className="mt-2 text-[length:var(--device-text-sm)] text-muted-foreground">
							{current?.release_notes ||
								(versions.isError
									? "登录管理平台后可同步版本记录。"
									: "正在读取管理后台版本记录…")}
						</p>
					</div>
					<span className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-muted px-[18px] text-[length:var(--device-text-xs)] text-muted-foreground">
						{current?.version ?? "版本待检测"}
					</span>
				</Card>
				<Card className="grid grid-cols-[120px_1fr_auto] items-center gap-7 border-violet-500/20 bg-violet-500/5 p-8">
					<CloudDownload className="size-24 text-violet-500" />
					<div>
						<h2 className="text-[length:var(--device-text-xl)] font-bold">
							检查可用更新
						</h2>
						<p className="mt-3 text-[length:var(--device-text-sm)] text-muted-foreground">
							版本元数据由管理后台统一下发；安装接口未提供时不操作设备固件。
						</p>
					</div>
					<Button
						size="device"
						disabled={versions.isFetching}
						onClick={async () => {
							const result = await versions.refetch();
							notify(
								result.data?.length
									? `已同步 ${result.data.length} 条版本记录`
									: "暂无可用版本",
							);
						}}
					>
						{versions.isFetching ? "检查中…" : "检查更新"}
					</Button>
				</Card>
			</div>
		</div>
	);
}

export function AccountScreen({
	back,
	notify,
}: {
	back: () => void;
	notify: Notify;
}) {
	const mode = useUiMode();
	const [editing, setEditing] = useState(false);
	const [session, setSession] = useState(loadManagementSession);
	const [profile, setProfile] = useState<ManagementAccount>(
		() =>
			loadManagementSession()?.user ?? {
				id: "",
				name: "",
				email: "",
				role: "OPERATOR",
				status: "ACTIVE",
				work_region: "",
				phone: "",
				company: "",
				work_serial_number: "",
				sex: "",
				height_cm: null,
				cooperation_mode: "",
			},
	);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loggingIn, setLoggingIn] = useState(false);
	const [saving, setSaving] = useState(false);
	const saveProfile = async () => {
		setSaving(true);
		try {
			const next = await managementApi.updateProfile(profile);
			setSession(next);
			setProfile(next.user);
			setEditing(false);
			notify("个人资料已保存到管理后台");
		} catch (error) {
			notify(error instanceof Error ? error.message : "个人资料保存失败");
		} finally {
			setSaving(false);
		}
	};
	const logout = () => {
		managementApi.logout();
		setSession(null);
		notify("已退出管理平台账户");
	};
	if (!session)
		return (
			<div className="page detail-page">
				<PageHeader
					title="账户登录"
					subtitle="登录后同步任务、记录和反馈"
					back={back}
				/>
				<Card className="mx-auto grid w-full max-w-2xl content-center gap-4 p-6 md:p-10">
					<UserRound className="size-12 text-primary" />
					<div>
						<h2 className="text-xl font-bold">登录采集平台</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							采集任务按登录账号下发，不提供离线账号绕过。
						</p>
					</div>
					<label className="grid gap-2 text-sm text-muted-foreground">
						账号
						<input
							className="min-h-12 rounded-xl border border-border bg-secondary px-4 text-foreground"
							autoComplete="username"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</label>
					<label className="grid gap-2 text-sm text-muted-foreground">
						密码
						<input
							className="min-h-12 rounded-xl border border-border bg-secondary px-4 text-foreground"
							autoComplete="current-password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</label>
					<Button
						size={mode === "device" ? "device" : "touch"}
						disabled={loggingIn || !email || !password}
						onClick={async () => {
							setLoggingIn(true);
							try {
								const next = await managementApi.login(email, password);
								setSession(next);
								setProfile(next.user);
								notify("登录成功，任务与记录同步已启用");
							} catch (error) {
								notify(error instanceof Error ? error.message : "登录失败");
							} finally {
								setLoggingIn(false);
							}
						}}
					>
						{loggingIn ? "登录中…" : "登录"}
					</Button>
				</Card>
			</div>
		);
	if (mode === "mobile")
		return (
			<MobileAccountView
				back={back}
				editing={editing}
				profile={profile}
				saving={saving}
				setEditing={setEditing}
				setProfile={setProfile}
				save={saveProfile}
				logout={logout}
			/>
		);
	return (
		<div className="page detail-page">
			<PageHeader title="我的信息" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-[.7fr_1.3fr] gap-[var(--gap)]">
				<Card className="grid content-center justify-items-center gap-5 border-sky-500/25 bg-sky-500/5 p-8 text-center">
					<div className="grid size-32 place-items-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 [&>svg]:size-16">
						<UserRound />
					</div>
					<div>
						<span className="eyebrow">SIGNED IN OPERATOR</span>
						<h2 className="mt-3 text-[length:var(--device-text-xl)] font-bold">
							{session.user.name}
						</h2>
						<p className="mt-3 text-[length:var(--device-text-sm)] text-muted-foreground">
							{session.user.role} · 管理平台账户
						</p>
					</div>
					<Badge
						className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
						size="device"
						variant="outline"
					>
						已登录
					</Badge>
				</Card>
				<Card className="local-scroll min-h-0 overflow-y-auto p-7">
					<div className="flex items-center justify-between gap-5">
						<div>
							<span className="eyebrow">PROFILE</span>
							<h2 className="mt-2 text-[length:var(--device-text-lg)] font-bold">
								个人资料
							</h2>
						</div>
						<Button
							size="device-compact"
							variant="outline"
							onClick={() => setEditing((value) => !value)}
						>
							{editing ? "取消" : "编辑资料"}
						</Button>
					</div>
					<div className="my-5 grid grid-cols-2 gap-4 [&_input]:min-h-16 [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-secondary [&_input]:px-4 [&_input]:text-[length:var(--device-text-xs)] [&_label]:grid [&_label]:gap-2 [&_label>span]:text-[length:var(--device-text-xs)] [&_label>span]:text-muted-foreground [&_select]:min-h-16 [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-secondary [&_select]:px-4 [&_select]:text-[length:var(--device-text-xs)]">
						<label>
							<span>昵称</span>
							<input
								value={profile.name}
								onChange={(event) =>
									setProfile({ ...profile, name: event.target.value })
								}
								disabled={!editing}
							/>
						</label>
						<label>
							<span>角色</span>
							<input value={profile.role} disabled />
						</label>
						<label>
							<span>性别</span>
							<select
								value={profile.sex}
								onChange={(event) =>
									setProfile({ ...profile, sex: event.target.value })
								}
								disabled={!editing}
							>
								<option value="">未设置</option>
								<option>男</option>
								<option>女</option>
							</select>
						</label>
						<label>
							<span>作业地区（省/市/县/街道）</span>
							<input
								value={profile.work_region}
								onChange={(event) =>
									setProfile({ ...profile, work_region: event.target.value })
								}
								disabled={!editing}
							/>
						</label>
						<label>
							<span>手机号</span>
							<input
								value={profile.phone}
								onChange={(event) =>
									setProfile({ ...profile, phone: event.target.value })
								}
								placeholder="未绑定"
								disabled={!editing}
							/>
						</label>
						<label>
							<span>邮箱</span>
							<input
								value={profile.email}
								onChange={(event) =>
									setProfile({ ...profile, email: event.target.value })
								}
								disabled={!editing}
							/>
						</label>
						<label>
							<span>身高</span>
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
								placeholder="cm"
								disabled={!editing}
							/>
						</label>
						<label>
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
						<label>
							<span>合作模式</span>
							<select
								value={profile.cooperation_mode}
								onChange={(event) =>
									setProfile({
										...profile,
										cooperation_mode: event.target.value,
									})
								}
								disabled={!editing}
							>
								<option value="">未设置</option>
								<option value="PART_TIME">兼职</option>
								<option value="FULL_TIME">全职</option>
							</select>
						</label>
						<label>
							<span>作业序列号</span>
							<input value={profile.work_serial_number} disabled />
						</label>
					</div>
					{editing && (
						<Button
							className="w-full"
							size="device"
							disabled={saving}
							onClick={saveProfile}
						>
							{saving ? "保存中…" : "保存资料"}
						</Button>
					)}
					<div className="mt-4">
						<Button
							className="w-full"
							size="device"
							variant="destructive"
							onClick={logout}
						>
							退出账户
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
