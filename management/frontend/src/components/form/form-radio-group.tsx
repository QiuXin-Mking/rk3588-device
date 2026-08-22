// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import type { ReactNode } from "react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormRadioGroup<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	options,
	orientation = "horizontal",
	valueType = "string",
	className,
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	options: { label: ReactNode; value: string }[];
	orientation?: "horizontal" | "vertical";
	valueType?: "string" | "boolean";
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const valueStr =
					field.state.value != null ? String(field.state.value) : "";

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<RadioGroup
							disabled={disabled}
							value={valueStr}
							onValueChange={(val) => {
								field.handleChange(
									valueType === "boolean" ? val === "true" : val,
								);
							}}
							aria-invalid={invalid}
							className={cn(
								"mt-2",
								orientation === "horizontal"
									? "flex flex-row flex-wrap gap-4"
									: "flex flex-col space-y-1",
							)}
						>
							{options.map((opt) => (
								<div key={opt.value} className="flex items-center space-x-2">
									<RadioGroupItem
										value={opt.value}
										id={`radio-${String(name)}-${opt.value}`}
									/>
									<Label
										htmlFor={`radio-${String(name)}-${opt.value}`}
										className="font-normal cursor-pointer"
									>
										{opt.label}
									</Label>
								</div>
							))}
						</RadioGroup>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
