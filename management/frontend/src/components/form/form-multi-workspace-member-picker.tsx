import { useStore } from "@tanstack/react-form";
import { Check, ChevronsUpDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useWorkspaceMembersReadWorkspaceMembers } from "@/api/workspace-members/workspace-members";
import { useDebounce } from "@/hooks/use-debounce";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../ui/command";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormMultiWorkspaceMemberPicker<TFormData>({
	form,
	name,
	label,
	required,
	className,
	disabled,
	placeholder = "请选择...",
	tooltip,
	action,
}: FormFieldBaseProps<TFormData> & {
	placeholder?: string;
	action?: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const debouncedSearch = useDebounce(searchValue, 300);

	// Local cache: account_id -> name, persists across searches
	const [nameCache, setNameCache] = useState<Record<string, string>>({});

	// Fetch dropdown list (search-driven)
	const { data: listResponse, isFetching } =
		useWorkspaceMembersReadWorkspaceMembers({
			limit: 50,
			employee_name: debouncedSearch || undefined,
		});

	// Reactively track the current form value for resolved query
	const currentValue = useStore(
		form.store,
		(state: any) => state.values[name as string],
	);
	const currentValueStr = currentValue ? String(currentValue) : "";

	// Fetch initially selected members by account_ids for name resolution
	const { data: resolvedResponse } = useWorkspaceMembersReadWorkspaceMembers(
		{
			limit: 50,
			account_ids: currentValueStr
				? currentValueStr
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean)
				: undefined,
		},
		{ query: { enabled: !!currentValueStr } },
	);

	const members = listResponse?.status === 200 ? listResponse.data.data : [];
	const resolvedMembers =
		resolvedResponse?.status === 200 ? resolvedResponse.data.data : [];

	// Resolve name: cache > resolved fetch > dropdown list
	const getDisplayName = (accountId: string) => {
		if (nameCache[accountId]) return nameCache[accountId];
		const fromResolved = resolvedMembers.find(
			(m) => m.account_id === accountId,
		);
		if (fromResolved) return fromResolved.employee_name;
		const fromList = members.find((m) => m.account_id === accountId);
		if (fromList) return fromList.employee_name;
		return null;
	};

	// Reset search on close
	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) setSearchValue("");
	};

	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const valueStr = field.state.value ? String(field.state.value) : "";
				const selectedIds = valueStr
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);

				const handleToggle = (accountId: string) => {
					let newIds: string[];
					if (selectedIds.includes(accountId)) {
						newIds = selectedIds.filter((id) => id !== accountId);
					} else {
						newIds = [...selectedIds, accountId];
						// Cache the name of the newly selected member
						const member = members.find((m) => m.account_id === accountId);
						if (member?.employee_name) {
							setNameCache((prev) => ({
								...prev,
								[accountId]: member.employee_name ?? "",
							}));
						}
					}
					field.handleChange(newIds.length > 0 ? newIds.join(",") : null);
				};

				const handleRemove = (accountId: string, e: React.MouseEvent) => {
					e.stopPropagation();
					const newIds = selectedIds.filter((id) => id !== accountId);
					field.handleChange(newIds.length > 0 ? newIds.join(",") : null);
				};

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel
							htmlFor={`field-${String(name)}`}
							className="flex items-center justify-between gap-3"
						>
							<span className="flex items-center gap-1">
								{label}
								{required && <span className="text-destructive"> *</span>}
								{tooltip && <FieldHint text={tooltip} />}
							</span>
							{action}
						</FieldLabel>
						<Popover modal={true} open={open} onOpenChange={handleOpenChange}>
							<PopoverTrigger asChild>
								<button
									type="button"
									id={`field-${String(name)}`}
									role="combobox"
									aria-expanded={open}
									aria-invalid={invalid}
									disabled={disabled}
									className={cn(
										"flex min-h-7 h-auto w-full items-center justify-between gap-1.5 rounded-md border border-input bg-input/20 px-2 py-0.5 text-xs/relaxed transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 font-normal",
										!valueStr && "text-muted-foreground",
									)}
								>
									<div className="flex flex-wrap items-center gap-1 flex-1">
										{selectedIds.length > 0
											? selectedIds.map((id) => (
													<Badge
														key={id}
														variant="secondary"
														className="font-normal gap-1 pr-1"
													>
														{getDisplayName(id) || "已选成员"}
														{!disabled && (
															<button
																type="button"
																className="cursor-pointer rounded-full hover:bg-muted-foreground/20"
																onClick={(e) => handleRemove(id, e)}
															>
																<X className="h-3 w-3" />
															</button>
														)}
													</Badge>
												))
											: placeholder}
									</div>
									<ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
								</button>
							</PopoverTrigger>
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
											{members.map((member) => (
												<CommandItem
													key={member.id}
													value={member.account_id}
													onSelect={() => handleToggle(member.account_id)}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															selectedIds.includes(member.account_id)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													{member.employee_name}
													{member.job_number ? ` (${member.job_number})` : ""}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
