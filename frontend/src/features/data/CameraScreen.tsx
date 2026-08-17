import { useEffect, useRef, useState } from "react";
import { useUiMode } from "../../app/uiModeContext";
import type { SelectableProduct } from "../../app/product";
import { api, type RecordStatus } from "../../services/deviceApi";
import { CameraFeed, PageHeader } from "../../shared/ui/DevicePrimitives";
import { cameraIsOnline, getSideCameraChannels } from "./dataModel";
import { MobileCameraView } from "./mobile/MobileDataViews";

export function CameraScreen({
	record,
	product,
	back,
}: {
	record: RecordStatus;
	product: SelectableProduct;
	back: () => void;
}) {
	const mode = useUiMode();
	const [stamp, setStamp] = useState(Date.now());
	const recordingRef = useRef(record.recording);
	recordingRef.current = record.recording;
	const sideChannels = getSideCameraChannels(product, {
		leftHand: Boolean(record.gloveSides?.left),
		rightHand: Boolean(record.gloveSides?.right),
		leftWrist: cameraIsOnline(record, [
			"ego_w_left",
			"ego_w_l",
			"wrist_left",
			"jhh2_left",
		]),
		rightWrist: cameraIsOnline(record, [
			"ego_w_right",
			"ego_w_r",
			"wrist_right",
			"jhh2_right",
		]),
	});
	const sidePreviewRoutes =
		product === "Mango" ? ["wrist-left", "wrist-right"] : [];

	useEffect(() => {
		if (!record.cameraConnected) return;
		const timer = window.setInterval(() => setStamp(Date.now()), 850);
		return () => window.clearInterval(timer);
	}, [record.cameraConnected]);

	useEffect(() => {
		if (!record.cameraConnected || record.recording) return;
		api.startLive().catch(() => undefined);
		return () => {
			if (!recordingRef.current) api.stopLive().catch(() => undefined);
		};
	}, [record.cameraConnected, record.recording]);

	const headChannels = [
		{
			title: "头部双目",
			connected: cameraIsOnline(record, [
				"jhh02",
				"stereo",
				"ego_h_stereo",
				"head_stereo",
			]),
			src: `/api/camera/preview/head-stereo?t=${stamp}`,
		},
		{
			title: "头部四目",
			connected: cameraIsOnline(record, [
				"jhh04",
				"four",
				"quad",
				"ego_h_four",
				"head_four",
			]),
			src: `/api/camera/preview/head-four?t=${stamp}`,
		},
	];
	const allChannels = [
		...headChannels,
		...sideChannels.map((channel, index) => ({
			title: channel.label,
			connected: channel.online,
			src: sidePreviewRoutes[index]
				? `/api/camera/preview/${sidePreviewRoutes[index]}?t=${stamp}`
				: undefined,
			note: sidePreviewRoutes[index]
				? "无信号"
				: `${channel.label}视频通道待接入`,
		})),
	];
	const previews = allChannels.map((channel) => (
		<CameraFeed key={channel.title} {...channel} />
	));

	if (mode === "mobile")
		return (
			<MobileCameraView
				back={back}
				previews={previews}
				online={allChannels.filter((channel) => channel.connected).length}
				total={allChannels.length}
			/>
		);

	return (
		<div className="page detail-page">
			<PageHeader
				title="相机"
				subtitle={record.cameraConnected ? "设备实时画面" : "等待相机接入"}
				back={back}
			/>
			<div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4">{previews}</div>
		</div>
	);
}
