"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export interface FormMultiValuePickerProps {
	value: string[];
	onValueChange: (next: string[]) => void;
	options: string[];
	placeholder?: string;
	emptyText?: string;
	disabled?: boolean;
	className?: string;
}

function normalizeOption(value: string) {
	return value.trim();
}

export function FormMultiValuePicker({
	value,
	onValueChange,
	options,
	placeholder = "请选择或输入",
	emptyText = "暂无可选项",
	disabled,
	className,
}: FormMultiValuePickerProps) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	const normalizedSelected = useMemo(
		() => value.map(normalizeOption).filter(Boolean),
		[value],
	);
	const selectedSet = useMemo(
		() => new Set(normalizedSelected),
		[normalizedSelected],
	);
	const normalizedOptions = useMemo(() => {
		const seen = new Set<string>();
		const result: string[] = [];
		for (const option of options) {
			const normalized = normalizeOption(option);
			if (!normalized || seen.has(normalized)) continue;
			seen.add(normalized);
			result.push(normalized);
		}
		return result;
	}, [options]);
	const normalizedOptionSet = useMemo(
		() => new Set(normalizedOptions),
		[normalizedOptions],
	);

	const filteredOptions = useMemo(() => {
		const query = searchValue.trim().toLowerCase();
		if (!query) return normalizedOptions;
		return normalizedOptions.filter((option) =>
			option.toLowerCase().includes(query),
		);
	}, [normalizedOptions, searchValue]);

	const customValue = searchValue.trim();
	const canAddCustom =
		customValue.length > 0 && !normalizedOptionSet.has(customValue);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) setSearchValue("");
	};

	const toggleValue = (nextValue: string) => {
		const normalized = normalizeOption(nextValue);
		if (!normalized) return;
		const next = selectedSet.has(normalized)
			? normalizedSelected.filter((item) => item !== normalized)
			: [...normalizedSelected, normalized];
		onValueChange(next);
	};

	const removeValue = (removeValue: string) => {
		onValueChange(normalizedSelected.filter((item) => item !== removeValue));
	};

	return (
		<Popover modal={true} open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					aria-expanded={open}
					className={cn(
						"flex h-7 w-full items-center justify-between gap-2 rounded-md border border-input bg-input/20 px-2 py-0.5 text-left text-xs/relaxed transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
						className,
					)}
				>
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
						{normalizedSelected.length > 0 ? (
							<>
								{normalizedSelected.slice(0, 4).map((item) => (
									<Badge
										key={item}
										variant="secondary"
										className="max-w-full gap-1 pr-1 font-normal"
									>
										<span className="max-w-[140px] truncate">{item}</span>
										<button
											type="button"
											className="rounded-full p-0.5 hover:bg-muted-foreground/20"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												removeValue(item);
											}}
										>
											<X className="size-3" />
										</button>
									</Badge>
								))}
								{normalizedSelected.length > 4 ? (
									<span className="text-muted-foreground">
										+{normalizedSelected.length - 4}
									</span>
								) : null}
							</>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-[320px] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="搜索或输入新值..."
						value={searchValue}
						onValueChange={setSearchValue}
					/>
					<CommandList>
						<CommandEmpty>
							{customValue ? (
								<button
									type="button"
									className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
									onClick={() => {
										toggleValue(customValue);
										setSearchValue("");
									}}
								>
									<Plus className="size-4" />
									添加 “{customValue}”
								</button>
							) : (
								emptyText
							)}
						</CommandEmpty>
						<CommandGroup>
							{filteredOptions.map((option) => {
								const active = selectedSet.has(option);
								return (
									<CommandItem
										key={option}
										value={option}
										onSelect={() => {
											toggleValue(option);
										}}
									>
										<Check
											className={cn(
												"mr-2 size-4",
												active ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="flex-1 truncate">{option}</span>
									</CommandItem>
								);
							})}
							{canAddCustom && filteredOptions.length > 0 ? (
								<CommandItem
									value={customValue}
									onSelect={() => {
										toggleValue(customValue);
										setSearchValue("");
									}}
								>
									<Plus className="mr-2 size-4" />
									添加 “{customValue}”
								</CommandItem>
							) : null}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
