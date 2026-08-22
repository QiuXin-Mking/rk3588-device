import { ListFilter, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export type FilterMultiSelectOption = string | { label: string; value: string };

export interface FilterMultiSelectProps {
	filterKey?: string;
	label: string;
	options: FilterMultiSelectOption[];
	value: string[];
	onChange: (value: string[]) => void;
}

export function FilterMultiSelect({
	label,
	options,
	value,
	onChange,
}: FilterMultiSelectProps) {
	const [open, setOpen] = useState(false);

	return (
		<ButtonGroup>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="border-dashed"
						role="combobox"
						aria-expanded={open}
						aria-label={`${label}筛选`}
					>
						<ListFilter data-icon="inline-start" />
						{label}
						{value.length > 0 && (
							<>
								<span className="text-muted-foreground">|</span>
								<span>{value.length} 已选</span>
							</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-64">
					<Command>
						<CommandInput placeholder={`搜索${label}`} />
						<CommandList>
							<CommandEmpty>没有匹配的{label}</CommandEmpty>
							<CommandGroup heading={`过滤${label}`}>
								{options.map((option) => {
									const optionValue =
										typeof option === "string" ? option : option.value;
									const optionLabel =
										typeof option === "string" ? option : option.label;
									const selected = value.includes(optionValue);
									return (
										<CommandItem
											key={optionValue}
											value={`${optionLabel} ${optionValue}`}
											data-checked={selected}
											aria-checked={selected}
											onSelect={() => {
												if (selected) {
													onChange(
														value.filter((item) => item !== optionValue),
													);
												} else {
													onChange([...value, optionValue]);
												}
											}}
										>
											{optionLabel}
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{value.length > 0 && (
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					className="border-dashed text-muted-foreground hover:text-foreground"
					aria-label={`清除${label}`}
					onClick={() => onChange([])}
				>
					<X />
				</Button>
			)}
		</ButtonGroup>
	);
}
