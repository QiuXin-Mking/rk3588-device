import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	getWorkspaceMembersReadWorkspaceMembersQueryKey,
	useWorkspaceMembersAddWorkspaceMemberRoles,
} from "@/api/workspace-members/workspace-members";
import { useWorkspaceRolesReadRoleOptions } from "@/api/workspace-roles/workspace-roles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface WorkspaceMemberAddRolesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberIds: string[];
}

export function WorkspaceMemberAddRolesDialog({
	open,
	onOpenChange,
	memberIds,
}: WorkspaceMemberAddRolesDialogProps) {
	const queryClient = useQueryClient();
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const { data: rolesData, isLoading } = useWorkspaceRolesReadRoleOptions({
		query: { enabled: open },
	});
	const roles = rolesData?.status === 200 ? rolesData.data : [];

	const mutation = useWorkspaceMembersAddWorkspaceMemberRoles({
		mutation: {
			onSuccess: (response) => {
				toast.success(
					response.status === 200 ? response.data.message : "角色增加成功",
				);
				queryClient.invalidateQueries({
					queryKey: getWorkspaceMembersReadWorkspaceMembersQueryKey(),
				});
				onOpenChange(false);
			},
			onError: (error) => toast.error((error as Error).message),
		},
	});

	const toggleRole = (roleId: string, checked: boolean) => {
		setSelectedRoleIds((current) =>
			checked
				? [...current, roleId]
				: current.filter((currentRoleId) => currentRoleId !== roleId),
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>批量增加角色</DialogTitle>
					<DialogDescription>
						将所选角色追加给 {memberIds.length}{" "}
						位成员。每位成员已有的角色和权限均会保留。
					</DialogDescription>
				</DialogHeader>

				<div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-4">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">加载角色中...</p>
					) : (
						roles.map((role) => {
							if (!role.id) return null;
							const roleId = role.id;
							return (
								<label
									key={roleId}
									htmlFor={`batch-role-${roleId}`}
									className="flex items-start gap-2"
								>
									<Checkbox
										id={`batch-role-${roleId}`}
										checked={selectedRoleIds.includes(roleId)}
										onCheckedChange={(checked) =>
											toggleRole(roleId, checked === true)
										}
									/>
									<span className="flex min-w-0 flex-col">
										<span className="text-sm font-medium">
											{role.role_name}
										</span>
										{role.business_line_name && (
											<span className="text-xs text-muted-foreground">
												{role.business_line_name}
											</span>
										)}
									</span>
								</label>
							);
						})
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={mutation.isPending}
					>
						取消
					</Button>
					<Button
						onClick={() =>
							mutation.mutate({
								data: {
									member_ids: memberIds,
									role_ids: selectedRoleIds,
								},
							})
						}
						disabled={selectedRoleIds.length === 0 || mutation.isPending}
					>
						确认增加
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
