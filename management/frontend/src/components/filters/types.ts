export type FilterValue =
	| string
	| string[]
	| boolean
	| number
	| null
	| undefined;
export type FilterValues = Record<string, FilterValue>;

export function getFilterString(
	filters: FilterValues,
	filterKey: string,
	defaultValue = "",
) {
	const value = filters[filterKey];
	if (value == null) return defaultValue;
	return Array.isArray(value) ? value.join(",") : String(value);
}

export interface FilterInputProps {
	label?: string;
	filterKey?: string;
	filters?: FilterValues;
	onFilterChange?: (key: string, value: string) => void;
	value?: string;
	onChange?: (value: string) => void;
	debounceMs?: number;
	placeholder?: string;
	searchIcon?: boolean;
}
