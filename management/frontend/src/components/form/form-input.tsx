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
import { Input } from "../ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../ui/input-group";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormInput<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	readOnly,
	type = "text",
	placeholder,
	className,
	tooltip,
	labelRight,
	copyable,
	suffix,
	min,
	max,
	step,
	list,
}: FormFieldBaseProps<TFormData> & {
	type?: "text" | "password" | "number" | "email" | "month";
	placeholder?: string;
	suffix?: ReactNode;
	labelRight?: ReactNode;
	copyable?: boolean;
	min?: number;
	max?: number;
	step?: number;
	list?: string;
}) {
	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const value = field.state.value ?? "";
				const hasSuffix = suffix !== undefined && suffix !== null;
				const showClear =
					field.state.value != null &&
					field.state.value !== "" &&
					!disabled &&
					!readOnly;

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
						{hasSuffix ? (
							<InputGroup
								className={cn(
									readOnly &&
										"border-dashed bg-muted/30 text-muted-foreground dark:bg-muted/20",
								)}
							>
								<InputGroupInput
									id={`field-${String(name)}`}
									type={type}
									placeholder={placeholder}
									disabled={disabled}
									readOnly={readOnly}
									min={min}
									max={max}
									step={step}
									list={list}
									value={value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										const val = e.target.value;
										field.handleChange(
											type === "number"
												? val === ""
													? // biome-ignore lint/suspicious/noExplicitAny: Required for TanStack Form reset
														(null as any)
													: Number(val)
												: val,
										);
									}}
									aria-invalid={invalid}
								/>
								<InputGroupAddon align="inline-end" className="gap-1">
									{field.state.value != null &&
										field.state.value !== "" &&
										!disabled &&
										!readOnly && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-6 text-muted-foreground hover:text-foreground"
												aria-label={`清除${String(label)}`}
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();
													field.handleChange(
														type === "number"
															? // biome-ignore lint/suspicious/noExplicitAny: clearing nullable numeric field
																(null as any)
															: "",
													);
												}}
											>
												<X className="size-3.5" />
											</Button>
										)}
									<span>{suffix}</span>
								</InputGroupAddon>
							</InputGroup>
						) : (
							<div className="relative">
								<Input
									id={`field-${String(name)}`}
									type={type}
									placeholder={placeholder}
									disabled={disabled}
									readOnly={readOnly}
									min={min}
									max={max}
									step={step}
									list={list}
									value={value}
									className={cn(showClear && "pr-8")}
									onBlur={field.handleBlur}
									onChange={(e) => {
										const val = e.target.value;
										field.handleChange(
											type === "number"
												? val === ""
													? // biome-ignore lint/suspicious/noExplicitAny: Required for TanStack Form reset
														(null as any)
													: Number(val)
												: val,
										);
									}}
									aria-invalid={invalid}
								/>
								{showClear && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-0.5 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										aria-label={`清除${String(label)}`}
										onClick={() => {
											field.handleChange(
												type === "number"
													? // biome-ignore lint/suspicious/noExplicitAny: clearing nullable numeric field
														(null as any)
													: "",
											);
										}}
									>
										<X className="size-3.5" />
									</Button>
								)}
							</div>
						)}
						<FieldError errors={errors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
