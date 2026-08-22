import { Loader2, Users } from "lucide-react";
import type { RolePublic } from "@/api/schemas";
import { useWorkspaceRolesReadRoleMembers } from "@/api/workspace-roles/workspace-roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RoleMembersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: RolePublic | null;
}

function getInitials(name: string | null | undefined) {
	const normalizedName = name?.trim();
	return normalizedName ? normalizedName.slice(0, 2) : "成员";
}

export function RoleMembersDialog({
	open,
	onOpenChange,
	role,
}: RoleMembersDialogProps) {
	const roleId = role?.id;
	const { data: response, isLoading } = useWorkspaceRolesReadRoleMembers(
		roleId ?? "",
		{
			query: { enabled: open && !!roleId },
		},
	);
	const members = response?.status === 200 ? response.data : [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle>角色使用成员</DialogTitle>
					<DialogDescription>
						{role && isLoading
							? `正在查询角色「${role.role_name}」的使用成员`
							: role
								? `角色「${role.role_name}」当前由 ${members.length} 位成员使用`
								: "查看角色使用成员"}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="h-[400px] rounded-md border">
					{isLoading ? (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : members.length > 0 ? (
						<div className="divide-y">
							{members.map((member) => (
								<div key={member.id} className="flex items-center gap-3 p-3">
									<Avatar>
										<AvatarFallback>
											{getInitials(member.employee_name)}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate font-medium">
												{member.employee_name || "未填写姓名"}
											</span>
											<Badge
												variant={member.is_active ? "default" : "secondary"}
											>
												{member.is_active ? "启用" : "禁用"}
											</Badge>
										</div>
										<div className="truncate text-muted-foreground">
											{[member.job_number, member.main_dept, member.position]
												.filter(Boolean)
												.join(" · ") || "暂无员工信息"}
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<Users className="size-8" />
							<span>暂无成员使用此角色</span>
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
