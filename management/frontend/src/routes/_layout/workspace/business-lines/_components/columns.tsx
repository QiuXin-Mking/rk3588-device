import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Edit, Plus, Trash } from "lucide-react";
import type { BusinessLineTreeNode } from "@/api/schemas";
import { ResponsiveActionGroup } from "@/components/shared";
import { Badge } from "@/components/ui/badge";

interface ColumnCallbacks {
	onCreateChild: (node: BusinessLineTreeNode) => void;
	onEdit: (node: BusinessLineTreeNode) => void;
	onDelete: (node: BusinessLineTreeNode) => void;
}

export function getColumns({
	onCreateChild,
	onEdit,
	onDelete,
}: ColumnCallbacks): ColumnDef<BusinessLineTreeNode>[] {
	return [
		{
			accessorKey: "name",
			header: "业务线名称",
			cell: ({ row }) => {
				const paddingLeft = `${row.depth * 2}rem`;
				return (
					<div
						className="flex items-center"
						style={{ paddingLeft }}
						title={row.original.path ?? undefined}
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
							<span className="mr-2 inline-block w-4" />
						)}
						{row.getValue("name")}
					</div>
				);
			},
		},
		{
			accessorKey: "external_id",
			header: "外联ID",
			cell: ({ row }) => row.getValue("external_id") || "—",
		},
		{
			accessorKey: "status",
			header: "状态",
			cell: ({ row }) => {
				const status = row.getValue("status") as number;
				return (
					<Badge variant={status === 1 ? "default" : "secondary"}>
						{status === 1 ? "启用" : "停用"}
					</Badge>
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
				const node = row.original;

				const actions = [
					{
						key: "add-child",
						label: "添加子项",
						icon: Plus,
						permissionCode: "business_lines:create",
						onClick: () => onCreateChild(node),
					},
					{
						key: "edit",
						label: "编辑",
						icon: Edit,
						permissionCode: "business_lines:update",
						onClick: () => onEdit(node),
					},
					{
						key: "delete",
						label: "删除",
						icon: Trash,
						danger: true,
						separator: true,
						permissionCode: "business_lines:delete",
						onClick: () => onDelete(node),
					},
				];

				return <ResponsiveActionGroup actions={actions} />;
			},
		},
	];
}
