import { Info } from "lucide-react";
import { useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { Navigate, Notify } from "../../app/model";
import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { TouchChoice } from "../../shared/ui/TouchChoice";
import { MobileTaskClaimView } from "./mobile/MobileDataViews";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TaskClaimScreen({
	back,
	go,
	notify,
}: {
	back: () => void;
	go: Navigate;
	notify: Notify;
}) {
	const mode = useUiMode();
	const [device, setDevice] = useState("iSuit");
	const [scene, setScene] = useState("家庭收纳");
	const [recent, setRecent] = useState("最近任务");
	const [project, setProject] = useState("未选择");
	const [task, setTask] = useState("未选择");

	const claim = () => {
		if (project === "未选择" || task === "未选择") {
			notify("请选择项目和任务");
			return;
		}
		notify("任务平台接口待接入，已保留当前选择");
		go("capture");
	};

	if (mode === "mobile")
		return (
			<MobileTaskClaimView
				back={back}
				device={device}
				scene={scene}
				project={project}
				task={task}
				setDevice={setDevice}
				setScene={setScene}
				setProject={setProject}
				setTask={setTask}
				claim={claim}
			/>
		);

	return (
		<div className="page detail-page">
			<PageHeader title="任务领取" subtitle="选择本次采集任务" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(600px,.9fr)_minmax(0,1.1fr)] gap-[var(--gap)]">
				<Card className="grid min-h-0 grid-rows-5 gap-px overflow-hidden">
					<TouchChoice
						label="设备类型"
						value={device}
						onChange={setDevice}
						options={["iSuit", "HSuit"]}
					/>
					<TouchChoice
						label="场景类型"
						value={scene}
						onChange={setScene}
						options={["家庭收纳", "办公场景", "工业装配"]}
					/>
					<TouchChoice
						label="任务范围"
						value={recent}
						onChange={setRecent}
						options={["最近任务", "全部任务", "我的任务"]}
					/>
					<TouchChoice
						label="项目名称"
						value={project}
						onChange={setProject}
						options={["未选择", "收纳盒@紫竹家具馆5", "桌面整理采集"]}
					/>
					<TouchChoice
						label="子任务"
						value={task}
						onChange={setTask}
						options={["未选择", "把药盒、药瓶、空药瓶分类", "桌面物品归位"]}
					/>
				</Card>
				<Card className="flex min-h-0 flex-col border-amber-500/20 bg-amber-500/5 p-[26px]">
					<span className="eyebrow">TASK PREVIEW</span>
					<h2 className="my-2 text-[length:var(--device-text-xl)] font-bold">{task === "未选择" ? "请选择子任务" : task}</h2>
					<p className="text-[length:var(--device-text-sm)] text-muted-foreground">任务详情和 SOP 将在任务平台 API 接入后显示。</p>
					<dl className="my-3 grid shrink-0 grid-cols-3 gap-2.5 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:bg-secondary/70 [&>div]:p-2 [&_dd]:mt-0.5 [&_dd]:break-words [&_dd]:text-[length:var(--device-text-sm)] [&_dd]:font-bold [&_dt]:text-[length:var(--device-text-xs)] [&_dt]:text-muted-foreground">
						<div>
							<dt>设备</dt>
							<dd>{device}</dd>
						</div>
						<div>
							<dt>场景</dt>
							<dd>{scene}</dd>
						</div>
						<div>
							<dt>任务编号</dt>
							<dd>TSK-20260815-017</dd>
						</div>
						<div>
							<dt>发布时间</dt>
							<dd>2026-08-15 09:30</dd>
						</div>
						<div>
							<dt>采集地点</dt>
							<dd>上海 · 紫竹家具馆</dd>
						</div>
						<div>
							<dt>GPS</dt>
							<dd>31.12, 121.38</dd>
						</div>
						<div>
							<dt>目标物体</dt>
							<dd>药盒 / 药瓶 / 空药瓶</dd>
						</div>
						<div>
							<dt>单次时长</dt>
							<dd>45–90 秒</dd>
						</div>
						<div>
							<dt>计划次数</dt>
							<dd>30</dd>
						</div>
					</dl>
					<div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-[length:var(--device-text-xs)] text-amber-500">
						<Info />
						<span>
							SOP：依次抓取三类物体，放入对应收纳格；保持目标完整处于头部相机视野。
						</span>
					</div>
					<Button className="mt-3 w-full" size="device-primary" onClick={claim}>
						确认领取
					</Button>
				</Card>
			</div>
		</div>
	);
}
