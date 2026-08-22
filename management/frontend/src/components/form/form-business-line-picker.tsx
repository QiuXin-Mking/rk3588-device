import {
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	X,
} from "lucide-react";
import { useState } from "react";
import type { BusinessLineTreeNode } from "@/api/schemas";
import { useWorkspaceBusinessLinesReadBusinessLinesTree } from "@/api/workspace-business-lines/workspace-business-lines";
import { extractErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../ui/command";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormBusinessLinePicker<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	disabledIds = [],
	level,
	placeholder = "请选择...",
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	disabledIds?: string[];
	level?: number;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	// Fetch data internally
	const { data: treeResponse, isLoading } =
		useWorkspaceBusinessLinesReadBusinessLinesTree();
	const treeNodes = treeResponse?.status === 200 ? treeResponse.data : [];

	const isSearching = searchValue.trim().length > 0;
	const maxLevel = level && level > 0 ? Math.floor(level) : undefined;
	// Use stringified dependency to prevent rememos when disabledIds array reference changes
	const disabledIdsStr = JSON.stringify(disabledIds);

	const options = (() => {
		const disabledSet = new Set(JSON.parse(disabledIdsStr));
		const result: {
			label: string;
			value: string;
			searchString: string;
			disabled: boolean;
			depth: number;
			hasChildren: boolean;
			isExpanded: boolean;
			isVisible: boolean;
			selectable: boolean;
		}[] = [];

		function flatten(
			nodes: BusinessLineTreeNode[],
			depth: number,
			parentExpanded: boolean,
		) {
			for (const node of nodes) {
				const currentId = node.id as string;
				const currentLevel = depth + 1;
				const isNodeExpanded = expandedIds.has(currentId);
				const hasChildren = !!node.children && node.children.length > 0;
				const canShowChildren = !maxLevel || currentLevel < maxLevel;
				const isVisible = isSearching || parentExpanded;
				const isTopLevel = depth === 0;
				const selectable = !maxLevel || currentLevel === maxLevel;

				if (!isTopLevel) {
					result.push({
						label: node.name,
						value: currentId,
						searchString: node.name,
						disabled: disabledSet.has(currentId),
						depth: depth - 1,
						hasChildren: hasChildren && canShowChildren,
						isExpanded: isNodeExpanded,
						isVisible,
						selectable,
					});
				}

				if (hasChildren && canShowChildren) {
					flatten(
						node.children as BusinessLineTreeNode[],
						depth + 1,
						isTopLevel || (isVisible && isNodeExpanded),
					);
				}
			}
		}

		flatten(treeNodes, 0, true);
		return result;
	})();

	const toggleExpand = (id: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const invalid = errors.length > 0;
				const rawValue = field.state.value;
				const valueStr =
					rawValue != null && String(rawValue) !== ""
						? String(rawValue)
						: undefined;

				// Find selected option for display
				const selectedOption = options.find((opt) => opt.value === valueStr);

				// Reset search on close
				const handleOpenChange = (newOpen: boolean) => {
					setOpen(newOpen);
					if (!newOpen) setSearchValue("");
				};

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>
						<div className="relative">
							<Popover modal={true} open={open} onOpenChange={handleOpenChange}>
								<PopoverTrigger asChild>
									<Button
										id={`field-${String(name)}`}
										variant="outline"
										role="combobox"
										aria-expanded={open}
										disabled={disabled}
										aria-invalid={invalid}
										className={cn(
											"w-full justify-between font-normal",
											rawValue != null && !disabled && "pr-8",
											!selectedOption && "text-muted-foreground",
											disabled && "cursor-not-allowed opacity-50",
										)}
									>
										{isLoading
											? "加载中..."
											: selectedOption
												? selectedOption.label
												: placeholder}
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[300px] p-0" align="start">
									<Command
										filter={(value, search) => {
											// cmdk string matching based on our explicit injected values
											if (value.toLowerCase().includes(search.toLowerCase()))
												return 1;
											const targetedOpt = options.find(
												(opt) => opt.value === value,
											);
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

													return (
														<CommandItem
															key={opt.value}
															value={opt.value}
															disabled={opt.disabled}
															onSelect={(currentValue) => {
																if (!opt.selectable) {
																	if (opt.hasChildren) {
																		setExpandedIds((prev) => {
																			const next = new Set(prev);
																			if (next.has(currentValue))
																				next.delete(currentValue);
																			else next.add(currentValue);
																			return next;
																		});
																	}
																	return;
																}
																field.handleChange(currentValue);
																handleOpenChange(false);
															}}
														>
															<div
																className={cn(
																	"flex items-center w-full",
																	!opt.selectable && "text-muted-foreground",
																)}
															>
																{/* Prefix indentation spacing */}
																<div
																	style={{ width: opt.depth * 16 }}
																	className="flex-shrink-0"
																/>

																{/* Expand/Collapse Toggle */}
																{opt.hasChildren ? (
																	<button
																		type="button"
																		className="p-0.5 hover:bg-muted rounded-sm mr-1 cursor-pointer flex-shrink-0"
																		onClick={(e) => toggleExpand(opt.value, e)}
																	>
																		{opt.isExpanded ? (
																			<ChevronDown className="h-4 w-4 text-muted-foreground" />
																		) : (
																			<ChevronRight className="h-4 w-4 text-muted-foreground" />
																		)}
																	</button>
																) : (
																	// Spacer for alignment if no children
																	<div className="h-4 w-4 mr-1 flex-shrink-0" />
																)}

																{/* Checkmark for selection */}
																<Check
																	className={cn(
																		"mr-2 h-4 w-4 flex-shrink-0",
																		valueStr === opt.value
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>

																{/* Node name */}
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
							{valueStr && !disabled && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={`清除${String(label)}`}
									onPointerDown={(event) => {
										event.preventDefault();
										event.stopPropagation();
										field.handleChange(null);
									}}
								>
									<X className="size-3.5" />
								</Button>
							)}
						</div>
						<FieldError errors={errors} className="mt-1" />
					</Field>
				);
			}}
		</form.Field>
	);
}
