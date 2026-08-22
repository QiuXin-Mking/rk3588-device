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

type FlatOption = {
	nodeId: string;
	label: string;
	value: string;
	searchString: string;
	selectable: boolean;
	depth: number;
	hasChildren: boolean;
	isExpanded: boolean;
	isVisible: boolean;
};

function findNodeById(
	nodes: BusinessLineTreeNode[],
	targetId: string,
): BusinessLineTreeNode | null {
	for (const node of nodes) {
		if (node.id === targetId) return node;
		if (node.children?.length) {
			const found = findNodeById(node.children, targetId);
			if (found) return found;
		}
	}
	return null;
}

function findPathToId(
	nodes: BusinessLineTreeNode[],
	targetId: string,
	path: BusinessLineTreeNode[] = [],
): BusinessLineTreeNode[] | null {
	for (const node of nodes) {
		const next = [...path, node];
		if (node.id === targetId) return next;
		if (node.children?.length) {
			const found = findPathToId(node.children, targetId, next);
			if (found) return found;
		}
	}
	return null;
}

function collectLeafDescendants(
	node: BusinessLineTreeNode,
): BusinessLineTreeNode[] {
	const children = node.children ?? [];
	if (children.length === 0) return [node];
	return children.flatMap((child) => collectLeafDescendants(child));
}

function collectDescendantIds(node: BusinessLineTreeNode): string[] {
	const ids: string[] = [];
	function walk(current: BusinessLineTreeNode) {
		if (current.id) ids.push(String(current.id));
		for (const child of current.children ?? []) {
			walk(child);
		}
	}
	walk(node);
	return ids;
}

export function deriveOrgLineFields(
	treeNodes: BusinessLineTreeNode[],
	selectedIds: string[],
	level?: number,
): {
	groupIds: string;
	abilityLineId: string | null;
	businessLineId: string | null;
} {
	const normalizedSelected = selectedIds.map((id) => id.trim()).filter(Boolean);
	if (normalizedSelected.length === 0) {
		return { groupIds: "", abilityLineId: null, businessLineId: null };
	}

	const maxLevel = level && level > 0 ? Math.floor(level) : undefined;
	if (maxLevel) {
		// Selection is pinned to the required level (e.g. 能力线 = level 3).
		const levelIds: string[] = [];
		for (const id of normalizedSelected) {
			const path = findPathToId(treeNodes, id);
			if (!path?.length) continue;
			const levelNode = path[maxLevel - 1];
			if (levelNode?.id) {
				levelIds.push(String(levelNode.id));
			}
		}
		const uniqueLevelIds = Array.from(new Set(levelIds));
		const firstId = uniqueLevelIds[0];
		if (!firstId) {
			return { groupIds: "", abilityLineId: null, businessLineId: null };
		}
		const path = findPathToId(treeNodes, firstId) ?? [];
		return {
			groupIds: uniqueLevelIds.join(","),
			abilityLineId: path[1]?.id ? String(path[1].id) : null,
			businessLineId: path[2]?.id ? String(path[2].id) : null,
		};
	}

	const leafIds = new Set<string>();
	for (const id of normalizedSelected) {
		const node = findNodeById(treeNodes, id);
		if (!node) continue;
		for (const leaf of collectLeafDescendants(node)) {
			if (leaf.id) leafIds.add(String(leaf.id));
		}
	}
	const leafIdList = Array.from(leafIds);
	const firstLeafId = leafIdList[0];
	if (!firstLeafId) {
		return { groupIds: "", abilityLineId: null, businessLineId: null };
	}
	const path = findPathToId(treeNodes, firstLeafId) ?? [];
	return {
		groupIds: leafIdList.join(","),
		abilityLineId: path[1]?.id ? String(path[1].id) : null,
		businessLineId: path[2]?.id ? String(path[2].id) : null,
	};
}

function buildTreeOptions(
	treeNodes: BusinessLineTreeNode[],
	expandedIds: Set<string>,
	searchValue: string,
	level?: number,
): FlatOption[] {
	const isSearching = searchValue.trim().length > 0;
	const maxLevel = level && level > 0 ? Math.floor(level) : undefined;
	const result: FlatOption[] = [];

	function flatten(
		nodes: BusinessLineTreeNode[],
		depth: number,
		parentExpanded: boolean,
	) {
		for (const node of nodes) {
			const currentId = String(node.id);
			const currentLevel = depth + 1;
			const isNodeExpanded = expandedIds.has(currentId);
			const hasChildren = !!node.children && node.children.length > 0;
			const canShowChildren = !maxLevel || currentLevel < maxLevel;
			const isVisible = isSearching || parentExpanded;
			const isTopLevel = depth === 0;
			const selectable = !maxLevel || currentLevel === maxLevel;

			if (!isTopLevel) {
				result.push({
					nodeId: currentId,
					label: node.name,
					value: currentId,
					searchString: node.name,
					selectable,
					depth: depth - 1,
					hasChildren: hasChildren && canShowChildren,
					isExpanded: isNodeExpanded,
					isVisible,
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
}

export function FormBusinessLineTreeMultiPicker<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	level,
	maxSelections,
	placeholder = "全选所有的业务线...",
	tooltip,
	externalError,
	onDerivedChange,
}: FormFieldBaseProps<TFormData> & {
	level?: number;
	maxSelections?: number;
	placeholder?: string;
	externalError?: string;
	onDerivedChange?: (derived: {
		groupIds: string;
		abilityLineId: string | null;
		businessLineId: string | null;
		selectedIds: string[];
	}) => void;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const { data: treeResponse, isLoading } =
		useWorkspaceBusinessLinesReadBusinessLinesTree();
	const treeNodes = treeResponse?.status === 200 ? treeResponse.data : [];
	const options = buildTreeOptions(treeNodes, expandedIds, searchValue, level);
	const maxLevel = level && level > 0 ? Math.floor(level) : undefined;

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
				const errors = [
					...extractErrors(field.state.meta.errors),
					...(externalError ? [{ message: externalError }] : []),
				];
				const invalid = errors.length > 0;
				const currentValue: string =
					typeof field.state.value === "string" ? field.state.value : "";
				const selectedValues: string[] = currentValue
					.split(",")
					.map((part: string) => part.trim())
					.filter((part: string) => part.length > 0);
				const selectedCount = selectedValues.length;
				const selectedLabels = selectedValues.map((part) => {
					const option = options.find((opt) => opt.value === part);
					if (option) return option.label;
					const path = findPathToId(treeNodes, part);
					if (maxLevel && path?.[maxLevel - 1]) {
						return path[maxLevel - 1]?.name ?? part;
					}
					return path?.[path.length - 1]?.name ?? part;
				});

				let displayText: string = placeholder;
				if (selectedCount >= 1 && selectedCount <= 2) {
					displayText = Array.from(new Set(selectedLabels)).join(", ");
				} else if (selectedCount >= 3) {
					displayText = `${selectedCount} 已选`;
				}

				const applySelection = (nextSelected: string[]) => {
					const derived = deriveOrgLineFields(treeNodes, nextSelected, level);
					field.handleChange(derived.groupIds as never);
					onDerivedChange?.({
						...derived,
						selectedIds: nextSelected,
					});
				};

				const isNodeSelected = (nodeId: string) => {
					if (selectedValues.includes(nodeId)) return true;
					const node = findNodeById(treeNodes, nodeId);
					if (!node) return false;
					const relatedIds = new Set(collectDescendantIds(node));
					return selectedValues.some((id) => relatedIds.has(id));
				};

				const toggleOption = (nodeValue: string) => {
					const node = findNodeById(treeNodes, nodeValue);
					if (!node) return;
					const closeAfterSelect = () => {
						setOpen(false);
						setSearchValue("");
					};
					if (maxLevel) {
						const path = findPathToId(treeNodes, nodeValue);
						const levelNode = path?.[maxLevel - 1];
						const levelId = levelNode?.id ? String(levelNode.id) : null;
						if (!levelId || path?.length !== maxLevel) return;
						let next: string[];
						if (maxSelections === 1) {
							next = isNodeSelected(levelId) ? [] : [levelId];
						} else if (isNodeSelected(levelId)) {
							next = selectedValues.filter((id) => {
								const idPath = findPathToId(treeNodes, id);
								return idPath?.[maxLevel - 1]?.id !== levelId;
							});
						} else {
							next = Array.from(new Set([...selectedValues, levelId]));
						}
						applySelection(next);
						if (maxSelections === 1 && next.length === 1) {
							closeAfterSelect();
						}
						return;
					}
					const targetLeafIds = collectLeafDescendants(node).map((leaf) =>
						String(leaf.id),
					);
					const allSelected = targetLeafIds.every((id) =>
						selectedValues.includes(id),
					);
					let next: string[];
					if (maxSelections === 1) {
						const primaryLeafId = targetLeafIds[0];
						if (!primaryLeafId) return;
						next = allSelected ? [] : [primaryLeafId];
					} else {
						next = allSelected
							? selectedValues.filter((id) => !targetLeafIds.includes(id))
							: Array.from(new Set([...selectedValues, ...targetLeafIds]));
					}
					applySelection(next);
					if (maxSelections === 1 && next.length === 1) {
						closeAfterSelect();
					}
				};

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
											selectedCount > 0 && !disabled && "pr-8",
											selectedCount === 0 && "text-muted-foreground",
											disabled && "cursor-not-allowed opacity-50",
										)}
									>
										<span className="truncate">
											{isLoading ? "加载中..." : displayText}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								{selectedCount > 0 && !disabled && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										aria-label={`清除${label ?? "业务线"}`}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											applySelection([]);
										}}
									>
										<X className="size-3.5" />
									</Button>
								)}
								<PopoverContent className="w-[300px] p-0" align="start">
									<Command
										filter={(value, search) => {
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
													const isSelected = isNodeSelected(opt.value);

													return (
														<CommandItem
															key={opt.value}
															value={opt.value}
															onSelect={() => {
																if (!opt.selectable) return;
																toggleOption(opt.value);
															}}
															className={cn(!opt.selectable && "opacity-70")}
														>
															<div className="flex w-full items-center">
																<div
																	style={{ width: opt.depth * 16 }}
																	className="flex-shrink-0"
																/>
																{opt.hasChildren ? (
																	<button
																		type="button"
																		className="mr-1 flex-shrink-0 cursor-pointer rounded-sm p-0.5 hover:bg-muted"
																		onClick={(e) => toggleExpand(opt.nodeId, e)}
																	>
																		{opt.isExpanded ? (
																			<ChevronDown className="h-4 w-4 text-muted-foreground" />
																		) : (
																			<ChevronRight className="h-4 w-4 text-muted-foreground" />
																		)}
																	</button>
																) : (
																	<div className="mr-1 h-4 w-4 flex-shrink-0" />
																)}
																<div
																	className={cn(
																		"mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-primary",
																		!opt.selectable && "invisible",
																		isSelected
																			? "bg-primary text-primary-foreground"
																			: "opacity-50 [&_svg]:invisible",
																	)}
																>
																	<Check className="h-3 w-3" />
																</div>
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
						{invalid && <FieldError errors={errors} />}
					</Field>
				);
			}}
		</form.Field>
	);
}
