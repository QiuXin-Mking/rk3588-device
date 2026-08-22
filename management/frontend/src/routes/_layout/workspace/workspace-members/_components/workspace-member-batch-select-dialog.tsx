import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type {
	WorkspaceMemberPublic,
	WorkspaceMembersReadWorkspaceMembersParams,
} from "@/api/schemas";
import { workspaceMembersReadWorkspaceMembers } from "@/api/workspace-members/workspace-members";
import {
	FilterBusinessLineMultiPicker,
	type FilterValues,
} from "@/components/filters";
import { Badge } from "@/components/ui/badge";
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

type BatchMode = "enable" | "add-roles";

interface WorkspaceMemberBatchSelectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: BatchMode;
	initialBusinessLineIds: string[];
	baseFilters: WorkspaceMembersReadWorkspaceMembersParams;
	onConfirm: (memberIds: string[]) => void;
}

async function loadAllMatchingMembers(
	filters: WorkspaceMembersReadWorkspaceMembersParams,
): Promise<WorkspaceMemberPublic[]> {
	const members: WorkspaceMemberPublic[] = [];
	let skip = 0;

	while (true) {
		const response = await workspaceMembersReadWorkspaceMembers({
			...filters,
			skip,
			limit: 500,
		});
		if (response.status !== 200) {
			throw new Error("加载业务线成员失败");
		}

		members.push(...response.data.data);
		if (
			members.length >= response.data.count ||
			response.data.data.length === 0
		) {
			return members;
		}
		skip += response.data.data.length;
	}
}

export function WorkspaceMemberBatchSelectDialog({
	open,
	onOpenChange,
	mode,
	initialBusinessLineIds,
	baseFilters,
	onConfirm,
}: WorkspaceMemberBatchSelectDialogProps) {
	const [businessLineIds, setBusinessLineIds] = useState(
		initialBusinessLineIds,
	);
	const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
	const filters: FilterValues = { business_line_ids: businessLineIds };

	const { data: members = [], isFetching } = useQuery({
		queryKey: [
			"workspace-member-batch-candidates",
			baseFilters,
			businessLineIds,
		],
		queryFn: () =>
			loadAllMatchingMembers({
				...baseFilters,
				business_line_ids: businessLineIds,
			}),
		enabled: open && businessLineIds.length > 0,
	});
	const candidateIds = members.flatMap((member) =>
		member.id ? [member.id] : [],
	);
	const allSelected =
		candidateIds.length > 0 &&
		candidateIds.every((memberId) => selectedMemberIds.includes(memberId));

	const toggleMember = (memberId: string, checked: boolean) => {
		setSelectedMemberIds((current) =>
			checked
				? [...current, memberId]
				: current.filter((currentId) => currentId !== memberId),
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{mode === "enable"
							? "选择要开启账号的成员"
							: "选择要增加角色的成员"}
					</DialogTitle>
					<DialogDescription>
						先选择业务线，再勾选本次批量处理的成员。
					</DialogDescription>
				</DialogHeader>

				<FilterBusinessLineMultiPicker
					filterKey="business_line_ids"
					label="业务线"
					filters={filters}
					onFilterChange={(_, value) => {
						setBusinessLineIds(value ? value.split(",").filter(Boolean) : []);
						setSelectedMemberIds([]);
					}}
					placeholder="请选择业务线..."
				/>

				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						匹配 {members.length} 人，已选 {selectedMemberIds.length} 人
					</span>
					{candidateIds.length > 0 && (
						<label
							htmlFor="select-all-batch-members"
							className="flex items-center gap-2"
						>
							<Checkbox
								id="select-all-batch-members"
								checked={allSelected}
								onCheckedChange={(checked) =>
									setSelectedMemberIds(checked === true ? candidateIds : [])
								}
							/>
							全选
						</label>
					)}
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
					{businessLineIds.length === 0 ? (
						<p className="p-6 text-center text-sm text-muted-foreground">
							请先选择业务线
						</p>
					) : isFetching ? (
						<p className="p-6 text-center text-sm text-muted-foreground">
							加载成员中...
						</p>
					) : members.length === 0 ? (
						<p className="p-6 text-center text-sm text-muted-foreground">
							当前业务线没有匹配成员
						</p>
					) : (
						<div className="flex flex-col divide-y">
							{members.map((member) => {
								if (!member.id) return null;
								const memberId = member.id;
								return (
									<label
										key={memberId}
										htmlFor={`batch-member-${memberId}`}
										className="flex items-center gap-3 p-3"
									>
										<Checkbox
											id={`batch-member-${memberId}`}
											checked={selectedMemberIds.includes(memberId)}
											onCheckedChange={(checked) =>
												toggleMember(memberId, checked === true)
											}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">
												{member.employee_name || "未命名成员"}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{[member.job_number, member.main_dept]
													.filter(Boolean)
													.join(" · ") || "暂无工号和部门信息"}
											</span>
										</span>
										<Badge variant={member.is_active ? "default" : "secondary"}>
											{member.is_active ? "启用" : "禁用"}
										</Badge>
									</label>
								);
							})}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button
						disabled={selectedMemberIds.length === 0 || isFetching}
						onClick={() => onConfirm(selectedMemberIds)}
					>
						{mode === "enable" ? "下一步：开启账号" : "下一步：增加角色"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
