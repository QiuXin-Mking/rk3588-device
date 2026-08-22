import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type {
	KitDeviceSlot,
	ProductKitCreate,
	ProductKitPublic,
} from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEVICE_MODEL_OPTIONS, KIT_SLOT_PRESETS } from "@/lib/device-topology";

type KitDraft = {
	code: string;
	name: string;
	product_type: string;
	instructions: string;
	device_slots: KitDeviceSlot[];
};

const emptyDraft = (): KitDraft => ({
	code: "",
	name: "",
	product_type: "Mango 采集套件",
	instructions: "",
	device_slots: [],
});

function draftFromKit(kit?: ProductKitPublic): KitDraft {
	if (!kit) return emptyDraft();
	return {
		code: kit.code,
		name: kit.name,
		product_type: kit.product_type ?? "",
		instructions: kit.instructions ?? "",
		device_slots: (kit.device_slots ?? []).map((slot) => ({ ...slot })),
	};
}

export function KitTopologyDialog({
	open,
	kit,
	isPending,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	kit?: ProductKitPublic;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: ProductKitCreate) => Promise<void>;
}) {
	const [draft, setDraft] = useState<KitDraft>(() => draftFromKit(kit));

	useEffect(() => {
		if (open) setDraft(draftFromKit(kit));
	}, [open, kit]);

	const updateSlot = (index: number, patch: Partial<KitDeviceSlot>) => {
		setDraft((current) => ({
			...current,
			device_slots: current.device_slots.map((slot, slotIndex) =>
				slotIndex === index ? { ...slot, ...patch } : slot,
			),
		}));
	};

	const addSlot = (slot: KitDeviceSlot) => {
		setDraft((current) => ({
			...current,
			device_slots: [
				...current.device_slots,
				{ ...slot, sort: current.device_slots.length + 1 },
			],
		}));
	};

	const submit = async () => {
		await onSubmit({
			code: draft.code.trim(),
			name: draft.name.trim(),
			product_type: draft.product_type.trim() || undefined,
			instructions: draft.instructions.trim() || undefined,
			device_slots: draft.device_slots.map((slot, index) => ({
				...slot,
				role: slot.role.trim(),
				label: slot.label.trim(),
				channel_labels: (slot.channel_labels ?? []).filter(Boolean),
				service_key: slot.service_key?.trim() ?? "",
				channel_keys: (slot.channel_keys ?? []).filter(Boolean),
				channel_count: (slot.channel_labels ?? []).filter(Boolean).length,
				sort: index + 1,
			})),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(1180px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1180px,calc(100vw-2rem))]">
				<DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
					<DialogTitle>{kit ? "编辑套件模板" : "新增套件模板"}</DialogTitle>
					<DialogDescription>
						定义产品允许包含的设备角色和视频通道；实体序列号在“实体套件”和“实体设备”中录入。
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="min-h-0 flex-1">
					<div className="grid grid-cols-2 gap-5 p-6">
						<Field>
							<FieldLabel htmlFor="kit-code">套件编码</FieldLabel>
							<Input
								id="kit-code"
								value={draft.code}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										code: event.target.value,
									}))
								}
								placeholder="例如 MANGO-H6-W2"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="kit-name">套件名称</FieldLabel>
							<Input
								id="kit-name"
								value={draft.name}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								placeholder="例如 Mango 六目双腕套件"
							/>
						</Field>
						<Field className="col-span-2">
							<FieldLabel htmlFor="kit-type">产品类型</FieldLabel>
							<Input
								id="kit-type"
								value={draft.product_type}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										product_type: event.target.value,
									}))
								}
							/>
						</Field>

						<section className="col-span-2 rounded-xl border bg-muted/20">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
								<div>
									<h3 className="font-semibold">设备槽位与通道</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										同一型号可以通过角色区分左腕、右腕等物理位置。
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{KIT_SLOT_PRESETS.map((preset) => (
										<Button
											key={preset.label}
											type="button"
											variant="outline"
											size="sm"
											onClick={() => addSlot(preset.slot)}
										>
											<Plus />
											{preset.label}
										</Button>
									))}
								</div>
							</div>
							<div className="grid gap-3 p-4">
								{draft.device_slots.length === 0 ? (
									<div className="grid min-h-32 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
										点击上方设备类型，添加套件所需设备
									</div>
								) : (
									draft.device_slots.map((slot, index) => (
										<div
											key={`${slot.role}-${slot.device_model}-${slot.sort ?? 0}`}
											className="grid grid-cols-[1.1fr_1fr_1fr_90px_100px_44px] items-end gap-3 rounded-lg border bg-background p-4"
										>
											<Field>
												<FieldLabel>显示名称</FieldLabel>
												<Input
													value={slot.label}
													onChange={(event) =>
														updateSlot(index, { label: event.target.value })
													}
												/>
											</Field>
											<Field>
												<FieldLabel>设备型号</FieldLabel>
												<Select
													value={slot.device_model}
													onValueChange={(value) =>
														updateSlot(index, { device_model: value })
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{DEVICE_MODEL_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</Field>
											<Field>
												<FieldLabel>角色编码</FieldLabel>
												<Input
													value={slot.role}
													onChange={(event) =>
														updateSlot(index, { role: event.target.value })
													}
												/>
											</Field>
											<Field>
												<FieldLabel>数量</FieldLabel>
												<Input
													type="number"
													min={1}
													max={32}
													value={slot.quantity ?? 1}
													onChange={(event) =>
														updateSlot(index, {
															quantity: Number(event.target.value) || 1,
														})
													}
												/>
											</Field>
											<Field className="items-start">
												<FieldLabel>必选设备</FieldLabel>
												<div className="flex h-9 items-center gap-2">
													<Switch
														checked={slot.required ?? true}
														onCheckedChange={(checked) =>
															updateSlot(index, { required: checked })
														}
													/>
													<span className="text-sm">
														{slot.required === false ? "可选" : "必选"}
													</span>
												</div>
											</Field>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label={`删除${slot.label}`}
												onClick={() =>
													setDraft((current) => ({
														...current,
														device_slots: current.device_slots.filter(
															(_, slotIndex) => slotIndex !== index,
														),
													}))
												}
											>
												<Trash2 className="text-destructive" />
											</Button>
											<Field className="col-span-6">
												<div className="flex items-center justify-between gap-3">
													<FieldLabel>视频通道名称</FieldLabel>
													<Badge variant="outline">
														{(slot.channel_labels ?? []).length} 路
													</Badge>
												</div>
												<Input
													value={(slot.channel_labels ?? []).join("，")}
													onChange={(event) =>
														updateSlot(index, {
															channel_labels: event.target.value
																.split(/[，,]/)
																.map((value) => value.trim()),
														})
													}
													placeholder="多个通道用逗号分隔；没有视频可留空"
												/>
											</Field>
											<Field className="col-span-3">
												<FieldLabel>硬件服务设备标识</FieldLabel>
												<Input
													value={slot.service_key ?? ""}
													onChange={(event) =>
														updateSlot(index, {
															service_key: event.target.value,
														})
													}
													placeholder="接口未确定时留空"
												/>
											</Field>
											<Field className="col-span-3">
												<FieldLabel>硬件视频通道标识</FieldLabel>
												<Input
													value={(slot.channel_keys ?? []).join("，")}
													onChange={(event) =>
														updateSlot(index, {
															channel_keys: event.target.value
																.split(/[，,]/)
																.map((value) => value.trim()),
														})
													}
													placeholder="与硬件服务 cameras 字段一致；未知可留空"
												/>
											</Field>
										</div>
									))
								)}
							</div>
						</section>

						<Field className="col-span-2">
							<FieldLabel htmlFor="kit-instructions">使用说明</FieldLabel>
							<Textarea
								id="kit-instructions"
								rows={4}
								value={draft.instructions}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										instructions: event.target.value,
									}))
								}
							/>
						</Field>
					</div>
				</ScrollArea>
				<DialogFooter className="shrink-0 border-t px-6 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						取消
					</Button>
					<Button
						type="button"
						disabled={isPending || !draft.code.trim() || !draft.name.trim()}
						onClick={submit}
					>
						{isPending ? "保存中…" : "保存套件"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
