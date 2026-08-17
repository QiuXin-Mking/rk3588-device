import {
	Activity,
	ChevronRight,
	Database,
	HardDrive,
	Languages,
	Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Navigate, Notify } from "../../app/model";
import { api, type DeviceStatus } from "../../services/deviceApi";
import { useI18n } from "../../shared/i18n/I18n";
import { Brand, PageHeader } from "../../shared/ui/DevicePrimitives";
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export function SettingsScreen({
	status,
	back,
	go,
	notify,
}: {
	status: DeviceStatus;
	back: () => void;
	go: Navigate;
	notify: Notify;
}) {
	const { locale, toggleLocale } = useI18n();
	const [postCapture, setPostCapture] = useState(true);
	useEffect(() => {
		api
			.settings()
			.then((value) => setPostCapture(value.postCaptureEnabled))
			.catch(() => undefined);
	}, []);

	const changePostCapture = async (next: boolean) => {
		setPostCapture(next);
		try {
			await api.saveSettings(next);
			notify("设置已保存");
		} catch {
			setPostCapture(!next);
			notify("保存失败");
		}
	};

	return (
		<div className="page detail-page">
			<PageHeader title="设置" subtitle="本机采集设置" back={back} />
			<Card className="grid min-h-0 flex-1 grid-rows-5 overflow-hidden [&>button]:grid [&>button]:grid-cols-[86px_1fr_auto] [&>button]:items-center [&>button]:gap-[18px] [&>button]:border-0 [&>button]:border-b [&>button]:border-border [&>button]:bg-transparent [&>button]:px-6 [&>button]:text-left [&>button:last-child]:border-b-0 [&>div]:grid [&>div]:grid-cols-[86px_1fr_auto] [&>div]:items-center [&>div]:gap-[18px] [&>div]:border-b [&>div]:border-border [&>div]:px-6 [&_small]:mt-1 [&_small]:block [&_small]:text-[length:var(--device-text-xs)] [&_small]:text-muted-foreground [&_strong]:block [&_strong]:text-[length:var(--device-text-md)]">
				<div>
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-sky-500/10 text-sky-500 [&>svg]:size-[38px]">
						<Wrench />
					</span>
					<span>
						<strong>录制后自动处理</strong>
						<small>停止录制后自动解码 IMU 数据</small>
					</span>
					<Switch size="device" checked={postCapture} onCheckedChange={changePostCapture} aria-label="录制后自动处理" />
				</div>
				<button onClick={toggleLocale}>
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-violet-500/10 text-violet-500 [&>svg]:size-[38px]">
						<Languages />
					</span>
					<span>
						<strong>界面语言</strong>
						<small>
							{locale === "zh" ? "当前：简体中文" : "Current: English"}
						</small>
					</span>
					<span className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-muted px-[18px] text-[length:var(--device-text-xs)] text-muted-foreground">
						{locale === "zh" ? "切换" : "Switch"}
					</span>
				</button>
				<div>
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-emerald-500/10 text-emerald-500 [&>svg]:size-[38px]">
						<HardDrive />
					</span>
					<span>
						<strong>存储位置</strong>
						<small>{status.storage.mount || "默认录制目录"}</small>
					</span>
					<strong>{status.storage.pct}%</strong>
				</div>
				<button onClick={() => go("cloud-settings")}>
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-violet-500/10 text-violet-500 [&>svg]:size-[38px]">
						<Database />
					</span>
					<span>
						<strong>数据存储与云端</strong>
						<small>本地、OSS、BOS、OBS、COS</small>
					</span>
					<ChevronRight />
				</button>
				<button onClick={() => go("diagnostics")}>
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-sky-500/10 text-sky-500 [&>svg]:size-[38px]">
						<Activity />
					</span>
					<span>
						<strong>采集诊断</strong>
						<small>IMU、Tracker 与 Topic 状态</small>
					</span>
					<ChevronRight />
				</button>
			</Card>
		</div>
	);
}

export function AboutScreen({ back }: { back: () => void }) {
	const mode = useUiMode();
	if (mode === "mobile") {
		return (
			<div className="page detail-page flex min-h-full flex-col gap-4 pb-6">
				<PageHeader title="关于" back={back} />
				<Card className="overflow-hidden p-5">
					<div className="flex items-center gap-3 border-b border-border pb-5">
						<span className="grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Activity className="size-7" /></span>
						<div><h2 className="text-xl font-extrabold">SensorHub</h2><p className="mt-1 text-xs text-muted-foreground">设备采集终端</p></div>
					</div>
					<p className="py-5 text-sm leading-6 text-muted-foreground">面向智能穿戴、双目相机与多传感器数据采集的一体化设备界面。</p>
					<dl className="grid grid-cols-2 gap-2.5">
						{[["界面版本", "React 终端版"], ["目标平台", "Debian 11 · ARM64"], ["物理屏幕", "5.5 英寸"], ["显示模式", "设备端 / H5"]].map(([label, value]) => <div className="grid min-w-0 gap-1 rounded-lg bg-secondary p-3" key={label}><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="break-words text-sm font-semibold leading-5">{value}</dd></div>)}
					</dl>
				</Card>
				<Card className="p-5 shadow-none"><h3 className="text-lg font-bold">版本记录</h3><div className="mt-4 grid gap-4"><div><strong className="text-sm text-primary">v1.1.0</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">移动端适配、Safe Area、云存储与任务工作流界面</p></div><div><strong className="text-sm text-primary">v1.0.0</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">RK3588 设备采集终端初始版本</p></div></div></Card>
			</div>
		);
	}
	return (
		<div className="page detail-page">
			<PageHeader title="关于" subtitle="SensorHub 设备采集终端" back={back} />
			<Card className="grid min-h-0 flex-1 grid-cols-[320px_1fr] content-center gap-x-12 gap-y-6 p-10 [&>.brand]:col-span-2">
				<Brand />
				<p className="col-span-2 m-0 text-[length:var(--device-text-sm)] text-muted-foreground">面向智能穿戴、双目相机与多传感器数据采集的一体化设备界面。</p>
				<dl className="grid grid-cols-2 gap-3 [&>div]:rounded-xl [&>div]:bg-secondary [&>div]:p-5 [&_dd]:mt-2 [&_dd]:text-[length:var(--device-text-md)] [&_dd]:font-bold [&_dt]:text-[length:var(--device-text-xs)] [&_dt]:text-muted-foreground">
					<div>
						<dt>界面版本</dt>
						<dd>React 终端版</dd>
					</div>
					<div>
						<dt>目标平台</dt>
						<dd>Debian 11 · ARM64</dd>
					</div>
					<div>
						<dt>物理屏幕</dt>
						<dd>5.5 英寸</dd>
					</div>
					<div>
						<dt>显示模式</dt>
						<dd>设备横屏 / H5 响应式</dd>
					</div>
				</dl>
				<div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-6">
					<h3 className="text-[length:var(--device-text-lg)] font-bold">版本记录</h3>
					<p className="mt-4 text-[length:var(--device-text-sm)] text-muted-foreground">
						<strong>v1.1.0</strong> 移动端适配、Safe
						Area、云存储与任务工作流界面
					</p>
					<p className="mt-3 text-[length:var(--device-text-sm)] text-muted-foreground">
						<strong>v1.0.0</strong> RK3588 设备采集终端初始版本
					</p>
				</div>
			</Card>
		</div>
	);
}
