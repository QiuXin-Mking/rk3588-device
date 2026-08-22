import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Network, Trash2, Users } from "lucide-react";
import type { RolePublic } from "@/api/schemas";
import { ResponsiveActionGroup } from "@/components/shared";
import { DataTableColumnHeader } from "@/components/table";
import { Badge } from "@/components/ui/badge";

type Role = RolePublic;

interface ColumnProps {
	onEdit: (role: Role) => void;
	onDelete: (role: Role) => void;
	onAssignMenus: (role: Role) => void;
	onViewMembers: (role: Role) => void;
}

export function getColumns({
	onEdit,
	onDelete,
	onAssignMenus,
	onViewMembers,
}: ColumnProps): ColumnDef<Role>[] {
	return [
		{
			accessorKey: "role_name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="角色名称" />
			),
		},
		{
			accessorKey: "business_line_name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="业务线" />
			),
			cell: ({ row }) => row.original.business_line_name || "-",
		},
		{
			accessorKey: "sort",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="排序" />
			),
		},
		{
			accessorKey: "is_active",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="状态" />
			),
			cell: ({ row }) => {
				const isActive = row.original.is_active;
				return (
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? "启用" : "禁用"}
					</Badge>
				);
			},
		},
		{
			accessorKey: "remark",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="备注" />
			),
			cell: ({ row }) => row.original.remark || "-",
		},
		{
			id: "actions",
			header: "操作",
			meta: {
				className:
					"sticky right-0 w-[1%] bg-background/80 backdrop-blur shadow-[inset_1px_0_0_hsl(var(--border)),-2px_0_5px_rgba(0,0,0,0.05)]",
			},
			cell: ({ row }) => {
				const role = row.original;
				return (
					<ResponsiveActionGroup
						actions={[
							{
								key: "members",
								label: "使用成员",
								icon: Users,
								permissionCode: "roles:read",
								onClick: () => onViewMembers(role),
							},
							{
								key: "edit",
								label: "编辑",
								icon: Edit,
								permissionCode: "roles:update",
								onClick: () => onEdit(role),
							},
							{
								key: "menus",
								label: "分配菜单",
								icon: Network,
								permissionCode: "roles:assign_menus",
								onClick: () => onAssignMenus(role),
							},
							{
								key: "delete",
								label: "删除",
								icon: Trash2,
								danger: true,
								permissionCode: "roles:delete",
								onClick: () => onDelete(role),
							},
						]}
					/>
				);
			},
		},
	];
}
