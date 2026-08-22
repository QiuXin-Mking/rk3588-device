import { Check, ChevronsUpDown, X } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { useWorkspaceMembersReadWorkspaceMembers } from "@/api/workspace-members/workspace-members";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { FilterValues } from "./types";

export interface FilterWorkspaceMemberMultiPickerProps {
	filterKey: string;
	label?: string;
	filters: FilterValues;
	onFilterChange: (key: string, value: string) => void;
	placeholder?: string;
}

export function FilterWorkspaceMemberMultiPicker({
	filterKey,
	label,
	filters,
	onFilterChange,
	placeholder = "全选所有的成员...",
}: FilterWorkspaceMemberMultiPickerProps) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const debouncedSearch = useDebounce(searchValue, 300);

	// Fetch dropdown list (search-driven)
	const { data: listResponse, isFetching } =
		useWorkspaceMembersReadWorkspaceMembers({
			limit: 50,
			employee_name: debouncedSearch || undefined,
		});

	const members = listResponse?.status === 200 ? listResponse.data.data : [];

	const rawVal = filters[filterKey];
	const value: string[] = rawVal
		? Array.isArray(rawVal)
			? rawVal
			: String(rawVal).split(",")
		: [];

	// Get resolved names for initial display
	const needsResolve = value.length > 0;
	// Always fetch resolved members if value.length > 0
	const { data: resolvedResponse } = useWorkspaceMembersReadWorkspaceMembers(
		{ limit: Math.max(value.length, 1), account_ids: value },
		{ query: { enabled: needsResolve } },
	);

	const resolvedMembers =
		resolvedResponse?.status === 200 ? resolvedResponse.data.data : [];

	// Display logic
	const displayNames = value.map((accountId) => {
		const m =
			resolvedMembers.find((rm) => rm.account_id === accountId) ||
			members.find((rm) => rm.account_id === accountId);
		return m ? m.employee_name : accountId;
	});

	let displayStr: React.ReactNode = placeholder;
	if (value.length > 0) {
		if (value.length <= 2) {
			displayStr = displayNames.join(", ");
		} else {
			displayStr = `${value.length} 已选`;
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) setSearchValue("");
	};

	const toggleOption = (accountId: string) => {
		const newArray = value.includes(accountId)
			? value.filter((id) => id !== accountId)
			: [...value, accountId];
		onFilterChange(filterKey, newArray.length > 0 ? newArray.join(",") : "");
	};

	return (
		<div className="space-y-1">
			{label && (
				<Label className="text-muted-foreground mb-1 block">{label}</Label>
			)}
			<div className="relative">
				<Popover modal={true} open={open} onOpenChange={handleOpenChange}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className={cn(
								"w-full justify-between font-normal",
								value.length > 0 && "pr-8",
								value.length === 0 && "text-muted-foreground",
							)}
						>
							<span className="truncate">{displayStr}</span>
							<ChevronsUpDown className="size-4 shrink-0 opacity-50 ml-2" />
						</Button>
					</PopoverTrigger>
					{value.length > 0 && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label={`清除${label ?? "成员筛选"}`}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onFilterChange(filterKey, "");
							}}
						>
							<X className="size-3.5" />
						</Button>
					)}
					<PopoverContent className="w-[300px] p-0" align="start">
						<Command shouldFilter={false}>
							<CommandInput
								placeholder="按姓名搜索成员..."
								value={searchValue}
								onValueChange={setSearchValue}
							/>
							<CommandList>
								<CommandEmpty>
									{isFetching ? "搜索中..." : "未找到成员"}
								</CommandEmpty>
								<CommandGroup>
									{members.map((member) => {
										const isSelected = value.includes(member.account_id);
										return (
											<CommandItem
												key={member.id}
												value={member.account_id}
												onSelect={() => toggleOption(member.account_id)}
											>
												<div
													className={cn(
														"mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
														isSelected
															? "bg-primary text-primary-foreground"
															: "opacity-50 [&_svg]:invisible",
													)}
												>
													<Check className="h-3 w-3" />
												</div>
												{member.employee_name}
												{member.job_number ? ` (${member.job_number})` : ""}
											</CommandItem>
										);
									})}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
