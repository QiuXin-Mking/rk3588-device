// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import dayjs from "dayjs";
import { CalendarIcon, X } from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormDateTimePicker<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	placeholder,
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
				const rawValue = field.state.value;
				const dateValue =
					rawValue instanceof Date
						? rawValue
						: typeof rawValue === "string" && rawValue
							? new Date(rawValue)
							: undefined;
				const displayValue = dateValue
					? dayjs(dateValue).format("YYYY-MM-DD HH:mm")
					: (placeholder ?? "选择日期时间...");

				return (
					<FormDateTimePickerField
						field={field}
						label={label}
						required={required}
						disabled={disabled}
						tooltip={tooltip}
						className={className}
						invalid={invalid}
						errors={errors}
						dateValue={dateValue}
						displayValue={displayValue}
					/>
				);
			}}
		</form.Field>
	);
}

function FormDateTimePickerField<TFormData>({
	field,
	label,
	required,
	disabled,
	tooltip,
	className,
	invalid,
	errors,
	dateValue,
	displayValue,
}: {
	field: AnyFieldApi<TFormData, any>;
	label: ReactNode;
	required?: boolean;
	disabled?: boolean;
	tooltip?: string;
	className?: string;
	invalid: boolean;
	errors: ReturnType<typeof extractErrors>;
	dateValue: Date | undefined;
	displayValue: string;
}) {
	const [open, setOpen] = React.useState(false);
	const [draftTime, setDraftTime] = React.useState(() =>
		dateValue ? dayjs(dateValue).format("HH:mm") : "00:00",
	);

	React.useEffect(() => {
		if (dateValue) {
			setDraftTime(dayjs(dateValue).format("HH:mm"));
		}
	}, [dateValue]);

	const commit = (date: Date | undefined, time = draftTime) => {
		if (!date) {
			field.handleChange(null);
			return;
		}

		const [hours, minutes] = time.split(":");
		const next = dayjs(date)
			.hour(Number.parseInt(hours || "0", 10))
			.minute(Number.parseInt(minutes || "0", 10))
			.second(0)
			.millisecond(0)
			.toDate();
		field.handleChange(next.toISOString());
	};

	const clearValue = () => {
		setDraftTime("00:00");
		setOpen(false);
		field.handleChange(null);
		field.handleBlur();
	};

	return (
		<Field data-invalid={invalid} className={className}>
			<FieldLabel htmlFor={`field-${String(field.name)}`}>
				{label}
				{required && <span className="text-destructive"> *</span>}
				{tooltip && <FieldHint text={tooltip} />}
			</FieldLabel>
			<div className="relative">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							id={`field-${String(field.name)}`}
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
							{displayValue}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-3" align="start">
						<Calendar
							mode="single"
							selected={dateValue}
							onSelect={(date) => commit(date)}
						/>
						<div className="mt-3 flex items-center gap-2">
							<Label className="min-w-12 text-xs text-muted-foreground">
								时间
							</Label>
							<Input
								type="time"
								value={draftTime}
								onChange={(event) => {
									const value = event.target.value;
									setDraftTime(value);
									if (dateValue) {
										commit(dateValue, value);
									}
								}}
								className="w-36"
							/>
						</div>
						<div className="mt-3 flex justify-end">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={clearValue}
							>
								清除
							</Button>
						</div>
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
							clearValue();
						}}
					>
						<X className="size-3.5" />
					</Button>
				)}
			</div>
			<FieldError errors={errors} />
		</Field>
	);
}
