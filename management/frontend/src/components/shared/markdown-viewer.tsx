import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	type ElementTransformer,
	type MultilineElementTransformer,
	TRANSFORMERS,
} from "@lexical/markdown";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
	TableCellHeaderStates,
	TableCellNode,
	TableNode,
	TableRowNode,
} from "@lexical/table";
import {
	$applyNodeReplacement,
	$createParagraphNode,
	$isElementNode,
	DecoratorNode,
	type EditorConfig,
	type ElementFormatType,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
	type SerializedLexicalNode,
} from "lexical";
import { cn } from "@/lib/utils";

interface MarkdownViewerProps {
	markdown: string;
	className?: string;
}

type TableColumnAlignment = Extract<
	ElementFormatType,
	"left" | "center" | "right"
>;

const TABLE_ROW_REG_EXP = /^\s*\|?.+\|.+\|?\s*$/;
const TABLE_DIVIDER_CELL_REG_EXP = /^:?-{3,}:?$/;

function buildMarkdownViewerConfig(markdown: string): InitialConfigType {
	return {
		namespace: "MarkdownViewer",
		editable: false,
		theme: {
			table:
				"my-3 w-full min-w-[520px] border-collapse overflow-hidden rounded-md border border-border text-sm",
			tableCell:
				"border border-border px-3 py-2 align-top leading-relaxed text-foreground",
			tableCellHeader: "bg-muted/70 font-semibold text-foreground",
			tableRow: "even:bg-muted/30",
			tableRowStriping: "even:bg-muted/30",
		},
		nodes: [
			AutoLinkNode,
			CodeHighlightNode,
			CodeNode,
			HeadingNode,
			LinkNode,
			ListItemNode,
			ListNode,
			QuoteNode,
			HorizontalRuleNode,
			TableCellNode,
			TableNode,
			TableRowNode,
		],
		onError(error) {
			throw error;
		},
		editorState: () => {
			$convertFromMarkdownString(markdown, getMarkdownViewerTransformers());
		},
	};
}

function getMarkdownViewerTransformers() {
	return [
		createTableTransformer(),
		createHorizontalRuleTransformer(),
		...TRANSFORMERS,
	];
}

class HorizontalRuleNode extends DecoratorNode<null> {
	static getType(): string {
		return "horizontal-rule";
	}

	static clone(node: HorizontalRuleNode): HorizontalRuleNode {
		return new HorizontalRuleNode(node.__key);
	}

	static importJSON(): HorizontalRuleNode {
		return $createHorizontalRuleNode();
	}

	createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
		const element = document.createElement("hr");
		element.className = "my-4 border-0 border-t border-border";
		return element;
	}

	updateDOM(): false {
		return false;
	}

	exportJSON(): SerializedLexicalNode {
		return {
			type: "horizontal-rule",
			version: 1,
		};
	}

	decorate(): null {
		return null;
	}

	isInline(): false {
		return false;
	}
}

function $createHorizontalRuleNode(): HorizontalRuleNode {
	return $applyNodeReplacement(new HorizontalRuleNode());
}

function $isHorizontalRuleNode(
	node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
	return node instanceof HorizontalRuleNode;
}

function createHorizontalRuleTransformer(): ElementTransformer {
	return {
		dependencies: [HorizontalRuleNode],
		export: (node) => ($isHorizontalRuleNode(node) ? "---" : null),
		regExp: /^ {0,3}[-*_](?:\s*[-*_]){2,}\s*$/,
		replace: (parentNode) => {
			parentNode.replace($createHorizontalRuleNode());
		},
		type: "element",
	};
}

function createTableTransformer(): MultilineElementTransformer {
	return {
		dependencies: [TableNode, TableRowNode, TableCellNode],
		handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
			const dividerLine = lines[startLineIndex + 1];
			if (
				dividerLine === undefined ||
				!isMarkdownTableDividerLine(dividerLine)
			) {
				return null;
			}

			let endLineIndex = startLineIndex + 1;
			while (
				endLineIndex + 1 < lines.length &&
				isMarkdownTableRowLine(lines[endLineIndex + 1])
			) {
				endLineIndex += 1;
			}

			appendMarkdownTable(
				rootNode,
				lines.slice(startLineIndex, endLineIndex + 1),
			);
			return [true, endLineIndex];
		},
		regExpStart: TABLE_ROW_REG_EXP,
		replace: () => false,
		type: "multiline-element",
	};
}

function appendMarkdownTable(rootNode: ElementNode, lines: string[]) {
	const [headerLine, dividerLine, ...bodyLines] = lines;
	const headerCells = splitMarkdownTableRow(headerLine);
	const alignments = parseTableColumnAlignments(dividerLine);
	const bodyRows = bodyLines
		.map((line) => splitMarkdownTableRow(line))
		.filter((row) => row.length > 0);
	const columnCount = Math.max(
		headerCells.length,
		alignments.length,
		...bodyRows.map((row) => row.length),
	);

	if (columnCount < 2) {
		return;
	}

	const tableNode = $createTableNode();
	tableNode.append(
		createTableRow(headerCells, alignments, columnCount, true),
		...bodyRows.map((row) =>
			createTableRow(row, alignments, columnCount, false),
		),
	);
	rootNode.append(tableNode);
}

function createTableRow(
	cells: string[],
	alignments: TableColumnAlignment[],
	columnCount: number,
	isHeader: boolean,
) {
	const rowNode = $createTableRowNode();
	for (let index = 0; index < columnCount; index += 1) {
		const cellNode = $createTableCellNode(
			isHeader ? TableCellHeaderStates.COLUMN : TableCellHeaderStates.NO_STATUS,
		);
		const cellText = cells[index] ?? "";
		if (cellText.trim() === "") {
			const paragraphNode = $createParagraphNode();
			paragraphNode.setFormat(alignments[index] ?? "");
			cellNode.append(paragraphNode);
		} else {
			$convertFromMarkdownString(cellText, TRANSFORMERS, cellNode);
			for (const child of cellNode.getChildren()) {
				if ($isElementNode(child)) {
					child.setFormat(alignments[index] ?? "");
				}
			}
		}
		rowNode.append(cellNode);
	}
	return rowNode;
}

function parseTableColumnAlignments(line: string): TableColumnAlignment[] {
	return splitMarkdownTableRow(line).map((cell) => {
		const normalized = cell.replace(/\s/g, "");
		if (normalized.startsWith(":") && normalized.endsWith(":")) {
			return "center";
		}
		if (normalized.endsWith(":")) {
			return "right";
		}
		return "left";
	});
}

function isMarkdownTableRowLine(line: string) {
	return TABLE_ROW_REG_EXP.test(line) && splitMarkdownTableRow(line).length > 1;
}

function isMarkdownTableDividerLine(line: string) {
	const cells = splitMarkdownTableRow(line);
	return (
		cells.length > 1 &&
		cells.every((cell) =>
			TABLE_DIVIDER_CELL_REG_EXP.test(cell.replace(/\s/g, "")),
		)
	);
}

function splitMarkdownTableRow(line: string) {
	let value = line.trim();
	if (value.startsWith("|")) {
		value = value.slice(1);
	}
	if (value.endsWith("|")) {
		value = value.slice(0, -1);
	}

	const cells: string[] = [];
	let currentCell = "";
	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const nextChar = value[index + 1];
		if (char === "\\" && nextChar === "|") {
			currentCell += "|";
			index += 1;
			continue;
		}
		if (char === "|") {
			cells.push(currentCell.trim());
			currentCell = "";
			continue;
		}
		currentCell += char;
	}
	cells.push(currentCell.trim());
	return cells;
}

export function MarkdownViewer({ markdown, className }: MarkdownViewerProps) {
	return (
		<LexicalComposer
			key={markdown}
			initialConfig={buildMarkdownViewerConfig(markdown)}
		>
			<div
				className={cn(
					"prose prose-sm max-w-none dark:prose-invert",
					"prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1.5",
					"prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
					"prose-pre:my-2 prose-pre:whitespace-pre-wrap prose-code:break-words",
					"overflow-x-auto",
					className,
				)}
			>
				<RichTextPlugin
					contentEditable={<ContentEditable className="outline-none" />}
					placeholder={null}
					ErrorBoundary={LexicalErrorBoundary}
				/>
			</div>
		</LexicalComposer>
	);
}
