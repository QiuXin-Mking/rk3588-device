import {
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	X,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import type { BusinessLineTreeNode } from "@/api/schemas";
import { useWorkspaceBusinessLinesReadBusinessLinesTree } from "@/api/workspace-business-lines/workspace-business-lines";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FilterValues } from "./types";

export interface FilterBusinessLineMultiPickerProps {
	filterKey: string;
	label?: string;
	filters: FilterValues;
	onFilterChange: (key: string, value: string) => void;
	placeholder?: string;
	valueKey?: "id" | "name";
	level?: number;
}

export function FilterBusinessLineMultiPicker({
	filterKey,
	label,
	filters,
	onFilterChange,
	placeholder = "全选所有的业务线...",
	valueKey = "id",
	level,
}: FilterBusinessLineMultiPickerProps) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	// Fetch data internally
	const { data: treeResponse, isLoading } =
		useWorkspaceBusinessLinesReadBusinessLinesTree();
	const treeNodes = treeResponse?.status === 200 ? treeResponse.data : [];

	const isSearching = searchValue.trim().length > 0;
	const maxLevel = level && level > 0 ? Math.floor(level) : undefined;

	const options = (() => {
		const result: {
			nodeId: string;
			label: string;
			value: string;
			searchString: string;
			selectable: boolean;
			depth: number;
			hasChildren: boolean;
			isExpanded: boolean;
			isVisible: boolean;
		}[] = [];

		function flatten(
			nodes: BusinessLineTreeNode[],
			depth: number,
			parentExpanded: boolean,
		) {
			for (const node of nodes) {
				const currentId = node.id as string;
				const currentValue = valueKey === "name" ? node.name : currentId;
				const currentLevel = depth + 1;
				const isNodeExpanded = expandedIds.has(currentId);
				const hasChildren = !!node.children && node.children.length > 0;
				const canShowChildren = !maxLevel || currentLevel < maxLevel;
				const isVisible = isSearching || parentExpanded;

				result.push({
					nodeId: currentId,
					label: node.name,
					value: currentValue,
					searchString: node.name,
					selectable: !maxLevel || currentLevel === maxLevel,
					depth,
					hasChildren: hasChildren && canShowChildren,
					isExpanded: isNodeExpanded,
					isVisible,
				});

				if (hasChildren && canShowChildren) {
					flatten(
						node.children as BusinessLineTreeNode[],
						depth + 1,
						isVisible && isNodeExpanded,
					);
				}
			}
		}

		flatten(treeNodes, 0, true);
		return result;
	})();

	const rawVal = filters[filterKey];
	const value: string[] = rawVal
		? Array.isArray(rawVal)
			? rawVal
			: String(rawVal).split(",")
		: [];

	const toggleExpanded = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleExpand = (id: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		toggleExpanded(id);
	};

	const toggleOption = (nodeValue: string) => {
		const newArray = value.includes(nodeValue)
			? value.filter((v) => v !== nodeValue)
			: [...value, nodeValue];
		onFilterChange(filterKey, newArray.length > 0 ? newArray.join(",") : "");
	};

	let displayStr: React.ReactNode = placeholder;
	if (value.length > 0) {
		if (value.length <= 2) {
			displayStr = value
				.map((v) => {
					const opt = options.find((o) => o.value === v);
					return opt ? opt.label : v;
				})
				.join(", ");
		} else {
			displayStr = `${value.length} 已选`;
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) setSearchValue("");
	};

	return (
		<div className="space-y-1">
			{label && (
				<Label className="text-muted-foreground mb-1 block">{label}</Label>
			)}
			<div className="relative">
				<Popover modal={true} open={open} onOpenChange={handleOpenChange}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className={cn(
								"w-full justify-between font-normal",
								value.length > 0 && "pr-8",
								value.length === 0 && "text-muted-foreground",
							)}
						>
							<span className="truncate">
								{isLoading ? "加载中..." : displayStr}
							</span>
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					{value.length > 0 && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label={`清除${label ?? "业务线筛选"}`}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onFilterChange(filterKey, "");
							}}
						>
							<X className="size-3.5" />
						</Button>
					)}
					<PopoverContent className="w-[300px] p-0" align="start">
						<Command
							filter={(val, search) => {
								if (val.toLowerCase().includes(search.toLowerCase())) return 1;
								const targetedOpt = options.find((opt) => opt.value === val);
								if (
									targetedOpt?.searchString
										.toLowerCase()
										.includes(search.toLowerCase())
								) {
									return 1;
								}
								return 0;
							}}
						>
							<CommandInput
								placeholder="搜索业务线..."
								value={searchValue}
								onValueChange={setSearchValue}
							/>
							<CommandList>
								<CommandEmpty>未找到对应业务线。</CommandEmpty>
								<CommandGroup>
									{options.map((opt) => {
										if (!opt.isVisible) return null;
										const isSelected = value.includes(opt.value);

										return (
											<CommandItem
												key={opt.value}
												value={opt.value}
												onSelect={() => {
													if (!opt.selectable) {
														if (opt.hasChildren) toggleExpanded(opt.nodeId);
														return;
													}
													toggleOption(opt.value);
												}}
											>
												<div
													className={cn(
														"flex w-full items-center",
														!opt.selectable && "text-muted-foreground",
													)}
												>
													{opt.value !== "all" && (
														<div
															style={{ width: opt.depth * 16 }}
															className="flex-shrink-0"
														/>
													)}

													{opt.hasChildren ? (
														<button
															type="button"
															className="p-0.5 hover:bg-muted rounded-sm mr-1 cursor-pointer flex-shrink-0"
															onClick={(e) => toggleExpand(opt.nodeId, e)}
														>
															{opt.isExpanded ? (
																<ChevronDown className="h-4 w-4 text-muted-foreground" />
															) : (
																<ChevronRight className="h-4 w-4 text-muted-foreground" />
															)}
														</button>
													) : (
														opt.value !== "all" && (
															<div className="h-4 w-4 mr-1 flex-shrink-0" />
														)
													)}

													{opt.selectable ? (
														<div
															data-testid={`business-line-selection-${opt.nodeId}`}
															className={cn(
																"mr-2 flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary",
																isSelected
																	? "bg-primary text-primary-foreground"
																	: "opacity-50 [&_svg]:invisible",
															)}
														>
															<Check className="size-3" />
														</div>
													) : null}

													<span className="truncate">{opt.label}</span>
												</div>
											</CommandItem>
										);
									})}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
