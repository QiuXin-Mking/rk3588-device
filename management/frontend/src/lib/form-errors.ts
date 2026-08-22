/**
 * Normalizes TanStack Form's polymorphic error array into a consistent format.
 * TanStack Form v1 errors can be strings, objects with `message`, or falsy values.
 */
export function extractErrors(errors: unknown[]): Array<{ message?: string }> {
	return errors.filter(Boolean).map((msg: unknown) => ({
		message:
			typeof msg === "string" ? msg : (msg as { message?: string })?.message,
	}));
}
