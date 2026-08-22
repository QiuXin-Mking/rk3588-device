import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) {
		return (
			<div className={cn("truncate", className)} title={title}>
				{title}
			</div>
		);
	}

	return (
		<div className={cn("flex min-w-0 items-center", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="-ml-2 w-[calc(100%+0.5rem)] min-w-0 max-w-[calc(100%+0.5rem)] justify-start overflow-hidden data-[state=open]:bg-accent"
						title={title}
					>
						<span className="min-w-0 truncate">{title}</span>
						{column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-auto" data-icon="inline-end" />
						) : column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-auto" data-icon="inline-end" />
						) : (
							<ChevronsUpDown className="ml-auto" data-icon="inline-end" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
						<ArrowUp />
						升序
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<ArrowDown />
						降序
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
						<EyeOff />
						隐藏列
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
