import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { MenuTreeNode } from "@/api/schemas";
import { ResponsiveActionGroup } from "@/components/shared";
import { Badge } from "@/components/ui/badge";

interface ColumnsProps {
	onCreateChild: (menu: MenuTreeNode) => void;
	onEdit: (menu: MenuTreeNode) => void;
	onDelete: (menu: MenuTreeNode) => void;
}

export function getColumns({
	onCreateChild,
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<MenuTreeNode>[] {
	return [
		{
			accessorKey: "name",
			header: "菜单名称",
			cell: ({ row, getValue }) => {
				const depth = row.depth;
				return (
					<div
						className="flex items-center"
						style={{ paddingLeft: `${depth * 1.5}rem` }}
					>
						{row.getCanExpand() ? (
							<button
								type="button"
								onClick={row.getToggleExpandedHandler()}
								className="mr-2 cursor-pointer p-0.5"
							>
								{row.getIsExpanded() ? (
									<ChevronDown className="h-4 w-4" />
								) : (
									<ChevronRight className="h-4 w-4" />
								)}
							</button>
						) : (
							<span className="mr-2 inline-block w-4" /> // Placeholder for alignment
						)}
						<span className="font-medium">{getValue() as string}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "type",
			header: "类型",
			cell: ({ row }) => {
				const type = row.original.type;
				const labelMap: Record<number, string> = {
					0: "目录",
					1: "菜单",
					2: "按钮",
					3: "外部链接",
					4: "内嵌页面",
				};
				return (
					<Badge variant="outline">
						{type !== undefined ? labelMap[type] : "未知"}
					</Badge>
				);
			},
		},
		{
			accessorKey: "path",
			header: "路由/组件",
			cell: ({ row }) => {
				const isExternal = row.original.type === 3;
				const isIframe = row.original.type === 4;
				return (
					<div className="flex flex-col text-xs space-y-1">
						{row.original.path ? (
							<span className="text-muted-foreground">
								{isExternal ? "外链: " : isIframe ? "内嵌: " : "路由: "}
								{row.original.path}
							</span>
						) : (
							<span className="text-muted-foreground">-</span>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "permission_code",
			header: "权限标识",
			cell: ({ row }) => {
				return (
					<span className="text-sm">{row.original.permission_code || "-"}</span>
				);
			},
		},
		{
			accessorKey: "sort",
			header: "排序",
			cell: ({ row }) => {
				return row.original.sort;
			},
		},
		{
			accessorKey: "is_active",
			header: "状态",
			cell: ({ row }) => (
				<Badge variant={row.original.is_active ? "default" : "secondary"}>
					{row.original.is_active ? "启用" : "禁用"}
				</Badge>
			),
		},
		{
			accessorKey: "created_at",
			header: "创建时间",
			cell: ({ row }) => {
				const val = row.original.created_at;
				if (!val) return "-";
				return (
					<div className="text-xs text-muted-foreground">
						{dayjs(val).format("YYYY-MM-DD HH:mm:ss")}
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "操作",
			meta: {
				className:
					"sticky right-0 w-[1%] bg-background/80 backdrop-blur shadow-[inset_1px_0_0_hsl(var(--border)),-2px_0_5px_rgba(0,0,0,0.05)]",
			},
			cell: ({ row }) => {
				const menu = row.original;

				const actions = [
					{
						key: "add-child",
						label: "添加子项",
						icon: Plus,
						onClick: () => onCreateChild(menu),
					},
					{
						key: "edit",
						label: "编辑",
						icon: Pencil,
						onClick: () => onEdit(menu),
					},
					{
						key: "delete",
						label: "删除",
						icon: Trash2,
						danger: true,
						separator: true,
						onClick: () => onDelete(menu),
					},
				];

				return <ResponsiveActionGroup actions={actions} />;
			},
		},
	];
}
