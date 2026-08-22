import {
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
		if (node.id === targetId) {
			return node;
		}
		if (node.children?.length) {
			const found = findNodeById(node.children, targetId);
			if (found) return found;
		}
	}
	return null;
}

function collectLeafDescendants(
	node: BusinessLineTreeNode,
): BusinessLineTreeNode[] {
	const children = node.children ?? [];
	if (children.length === 0) {
		return [node];
	}
	return children.flatMap((child) => collectLeafDescendants(child));
}

function buildLeafOptions(
	treeNodes: BusinessLineTreeNode[],
	parentId: string | null | undefined,
	expandedIds: Set<string>,
	searchValue: string,
): FlatOption[] {
	if (!parentId) {
		return [];
	}

	const parentNode = findNodeById(treeNodes, parentId);
	if (!parentNode) {
		return [];
	}

	const leafNodes = collectLeafDescendants(parentNode).filter(
		(node) => node.id !== parentId,
	);
	const leafIdSet = new Set(leafNodes.map((node) => node.id as string));
	const isSearching = searchValue.trim().length > 0;
	const result: FlatOption[] = [];

	function flatten(
		nodes: BusinessLineTreeNode[],
		depth: number,
		parentExpanded: boolean,
	) {
		for (const node of nodes) {
			const currentId = node.id as string;
			const isNodeExpanded = expandedIds.has(currentId);
			const hasChildren = !!node.children && node.children.length > 0;
			const isVisible = isSearching || parentExpanded;
			const selectable = leafIdSet.has(currentId);

			if (selectable || hasChildren) {
				result.push({
					nodeId: currentId,
					label: node.name,
					value: currentId,
					searchString: node.name,
					selectable,
					depth,
					hasChildren,
					isExpanded: isNodeExpanded,
					isVisible,
				});
			}

			if (hasChildren) {
				flatten(
					node.children as BusinessLineTreeNode[],
					depth + 1,
					isVisible && isNodeExpanded,
				);
			}
		}
	}

	flatten([parentNode], 0, true);
	return result;
}

export function FormBusinessLineMultiPicker<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	parentId,
	placeholder = "请选择...",
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	parentId?: string | null;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const { data: treeResponse, isLoading } =
		useWorkspaceBusinessLinesReadBusinessLinesTree();
	const treeNodes = treeResponse?.status === 200 ? treeResponse.data : [];

	const options = useMemo(
		() => buildLeafOptions(treeNodes, parentId, expandedIds, searchValue),
		[treeNodes, parentId, expandedIds, searchValue],
	);

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
				const currentValue: string =
					typeof field.state.value === "string" ? field.state.value : "";
				const selectedValues: string[] = currentValue
					.split(",")
					.map((part: string) => part.trim())
					.filter((part: string) => part.length > 0);
				const selectedCount = selectedValues.length;
				const selectedLabels = selectedValues.map((part) => {
					const option = options.find((opt) => opt.value === part);
					return option?.label ?? part;
				});

				let displayText: string = placeholder;
				if (selectedCount >= 1 && selectedCount <= 4) {
					displayText = selectedLabels.join("、");
				} else if (selectedCount >= 5) {
					displayText = `已选${selectedCount}个`;
				}

				const handleOpenChange = (newOpen: boolean) => {
					setOpen(newOpen);
					if (!newOpen) setSearchValue("");
				};

				const toggleOption = (value: string) => {
					const next = selectedValues.includes(value)
						? selectedValues.filter((part) => part !== value)
						: [...selectedValues, value];
					field.handleChange(next.join(","));
				};

				const fieldDisabled = disabled || !parentId;

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
										disabled={fieldDisabled}
										aria-invalid={invalid}
										className={cn(
											"w-full justify-between font-normal",
											selectedCount > 0 && !fieldDisabled && "pr-8",
											selectedCount === 0 && "text-muted-foreground",
											fieldDisabled && "cursor-not-allowed opacity-50",
										)}
									>
										<span className="truncate">
											{isLoading
												? "加载中..."
												: !parentId
													? "请先选择业务线"
													: displayText}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
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
											placeholder="搜索小组..."
											value={searchValue}
											onValueChange={setSearchValue}
										/>
										<CommandList>
											<CommandEmpty>未找到对应小组。</CommandEmpty>
											<CommandGroup>
												{options.map((opt) => {
													if (!opt.isVisible) return null;
													const isSelected = selectedValues.includes(opt.value);

													return (
														<CommandItem
															key={opt.value}
															value={opt.value}
															onSelect={() => {
																if (!opt.selectable) return;
																toggleOption(opt.value);
															}}
														>
															<div className="flex items-center w-full">
																<div
																	style={{ width: opt.depth * 16 }}
																	className="flex-shrink-0"
																/>
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
																	<div className="h-4 w-4 mr-1 flex-shrink-0" />
																)}
																{opt.selectable ? (
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4 flex-shrink-0",
																			isSelected ? "opacity-100" : "opacity-0",
																		)}
																	/>
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
							{selectedCount > 0 && !fieldDisabled && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={`清除${String(label)}`}
									onPointerDown={(event) => {
										event.preventDefault();
										event.stopPropagation();
										field.handleChange("");
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
