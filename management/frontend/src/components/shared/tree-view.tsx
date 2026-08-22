import {
	ChevronRight,
	ChevronsDownUp,
	ChevronsUpDown,
	Search,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TreeDataItem {
	id: string;
	name: string;
	children?: TreeDataItem[];
	icon?: string;
	[key: string]: unknown;
}

interface TreeViewProps {
	data: TreeDataItem[];
	selectedIds: string[];
	onSelectedIdsChange: (ids: string[]) => void;
	className?: string;
	defaultExpanded?: boolean;
	searchPlaceholder?: string;
	getSearchText?: (node: TreeDataItem) => string;
	renderSuffix?: (node: TreeDataItem) => ReactNode;
	showToolbar?: boolean;
}

function collectNodeIds(nodes: TreeDataItem[]): string[] {
	return nodes.flatMap((node) => [
		node.id,
		...collectNodeIds(node.children ?? []),
	]);
}

function collectExpandableIds(nodes: TreeDataItem[]): string[] {
	return nodes.flatMap((node) => [
		...(node.children?.length ? [node.id] : []),
		...collectExpandableIds(node.children ?? []),
	]);
}

function getDescendantIds(node: TreeDataItem): string[] {
	return collectNodeIds(node.children ?? []);
}

function filterTree(
	nodes: TreeDataItem[],
	query: string,
	getSearchText: (node: TreeDataItem) => string,
): TreeDataItem[] {
	if (!query) return nodes;

	return nodes.flatMap((node) => {
		if (getSearchText(node).toLocaleLowerCase().includes(query)) {
			return [node];
		}

		const children = filterTree(node.children ?? [], query, getSearchText);
		return children.length > 0 ? [{ ...node, children }] : [];
	});
}

export function TreeView({
	data,
	selectedIds,
	onSelectedIdsChange,
	className,
	defaultExpanded = false,
	searchPlaceholder = "搜索节点",
	getSearchText = (node) => node.name,
	renderSuffix,
	showToolbar = true,
}: TreeViewProps) {
	const [searchValue, setSearchValue] = useState("");
	const [expandedIds, setExpandedIds] = useState<string[]>(() =>
		defaultExpanded ? collectExpandableIds(data) : [],
	);
	const selectedSet = new Set(selectedIds);
	const normalizedSearch = searchValue.trim().toLocaleLowerCase();
	const visibleData = filterTree(data, normalizedSearch, getSearchText);
	const effectiveExpandedIds = normalizedSearch
		? new Set(collectExpandableIds(visibleData))
		: new Set(expandedIds);
	const allNodeIds = collectNodeIds(data);

	const checkState = (
		node: TreeDataItem,
	): "checked" | "indeterminate" | "unchecked" => {
		if (!node.children?.length) {
			return selectedSet.has(node.id) ? "checked" : "unchecked";
		}

		const descendants = getDescendantIds(node);
		const selectedDescendants = descendants.filter((id) => selectedSet.has(id));
		if (
			selectedSet.has(node.id) &&
			selectedDescendants.length === descendants.length
		) {
			return "checked";
		}
		if (selectedSet.has(node.id) || selectedDescendants.length > 0) {
			return "indeterminate";
		}
		return "unchecked";
	};

	const handleCheckedChange = (node: TreeDataItem, checked: boolean) => {
		const nextSelected = new Set(selectedIds);
		const affectedIds = [node.id, ...getDescendantIds(node)];
		for (const id of affectedIds) {
			if (checked) nextSelected.add(id);
			else nextSelected.delete(id);
		}
		onSelectedIdsChange(Array.from(nextSelected));
	};

	const setNodeExpanded = (nodeId: string, open: boolean) => {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (open) next.add(nodeId);
			else next.delete(nodeId);
			return Array.from(next);
		});
	};

	const renderNode = (node: TreeDataItem) => {
		const hasChildren = Boolean(node.children?.length);
		const state = checkState(node);
		const isExpanded = effectiveExpandedIds.has(node.id);
		const row = (
			<div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
				{hasChildren ? (
					<CollapsibleTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={isExpanded ? `收起${node.name}` : `展开${node.name}`}
						>
							<ChevronRight
								className={cn(
									"transition-transform",
									isExpanded && "rotate-90",
								)}
							/>
						</Button>
					</CollapsibleTrigger>
				) : (
					<span className="size-5 shrink-0" />
				)}
				<Checkbox
					checked={
						state === "checked"
							? true
							: state === "indeterminate"
								? "indeterminate"
								: false
					}
					onCheckedChange={(checked) =>
						handleCheckedChange(node, checked === true)
					}
					aria-label={`选择${node.name}`}
					className="shrink-0"
				/>
				{hasChildren ? (
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="min-w-0 flex-1 truncate text-left text-sm font-medium"
						>
							{node.name}
						</button>
					</CollapsibleTrigger>
				) : (
					<span className="min-w-0 flex-1 truncate text-sm font-medium">
						{node.name}
					</span>
				)}
				{renderSuffix?.(node)}
			</div>
		);

		if (!hasChildren) return <div key={node.id}>{row}</div>;

		return (
			<Collapsible
				key={node.id}
				open={isExpanded}
				onOpenChange={(open) => setNodeExpanded(node.id, open)}
			>
				{row}
				<CollapsibleContent>
					<div className="ml-4 flex flex-col border-l pl-2">
						{node.children?.map(renderNode)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		);
	};

	return (
		<div className={cn("flex min-h-0 flex-col", className)}>
			{showToolbar && (
				<div className="shrink-0 space-y-2 border-b p-2">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							placeholder={searchPlaceholder}
							className="pl-7"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setExpandedIds(collectExpandableIds(data))}
						>
							<ChevronsUpDown />
							全部展开
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setExpandedIds([])}
						>
							<ChevronsDownUp />
							全部收起
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onSelectedIdsChange(allNodeIds)}
						>
							全选
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onSelectedIdsChange([])}
						>
							清空
						</Button>
						<span className="ml-auto text-xs text-muted-foreground">
							已选择 {selectedIds.length} 项
						</span>
					</div>
				</div>
			)}
			<div className="min-h-0 flex-1 overflow-y-auto p-1">
				{visibleData.length > 0 ? (
					visibleData.map(renderNode)
				) : (
					<div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
						没有匹配的节点
					</div>
				)}
			</div>
		</div>
	);
}
