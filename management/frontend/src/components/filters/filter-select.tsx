import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type FilterValues, getFilterString } from "./types";

export interface FilterSelectProps {
	filterKey: string;
	label?: string;
	filters: FilterValues;
	onFilterChange: (key: string, value: string) => void;
	options: { label: ReactNode; value: string }[];
	placeholder?: string;
	defaultValueLabel?: ReactNode;
}

export function FilterSelect({
	filterKey,
	label,
	filters,
	onFilterChange,
	options,
	placeholder,
	defaultValueLabel,
}: FilterSelectProps) {
	return (
		<div className="space-y-1">
			{label && (
				<Label
					htmlFor={`filter-select-${filterKey}`}
					className="text-muted-foreground mb-1 block"
				>
					{label}
				</Label>
			)}
			<div className="relative">
				<Select
					value={getFilterString(filters, filterKey, "all")}
					onValueChange={(val) =>
						onFilterChange(filterKey, val === "all" ? "" : val)
					}
				>
					<SelectTrigger
						id={`filter-select-${filterKey}`}
						className={cn(
							"w-full font-normal",
							getFilterString(filters, filterKey, "all") !== "all" && "pr-8",
						)}
					>
						<SelectValue
							placeholder={
								placeholder ?? (label ? `选择${label}...` : "请选择...")
							}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{defaultValueLabel ?? "不限"}</SelectItem>
						{options.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{getFilterString(filters, filterKey, "all") !== "all" && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label={`清除${label ?? "筛选"}`}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onFilterChange(filterKey, "");
						}}
					>
						<X className="size-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}
