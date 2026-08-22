import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type FilterValues, getFilterString } from "./types";

export interface FilterRadioGroupProps {
	filterKey: string;
	label?: string;
	options: { label: string; value: string }[];
	defaultValue?: string;
	filters: FilterValues;
	onFilterChange: (key: string, value: string) => void;
}

export function FilterRadioGroup({
	filterKey,
	label,
	options,
	defaultValue = "all",
	filters,
	onFilterChange,
}: FilterRadioGroupProps) {
	return (
		<div>
			{label && (
				<Label className="text-muted-foreground mb-2 block">{label}</Label>
			)}
			<RadioGroup
				value={getFilterString(filters, filterKey, defaultValue)}
				onValueChange={(val) => {
					onFilterChange(filterKey, val === defaultValue ? "" : val);
				}}
				className="flex flex-wrap gap-x-4 gap-y-2.5"
			>
				{options.map((opt) => (
					<div key={opt.value} className="flex items-center space-x-1.5">
						<RadioGroupItem
							value={opt.value}
							id={`${filterKey}-${opt.value}`}
						/>
						<Label
							htmlFor={`${filterKey}-${opt.value}`}
							className="font-normal cursor-pointer"
						>
							{opt.label}
						</Label>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
