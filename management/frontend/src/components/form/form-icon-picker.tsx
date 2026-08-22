// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import { extractErrors } from "@/lib/form-errors";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { FieldHint } from "./field-hint";
import { IconPicker } from "./icon-picker";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormIconPicker<TFormData>({
	form,
	name,
	label,
	required,
	placeholder = "选择图标...",
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
				const valueStr = field.state.value
					? String(field.state.value)
					: undefined;

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<IconPicker
							value={valueStr}
							placeholder={placeholder}
							// biome-ignore lint/suspicious/noExplicitAny: Required by TanStack Form
							onChange={(val) => field.handleChange(val as any)}
						/>
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
