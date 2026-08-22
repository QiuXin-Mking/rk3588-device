import { useStore } from "@tanstack/react-form";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { useWorkspaceMembersReadWorkspaceMembers } from "@/api/workspace-members/workspace-members";
import { useDebounce } from "@/hooks/use-debounce";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
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

export function FormWorkspaceMemberPicker<TFormData>({
	form,
	name,
	label,
	required,
	className,
	disabled,
	placeholder = "请选择...",
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const debouncedSearch = useDebounce(searchValue, 300);

	const { data: listResponse, isFetching } =
		useWorkspaceMembersReadWorkspaceMembers({
			limit: 50,
			employee_name: debouncedSearch || undefined,
		});

	const members =
		listResponse?.status === 200 ? (listResponse.data.data ?? []) : [];

	// Reactively track the current form value to resolve names for members not in the list
	const currentValue = useStore(
		form.store,
		(state: any) => state.values[name as string],
	);
	const currentValueStr = currentValue ? String(currentValue) : "";
	const needsResolve =
		!!currentValueStr && !members.some((m) => m.account_id === currentValueStr);

	const { data: resolvedResponse } = useWorkspaceMembersReadWorkspaceMembers(
		{
			limit: 1,
			account_ids: currentValueStr
				? currentValueStr
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean)
				: undefined,
		},
		{ query: { enabled: needsResolve } },
	);

	const resolvedMembers =
		resolvedResponse?.status === 200 ? (resolvedResponse.data.data ?? []) : [];

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

				const selectedMember =
					members.find((m) => m.account_id === valueStr) ||
					resolvedMembers.find((m) => m.account_id === valueStr);

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
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
											"flex h-7 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-input/20 px-2 py-0.5 text-xs/relaxed whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 font-normal",
											valueStr && !disabled && "pr-8",
											!valueStr && "text-muted-foreground",
										)}
									>
										<span className="truncate">
											{selectedMember
												? selectedMember.employee_name
												: valueStr
													? "已选择成员"
													: placeholder}
										</span>
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
														onSelect={(currentValue) => {
															field.handleChange(currentValue);
															handleOpenChange(false);
														}}
													>
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																valueStr === member.account_id
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
							{valueStr && !disabled && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={`清除${String(label)}`}
									onPointerDown={(event) => {
										event.preventDefault();
										event.stopPropagation();
										field.handleChange(null);
									}}
								>
									<X className="size-3.5" />
								</Button>
							)}
						</div>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
