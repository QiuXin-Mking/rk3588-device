import { Info } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldHintProps {
	text: string;
}

/** Tiny info icon with hover tooltip — use inline next to a label. */
export function FieldHint({ text }: FieldHintProps) {
	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger
					type="button"
					tabIndex={-1}
					className="ml-1 inline-flex align-text-bottom text-muted-foreground hover:text-foreground transition-colors"
				>
					<Info className="h-3.5 w-3.5" />
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-[280px] text-xs">
					{text}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
