import dayjs from "dayjs";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

function parseValueToRangeOrLongTerm(value: string | null | undefined): {
	range: DateRange | undefined;
	isLongTerm: boolean;
} {
	if (value === "长期") {
		return { range: undefined, isLongTerm: true };
	}
	if (!value) {
		return { range: undefined, isLongTerm: false };
	}
	const parts = value.split(",");
	if (parts.length === 2) {
		const from = new Date(parts[0]);
		const to = new Date(parts[1]);
		return { range: { from, to }, isLongTerm: false };
	}
	return { range: undefined, isLongTerm: false };
}

export function FormDateRangeWithLongTerm<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	placeholder = "选择起止日期...",
	className,
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;

				const rawValue = field.state.value as string | null | undefined;
				const { range, isLongTerm } = parseValueToRangeOrLongTerm(rawValue);

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											id={`field-${String(name)}`}
											variant="outline"
											disabled={disabled || isLongTerm}
											className={cn(
												"w-full justify-start text-left font-normal",
												rawValue && !disabled && "pr-8",
												!range && "text-muted-foreground",
											)}
											aria-invalid={invalid}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{isLongTerm ? (
												"长期"
											) : range?.from ? (
												range.to ? (
													<>
														{dayjs(range.from).format("YYYY-MM-DD")} -{" "}
														{dayjs(range.to).format("YYYY-MM-DD")}
													</>
												) : (
													dayjs(range.from).format("YYYY-MM-DD")
												)
											) : (
												<span>{placeholder}</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											initialFocus
											mode="range"
											defaultMonth={range?.from}
											selected={range}
											onSelect={(newRange) => {
												if (newRange?.from && newRange?.to) {
													const fromStr = dayjs(newRange.from).format(
														"YYYY-MM-DD",
													);
													const toStr = dayjs(newRange.to).format("YYYY-MM-DD");
													field.handleChange(`${fromStr},${toStr}`);
												} else {
													// Partially selected range, don't update form yet or clear
													// We can either set it to null or do nothing until both are selected
													if (!newRange) {
														field.handleChange(null);
													}
												}
											}}
											numberOfMonths={2}
										/>
									</PopoverContent>
								</Popover>
								{rawValue && !disabled && (
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
											field.handleBlur();
										}}
									>
										<X className="size-3.5" />
									</Button>
								)}
							</div>
							<div className="flex items-center space-x-2 shrink-0">
								<Checkbox
									id={`field-${String(name)}-long-term`}
									checked={isLongTerm}
									disabled={disabled}
									onCheckedChange={(checked) => {
										if (checked) {
											field.handleChange("长期");
										} else {
											field.handleChange(null);
										}
									}}
								/>
								<label
									htmlFor={`field-${String(name)}-long-term`}
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
								>
									长期
								</label>
							</div>
						</div>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
