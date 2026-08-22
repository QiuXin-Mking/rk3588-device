import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as zod from "zod";
import type { MenuCreate, MenuTreeNode } from "@/api/schemas";
import {
	getSystemMenusReadMenusQueryKey,
	getSystemMenusReadMenusTreeQueryKey,
	useSystemMenusCreateMenu,
	useSystemMenusReadMenusOptions,
	useSystemMenusUpdateMenu,
} from "@/api/system-menus/system-menus";
import {
	SystemMenusCreateMenuBody,
	SystemMenusUpdateMenuBody,
} from "@/api/zod/system-menus/system-menus";
import {
	FormButton,
	FormCheckbox,
	FormIconPicker,
	FormInput,
	FormSelect,
} from "@/components/form";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingMenu: MenuTreeNode | null;
	defaultParentId?: string;
}

function flattenOptions(
	nodes: MenuTreeNode[],
	depth = 0,
): { label: string; value: string }[] {
	return nodes.flatMap((node) => {
		const prefix = "—".repeat(depth);
		const current = {
			label: depth > 0 ? `${prefix} ${node.name}` : node.name,
			value: node.id as string,
		};
		if (node.children && node.children.length > 0) {
			return [
				current,
				...flattenOptions(node.children as MenuTreeNode[], depth + 1),
			];
		}
		return [current];
	});
}

export function MenuFormDialog({
	open,
	onOpenChange,
	editingMenu,
	defaultParentId,
}: MenuFormDialogProps) {
	const queryClient = useQueryClient();
	const isEditing = editingMenu != null;

	const { data: optionsData } = useSystemMenusReadMenusOptions();

	const tree =
		optionsData?.status === 200 && Array.isArray(optionsData.data)
			? optionsData.data
			: [];
	const parentOptions = [
		{ label: "无（作为根菜单）", value: "root" },
		...flattenOptions(tree),
	];

	const createMutation = useSystemMenusCreateMenu({
		mutation: {
			onSuccess: () => {
				toast.success("菜单创建成功");
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const updateMutation = useSystemMenusUpdateMenu({
		mutation: {
			onSuccess: () => {
				toast.success("菜单更新成功");
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusTreeQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getSystemMenusReadMenusQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	// @ts-expect-error TanStack Form generic explosion
	const form = useForm<MenuCreate>({
		defaultValues: {
			parent_id: editingMenu?.parent_id ?? defaultParentId ?? "root",
			name: editingMenu?.name ?? "",
			type: editingMenu?.type ?? 0,
			path: editingMenu?.path ?? "",
			icon: editingMenu?.icon ?? "",
			permission_code: editingMenu?.permission_code ?? "",
			sort: editingMenu?.sort ?? 1,
			is_active: editingMenu?.is_active ?? true,
			is_visible: editingMenu?.is_visible ?? true,
			is_cache: editingMenu?.is_cache ?? true,
		},
		validators: {
			onChangeAsync: (isEditing
				? SystemMenusUpdateMenuBody
				: SystemMenusCreateMenuBody
			)
				.extend({
					parent_id: zod
						.union([zod.string().uuid(), zod.literal("root"), zod.null()])
						.optional(),
				})
				.superRefine((data, ctx) => {
					if (data.type === 1) {
						if (!data.path) {
							ctx.addIssue({
								code: "custom",
								path: ["path"],
								message: "菜单类型必须填写路由路径",
							});
						}
					}
					if (data.type === 2 && !data.permission_code) {
						ctx.addIssue({
							code: "custom",
							path: ["permission_code"],
							message: "按钮类型必须填写权限标识",
						});
					}
					if (data.type === 3 && !data.path) {
						ctx.addIssue({
							code: "custom",
							path: ["path"],
							message: "外部链接必须填写链接地址",
						});
					}
				}),
		},
		onSubmit: async ({ value }) => {
			const data = { ...value };
			if (data.parent_id === "root" || !data.parent_id) {
				data.parent_id = null;
			}

			// Clean up hidden fields based on type
			if (data.type === 0) {
				// Directory: no cache
				data.is_cache = false;
			} else if (data.type === 2) {
				// Button: only permission_code matters
				data.path = "";
				data.icon = "";
				data.is_visible = false;
				data.is_cache = false;
			} else if (data.type === 3) {
				// URL: no cache
				data.is_cache = false;
			}

			if (isEditing && editingMenu?.id) {
				updateMutation.mutate({ id: editingMenu.id, data });
			} else {
				createMutation.mutate({ data });
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const typeOptions = [
		{ label: "目录", value: 0 },
		{ label: "菜单", value: 1 },
		{ label: "按钮/api", value: 2 },
		{ label: "外部链接", value: 3 },
		{ label: "内嵌页面", value: 4 },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{isEditing ? "编辑菜单" : "新建菜单"}</DialogTitle>
					<DialogDescription>
						{isEditing ? "修改菜单信息" : "添加新的系统菜单项"}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="h-[450px] pr-4">
					<form action={() => form.handleSubmit()} className="space-y-4 pt-2">
						<form.Subscribe selector={(state) => state.values.type}>
							{(currentType) => {
								// 0=Directory, 1=Menu, 2=Button, 3=URL, 4=Iframe
								const isDirectory = currentType === 0;
								const isMenu = currentType === 1;
								const isButton = currentType === 2;
								const isUrl = currentType === 3;
								const isIframe = currentType === 4;

								const showPath = !isButton; // Directory, Menu, URL, Iframe
								const showIcon = !isButton; // Directory, Menu, URL, Iframe
								const showIsVisible =
									isDirectory || isMenu || isUrl || isIframe;
								const showIsCache = isMenu; // Menu only

								return (
									<>
										<FormSelect
											form={form}
											name="parent_id"
											label="父菜单"
											options={parentOptions}
											placeholder="请选择父菜单"
										/>
										<div className="grid grid-cols-2 gap-4">
											<FormInput
												form={form}
												name="name"
												label="名称"
												placeholder="如: 用户管理"
												required
											/>
											<FormSelect
												form={form}
												name="type"
												label="类型"
												options={typeOptions}
												valueType="number"
											/>
										</div>

										{/* Path row */}
										{showPath && (
											<FormInput
												form={form}
												name="path"
												label={
													isUrl || isIframe ? "链接地址" : "路由路径 (Path)"
												}
												placeholder={
													isUrl || isIframe
														? "如: https://example.com"
														: "如: users (会自动继承父级路由)"
												}
												required={isUrl || isIframe || isMenu}
											/>
										)}

										{/* Permission code + Icon row */}
										<div className="grid grid-cols-2 gap-4">
											<FormInput
												form={form}
												name="permission_code"
												label="权限标识"
												placeholder={
													isButton ? "如: users:delete" : "如: users:*"
												}
												required={isButton}
											/>
											{showIcon && (
												<FormIconPicker
													form={form}
													name="icon"
													label="图标"
													placeholder="选择图标..."
												/>
											)}
										</div>

										<FormInput
											form={form}
											name="sort"
											label="排序"
											type="number"
											placeholder="1"
										/>

										<div className="grid grid-cols-2 gap-4 pt-2">
											<FormCheckbox form={form} name="is_active" label="启用" />
											{showIsVisible && (
												<FormCheckbox
													form={form}
													name="is_visible"
													label="显示"
												/>
											)}
											{showIsCache && (
												<FormCheckbox
													form={form}
													name="is_cache"
													label="缓存"
												/>
											)}
										</div>
									</>
								);
							}}
						</form.Subscribe>

						<div className="flex justify-end gap-2 pt-4">
							<FormButton form={form} disabled={isPending}>
								{isEditing ? "保存" : "创建"}
							</FormButton>
						</div>
					</form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
