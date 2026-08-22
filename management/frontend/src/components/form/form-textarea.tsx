// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { CopyButton } from "../shared";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormTextarea<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	readOnly,
	placeholder,
	rows,
	className,
	tooltip,
	labelRight,
	copyable,
}: FormFieldBaseProps<TFormData> & {
	placeholder?: string;
	rows?: number;
	labelRight?: ReactNode;
	copyable?: boolean;
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel
							htmlFor={`field-${String(name)}`}
							className={cn(
								labelRight && "w-full items-center justify-between",
							)}
						>
							<span className="flex min-w-0 items-center gap-1.5">
								{label}
								{required && <span className="text-destructive"> *</span>}
								{tooltip && <FieldHint text={tooltip} />}
							</span>
							{labelRight && (
								<span className="ml-auto flex shrink-0 items-center gap-1">
									{labelRight}
								</span>
							)}
							{copyable && (
								<CopyButton
									text={String(field.state.value ?? "")}
									label={`复制${String(label)}`}
								/>
							)}
						</FieldLabel>
						<div className="relative">
							<Textarea
								id={`field-${String(name)}`}
								placeholder={placeholder}
								disabled={disabled}
								readOnly={readOnly}
								rows={rows}
								value={(field.state.value as string) ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								aria-invalid={invalid}
								className={cn(
									field.state.value && !disabled && !readOnly && "pr-8",
								)}
							/>
							{field.state.value != null &&
								field.state.value !== "" &&
								!disabled &&
								!readOnly && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1 top-2 size-6 text-muted-foreground hover:text-foreground"
										aria-label={`清除${String(label)}`}
										onClick={() => field.handleChange("")}
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
