import {
	ChevronRight,
	Eye,
	EyeOff,
	Radio,
	RefreshCw,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import { useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Notify } from "../../app/model";
import {
	api,
	type DeviceStatus,
	type WifiNetwork,
} from "../../services/deviceApi";
import { EmptyState, PageHeader } from "../../shared/ui/DevicePrimitives";
import { TouchKeyboard } from "../../shared/ui/TouchKeyboard";
import { MobileWifiView } from "./mobile/MobileWifiView";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export function WifiScreen({
	status,
	back,
	notify,
	refreshStatus,
}: {
	status: DeviceStatus;
	back: () => void;
	notify: Notify;
	refreshStatus: () => Promise<void>;
}) {
	const mode = useUiMode();
	const [networks, setNetworks] = useState<WifiNetwork[]>([]);
	const [scanning, setScanning] = useState(false);
	const [pendingNetwork, setPendingNetwork] = useState<WifiNetwork | null>(
		null,
	);
	const [hotspot, setHotspot] = useState(false);

	const scan = async () => {
		setScanning(true);
		try {
			setNetworks((await api.wifiScan()).networks);
		} catch {
			notify("WiFi 扫描失败");
		} finally {
			setScanning(false);
		}
	};

	const connect = async (network: WifiNetwork, password: string) => {
		try {
			const result = await api.wifiConnect(network.ssid, password);
			if (!result.ok) throw new Error(result.error || "连接失败");
			notify(`已连接 ${network.ssid}`);
			setPendingNetwork(null);
			await refreshStatus();
		} catch (error) {
			notify(error instanceof Error ? error.message : "连接失败");
		}
	};

	const chooseNetwork = (network: WifiNetwork) => {
		const secured = Boolean(
			network.security && !/^none$/i.test(network.security),
		);
		if (secured) setPendingNetwork(network);
		else connect(network, "");
	};

	const disconnect = async () => {
		await api.wifiDisconnect();
		notify("WiFi 已断开");
		refreshStatus();
	};

	const toggleHotspot = () => {
		setHotspot((value) => !value);
		notify(`热点${hotspot ? "已关闭" : "配置已保存在页面，待系统接口接入"}`);
	};

	if (mode === "mobile") {
		return <>
			<MobileWifiView status={status} networks={networks} scanning={scanning} hotspot={hotspot} back={back} scan={scan} chooseNetwork={chooseNetwork} disconnect={disconnect} toggleHotspot={toggleHotspot} />
			{pendingNetwork && <PasswordDialog mobile network={pendingNetwork} onCancel={() => setPendingNetwork(null)} onConnect={(password) => connect(pendingNetwork, password)} />}
		</>;
	}

	return (
		<div className="page detail-page">
			<PageHeader
				title="WiFi 设置"
				subtitle={
					status.wifi.connected ? `已连接 ${status.wifi.ssid}` : "当前未连接"
				}
				back={back}
				action={
					<Button className="size-20 rounded-xl" size="icon-touch" variant="outline" onClick={scan} aria-label="扫描网络">
						<RefreshCw className={scanning ? "animate-spin" : ""} />
					</Button>
				}
			/>
			<div className="grid min-h-0 flex-1 grid-cols-[.7fr_1.3fr] gap-[var(--gap)]">
				<Card className="grid min-h-0 grid-cols-[110px_1fr] content-center items-center gap-6 p-[34px]">
					<Wifi className="size-[92px] text-sky-500" />
					<div className="min-w-0">
						<strong className="block truncate text-[length:var(--device-text-xl)]">
							{status.wifi.connected ? status.wifi.ssid : "未连接网络"}
						</strong>
						<small className="mt-3 block truncate text-[length:var(--device-text-sm)] text-muted-foreground">
							{status.wifi.connected
								? `信号 ${status.wifi.signal}%`
								: "请扫描并选择网络"}
						</small>
					</div>
					{status.wifi.connected && (
						<Button
							className="col-span-2"
							size="device"
							variant="destructive"
								onClick={disconnect}
						>
							断开
						</Button>
					)}
				</Card>
				<Card className="flex min-h-0 flex-col p-[26px]">
					<div className="flex items-center justify-between gap-5">
						<h2 className="text-[length:var(--device-text-lg)] font-bold">可用网络</h2>
						<span className="text-[length:var(--device-text-sm)] text-muted-foreground">{scanning ? "扫描中…" : `${networks.length} 个`}</span>
					</div>
					<div className="local-scroll mt-4 min-h-0 flex-1">
						{networks.length ? (
							networks.map((network) => (
								<button
									className="grid min-h-28 w-full grid-cols-[62px_minmax(0,1fr)_auto_40px] items-center gap-[18px] border-0 border-t border-border bg-transparent px-5 text-left text-foreground"
									key={network.ssid}
									onClick={() => chooseNetwork(network)}
								>
									<Wifi className="size-[42px] text-sky-500" />
									<span className="min-w-0">
										<strong className="block truncate text-[length:var(--device-text-md)]">{network.ssid}</strong>
										<small className="mt-1 block truncate text-[length:var(--device-text-xs)] text-muted-foreground">{network.security || "开放网络"}</small>
									</span>
									<em className="text-[length:var(--device-text-sm)] not-italic text-muted-foreground">{network.signal}%</em>
									<ChevronRight className="size-8 text-muted-foreground" />
								</button>
							))
						) : (
							<EmptyState
								icon={<WifiOff />}
								title={scanning ? "正在扫描" : "尚未扫描网络"}
								action={
									<Button size="device" variant="secondary" onClick={scan}>
										开始扫描
									</Button>
								}
							/>
						)}
					</div>
				</Card>
				<Card className="col-span-2 grid min-h-28 grid-cols-[92px_1fr_auto] items-center gap-5 px-6">
					<span className="grid size-[76px] place-items-center rounded-[20px] bg-violet-500/10 text-violet-500 [&>svg]:size-[38px]">
						<Radio />
					</span>
					<div className="min-w-0">
						<strong className="block text-[length:var(--device-text-md)]">设备热点</strong>
						<small className="mt-1 block truncate text-[length:var(--device-text-xs)] text-muted-foreground">
							{hotspot
								? "SensorHub-RK3588 · 192.168.4.1"
								: "关闭时仅使用上方 WiFi 网络"}
						</small>
					</div>
					<Button
						size="device"
						variant={hotspot ? "default" : "secondary"}
						onClick={toggleHotspot}
					>
						{hotspot ? "关闭热点" : "开启热点"}
					</Button>
				</Card>
			</div>
			{pendingNetwork && (
				<PasswordDialog
					network={pendingNetwork}
					onCancel={() => setPendingNetwork(null)}
					onConnect={(password) => connect(pendingNetwork, password)}
				/>
			)}
		</div>
	);
}

function PasswordDialog({
	mobile = false,
	network,
	onCancel,
	onConnect,
}: {
	mobile?: boolean;
	network: WifiNetwork;
	onCancel: () => void;
	onConnect: (password: string) => void;
}) {
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const applyKey = (key: string) => {
		setPassword((current) =>
			key === "backspace" ? current.slice(0, -1) : `${current}${key}`,
		);
	};
	if (mobile) {
		return <Dialog open onOpenChange={open => !open && onCancel()}>
			<DialogContent className="top-auto bottom-[max(.75rem,env(safe-area-inset-bottom))] translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
				<DialogHeader>
					<DialogTitle>连接 {network.ssid}</DialogTitle>
					<DialogDescription>输入该 WiFi 网络的密码。</DialogDescription>
				</DialogHeader>
				<label className="grid gap-2"><span className="text-sm font-medium">WiFi 密码</span><div className="relative"><Input autoFocus className="h-11 pr-11" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="请输入密码" /><Button className="absolute right-0 top-0" size="icon-touch" variant="ghost" onClick={() => setShowPassword(value => !value)} type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></label>
				<DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
					<Button size="touch" variant="outline" onClick={onCancel}>取消</Button>
					<Button size="touch" onClick={() => onConnect(password)}>连接</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>;
	}
	return (
		<div
			className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-10 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label="输入 WiFi 密码"
		>
			<Card className="max-h-[88vh] w-[min(1120px,92vw)] overflow-y-auto rounded-3xl border-blue-500/25 shadow-2xl">
				<header className="flex min-h-[120px] items-center justify-between gap-6 border-b border-border px-[34px] py-[18px]">
					<div>
						<span className="text-[length:var(--device-text-xs)] text-muted-foreground">连接网络</span>
						<h2 className="mt-1 text-[length:var(--device-text-xl)] font-bold">{network.ssid}</h2>
					</div>
					<Button className="size-20" size="icon-touch" variant="outline" onClick={onCancel} aria-label="关闭">
						<X />
					</Button>
				</header>
				<label className="mx-[34px] my-5 grid gap-3 text-[length:var(--device-text-sm)]">
					<span>WiFi 密码</span>
					<div className="grid grid-cols-[1fr_92px] gap-3">
						<input
							className="min-h-[88px] rounded-xl border border-border bg-secondary px-5 text-[length:var(--device-text-md)] outline-none focus:border-blue-500"
							type={showPassword ? "text" : "password"}
							value={password}
							readOnly
							inputMode="none"
							placeholder="请输入密码"
						/>
						<Button
							className="h-full w-full [&_svg]:size-8"
							variant="outline"
							onClick={() => setShowPassword((value) => !value)}
							aria-label={showPassword ? "隐藏密码" : "显示密码"}
						>
							{showPassword ? <EyeOff /> : <Eye />}
						</Button>
					</div>
				</label>
				<TouchKeyboard onKey={applyKey} onDone={() => onConnect(password)} />
				<div className="grid grid-cols-2 gap-3 border-t border-border p-5">
					<Button size="device" variant="outline" onClick={onCancel}>
						取消
					</Button>
					<Button
						size="device"
						onClick={() => onConnect(password)}
					>
						连接
					</Button>
				</div>
			</Card>
		</div>
	);
}
