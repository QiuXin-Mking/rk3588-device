import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

export type ActionItem = {
	key: string;
	label: string;
	icon?: React.ElementType;
	onClick: () => void;
	danger?: boolean;
	separator?: boolean; // Add separator BEFORE this item
	permissionCode?: string; // Optional permission code needed to display this action
};

export function ResponsiveActionGroup({ actions }: { actions: ActionItem[] }) {
	const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg
	const isTablet = useMediaQuery("(min-width: 768px)"); // md
	const { hasPermission } = usePermissions();

	const maxVisible = isDesktop ? 3 : isTablet ? 2 : 0;

	const allowedActions = actions.filter((action) =>
		hasPermission(action.permissionCode),
	);

	const inlineActions = allowedActions.slice(0, maxVisible);
	const dropdownActions = allowedActions.slice(maxVisible);

	if (allowedActions.length === 0) return null;

	return (
		<div className="flex items-center gap-1">
			{inlineActions.map((action) => (
				<Tooltip key={action.key}>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								action.danger &&
									"text-destructive hover:text-destructive hover:bg-destructive/10",
							)}
							onClick={action.onClick}
						>
							{action.icon && <action.icon className="size-4" />}
							<span className="sr-only">{action.label}</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>{action.label}</TooltipContent>
				</Tooltip>
			))}

			{dropdownActions.length > 0 && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<span className="sr-only">更多操作</span>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{dropdownActions.map((action, index) => (
							<React.Fragment key={action.key}>
								{action.separator && index !== 0 && <DropdownMenuSeparator />}
								<DropdownMenuItem
									onClick={action.onClick}
									className={cn(
										action.danger && "text-destructive focus:text-destructive",
									)}
								>
									{action.icon && <action.icon className="mr-2 size-4" />}
									{action.label}
								</DropdownMenuItem>
							</React.Fragment>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
