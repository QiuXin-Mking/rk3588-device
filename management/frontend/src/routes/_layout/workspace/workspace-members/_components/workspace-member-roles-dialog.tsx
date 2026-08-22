import { useState } from "react";
import { toast } from "sonner";
import type { WorkspaceMemberPublic } from "@/api/schemas";
import {
	useWorkspaceMembersReadWorkspacememberRoles,
	useWorkspaceMembersSetWorkspacememberRoles,
} from "@/api/workspace-members/workspace-members";
import { useWorkspaceRolesReadRoleOptions } from "@/api/workspace-roles/workspace-roles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Member = WorkspaceMemberPublic;

export interface WorkspaceMemberRolesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	member: Member | null;
}

export function WorkspaceMemberRolesDialog({
	open,
	onOpenChange,
	member,
}: WorkspaceMemberRolesDialogProps) {
	// null = user hasn't touched anything yet → fall back to server data
	const [userEdits, setUserEdits] = useState<string[] | null>(null);

	// Fetch all available roles (options: active, unpaginated)
	const { data: rolesData, isLoading: rolesLoading } =
		useWorkspaceRolesReadRoleOptions({
			query: { enabled: open },
		});

	const roles = rolesData?.status === 200 ? rolesData.data : [];

	// Fetch member's current role assignments
	const { data: currentRolesData, isLoading: currentRolesLoading } =
		useWorkspaceMembersReadWorkspacememberRoles(member?.id ?? "", {
			query: { enabled: open && !!member?.id },
		});

	// Derive effective selection: user edits take priority, otherwise use server data
	const serverRoleIds =
		currentRolesData?.status === 200 ? (currentRolesData.data as string[]) : [];
	const selectedRoleIds = userEdits ?? serverRoleIds;

	const updateMutation = useWorkspaceMembersSetWorkspacememberRoles({
		mutation: {
			onSuccess: () => {
				toast.success("角色分配成功");
				onOpenChange(false);
			},
			onError: (err) => toast.error((err as Error).message),
		},
	});

	const handleSubmit = () => {
		if (!member?.id) return;
		updateMutation.mutate({
			memberId: member.id,
			data: {
				role_ids: selectedRoleIds,
			},
		});
	};

	const toggleRole = (roleId: string, checked: boolean) => {
		if (checked) {
			setUserEdits([...selectedRoleIds, roleId]);
		} else {
			setUserEdits(selectedRoleIds.filter((id) => id !== roleId));
		}
	};

	const isLoading = rolesLoading || currentRolesLoading;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>分配角色 - {member?.employee_name}</DialogTitle>
					<DialogDescription>
						批量为当前成员分配可以在工作区内使用的职务角色
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
					<p className="text-sm text-muted-foreground mb-4">
						请选择要分配给该成员的角色：
					</p>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">加载角色中...</p>
					) : (
						<div className="space-y-3">
							{roles?.map((role) => {
								if (!role.id) return null;
								const isChecked = selectedRoleIds.includes(role.id);
								return (
									<div key={role.id} className="flex items-center space-x-2">
										<Checkbox
											id={`role-${role.id}`}
											checked={isChecked}
											onCheckedChange={(checked) =>
												toggleRole(role.id as string, checked as boolean)
											}
										/>
										<label
											htmlFor={`role-${role.id}`}
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											{role.role_name}
										</label>
									</div>
								);
							})}
						</div>
					)}
				</div>
				<div className="flex justify-end gap-2 pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={updateMutation.isPending}
					>
						取消
					</Button>
					<Button onClick={handleSubmit} disabled={updateMutation.isPending}>
						保存
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
