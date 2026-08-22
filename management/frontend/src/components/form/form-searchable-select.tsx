import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
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

export type SearchableSelectOption = {
	label: string;
	value: string;
	/** Extra text used for input matching; defaults to label. */
	searchText?: string;
	/** Shown in dropdown; defaults to label. */
	description?: string;
};

function normalizeSearchText(value: string) {
	return value.trim().toLowerCase();
}

export function FormSearchableSelect<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	options,
	placeholder = "请输入关键词搜索...",
	searchPlaceholder = "输入关键词匹配...",
	emptyText = "未找到匹配项",
	className,
	tooltip,
	popoverClassName,
}: FormFieldBaseProps<TFormData> & {
	options: SearchableSelectOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	popoverClassName?: string;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setSearchValue("");
		}
	};

	const filteredOptions = useMemo(() => {
		const needle = normalizeSearchText(searchValue);
		if (!needle) {
			return options;
		}
		return options.filter((option) => {
			const haystack = normalizeSearchText(option.searchText ?? option.label);
			return haystack.includes(needle);
		});
	}, [options, searchValue]);

	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const valueStr = field.state.value ? String(field.state.value) : "";
				const selectedOption = options.find(
					(option) => option.value === valueStr,
				);

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
							<Popover modal open={open} onOpenChange={handleOpenChange}>
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
											{selectedOption?.label ?? placeholder}
										</span>
										<ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
									</button>
								</PopoverTrigger>
								<PopoverContent
									className={cn(
										"w-[min(520px,var(--radix-popover-content-available-width))] p-0",
										popoverClassName,
									)}
									align="start"
								>
									<Command shouldFilter={false}>
										<CommandInput
											placeholder={searchPlaceholder}
											value={searchValue}
											onValueChange={setSearchValue}
										/>
										<CommandList className="max-h-72">
											<CommandEmpty>{emptyText}</CommandEmpty>
											<CommandGroup>
												{filteredOptions.map((option) => (
													<CommandItem
														key={option.value}
														value={option.value}
														className="items-start py-2"
														onSelect={(currentValue) => {
															field.handleChange(currentValue);
															handleOpenChange(false);
														}}
													>
														<Check
															className={cn(
																"mt-0.5 mr-2 h-4 w-4 shrink-0",
																valueStr === option.value
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														<div className="min-w-0 space-y-0.5">
															<div className="truncate font-medium">
																{option.label}
															</div>
															{option.description ? (
																<div className="line-clamp-2 text-xs text-muted-foreground">
																	{option.description}
																</div>
															) : null}
														</div>
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
