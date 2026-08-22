import type { DeepKeys, FieldApi, FormApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

// @ts-expect-error TanStack FieldApi requires 23 args, we pass just 2 for cleanliness
export type AnyFieldApi<TFormData, TName> = FieldApi<TFormData, TName>;

export interface FormFieldBaseProps<TFormData> {
	// @ts-expect-error TanStack FormApi requires 12 args, we pass just 1 for cleanliness
	form: FormApi<TFormData>;
	name: DeepKeys<TFormData>;
	label: ReactNode;
	required?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	className?: string;
	tooltip?: string;
}
