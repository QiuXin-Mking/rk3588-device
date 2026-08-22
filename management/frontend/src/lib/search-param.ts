export function parseSearchArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => String(item)).filter(Boolean);
	}
	if (typeof value !== "string" || value.length === 0) {
		return [];
	}
	if (value.startsWith("[")) {
		try {
			const parsed = JSON.parse(value) as unknown;
			if (Array.isArray(parsed)) {
				return parsed.map((item) => String(item).trim()).filter(Boolean);
			}
		} catch {
			// fall through to comma parsing
		}
	}
	return value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}
