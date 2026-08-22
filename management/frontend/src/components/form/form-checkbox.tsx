// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import { extractErrors } from "@/lib/form-errors";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormCheckbox<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	tooltip,
}: FormFieldBaseProps<TFormData>) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;

				return (
					<Field
						data-invalid={invalid}
						orientation="horizontal"
						className={className}
					>
						<Checkbox
							id={`field-${String(name)}`}
							checked={!!field.state.value}
							disabled={disabled}
							onCheckedChange={(checked) => field.handleChange(!!checked)}
							onBlur={field.handleBlur}
							aria-invalid={invalid}
						/>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
