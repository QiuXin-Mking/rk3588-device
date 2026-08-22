import { Search, X } from "lucide-react";
import * as React from "react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type FilterInputProps, getFilterString } from "./types";

export function FilterInput({
	filterKey,
	label,
	filters,
	onFilterChange,
	value,
	onChange,
	debounceMs = 500,
	placeholder,
	searchIcon,
	...props
}: FilterInputProps &
	Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
	const initialValue =
		value ?? (filterKey && filters ? getFilterString(filters, filterKey) : "");
	const [localValue, setLocalValue] = useState(initialValue);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

	// 外部值变更时同步到本地（仅在没有挂起的 debounce 时）
	React.useEffect(() => {
		if (localValue !== initialValue && timerRef.current === null) {
			setLocalValue(initialValue);
		}
	}, [initialValue, localValue]);

	const handleChange = (nextValue: string) => {
		setLocalValue(nextValue);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			onChange?.(nextValue);
			if (filterKey) onFilterChange?.(filterKey, nextValue);
		}, debounceMs);
	};

	const handleClear = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setLocalValue("");
		onChange?.("");
		if (filterKey) onFilterChange?.(filterKey, "");
	};

	const input = (
		<div className="relative">
			<Input
				{...props}
				id={props.id ?? filterKey}
				placeholder={placeholder ?? (label ? `搜索${label}...` : "搜索...")}
				value={localValue}
				onChange={(e) => handleChange(e.target.value)}
				className={cn(
					searchIcon && "pl-8",
					localValue && "pr-8",
					props.className,
				)}
			/>
			{localValue && (
				<button
					type="button"
					aria-label={`清除${label ?? "搜索"}`}
					className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
					onClick={handleClear}
				>
					<X className="size-3.5" />
				</button>
			)}
		</div>
	);

	return (
		<div className="space-y-1">
			{label && <Label htmlFor={filterKey}>{label}</Label>}
			{searchIcon ? (
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					{input}
				</div>
			) : (
				input
			)}
		</div>
	);
}
