import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Edit, Shield, Trash2 } from "lucide-react";
import type { WorkspaceMemberPublic } from "@/api/schemas";
import { ResponsiveActionGroup } from "@/components/shared";
import { DataTableColumnHeader } from "@/components/table";
import { Badge } from "@/components/ui/badge";

type Member = WorkspaceMemberPublic;

interface ColumnProps {
	onEdit: (member: Member) => void;
	onDelete: (member: Member) => void;
	onSetupRoles: (member: Member) => void;
}

export function getColumns({
	onEdit,
	onDelete,
	onSetupRoles,
}: ColumnProps): ColumnDef<Member>[] {
	return [
		{
			accessorKey: "employee_name",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="员工姓名" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.employee_name || ""}
				>
					{row.original.employee_name || "-"}
				</span>
			),
		},
		{
			accessorKey: "job_number",
			size: 80,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="工号" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.job_number || ""}
				>
					{row.original.job_number || "-"}
				</span>
			),
		},
		{
			accessorKey: "work_serial_number",
			size: 120,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="作业序列号" />
			),
			cell: ({ row }) => (
				<span
					className="block max-w-full truncate font-mono"
					title={row.original.work_serial_number || ""}
				>
					{row.original.work_serial_number || "待生成"}
				</span>
			),
		},
		{
			accessorKey: "mobile",
			size: 120,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="手机号" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.mobile || ""}
				>
					{row.original.mobile || "-"}
				</span>
			),
		},
		{
			accessorKey: "sex",
			size: 60,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="性别" />
			),
			cell: ({ row }) => row.original.sex || "-",
		},
		{
			accessorKey: "email",
			size: 160,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="邮箱" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.email || ""}
				>
					{row.original.email || "-"}
				</span>
			),
		},
		{
			accessorKey: "telephone",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="座机" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.telephone || ""}
				>
					{row.original.telephone || "-"}
				</span>
			),
		},
		{
			accessorKey: "main_dept",
			size: 120,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="主部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.main_dept || ""}
				>
					{row.original.main_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "first_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="一级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.first_dept || ""}
				>
					{row.original.first_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "second_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="二级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.second_dept || ""}
				>
					{row.original.second_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "third_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="三级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.third_dept || ""}
				>
					{row.original.third_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "fourth_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="四级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.fourth_dept || ""}
				>
					{row.original.fourth_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "fifth_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="五级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.fifth_dept || ""}
				>
					{row.original.fifth_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "sixth_dept",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="六级部门" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.sixth_dept || ""}
				>
					{row.original.sixth_dept || "-"}
				</span>
			),
		},
		{
			accessorKey: "employee_status",
			size: 80,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="在职状态" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.employee_status || ""}
				>
					{row.original.employee_status || "-"}
				</span>
			),
		},
		{
			accessorKey: "employee_type",
			size: 80,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="员工类型" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.employee_type || ""}
				>
					{row.original.employee_type || "-"}
				</span>
			),
		},
		{
			accessorKey: "position",
			size: 100,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="岗位" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.position || ""}
				>
					{row.original.position || "-"}
				</span>
			),
		},
		{
			accessorKey: "report_manager",
			size: 80,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="直属上级" />
			),
			cell: ({ row }) => (
				<span
					className="truncate max-w-full block"
					title={row.original.report_manager || ""}
				>
					{row.original.report_manager || "-"}
				</span>
			),
		},
		{
			accessorKey: "entry_date",
			size: 90,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="入职时间" />
			),
			cell: ({ row }) => {
				const val = row.original.entry_date;
				if (!val) return "-";
				return dayjs(val).format("YYYY-MM-DD");
			},
		},
		{
			accessorKey: "exit_date",
			size: 90,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="离职时间" />
			),
			cell: ({ row }) => {
				const val = row.original.exit_date;
				if (!val) return "-";
				return dayjs(val).format("YYYY-MM-DD");
			},
		},
		{
			accessorKey: "is_active",
			size: 70,
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
			id: "actions",
			size: 120,
			header: "操作",
			meta: {
				className:
					"sticky right-0 w-[1%] bg-background/80 backdrop-blur shadow-[inset_1px_0_0_hsl(var(--border)),-2px_0_5px_rgba(0,0,0,0.05)]",
			},
			cell: ({ row }) => {
				const member = row.original;
				return (
					<ResponsiveActionGroup
						actions={[
							{
								key: "edit",
								label: "编辑",
								icon: Edit,
								permissionCode: "workspace_members:update",
								onClick: () => onEdit(member),
							},
							{
								key: "roles",
								label: "分配角色",
								icon: Shield,
								permissionCode: "workspace_members:assign_roles",
								onClick: () => onSetupRoles(member),
							},
							{
								key: "delete",
								label: "删除",
								icon: Trash2,
								danger: true,
								permissionCode: "workspace_members:delete",
								onClick: () => onDelete(member),
							},
						]}
					/>
				);
			},
		},
	];
}
