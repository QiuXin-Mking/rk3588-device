// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormSelect<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	options,
	valueType = "string",
	placeholder = "请选择...",
	className,
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	options: { label: ReactNode; value: string | number }[];
	valueType?: "string" | "number";
	placeholder?: string;
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const valueStr =
					field.state.value != null ? String(field.state.value) : undefined;

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
							<Select
								value={valueStr}
								disabled={disabled}
								onValueChange={(val) => {
									field.handleChange(
										valueType === "number" ? Number(val) : val,
									);
								}}
							>
								<SelectTrigger
									id={`field-${String(name)}`}
									aria-invalid={invalid}
									className={cn("w-full", valueStr && !disabled && "pr-8")}
								>
									<SelectValue placeholder={placeholder} />
								</SelectTrigger>
								<SelectContent>
									{options.map((opt) => (
										<SelectItem
											key={String(opt.value)}
											value={String(opt.value)}
										>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
										field.handleChange(
											valueType === "number"
												? // biome-ignore lint/suspicious/noExplicitAny: clearing nullable numeric field
													(null as any)
												: (null as any),
										);
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
