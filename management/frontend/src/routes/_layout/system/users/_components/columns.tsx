import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import type { UserPublic } from "@/api/schemas";
import { type ActionItem, ResponsiveActionGroup } from "@/components/shared";
import { DataTableColumnHeader } from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ColumnsOptions {
	onEdit: (user: UserPublic) => void;
	onDelete: (user: UserPublic) => void;
}

export function getColumns({
	onEdit,
	onDelete,
}: ColumnsOptions): ColumnDef<UserPublic>[] {
	return [
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
			accessorKey: "username",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="用户名" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue("username")}</span>
			),
		},
		{
			accessorKey: "is_active",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="状态" />
			),
			cell: ({ row }) => {
				const active = row.getValue("is_active") as boolean;
				return (
					<Badge variant={active ? "default" : "secondary"}>
						{active ? "启用" : "禁用"}
					</Badge>
				);
			},
		},
		{
			accessorKey: "is_root",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="超级管理员" />
			),
			cell: ({ row }) => {
				const root = row.getValue("is_root") as boolean;
				return root ? (
					<Badge variant="destructive">是</Badge>
				) : (
					<span className="text-muted-foreground">否</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="状态码" />
			),
		},
		{
			accessorKey: "last_login",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="最后登录" />
			),
			cell: ({ row }) => {
				const val = row.getValue("last_login") as string | null;
				return val ? new Date(val).toLocaleString() : "-";
			},
		},
		{
			accessorKey: "created_at",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="创建时间" />
			),
			cell: ({ row }) => {
				const val = row.getValue("created_at") as string | null;
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
				const user = row.original;

				const actions: ActionItem[] = [
					{
						key: "edit",
						label: "编辑",
						icon: Pencil,
						onClick: () => onEdit(user),
					},
					{
						key: "delete",
						label: "删除",
						icon: Trash2,
						danger: true,
						separator: true,
						onClick: () => onDelete(user),
					},
				];

				return <ResponsiveActionGroup actions={actions} />;
			},
		},
	];
}
