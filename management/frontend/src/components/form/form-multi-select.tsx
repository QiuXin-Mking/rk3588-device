import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormMultiSelect<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	options,
	placeholder = "请选择...",
	separator = ",",
	className,
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	options: { label: ReactNode; value: string | number }[];
	placeholder?: string;
	separator?: string;
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const currentValue =
					typeof field.state.value === "string" ? field.state.value : "";
				const selectedValues = currentValue
					.split(separator)
					.map((value: string) => value.trim())
					.filter((value: string) => Boolean(value));
				const selectedCount = selectedValues.length;
				const selectedLabels = options
					.filter((opt) => selectedValues.includes(String(opt.value)))
					.map((opt) => String(opt.label));

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										id={`field-${String(name)}`}
										variant="outline"
										disabled={disabled}
										className={cn(
											"w-full justify-between font-normal",
											selectedCount > 0 && !disabled && "pr-8",
											!selectedCount && "text-muted-foreground",
										)}
										aria-invalid={invalid}
									>
										<span className="truncate">
											{selectedCount
												? selectedCount === 1
													? selectedLabels[0]
													: `${selectedCount} 已选`
												: placeholder}
										</span>
										<ChevronDown className="ml-2 size-4 opacity-60" />
									</Button>
								</DropdownMenuTrigger>
								{selectedCount > 0 && !disabled && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										aria-label={`清除${String(label)}`}
										onPointerDown={(event) => {
											event.preventDefault();
											event.stopPropagation();
											field.handleChange("");
										}}
									>
										<X className="size-3.5" />
									</Button>
								)}
								<DropdownMenuContent align="start" className="w-[240px]">
									<DropdownMenuLabel>{label}</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{options.map((opt) => {
										const optValue = String(opt.value);
										return (
											<DropdownMenuCheckboxItem
												key={optValue}
												checked={selectedValues.includes(optValue)}
												disabled={disabled}
												onCheckedChange={(
													checked: boolean | "indeterminate",
												) => {
													const next =
														checked === true
															? [...selectedValues, optValue]
															: selectedValues.filter(
																	(value: string) => value !== optValue,
																);
													field.handleChange(next.join(separator));
												}}
											>
												{opt.label}
											</DropdownMenuCheckboxItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
