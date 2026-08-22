// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import dayjs from "dayjs";
import { CalendarIcon, X } from "lucide-react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormDatePicker<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	placeholder = "选择日期...",
	className,
	tooltip,
	outputMode = "datetime",
}: FormFieldBaseProps<TFormData> & {
	placeholder?: string;
	outputMode?: "datetime" | "date";
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;

				// Support both Date objects and ISO string values from the form
				const rawValue = field.state.value;
				const dateValue =
					rawValue instanceof Date
						? rawValue
						: typeof rawValue === "string" && rawValue
							? rawValue.length === 10
								? new Date(`${rawValue}T00:00:00`)
								: new Date(rawValue)
							: undefined;

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										id={`field-${String(name)}`}
										variant="outline"
										disabled={disabled}
										className={cn(
											"w-full justify-start text-left font-normal",
											dateValue && !disabled && "pr-8",
											!dateValue && "text-muted-foreground",
										)}
										aria-invalid={invalid}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{dateValue
											? dayjs(dateValue).format("YYYY-MM-DD")
											: placeholder}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={dateValue}
										onSelect={(date) =>
											field.handleChange(
												date
													? outputMode === "date"
														? dayjs(date).format("YYYY-MM-DD")
														: date.toISOString()
													: null,
											)
										}
									/>
								</PopoverContent>
							</Popover>
							{dateValue && !disabled && (
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
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
