// NOTE: TanStack Form v1 uses extensive generic parameters (up to 23).
// In this thin-wrapper layer we only care about TFormData + TName.
// The @ts-expect-error suppressions below are the community-accepted pattern;
// they can be removed once TanStack Form v2 simplifies its generics.

import type { FormApi } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "../ui/button";

export interface FormButtonProps extends ComponentProps<typeof Button> {
	// @ts-expect-error TanStack FormApi is too big
	// biome-ignore lint/suspicious/noExplicitAny: TanStack FormApi is too big
	form: FormApi<any>;
	children: ReactNode;
}

export function FormButton({
	form,
	children,
	disabled,
	type = "submit",
	...props
}: FormButtonProps) {
	return (
		<form.Subscribe
			selector={(state: { canSubmit: boolean; isSubmitting: boolean }) =>
				[state.canSubmit, state.isSubmitting] as const
			}
		>
			{([canSubmit, isSubmitting]: readonly [boolean, boolean]) => (
				<Button
					type={type}
					disabled={
						disabled || (type === "submit" && !canSubmit) || isSubmitting
					}
					{...props}
				>
					{isSubmitting && type === "submit" && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					{children}
				</Button>
			)}
		</form.Subscribe>
	);
}
