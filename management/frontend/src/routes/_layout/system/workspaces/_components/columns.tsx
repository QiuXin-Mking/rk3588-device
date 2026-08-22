import type { ColumnDef } from "@tanstack/react-table";
import { Network, Pencil, Trash2 } from "lucide-react";
import type { WorkspacePublic } from "@/api/schemas";
import { type ActionItem, ResponsiveActionGroup } from "@/components/shared";
import { DataTableColumnHeader } from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface GetColumnsProps {
	onEdit: (workspace: WorkspacePublic) => void;
	onDelete: (workspace: WorkspacePublic) => void;
	onBind: (workspace: WorkspacePublic) => void;
}

export const getColumns = ({
	onEdit,
	onDelete,
	onBind,
}: GetColumnsProps): ColumnDef<WorkspacePublic>[] => [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="工作区名称" />
		),
		cell: ({ row }) => (
			<span className="font-medium">{row.getValue("name")}</span>
		),
	},
	{
		accessorKey: "description",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="描述" />
		),
	},
	{
		accessorKey: "is_active",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="状态" />
		),
		cell: ({ row }) => {
			const active = row.original.is_active;
			return (
				<Badge variant={active ? "default" : "secondary"}>
					{active ? "启用" : "禁用"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "created_at",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="创建时间" />
		),
		cell: ({ row }) => {
			const val = row.original.created_at;
			return val ? new Date(val).toLocaleString() : "-";
		},
	},
	{
		accessorKey: "updated_at",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="更新时间" />
		),
		cell: ({ row }) => {
			const val = row.original.updated_at;
			return val ? new Date(val).toLocaleString() : "-";
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
			const workspace = row.original;

			const actions: ActionItem[] = [
				{
					key: "edit",
					label: "编辑",
					icon: Pencil,
					onClick: () => onEdit(workspace),
				},
				{
					key: "bind",
					label: "绑定菜单",
					icon: Network,
					onClick: () => onBind(workspace),
				},
				{
					key: "delete",
					label: "删除",
					icon: Trash2,
					danger: true,
					separator: true,
					onClick: () => onDelete(workspace),
				},
			];

			return <ResponsiveActionGroup actions={actions} />;
		},
	},
];
