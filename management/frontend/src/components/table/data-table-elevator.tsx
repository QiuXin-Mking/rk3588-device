import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export interface DataTableElevatorAnchor {
	label: string;
	targetName: string;
	className?: string;
}

export interface DataTableElevatorProps<TData> {
	table: Table<TData>;
	anchors: DataTableElevatorAnchor[];
	className?: string;
}

export function DataTableElevator<TData>({
	table,
	anchors,
	className = "",
}: DataTableElevatorProps<TData>) {
	const scrollToTableColumn = (groupName: string) => {
		const ths = Array.from(document.querySelectorAll("th"));
		const targetTh = ths.find((th) => th.textContent?.includes(groupName));
		if (targetTh) {
			const container = targetTh.closest(".overflow-auto");
			if (container) {
				const pinnedWidth = table
					.getLeftLeafColumns()
					.reduce((sum, col) => sum + col.getSize(), 0);
				container.scrollTo({
					left: targetTh.offsetLeft - pinnedWidth,
					behavior: "smooth",
				});
			}
		}
	};

	return (
		<div
			className={`flex items-center gap-1 bg-muted/40 rounded-lg border shadow-sm ${className}`}
		>
			{anchors.map((anchor) => (
				<Button
					key={anchor.label}
					variant="ghost"
					size="sm"
					className={anchor.className}
					onClick={() => scrollToTableColumn(anchor.targetName)}
				>
					{anchor.label}
				</Button>
			))}
		</div>
	);
}
